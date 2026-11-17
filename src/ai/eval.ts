// AI 的轻量局面评估：只读影响力和公开信息，不依赖引擎推进。
import { CARDS, CHINA_CARD, COUNTRIES, COUNTRY_LIST, REGIONS, type CountryDef, type RegionId, type Side } from '../data';
import type { GameView } from '../engine/view';

export const opp = (s: Side): Side => (s === 'US' ? 'USSR' : 'US');
const idx = (s: Side) => (s === 'US' ? 0 : 1);

export type Inf = Record<string, [number, number]>;

export const cloneInf = (inf: Inf): Inf => {
  const o: Inf = {};
  for (const k in inf) o[k] = [inf[k][0], inf[k][1]];
  return o;
};

export function ctrl(inf: Inf, c: string): Side | null {
  const st = COUNTRIES[c].stability;
  const [a, b] = inf[c];
  if (a >= st && a - b >= st) return 'US';
  if (b >= st && b - a >= st) return 'USSR';
  return null;
}

export const SCORING_REGION: Record<number, RegionId | 'sea'> = { 1: 'asia', 2: 'europe', 3: 'middleEast', 37: 'centralAmerica', 38: 'sea', 79: 'africa', 81: 'southAmerica' };

const REGION_LIST: Record<RegionId, CountryDef[]> = Object.fromEntries(REGIONS.map((r) => [r, COUNTRY_LIST.filter((c) => c.region === r)])) as Record<RegionId, CountryDef[]>;
const BG_COUNT: Record<RegionId, number> = Object.fromEntries(REGIONS.map((r) => [r, REGION_LIST[r].filter((c) => c.bg).length])) as Record<RegionId, number>;
const POINTS: Record<RegionId, [number, number, number]> = {
  europe: [3, 7, 40], asia: [3, 7, 9], middleEast: [3, 5, 7], africa: [1, 4, 6], centralAmerica: [1, 3, 5], southAmerica: [2, 5, 6],
};
const SEA_PTS: Record<string, number> = { burma: 1, laosCambodia: 1, vietnam: 1, malaysia: 1, indonesia: 1, philippines: 1, thailand: 2 };

/** 区域计分（双方分数），与引擎规则一致（不含穿梭外交） */
export function regionPoints(inf: Inf, r: RegionId, formosan = false): Record<Side, number> & { ctrlEurope?: Side } {
  const list = REGION_LIST[r];
  const t = { US: { n: 0, bg: 0, adj: 0 }, USSR: { n: 0, bg: 0, adj: 0 } };
  let totalBg = BG_COUNT[r];
  const taiwanBg = formosan && r === 'asia' && ctrl(inf, 'taiwan') === 'US';
  if (taiwanBg) totalBg++;
  for (const c of list) {
    const w = ctrl(inf, c.id);
    if (!w) continue;
    const x = t[w];
    x.n++;
    if (c.bg || (taiwanBg && c.id === 'taiwan')) x.bg++;
    if (c.adj.includes(w === 'US' ? 'ussr' : 'usa')) x.adj++;
  }
  const [p, d, cc] = POINTS[r];
  const lv = (me: typeof t.US, th: typeof t.US) => {
    if (me.n === 0) return 0;
    if (me.bg === totalBg && me.n > th.n) return cc;
    if (me.n > th.n && me.bg > th.bg && me.n > me.bg) return d;
    return p;
  };
  const res = { US: lv(t.US, t.USSR) + t.US.bg + t.US.adj, USSR: lv(t.USSR, t.US) + t.USSR.bg + t.USSR.adj } as Record<Side, number> & { ctrlEurope?: Side };
  if (r === 'europe') {
    if (res.US >= 40) res.ctrlEurope = 'US';
    if (res.USSR >= 40) res.ctrlEurope = 'USSR';
  }
  return res;
}

export function seaPoints(inf: Inf): Record<Side, number> {
  const p = { US: 0, USSR: 0 };
  for (const [c, v] of Object.entries(SEA_PTS)) {
    const w = ctrl(inf, c);
    if (w) p[w] += v;
  }
  return p;
}

export interface Ctx {
  v: GameView;
  me: Side;
  /** 区域重要度 */
  rw: Record<RegionId, number>;
  /** 区域计分项权重 */
  sw: Record<RegionId, number>;
  seaW: number;
}

