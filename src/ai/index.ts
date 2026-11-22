import { CARDS, CHINA_CARD, COUNTRIES, REGIONS, type Side } from '../data';
import type { GameView } from '../engine/view';
import type { Choice, Decision, Option } from '../engine/types';
import { SPACE } from '../engine/space';
import { ORBIT, regionLevels } from '../engine/endless';
import { addDelta, arsLeft, cloneInf, ctrl, effOps, infOf, makeCtx, opp, warEV, type Ctx, type Inf } from './eval';
import { eventMe, scoringNet, spaceValue, suicidal } from './events';
import { bestCoup, bestRealign, defconCost, greedyAdd, milopsValue, opsValue, planInfluence, threat } from './plan';

export type AiLevel = 1 | 2 | 3;

export const AI_LEVEL_ZH: Record<AiLevel, string> = { 1: '新兵', 2: '参谋', 3: '将军' };

/**
 * AI 选择。只能看到 view（与真人同样的信息），不能作弊。
 * rand 返回 [0,1) 随机数（由调用方提供，便于复现）。
 */
export function chooseAI(view: GameView, d: Decision, level: AiLevel, rand: () => number): Choice {
  const legal = (v: Choice | undefined): v is Choice => v !== undefined && d.options.some((o) => o.v === v);
  try {
    const v = level === 1 ? safeRandom(view, d, rand) : new Smart(view, d.side, level, rand).choose(d);
    if (legal(v)) return v;
  } catch (e) {
    if (typeof process !== 'undefined' && process.env?.AI_DEBUG) console.error(e);
  }
  try {
    const v = safeRandom(view, d, rand);
    if (legal(v)) return v;
  } catch {
    /* 回退到第一个选项 */
  }
  return d.options[0].v;
}

// =====================================================================
// 1 档：带安全过滤的随机
// =====================================================================

const DEGRADE = new Set([4, 50, 89]);
const num = (o: Option) => (typeof o.v === 'number' ? o.v : NaN);

function scoringForced(v: GameView, me: Side): boolean {
  const sc = v.hands[me].filter((c) => CARDS[c].scoring).length;
  return sc > 0 && sc >= arsLeft(v, me);
}

function safeRandom(v: GameView, d: Decision, rand: () => number): Choice {
  const me = d.side;
  const pick = (arr: Option[]) => arr[Math.floor(rand() * arr.length)].v;
  const keep = (f: (o: Option) => boolean) => {
    const r = d.options.filter(f);
    return r.length ? r : d.options;
  };
  switch (d.tag) {
    case 'play':
    case 'headline': {
      const sc = d.options.filter((o) => CARDS[num(o)]?.scoring);
      if (sc.length && (d.tag === 'headline' || scoringForced(v, me) || rand() < 0.4)) return sc[0].v;
      // DEFCON 2 时避免必然自杀的牌
      return pick(keep((o) => !(v.defcon === 2 && DEGRADE.has(num(o)) && !canSpaceCard(v, me, num(o))) && o.v !== 'pass'));
    }
    case 'mode': {
      const c = d.card!;
      const def = CARDS[c];
      if (v.defcon === 2 && (DEGRADE.has(c) || (c === 20 && def.side === 'NEUTRAL'))) {
        if (def.side === opp(me) || DEGRADE.has(c)) return pick(keep((o) => o.v === 'space'));
        return pick(keep((o) => o.v !== 'event'));
      }
      if (v.defcon === 2 && DEGRADE.has(c)) return pick(keep((o) => o.v === 'space'));
      return pick(d.options);
    }
    case 'opsMode':
      return pick(keep((o) => !(o.v === 'coup' && (v.flags.cmc === me || v.defcon <= 2)) && o.v !== 'skip'));
    case 'coupTarget':
      return pick(keep((o) => o.v === 'done' || !(COUNTRIES[o.v as string]?.bg && v.defcon <= 2 && !(me === 'US' && v.flags.nuclearSubs))));
    case 'discard': {
      const sc = d.options.filter((o) => CARDS[num(o)]?.scoring);
      if (sc.length && scoringForced(v, me)) return sc[0].v;
      return pick(keep((o) => !CARDS[num(o)]?.scoring));
    }
    case 'choice': {
      if (d.card === 40) return pick(keep((o) => o.v !== 'no')) ;
      if (d.card === 20 && v.defcon === 2) return 'boycott';
      if (d.card === 100) {
        const after = v.vp + (me === 'US' ? -6 : 6);
        return (me === 'US' ? after > 0 : after < 0) ? 'end' : 'no';
      }
      return pick(keep((o) => o.v !== '1' && o.v !== 'down'));
    }
    default:
      return pick(d.options);
  }
}

