// 行动点规划：放影响力 / 政变 / 调整的价值估计，以及事件的贪心子选择
import { COUNTRIES, COUNTRY_LIST, type Side } from '../data';
import {
  addDelta, cloneInf, coupEV, ctrl, deltaVal, infOf, opp, realignEV, sideIdx,
  type Ctx, type Inf,
} from './eval';

const ALL = COUNTRY_LIST.map((c) => c.id);

export function placeCost(inf: Inf, side: Side, c: string) {
  return ctrl(inf, c) === opp(side) ? 2 : 1;
}

/** 用行动点放影响力的合法目标（按快照 = 当前局面近似） */
export function placeTargets(cx: Ctx, inf: Inf, side: Side, snap: Set<string>): string[] {
  const home = side === 'US' ? 'usa' : 'ussr';
  const out: string[] = [];
  for (const c of ALL) {
    const d = COUNTRIES[c];
    if (side === 'USSR' && cx.v.flags.chernobyl && d.region === cx.v.flags.chernobyl) continue;
    const has = (x: string) => snap.has(x) && infOf(inf, x, side) > 0;
    if (has(c) || d.adj.some((a) => a === home || (a !== 'usa' && a !== 'ussr' && has(a)))) out.push(c);
  }
  return out;
}

export function snapshotOf(inf: Inf, side: Side): Set<string> {
  return new Set(ALL.filter((c) => infOf(inf, c, side) > 0));
}

/**
 * 贪心放置 ops 点影响力。返回 me 视角价值变化、首步与最终局面。
 * look2：对前若干候选做两步前瞻（将军）。
 */
export function planInfluence(cx: Ctx, inf: Inf, side: Side, ops: number, cands?: string[], look2 = false, filter?: (c: string) => boolean): { value: number; first?: string; after: Inf } {
  const snap = snapshotOf(inf, side);
  const base = cands ?? placeTargets(cx, inf, side, snap);
  const pool = filter ? base.filter(filter) : base;
  const sign = side === cx.me ? 1 : -1;
  let cur = cloneInf(inf);
  let left = ops;
  let total = 0;
  let first: string | undefined;
  while (left > 0) {
    const scored: [string, number, number][] = [];
    for (const c of pool) {
      const cost = placeCost(cur, side, c);
      if (cost > left) continue;
      scored.push([c, sign * addDelta(cx, cur, c, side, 1) / cost, cost]);
    }
    if (!scored.length) break;
    scored.sort((a, b) => b[1] - a[1]);
    let pick = scored[0];
    if (look2 && left >= 2) {
      let best = -Infinity;
      for (const [c1, , cost1] of scored.slice(0, 10)) {
        const t1 = cloneInf(cur);
        t1[c1][sideIdx(side)]++;
        const d1 = sign * deltaVal(cx, cur, t1, [c1]);
        let best2 = 0;
        for (const [c2] of scored.slice(0, 12)) {
          const cost2 = placeCost(t1, side, c2);
          if (cost1 + cost2 > left) continue;
          const v2 = sign * addDelta(cx, t1, c2, side, 1);
          if (v2 > best2) best2 = v2;
        }
        const tot = d1 + best2;
        if (tot > best) {
          best = tot;
          pick = scored.find((x) => x[0] === c1)!;
        }
      }
    }
    const [c, , cost] = pick;
    const nxt = cloneInf(cur);
    nxt[c][sideIdx(side)]++;
    total += deltaVal(cx, cur, nxt, [c]);
    cur = nxt;
    left -= cost;
    if (!first) first = c;
  }
  return { value: total, first, after: cur };
}

export interface CoupPick {
  c: string;
  value: number;
}

/** 军事行动缺口带来的价值（每点约 1 VP，越到回合末越紧迫） */
export function milopsValue(cx: Ctx, side: Side, ops: number, arsLeft: number): number {
  const need = Math.max(0, cx.v.defcon - cx.v.milops[side]);
  const gain = Math.min(need, ops);
  if (!gain) return 0;
  const urgency = arsLeft <= 1 ? 1 : arsLeft <= 2 ? 0.8 : arsLeft <= 4 ? 0.55 : 0.4;
  return gain * urgency;
}