export function makeCtx(v: GameView, me: Side): Ctx {
  const t = v.turn;
  const early = t <= 3;
  const rw: Record<RegionId, number> = early
    ? { europe: 1.4, asia: 1.25, middleEast: 1.1, africa: 0.45, centralAmerica: 0.4, southAmerica: 0.4 }
    : { europe: 1.25, asia: 1.15, middleEast: 1.05, africa: 0.85, centralAmerica: 0.75, southAmerica: 0.8 };
  const sw: Record<RegionId, number> = { europe: 0.3, asia: 0.3, middleEast: 0.3, africa: 0.25, centralAmerica: 0.25, southAmerica: 0.25 };
  if (early) {
    sw.africa = 0.08;
    sw.centralAmerica = 0.08;
    sw.southAmerica = 0.08;
  }
  if (t >= 10) for (const r of REGIONS) sw[r] = 0.9; // 终局计分临近
  let seaW = 0;
  const mine = v.hands[me];
  const theirs = v.hands[opp(me)];
  for (const c of [...mine, ...theirs]) {
    const r = SCORING_REGION[c];
    if (!r) continue;
    const boost = mine.includes(c) ? 1.0 : 0.6;
    if (r === 'sea') seaW += boost * 0.6;
    else sw[r] += boost;
  }
  return { v, me, rw, sw, seaW };
}

/** 单国价值（从 me 视角，双方对称），不含区域计分项 */
function countryVal(cx: Ctx, inf: Inf, c: CountryDef): number {
  const me = cx.me;
  const [a, b] = inf[c.id];
  const mine = idx(me) === 0 ? a : b;
  const th = idx(me) === 0 ? b : a;
  const st = c.stability;
  const bgW = c.bg || (c.id === 'taiwan' && cx.v.flags.formosan) ? 2.3 : 1;
  const enemyAdj = c.adj.includes(me === 'US' ? 'ussr' : 'usa') ? 0.4 : 0;
  const myAdjThreat = c.adj.includes(me === 'US' ? 'usa' : 'ussr') ? 0.4 : 0;
  const w = cx.rw[c.region] * bgW;
  const who = ctrl(inf, c.id);
  let val: number;
  if (who === me) {
    const margin = mine - th - st;
    val = (1 + enemyAdj) * w + Math.min(margin, 2) * 0.1 * w;
  } else if (who === opp(me)) {
    const margin = th - mine - st;
    val = -(1 + myAdjThreat) * w - Math.min(margin, 2) * 0.1 * w;
  } else {
    // 进度：离控制还差多少
    const p = Math.max(-1, Math.min(1, (mine - th) / st));
    val = p * 0.4 * w + (mine > 0 ? 0.05 : 0) - (th > 0 ? 0.05 : 0);
  }
  // SEA 计分
  if (cx.seaW && SEA_PTS[c.id] && who) val += (who === me ? 1 : -1) * SEA_PTS[c.id] * cx.seaW;
  return val;
}

export function regionVal(cx: Ctx, inf: Inf, r: RegionId): number {
  let s = 0;
  for (const c of REGION_LIST[r]) s += countryVal(cx, inf, c);
  const p = regionPoints(inf, r, !!cx.v.flags.formosan);
  if (p.ctrlEurope) return s + (p.ctrlEurope === cx.me ? 500 : -500);
  return s + (p[cx.me] - p[opp(cx.me)]) * cx.sw[r];
}

export function boardVal(cx: Ctx, inf: Inf): number {
  let s = 0;
  for (const r of REGIONS) s += regionVal(cx, inf, r);
  return s;
}

/** 修改一组国家后的价值变化（只重算受影响区域） */
export function deltaVal(cx: Ctx, before: Inf, after: Inf, touched: string[]): number {
  const regs = new Set(touched.map((c) => COUNTRIES[c].region));
  let d = 0;
  for (const r of regs) d += regionVal(cx, after, r) - regionVal(cx, before, r);
  return d;
}

/** 在 c 上给 side 加 n 点的价值变化 */
export function addDelta(cx: Ctx, inf: Inf, c: string, side: Side, n: number): number {
  const r = COUNTRIES[c].region;
  const before = regionVal(cx, inf, r);
  const i = idx(side);
  const old = inf[c][i];
  inf[c][i] = Math.max(0, old + n);
  const after = regionVal(cx, inf, r);
  inf[c][i] = old;
  return after - before;
}

export function setDelta(cx: Ctx, inf: Inf, c: string, us: number, ussr: number): number {
  const after = cloneInf(inf);
  after[c] = [Math.max(0, us), Math.max(0, ussr)];
  return deltaVal(cx, inf, after, [c]);
}

export const infOf = (inf: Inf, c: string, s: Side) => inf[c][idx(s)];
export const sideIdx = idx;

// ---------------- 行动点 ----------------

type RS = 'none' | 'sea' | 'asia' | 'other';

export function opsBudget(v: GameView, side: Side, base: number, card: number | undefined, rs: RS): number {
  const f = v.flags;
  const plus = side === 'US' ? !!f.containment : !!f.brezhnev;
  let ops = base + (plus ? 1 : 0) - (f.redScare?.includes(side) ? 1 : 0);
  let cap = 4;
  if (card === CHINA_CARD && rs !== 'other') {
    ops += 1;
    cap = 5;
  }
  if (plus) ops = Math.min(ops, Math.max(cap, base));
  if (side === 'USSR' && f.vietnamRevolts && (rs === 'none' || rs === 'sea')) ops += 1;
  return Math.max(ops, 1);
}