function canSpaceCard(v: GameView, me: Side, c: number): boolean {
  if (!CARDS[c] || CARDS[c].scoring) return false;
  if (c === CHINA_CARD && v.flags.endlessWorld) return false;
  const next = v.space[me] + 1;
  if (next > 8 && !v.flags.endlessWorld) return false;
  const perk2 = v.space[me] >= 2 && v.space[opp(me)] < 2;
  if (v.spaceAttempts[me] >= (perk2 ? 2 : 1)) return false;
  return effOps(v, me, c) >= (next > 8 ? ORBIT.ops : SPACE[next].ops);
}

// =====================================================================
// 2 / 3 档：启发式
// =====================================================================

interface PlayEval {
  value: number;
  mode: 'event' | 'ops' | 'space';
}

const REMOVERS = new Set([7, 10, 19, 28, 29, 56, 74, 82, 88, 95, 99, 8, 12, 15, 17, 68, 72, 83]);
const FREE_OPS: Record<number, (c: string) => boolean> = {
  47: (c) => COUNTRIES[c].region === 'centralAmerica' || COUNTRIES[c].region === 'southAmerica',
  96: (c) => COUNTRIES[c].region === 'europe',
  91: (c) => COUNTRIES.nicaragua.adj.includes(c),
};

class Smart {
  cx: Ctx;
  inf: Inf;
  constructor(public v: GameView, public me: Side, public level: AiLevel, public rand: () => number) {
    this.cx = makeCtx(v, me);
    this.inf = cloneInf(v.inf);
  }

  get look2() {
    return this.level >= 3;
  }

  choose(d: Decision): Choice | undefined {
    switch (d.tag) {
      case 'play': return this.play(d);
      case 'headline': return this.headline(d);
      case 'mode': return this.mode(d);
      case 'order': return this.order(d);
      case 'opsMode': return this.opsMode(d);
      case 'placeOps': return this.placeOps(d);
      case 'setup': return this.setup(d);
      case 'coupTarget': return this.coupTarget(d);
      case 'realignTarget': return this.realignTarget(d);
      case 'placeEvent': return this.placeEvent(d);
      case 'removeEvent': return this.removeEvent(d);
      case 'discard': return this.discard(d);
      case 'pickCard': return this.pickCard(d);
      case 'choice': return this.choice(d);
    }
    return undefined;
  }

  // ---------------- 出牌 ----------------

  canSpace(c: number) {
    return canSpaceCard(this.v, this.me, c);
  }

  spaceEV() {
    const next = this.v.space[this.me] + 1;
    // 不死不休：空间站之后每次成功是一次免费政变
    if (next > 8) return this.v.flags.endlessWorld ? (ORBIT.roll / 6) * 2.0 : -Infinity;
    return (SPACE[next].roll / 6) * spaceValue(this.cx, this.me);
  }

  opsV(ops: number, china = false, defconDrop = 0): number {
    const cx = defconDrop ? makeCtx({ ...this.v, defcon: Math.max(1, this.v.defcon - defconDrop) }, this.me) : this.cx;
    const r = opsValue(cx, this.inf, this.me, ops, { arsLeft: arsLeft(this.v, this.me), look2: this.look2, china });
    let val = r.value;
    if (this.level >= 3 && r.mode === 'influence') {
      const plan = planInfluence(this.cx, this.inf, this.me, ops, undefined, true);
      const t0 = threat(this.cx, this.inf, opp(this.me));
      const t1 = threat(this.cx, plan.after, opp(this.me));
      val -= 0.25 * (t1 - t0);
    }
    return val;
  }