/** DEFCON 对政变方的代价 */
export function defconCost(cx: Ctx, side: Side, c: string, free: boolean): number {
  const v = cx.v;
  if (!COUNTRIES[c].bg) return 0;
  if (side === 'US' && v.flags.nuclearSubs && !free) return 0;
  if (v.defcon <= 2) return 1000;
  if (v.defcon === 3) return 1.6;
  return 0.25;
}

export function bestCoup(cx: Ctx, inf: Inf, side: Side, targets: string[], opsOf: (c: string) => number, o: { free?: boolean; arsLeft: number }): CoupPick | null {
  let best: CoupPick | null = null;
  const v = cx.v;
  for (const c of targets) {
    if (infOf(inf, c, opp(side)) <= 0) continue;
    const ops = opsOf(c);
    const { ev } = coupEV(cx, inf, side, c, ops);
    let val = ev; // 对 side 有利的量
    if (!o.free) val += milopsValue(cx, side, ops, o.arsLeft);
    val -= defconCost(cx, side, c, !!o.free);
    if (v.flags.cmc === side) val -= 1000;
    if (side === 'US' && v.flags.yuri) val -= 1;
    if (!best || val > best.value) best = { c, value: val };
  }
  return best;
}

export function bestRealign(cx: Ctx, inf: Inf, side: Side, targets: string[]): CoupPick | null {
  let best: CoupPick | null = null;
  for (const c of targets) {
    if (infOf(inf, c, opp(side)) <= 0) continue;
    const val = realignEV(cx, inf, side, c); // 对 side 有利的量
    if (!best || val > best.value) best = { c, value: val };
  }
  return best;
}

/** 政变 / 调整的 DEFCON 地区限制与保护（与引擎 canTarget 一致） */
export function canTarget(cx: Ctx, inf: Inf, side: Side, c: string, kind: 'coup' | 'realign', free = false): boolean {
  const v = cx.v;
  const d = COUNTRIES[c];
  if (infOf(inf, c, opp(side)) <= 0) return false;
  if (v.flags.euFounded && d.region === 'europe') return false;
  if (!free) {
    if (v.defcon <= 4 && d.region === 'europe') return false;
    if (v.defcon <= 3 && d.region === 'asia') return false;
    if (v.defcon <= 2 && d.region === 'middleEast') return false;
  }
  if (side === 'USSR') {
    const f = v.flags;
    if (f.nato && d.region === 'europe' && ctrl(inf, c) === 'US' && !(c === 'france' && f.deGaulle) && !(c === 'westGermany' && f.willyBrandt)) return false;
    if (f.usJapan && c === 'japan') return false;
    if (kind === 'coup' && f.reformer && d.region === 'europe') return false;
  }
  return true;
}

/** 一手 ops 的最佳用法估值（me 视角，side 为使用方） */
export function opsValue(cx: Ctx, inf: Inf, side: Side, ops: number, o: { arsLeft: number; look2?: boolean; china?: boolean; modes?: string[]; filter?: (c: string) => boolean; free?: boolean } = { arsLeft: 4 }): { value: number; mode: 'influence' | 'coup' | 'realign' } {
  const modes = o.modes ?? ['influence', 'coup', 'realign'];
  let best: { value: number; mode: 'influence' | 'coup' | 'realign' } = { value: -Infinity, mode: 'influence' };
  const sign = side === cx.me ? 1 : -1;
  if (modes.includes('influence')) {
    let pv = planInfluence(cx, inf, side, ops, undefined, o.look2, o.filter).value;
    if (o.china) pv = Math.max(pv, planInfluence(cx, inf, side, ops + 1, undefined, o.look2, (c) => COUNTRIES[c].region === 'asia' && (!o.filter || o.filter(c))).value);
    best = { value: sign * pv, mode: 'influence' };
  }
  if (modes.includes('coup')) {
    const t = ALL.filter((c) => (!o.filter || o.filter(c)) && canTarget(cx, inf, side, c, 'coup', o.free));
    const bc = bestCoup(cx, inf, side, t, (c) => ops + (o.china && COUNTRIES[c].region === 'asia' ? 1 : 0), { arsLeft: o.arsLeft, free: o.free });
    if (bc && bc.value > best.value) best = { value: bc.value, mode: 'coup' };
  }
  if (modes.includes('realign')) {
    const t = ALL.filter((c) => (!o.filter || o.filter(c)) && canTarget(cx, inf, side, c, 'realign', o.free));
    const br = bestRealign(cx, inf, side, t);
    if (br && br.value * ops * 0.85 > best.value) best = { value: br.value * ops * 0.85, mode: 'realign' };
  }
  if (best.value === -Infinity) best.value = 0;
  // best.value 现在是“对 side 有利”的量；换成 me 视角
  return { value: sign * best.value, mode: best.mode };
}