export function effOps(v: GameView, side: Side, card: number): number {
  const d = CARDS[card];
  if (d.scoring) return 0;
  return opsBudget(v, side, d.ops, card, 'other');
}

export function maxARs(v: GameView, side: Side): number {
  const base = v.turn <= 3 ? 6 : 7;
  const perk8 = v.space[side] >= 8 && v.space[opp(side)] < 8;
  return base + (perk8 || (side === 'US' && v.flags.northSeaOil8) ? 1 : 0);
}

/** 本回合我方剩余行动轮（含当前） */
export function arsLeft(v: GameView, side: Side): number {
  if (v.phase === 'headline') return maxARs(v, side);
  return Math.max(1, maxARs(v, side) - v.ar + 1);
}

// ---------------- 政变 / 调整 ----------------

export function coupMods(v: GameView, side: Side, c: string): number {
  let m = 0;
  if (v.flags.salt) m -= 1;
  const r = COUNTRIES[c].region;
  if (v.flags.lads && (r === 'centralAmerica' || r === 'southAmerica')) m += v.flags.lads === side ? 1 : -1;
  return m;
}

/** 政变期望价值（不含军事行动与 DEFCON 项） */
export function coupEV(cx: Ctx, inf: Inf, side: Side, c: string, ops: number): { ev: number; pRemove: number } {
  const d = COUNTRIES[c];
  const mod = coupMods(cx.v, side, c);
  let ev = 0;
  let pRemove = 0;
  const thIn = infOf(inf, c, opp(side));
  const r0 = COUNTRIES[c].region;
  const before = regionVal(cx, inf, r0);
  const [o0, o1] = inf[c];
  for (let r = 1; r <= 6; r++) {
    const diff = r + ops + mod - 2 * d.stability;
    if (diff <= 0) continue;
    const rem = Math.min(diff, thIn);
    const add = diff - rem;
    if (rem > 0) pRemove += 1 / 6;
    inf[c][idx(opp(side))] -= rem;
    inf[c][idx(side)] += add;
    const dv = regionVal(cx, inf, r0) - before;
    inf[c] = [o0, o1];
    ev += (side === cx.me ? dv : -dv) / 6;
  }
  return { ev, pRemove };
}

export function realignMods(inf: Inf, v: GameView, side: Side, c: string): number {
  const d = COUNTRIES[c];
  const home = side === 'US' ? 'usa' : 'ussr';
  let m = 0;
  for (const a of d.adj) {
    if (a === home) m++;
    else if (a !== 'usa' && a !== 'ussr' && ctrl(inf, a) === side) m++;
  }
  if (infOf(inf, c, side) > infOf(inf, c, opp(side))) m++;
  if (side === 'US' && v.flags.iranContra) m--;
  return m;
}

export function realignEV(cx: Ctx, inf: Inf, side: Side, c: string): number {
  const ma = realignMods(inf, cx.v, side, c);
  const mb = realignMods(inf, cx.v, opp(side), c);
  const dist = new Map<number, number>();
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
    const k = a + ma - (b + mb);
    if (k !== 0) dist.set(k, (dist.get(k) ?? 0) + 1);
  }
  let ev = 0;
  for (const [k, n] of dist) {
    const who = k > 0 ? opp(side) : side;
    const dv = addDelta(cx, inf, c, who, -Math.abs(k));
    ev += ((side === cx.me ? dv : -dv) * n) / 36;
  }
  return ev;
}

export function warP(inf: Inf, side: Side, target: string, need: number, selfMinus: boolean): number {
  const d = COUNTRIES[target];
  const enemy = opp(side);
  const home = enemy === 'US' ? 'usa' : 'ussr';
  let mod = d.adj.filter((a) => a === home || (a !== 'usa' && a !== 'ussr' && ctrl(inf, a) === enemy)).length;
  if (selfMinus && ctrl(inf, target) === enemy) mod++;
  let p = 0;
  for (let r = 1; r <= 6; r++) if (r - mod >= need) p += 1 / 6;
  return p;
}

/** 战争事件对执行方 side 的期望价值（me 视角取符号） */
export function warEV(cx: Ctx, inf: Inf, side: Side, target: string, need: number, vp: number, selfMinus = false): number {
  const p = warP(inf, side, target, need, selfMinus);
  const after = cloneInf(inf);
  const n = after[target][idx(opp(side))];
  after[target][idx(opp(side))] = 0;
  after[target][idx(side)] += n;
  const dv = deltaVal(cx, inf, after, [target]);
  const gain = (side === cx.me ? dv : -dv) + (side === cx.me ? vp : -vp);
  return p * gain;
}