  /** 打出某张牌的最佳估值 */
  evalPlay(c: number, allowed?: string[]): PlayEval {
    const v = this.v, me = this.me;
    const can = (m: string) => !allowed || allowed.includes(m);
    if (c === CHINA_CARD) {
      const keep = 1.2 + (v.turn >= 9 ? 1 : 0);
      const ops = this.opsV(effOps(v, me, c), true) - keep;
      const sp = can('space') && this.canSpace(c) ? this.spaceEV() - keep : -Infinity;
      return sp > ops ? { value: sp, mode: 'space' } : { value: ops, mode: 'ops' };
    }
    const def = CARDS[c];
    if (def.scoring) {
      const net = scoringNet(this.cx, this.inf, c, me);
      const forced = scoringForced(v, me);
      return { value: forced ? 100 + net : net - 1.5, mode: 'event' };
    }
    const ops = effOps(v, me, c);
    let best: PlayEval = { value: -Infinity, mode: 'ops' };
    const consider = (value: number, mode: PlayEval['mode']) => {
      if (can(mode) && value > best.value) best = { value, mode };
    };
    const own = def.side === me || def.side === 'NEUTRAL';
    if (own) {
      let ev = eventMe(this.cx, this.inf, c, me);
      if (suicidal(this.cx, c, me, me)) ev = -1000;
      if (def.side === me || def.side === 'NEUTRAL') consider(ev, 'event');
      consider(this.opsV(ops), 'ops');
    } else {
      let harm = eventMe(this.cx, this.inf, c, opp(me));
      if (suicidal(this.cx, c, opp(me), me)) harm = -1000;
      // 带星的对手事件被我们打掉后永久移除，减轻一点
      if (def.starred) harm *= 0.85;
      // 降 DEFCON 的对手事件：先发动事件再用行动点（见 order），按降级后的 DEFCON 估值
      // DEFCON 还安全时尽早甩掉会降 DEFCON 的对手牌，免得之后被迫在 DEFCON 2 打出
      const early = DEGRADE.has(c) ? (v.defcon === 3 ? 2.5 : v.defcon === 4 ? 0.8 : 0) : 0;
      consider(this.opsV(ops, false, DEGRADE.has(c) ? 1 : 0) + harm + early, 'ops');
    }
    if (this.canSpace(c)) {
      const dump = own ? 0 : Math.max(0, -eventMe(this.cx, this.inf, c, opp(me)));
      // 手里有会自杀的牌时，太空竞赛留给它
      const reserve = !this.bombs().includes(c) && this.bombs().some((b) => this.canSpace(b)) ? 50 : 0;
      consider(this.spaceEV() + dump * 0.9 - (own ? 0.5 : 0) - reserve, 'space');
    }
    if (best.value === -Infinity) best.value = 0;
    return best;
  }

  private _bombs?: number[];
  /** 当前 DEFCON 下打出（含换行动点）即自杀的手牌 */
  bombs(): number[] {
    if (!this._bombs) {
      this._bombs = this.v.hands[this.me].filter((c) => {
        const def = CARDS[c];
        if (def.scoring) return false;
        const exec = def.side === 'NEUTRAL' ? this.me : def.side;
        return def.side !== 'NEUTRAL' && suicidal(this.cx, c, exec, this.me);
      });
    }
    return this._bombs;
  }

  play(d: Decision): Choice | undefined {
    const v = this.v, me = this.me;
    if (v.flags.cmc === me && v.defcon) {
      /* 不政变由各环节处理 */
    }
    let best: Choice | undefined;
    let bv = -Infinity;
    // 剩下的行动轮不比手里的计分卡多：只能在计分卡里挑，否则回合末持牌判负。
    // 不能交给估值比较——后期行动点的估值量级可能远超计分卡的加成（曾因此在最后一轮打出别的牌而判负）
    const opts = scoringForced(v, me) ? d.options.filter((o) => typeof o.v === 'number' && CARDS[o.v]?.scoring && o.v !== CHINA_CARD) : [];
    for (const o of opts.length ? opts : d.options) {
      let val: number;
      if (o.v === 'pass') val = 0;
      else val = this.evalPlay(o.v as number).value + this.rand() * 0.05;
      if (val > bv) {
        bv = val;
        best = o.v;
      }
    }
    return best;
  }