// ---------------- 事件的贪心估值（me 视角） ----------------

export function greedyAdd(cx: Ctx, inf: Inf, side: Side, n: number, ok: (c: string) => boolean, maxPer = Infinity, once = false): { value: number; after: Inf } {
  const sign = side === cx.me ? 1 : -1;
  let cur = cloneInf(inf);
  const used: Record<string, number> = {};
  let total = 0;
  const pool = ALL.filter(ok);
  for (let i = 0; i < n; i++) {
    let best: string | null = null;
    let bv = -Infinity;
    for (const c of pool) {
      if ((used[c] ?? 0) >= (once ? 1 : maxPer)) continue;
      const dv = sign * addDelta(cx, cur, c, side, 1);
      if (dv > bv) {
        bv = dv;
        best = c;
      }
    }
    if (!best) break;
    const nxt = cloneInf(cur);
    nxt[best][sideIdx(side)]++;
    total += deltaVal(cx, cur, nxt, [best]);
    cur = nxt;
    used[best] = (used[best] ?? 0) + 1;
  }
  return { value: total, after: cur };
}

/** 执行方 side 从 target 移除影响力（每步 amount 点） */
export function greedyRemove(cx: Ctx, inf: Inf, side: Side, target: Side, n: number, ok: (c: string) => boolean, maxPer = Infinity, amount: (c: string, cur: Inf) => number = () => 1, once = false): { value: number; after: Inf } {
  const sign = side === cx.me ? 1 : -1;
  let cur = cloneInf(inf);
  const used: Record<string, number> = {};
  let total = 0;
  const pool = ALL.filter(ok);
  for (let i = 0; i < n; i++) {
    let best: string | null = null;
    let bv = -Infinity;
    let bestAfter: Inf | null = null;
    for (const c of pool) {
      if ((used[c] ?? 0) >= (once ? 1 : maxPer)) continue;
      if (infOf(cur, c, target) <= 0) continue;
      const nxt = cloneInf(cur);
      nxt[c][sideIdx(target)] = Math.max(0, nxt[c][sideIdx(target)] - amount(c, cur));
      const dv = sign * deltaVal(cx, cur, nxt, [c]);
      if (dv > bv) {
        bv = dv;
        best = c;
        bestAfter = nxt;
      }
    }
    if (!best || !bestAfter) break;
    total += deltaVal(cx, cur, bestAfter, [best]);
    cur = bestAfter;
    used[best] = (used[best] ?? 0) + 1;
  }
  return { value: total, after: cur };
}

/** 对手下一手的最大政变威胁（将军用） */
export function threat(cx: Ctx, inf: Inf, side: Side, ops = 3): number {
  const t = ALL.filter((c) => canTarget(cx, inf, side, c, 'coup'));
  let worst = 0;
  for (const c of t) {
    if (COUNTRIES[c].bg && cx.v.defcon <= 2) continue;
    const { ev } = coupEV(cx, inf, side, c, ops); // 对 side 有利的量
    if (ev > worst) worst = ev;
  }
  return worst;
}