  headline(d: Decision): Choice | undefined {
    const me = this.me;
    let best: Choice | undefined;
    let bv = -Infinity;
    for (const o of d.options) {
      const c = o.v as number;
      const def = CARDS[c];
      let val: number;
      if (def.scoring) val = scoringNet(this.cx, this.inf, c, me) + 0.8;
      else {
        const exec = def.side === 'NEUTRAL' ? me : def.side;
        val = eventMe(this.cx, this.inf, c, exec) - 0.45 * effOps(this.v, me, c);
        if (c === 103 && me === 'US') val = 1.2;
        if (suicidal(this.cx, c, exec, me)) val = -1000;
      }
      val += this.rand() * 0.05;
      if (val > bv) {
        bv = val;
        best = c;
      }
    }
    return best;
  }

  mode(d: Decision): Choice | undefined {
    const allowed = d.options.map((o) => String(o.v));
    const r = this.evalPlay(d.card!, allowed);
    return allowed.includes(r.mode) ? r.mode : undefined;
  }

  order(d: Decision): Choice | undefined {
    const c = d.card!;
    if (REMOVERS.has(c) || DEGRADE.has(c)) return 'eventFirst';
    void d;
    return 'opsFirst';
  }

  // ---------------- 行动点 ----------------

  parseOps(d: Decision): number {
    const m = d.prompt.match(/(\d+) 点行动点/) ?? d.prompt.match(/（(\d+) 点/);
    let n = m ? Number(m[1]) : CARDS[d.card ?? 0]?.ops ?? 1;
    if (d.card === CHINA_CARD) n -= 1;
    if (this.me === 'USSR' && this.v.flags.vietnamRevolts) n -= 1;
    return Math.max(1, n);
  }

  opsMode(d: Decision): Choice | undefined {
    const ops = this.parseOps(d);
    const china = d.card === CHINA_CARD;
    const filter = d.card !== undefined ? FREE_OPS[d.card] : undefined;
    const free = !!filter && d.prompt.includes('行动点') && [47, 96, 91].includes(d.card!);
    let best: Choice | undefined;
    let bv = -Infinity;
    for (const o of d.options) {
      let val: number;
      if (o.v === 'skip') val = 0;
      else {
        val = opsValue(this.cx, this.inf, this.me, ops, { arsLeft: arsLeft(this.v, this.me), look2: this.look2, china, modes: [o.v as string], filter, free }).value;
        if (o.v === 'coup' && this.v.flags.cmc === this.me) val -= 1000;
      }
      if (val > bv) {
        bv = val;
        best = o.v;
      }
    }
    return best;
  }

  placeOps(d: Decision): Choice | undefined {
    const cands = d.options.map((o) => o.v as string).filter((c) => COUNTRIES[c]);
    const left = d.ops ? d.ops.total - d.ops.spent : 1;
    const p = planInfluence(this.cx, this.inf, this.me, left, cands, this.look2);
    if (p.first && cands.includes(p.first)) return p.first;
    return this.bestAdd(cands, 1);
  }

  setup(d: Decision): Choice | undefined {
    const cands = d.options.map((o) => o.v as string);
    const left = d.ops ? d.ops.total - d.ops.spent : 1;
    const p = planInfluence(this.cx, this.inf, this.me, left, cands, this.look2);
    return p.first ?? this.bestAdd(cands, 1);
  }

  bestAdd(cands: string[], n: number, side: Side = this.me): string | undefined {
    let best: string | undefined;
    let bv = -Infinity;
    const sg = side === this.me ? 1 : -1;
    for (const c of cands) {
      if (!COUNTRIES[c]) continue;
      const val = sg * addDelta(this.cx, this.inf, c, side, n) + this.rand() * 1e-3;
      if (val > bv) {
        bv = val;
        best = c;
      }
    }
    return best;
  }

  coupTarget(d: Decision): Choice | undefined {
    const cands = d.options.map((o) => o.v as string).filter((c) => COUNTRIES[c]);
    const hasDone = d.options.some((o) => o.v === 'done');
    if (d.card === 36 || d.card === 142) {
      // 局部战争 / 代理人战争
      let best: string | undefined;
      let bv = -Infinity;
      for (const c of cands) {
        const val = d.card === 142 ? warEV(this.cx, this.inf, this.me, c, 4, 2) : warEV(this.cx, this.inf, this.me, c, 3, 1);
        if (val > bv) {
          bv = val;
          best = c;
        }
      }
      return best;
    }
    const n = this.parseOps(d);
    const china = d.card === CHINA_CARD;
    const vr = this.me === 'USSR' && this.v.flags.vietnamRevolts;
    const free = [47, 96, 91, 121, 133].includes(d.card ?? 0);
    const pick = bestCoup(this.cx, this.inf, this.me, cands, (c) => n + (china && COUNTRIES[c].region === 'asia' ? 1 : 0) + (vr && COUNTRIES[c].sub.includes('southeastAsia') ? 1 : 0), { arsLeft: arsLeft(this.v, this.me), free });
    if (!pick) return hasDone ? 'done' : cands[0];
    if (hasDone && pick.value < 0) return 'done';
    return pick.c;
  }

  realignTarget(d: Decision): Choice | undefined {
    const cands = d.options.map((o) => o.v as string).filter((c) => COUNTRIES[c]);
    const hasDone = d.options.some((o) => o.v === 'done');
    const pick = bestRealign(this.cx, this.inf, this.me, cands);
    if (!pick) return hasDone ? 'done' : cands[0];
    if (hasDone && pick.value < 0.05) return 'done';
    return pick.c;
  }

  // ---------------- 事件子选择 ----------------

  placeEvent(d: Decision): Choice | undefined {
    const cands = d.options.map((o) => o.v as string).filter((c) => COUNTRIES[c]);
    const hasDone = d.options.some((o) => o.v === 'done');
    const card = d.card;
    let best: string | undefined;
    let bv = -Infinity;
    const f = this.v.flags;
    const bonusLv = d.prompt.startsWith('区域红利') ? regionLevels(this.v as never, this.me) : null;
    for (const c of cands) {
      let n = 1;
      if (card === 47 || card === 53) n = 2;
      if (card === 105) n = f.nato ? 2 : 1;
      if (card === 22) n = Math.max(0, infOf(this.inf, c, 'USSR') - infOf(this.inf, c, 'US'));
      if (card === 95) n = infOf(this.inf, c, 'USSR');
      // 不死不休的区域红利：己方支配 / 控制的洲里点国家 = 移除敌方 1 点
      const strong = bonusLv && (bonusLv[COUNTRIES[c].region] === 'domination' || bonusLv[COUNTRIES[c].region] === 'control');
      const val = (strong ? addDelta(this.cx, this.inf, c, opp(this.me), -1) : addDelta(this.cx, this.inf, c, this.me, n)) + this.rand() * 1e-3;
      if (val > bv) {
        bv = val;
        best = c;
      }
    }
    if (hasDone && bv <= 0) return 'done';
    return best;
  }

  removeEvent(d: Decision): Choice | undefined {
    const cands = d.options.map((o) => o.v as string).filter((c) => COUNTRIES[c]);
    const hasDone = d.options.some((o) => o.v === 'done');
    const card = d.card;
    const own = card === 33;
    const target = own ? this.me : opp(this.me);
    let best: string | undefined;
    let bv = -Infinity;
    for (const c of cands) {
      let n = 1;
      if (card === 16 || card === 19 || card === 56) n = infOf(this.inf, c, target);
      if (card === 29) n = this.v.turn >= 8 ? 2 : 1;
      const val = addDelta(this.cx, this.inf, c, target, -n) + this.rand() * 1e-3;
      if (val > bv) {
        bv = val;
        best = c;
      }
    }
    if (own && hasDone && bv < -0.5) return 'done';
    return best;
  }

  /** 保留一张牌的价值（越低越该弃） */
  keepValue(c: number): number {
    if (CARDS[c].scoring) return 50;
    return this.evalPlay(c).value;
  }

  discard(d: Decision): Choice | undefined {
    const v = this.v, me = this.me;
    const cards = d.options.filter((o) => typeof o.v === 'number').map((o) => o.v as number);
    const hasPass = d.options.some((o) => o.v === 'pass');
    const card = d.card;
    const lowest = () => {
      let best: number | undefined;
      let bv = Infinity;
      for (const c of cards) {
        if (CARDS[c].scoring) continue;
        const k = this.keepValue(c);
        if (k < bv) {
          bv = k;
          best = c;
        }
      }
      return { c: best, k: bv };
    };
    if (card === 42 || card === 44) {
      const sc = cards.filter((c) => CARDS[c].scoring);
      if (sc.length && (scoringForced(v, me) || sc.length === cards.length)) {
        let best = sc[0], bv = -Infinity;
        for (const c of sc) {
          const n = scoringNet(this.cx, this.inf, c, me);
          if (n > bv) {
            bv = n;
            best = c;
          }
        }
        return best;
      }
      return lowest().c;
    }
    if (card === 10 || card === 95) {
      const lo = lowest();
      let penalty: number;
      if (card === 10) penalty = -addDelta(this.cx, this.inf, 'westGermany', 'US', -infOf(this.inf, 'westGermany', 'US'));
      else penalty = 1.5;
      if (lo.c !== undefined && lo.k < penalty) return lo.c;
      return hasPass ? 'pass' : lo.c;
    }
    if (card === 77 || card === 108) {
      // 弃掉对我方不利 / 价值低的牌
      let worst: number | undefined, wv = Infinity;
      for (const c of cards) {
        const def = CARDS[c];
        let k: number;
        if (card === 108) k = def.side === opp(me) ? -Math.max(0, -eventMe(this.cx, this.inf, c, opp(me))) - 0.5 : 1;
        else k = def.scoring ? (scoringNet(this.cx, this.inf, c, me) >= 0 ? 2 : -1) : this.keepValue(c) - 0.9;
        if (k < wv) {
          wv = k;
          worst = c;
        }
      }
      if (worst !== undefined && wv < 0) return worst;
      return hasPass ? 'pass' : worst;
    }
    if (card === 98) {
      // 苏联替美国弃牌：弃美国最好的牌
      let best = cards[0], bv = -Infinity;
      for (const c of cards) {
        const def = CARDS[c];
        const k = def.ops + (def.side === 'US' ? 1.5 : 0) - (def.side === 'USSR' ? 1 : 0) + (def.scoring ? -5 : 0);
        if (k > bv) {
          bv = k;
          best = c;
        }
      }
      return best;
    }
    // 登月特权等：可选弃牌
    const lo = lowest();
    if (hasPass) return lo.c !== undefined && lo.k < 0 ? lo.c : 'pass';
    return lo.c ?? cards[0];
  }

  pickCard(d: Decision): Choice | undefined {
    const me = this.me;
    const cards = d.options.filter((o) => typeof o.v === 'number').map((o) => o.v as number);
    const hasPass = d.options.some((o) => o.v === 'pass');
    const card = d.card;
    const argmax = (f: (c: number) => number) => {
      let best: number | undefined, bv = -Infinity;
      for (const c of cards) {
        const x = f(c);
        if (x > bv) {
          bv = x;
          best = c;
        }
      }
      return { c: best, v: bv };
    };
    if (card === 49) {
      // 交出最高行动点牌（并列时）：优先交出我方事件牌（对手只能用行动点）
      return argmax((c) => (CARDS[c].side === me ? 2 : CARDS[c].side === 'NEUTRAL' ? 0 : -1)).c;
    }
    if (card === 32) {
      return argmax((c) => -eventMe(this.cx, this.inf, c, opp(me)) + CARDS[c].ops * 0.3).c;
    }
    if (card === 85) {
      return argmax((c) => {
        const def = CARDS[c];
        const exec = def.side === 'NEUTRAL' ? me : def.side;
        if (suicidal(this.cx, c, exec, me)) return -1000;
        return eventMe(this.cx, this.inf, c, exec);
      }).c;
    }
    if (card === 43) {
      const r = argmax((c) => this.evalPlay(c).value);
      if (hasPass && r.v < 1) return 'pass';
      return r.c;
    }
    const r = argmax((c) => this.evalPlay(c).value);
    return r.c ?? (hasPass ? 'pass' : undefined);
  }

  choice(d: Decision): Choice | undefined {
    const v = this.v, me = this.me;
    const has = (x: string) => d.options.some((o) => o.v === x);
    switch (d.card) {
      case 16: {
        const add = greedyAdd(this.cx, this.inf, me, 5, (c) => COUNTRIES[c].sub.includes('easternEurope'), 2).value;
        let rem = 0;
        const cands = Object.keys(this.inf).filter((c) => COUNTRIES[c].sub.includes('easternEurope') && infOf(this.inf, c, 'US') > 0);
        const gains = cands.map((c) => addDelta(this.cx, this.inf, c, 'US', -infOf(this.inf, c, 'US'))).sort((a, b) => b - a);
        for (const g of gains.slice(0, 4)) rem += g;
        return rem > add ? 'remove' : 'add';
      }
      case 20: {
        if (v.defcon === 2) return 'boycott';
        return 'go';
      }
      case 24: case 102: {
        const [a, b] = d.options.map((o) => o.v as string);
        return warEV(this.cx, this.inf, me, a, 4, 2) >= warEV(this.cx, this.inf, me, b, 4, 2) ? a : b;
      }
      case 40: {
        if (has('no')) return 'no';
        // 必须解除：选损失最小的
        let best: string | undefined, bv = -Infinity;
        for (const o of d.options) {
          const c = o.v as string;
          if (!COUNTRIES[c]) continue;
          const x = addDelta(this.cx, this.inf, c, me, -2);
          if (x > bv) {
            bv = x;
            best = c;
          }
        }
        return best;
      }
      case 45:
        return v.defcon <= 2 && has('up') ? 'up' : 'none';
      case 46:
        return v.defcon <= 2 ? '3' : '4';
      case 53: {
        const two = addDelta(this.cx, this.inf, 'southAfrica', me, 2);
        let split = addDelta(this.cx, this.inf, 'southAfrica', me, 1);
        let bestAdj = 0;
        for (const a of COUNTRIES.southAfrica.adj) if (COUNTRIES[a]) bestAdj = Math.max(bestAdj, addDelta(this.cx, this.inf, a, me, 2));
        split += bestAdj;
        return split > two ? 'split' : 'two';
      }
      case 67: {
        const label = d.prompt.match(/#(\d+)/);
        const c = label ? Number(label[1]) : NaN;
        if (!CARDS[c]) return 'return';
        const playV = this.evalPlay(c).value;
        const opsV = this.opsV(2);
        return playV > opsV ? 'play' : 'return';
      }
      case 94: {
        let best = REGIONS[0] as string, bv = -Infinity;
        for (const o of d.options) {
          const r = o.v as keyof Ctx['sw'];
          const x = (this.cx.sw[r] ?? 0) * 2 + (this.cx.rw[r] ?? 0);
          if (x > bv) {
            bv = x;
            best = r;
          }
        }
        return best;
      }
      case 100: {
        const after = v.vp + (me === 'US' ? -6 : 6);
        return (me === 'US' ? after > 0 : after < 0) ? 'end' : 'no';
      }
    }
    return safeRandom(v, d, this.rand);
  }
}

// 供测试使用
export const _internal = { safeRandom, ctrl, milopsValue, defconCost };
