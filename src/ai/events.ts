// 事件估值：返回 me 视角的价值（事件由 exec 执行）
import { CARDS, COUNTRIES, type Side } from '../data';
import {
  SCORING_REGION, cloneInf, ctrl, deltaVal, infOf, opp, regionPoints, seaPoints, sideIdx, warEV, arsLeft,
  type Ctx, type Inf,
} from './eval';
import { greedyAdd, greedyRemove, opsValue } from './plan';
import { SPACE } from '../engine/space';

const OIL = ['egypt', 'iran', 'libya', 'saudiArabia', 'iraq', 'gulfStates', 'venezuela'];
const inR = (c: string, r: string) => COUNTRIES[c].region === r || COUNTRIES[c].sub.includes(r as never);

/** 直接改动局面的价值 */
function apply(cx: Ctx, inf: Inf, f: (x: Inf) => void, touched: string[]): number {
  const after = cloneInf(inf);
  f(after);
  return deltaVal(cx, inf, after, touched);
}

const ix = sideIdx;

function forControl(x: Inf, c: string, side: Side) {
  const need = Math.max(COUNTRIES[c].stability + x[c][ix(opp(side))] - x[c][ix(side)], 0);
  x[c][ix(side)] += need;
}

export function scoringNet(cx: Ctx, inf: Inf, card: number, me: Side): number {
  const r = SCORING_REGION[card];
  if (r === 'sea') {
    const p = seaPoints(inf);
    return p[me] - p[opp(me)];
  }
  const p = regionPoints(inf, r, !!cx.v.flags.formosan);
  if (p.ctrlEurope) return p.ctrlEurope === me ? 1000 : -1000;
  let net = p[me] - p[opp(me)];
  // 穿梭外交对苏联的修正（近似：苏联少 1 个战场国 = 少 1 分以上）
  if (cx.v.flags.shuttle && (r === 'asia' || r === 'middleEast')) net += me === 'US' ? 2 : -2;
  return net;
}

export function spaceValue(cx: Ctx, side: Side, steps = 1): number {
  const v = cx.v;
  let to = v.space[side];
  let gain = 0;
  for (let i = 0; i < steps && to < 8; i++) {
    to++;
    const box = SPACE[to];
    gain = v.space[opp(side)] >= to ? box.vp[1] : box.vp[0];
  }
  if (to === v.space[side]) return 0;
  const perk: Record<number, number> = { 2: 1.0, 4: 1.2, 6: 0.8, 8: 2.0 };
  const pv = v.space[opp(side)] < to ? perk[to] ?? 0 : 0;
  // 也阻止对手先到
  return gain + pv + 0.3;
}

const DEGRADE = new Set([4, 50, 89]);

/** 事件会让行动方在 DEFCON 2 时自杀吗 */
export function suicidal(cx: Ctx, card: number, exec: Side, phasing: Side): boolean {
  const v = cx.v;
  if (v.defcon !== 2) return false;
  if (DEGRADE.has(card)) return true;
  if (card === 20 && exec === phasing) return true; // 对手抵制奥运会
  return false;
}

export function eventMe(cx: Ctx, inf: Inf, card: number, exec: Side): number {
  const v = cx.v;
  const me = cx.me;
  const sg = exec === me ? 1 : -1;
  const vp = (n: number) => sg * n;
  const them = opp(exec);
  const ars = arsLeft(v, them);
  const myArs = arsLeft(v, exec);
  const ops = (n: number, modes?: string[]) => {
    // 事件给的行动点（exec 使用）
    const r = opsValue({ ...cx }, inf, exec, n, { arsLeft: myArs, modes });
    return r.value;
  };
  const f = v.flags;
  switch (card) {
    case 1: case 2: case 3: case 37: case 38: case 79: case 81:
      return scoringNet(cx, inf, card, me);
    case 4: return vp(5 - (v.defcon - 1)) - 0.3 * sg;
    case 5: return vp(1.3);
    case 7: return f.ironLady ? 0 : greedyRemove(cx, inf, exec, 'US', 3, (c) => inR(c, 'westernEurope'), 2).value;
    case 8: return apply(cx, inf, (x) => { x.cuba[0] = 0; forControl(x, 'cuba', 'USSR'); }, ['cuba']);
    case 9: return apply(cx, inf, (x) => { x.vietnam[1] += 2; }, ['vietnam']) + vp(0.6);
    case 10: return Math.min(apply(cx, inf, (x) => { x.westGermany[0] = 0; }, ['westGermany']) * sg, 2.0) * sg;
    case 11: return !inf.southKorea ? 0 : warEV(cx, inf, exec, 'southKorea', 4, 2) + vp(0.3);
    case 12: return apply(cx, inf, (x) => { x.romania[0] = 0; forControl(x, 'romania', 'USSR'); }, ['romania']);
    case 13: return f.campDavid ? 0 : warEV(cx, inf, exec, 'israel', 4, 2, true) + vp(0.3);
    case 14: return greedyAdd(cx, inf, exec, 4, (c) => inR(c, 'easternEurope') && ctrl(inf, c) !== 'US', 1, true).value;
    case 15: return apply(cx, inf, (x) => { x.egypt[1] += 2; x.egypt[0] -= Math.ceil(x.egypt[0] / 2); }, ['egypt']);
    case 16: {
      const a = greedyAdd(cx, inf, exec, 5, (c) => inR(c, 'easternEurope'), 2).value;
      const b = greedyRemove(cx, inf, exec, 'US', 4, (c) => inR(c, 'easternEurope'), 1, (c, cur) => cur[c][0], true).value;
      return (sg > 0 ? Math.max(a, b) : Math.min(a, b)) - vp(0.4);
    }
    case 17: return apply(cx, inf, (x) => { x.france[0] = Math.max(0, x.france[0] - 2); x.france[1] += 1; }, ['france']) + vp(f.nato ? 0.6 : 0.2);
    case 18: return vp(spaceValue(cx, exec));
    case 19: {
      let best = 0;
      for (const c of Object.keys(inf)) if (inR(c, 'europe') && !ctrl(inf, c) && infOf(inf, c, 'USSR') > 0) {
        const d = apply(cx, inf, (x) => { x[c][1] = 0; }, [c]) * sg;
        if (d > best) best = d;
      }
      return best * sg;
    }
    case 20: return vp(1.0);
    case 21: return f.warsawPact || f.marshall ? vp(2.0) : 0;
    case 22: {
      let best = 0;
      for (const c of ['yugoslavia', 'romania', 'bulgaria', 'hungary', 'czechoslovakia']) {
        const d = apply(cx, inf, (x) => { x[c][0] = Math.max(x[c][0], x[c][1]); }, [c]) * sg;
        if (d > best) best = d;
      }
      return best * sg;
    }
    case 23: return greedyAdd(cx, inf, exec, 7, (c) => inR(c, 'westernEurope') && ctrl(inf, c) !== 'USSR', 1, true).value + vp(0.3);
    case 24: return sg * Math.max(sg * warEV(cx, inf, exec, 'pakistan', 4, 2), sg * warEV(cx, inf, exec, 'india', 4, 2)) + vp(0.3);
    case 25: case 51: return vp(0.35 * myArs);
    case 26: return vp(0.8) + ops(1);
    case 27: return apply(cx, inf, (x) => forControl(x, 'japan', 'US'), ['japan']) + vp(0.8);
    case 28: return greedyRemove(cx, inf, exec, 'US', 4, (c) => c === 'france' || c === 'uk' || c === 'israel', 2).value;
    case 29: return greedyRemove(cx, inf, exec, 'USSR', 3, (c) => inR(c, 'easternEurope'), 1, () => (v.turn >= 8 ? 2 : 1), true).value;
    case 30: return greedyAdd(cx, inf, exec, 4, (c) => inR(c, 'africa') || inR(c, 'southeastAsia'), 1, true).value;
    case 31: return vp(0.4 * ars + 0.3);
    case 32: return 0;
    case 33: return vp(1.8);
    case 34: return vp(v.defcon - 2 + 0.3);
    case 35: return vp(0.5);
    case 36: {
      let best = 0;
      for (const c of Object.keys(inf)) {
        if (COUNTRIES[c].stability > 2 || infOf(inf, c, them) <= 0) continue;
        const d = warEV(cx, inf, exec, c, 3, 1) * sg;
        if (d > best) best = d;
      }
      return best * sg + vp(0.4);
    }
    case 39: {
      const m = v.milops;
      if (m[exec] > m[them]) return vp(m[exec] >= v.defcon ? 3 : 1);
      return 0;
    }
    case 40: return vp(1.2);
    case 41: return vp(0.3);
    case 42: case 44: return vp(3.0);
    case 43: return vp(1.0);
    case 45: return vp(0.6);
    case 46: return vp(1.2);
    case 47: return greedyAdd(cx, inf, exec, 1, (c) => inR(c, 'centralAmerica') || inR(c, 'southAmerica')).value * 2 + vp(0.8);
    case 48: {
      const n = (s: Side) => Object.keys(inf).filter((c) => COUNTRIES[c].bg && ctrl(inf, c) === s).length;
      return n('US') > n('USSR') ? vp(2) : 0;
    }
    case 49: return vp(1.0);
    case 50: return vp(2.6) - vp(0.3);
    case 52: return apply(cx, inf, (x) => { x.angola[1] += 2; x.seAfricanStates[1] += 2; }, ['angola', 'seAfricanStates']);
    case 53: return apply(cx, inf, (x) => { x.southAfrica[1] += 2; }, ['southAfrica']) + vp(0.4);
    case 54: return apply(cx, inf, (x) => { x.chile[1] += 2; }, ['chile']);
    case 55: return f.tearDownWall ? 0 : vp(1) + apply(cx, inf, (x) => { x.westGermany[1] += 1; }, ['westGermany']) + vp(f.nato ? 0.6 : 0.2);
    case 56: return f.awacs ? 0 : greedyRemove(cx, inf, exec, 'US', 2, (c) => ['sudan', 'iran', 'iraq', 'egypt', 'libya', 'saudiArabia', 'syria', 'jordan'].includes(c), 1, (c, cur) => cur[c][0], true).value;
    case 57: return ops(4) + vp(0.2);
    case 58: return vp(v.china.holder === 'US' ? 2.5 : 1);
    case 59: return f.evilEmpire ? 0 : vp(1.2);
    case 60: return vp(1.1);
    case 61: return f.northSeaOil ? 0 : vp(['egypt', 'iran', 'libya', 'saudiArabia', 'iraq', 'gulfStates', 'venezuela'].filter((c) => ctrl(inf, c) === 'USSR').length);
    case 62: return vp(0.5) + ops(1);
    case 63: return greedyAdd(cx, inf, exec, 4, (c) => inR(c, 'africa') || inR(c, 'southeastAsia'), 1, true).value;
    case 64: return apply(cx, inf, (x) => { x.panama[0]++; x.costaRica[0]++; x.venezuela[0]++; }, ['panama', 'costaRica', 'venezuela']);
    case 65: return vp(1) + apply(cx, inf, (x) => { x.israel[0]++; x.jordan[0]++; x.egypt[0]++; }, ['israel', 'jordan', 'egypt']);
    case 66: return greedyAdd(cx, inf, exec, 3, (c) => inf[c][0] === 0 && inf[c][1] === 0, 1, true).value;
    case 67: return vp(1.0) + ops(2) * 0.8;
    case 68: return apply(cx, inf, (x) => { x.poland[1] = Math.max(0, x.poland[1] - 2); x.poland[0]++; }, ['poland']) + vp(0.3);
    case 69: return vp(0.5);
    case 70: return greedyAdd(cx, inf, exec, 2, (c) => inR(c, 'centralAmerica') || inR(c, 'southAmerica')).value;
    case 71: return vp(v.china.holder === 'USSR' ? 2.2 : 2);
    case 72: return apply(cx, inf, (x) => { x.egypt[1] = 0; x.egypt[0]++; }, ['egypt']);
    case 73: return vp(1.2);
    case 74: return greedyRemove(cx, inf, exec, 'USSR', 4, (c) => COUNTRIES[c].region !== 'europe', 2).value;
    case 75: return greedyAdd(cx, inf, exec, 3, (c) => inR(c, 'centralAmerica'), 2).value;
    case 76: return v.china.holder === 'USSR' ? vp(2.5) : greedyAdd(cx, inf, exec, 4, (c) => inR(c, 'asia'), 2).value;
    case 77: return vp(1.2);
    case 78: return vp(Object.keys(inf).filter((c) => COUNTRIES[c].bg && (inR(c, 'centralAmerica') || inR(c, 'southAmerica')) && ctrl(inf, c) === 'US').length);
    case 80: return v.space[exec] < v.space[them] ? vp(spaceValue(cx, exec, 2)) : 0;
    case 82: return apply(cx, inf, (x) => { x.iran[0] = 0; x.iran[1] += 2; }, ['iran']);
    case 83: return vp(1) + apply(cx, inf, (x) => { x.argentina[1]++; x.uk[1] = 0; }, ['argentina', 'uk']) + vp(0.3);
    case 84: return vp(Math.floor(inf.libya[1] / 2));
    case 85: return v.space.US > v.space.USSR ? vp(1.8) : 0;
    case 86: return vp(1.4);
    case 87: return greedyAdd(cx, inf, exec, v.vp < 0 ? 6 : 4, (c) => inR(c, 'europe'), 2).value - vp(0.4);
    case 88: {
      const a = apply(cx, inf, (x) => { x.lebanon[0] = 0; }, ['lebanon']);
      return a + greedyRemove(cx, inf, exec, 'US', 2, (c) => inR(c, 'middleEast')).value;
    }
    case 89: return vp(2) + (inf.southKorea && ctrl(inf, 'southKorea') === 'US' ? ops(4, ['influence', 'realign']) : 0);
    case 90: return vp(2) + (f.reformer ? ops(4, ['influence', 'realign']) : 0) + vp(0.2);
    case 91: return apply(cx, inf, (x) => { x.nicaragua[0] = 0; }, ['nicaragua']) + vp(0.6);
    case 92: return vp(them === 'US' && f.iranianHostage ? 1.8 : 1.0);
    case 93: return vp(0.3);
    case 94: return vp(0.8);
    case 95: return vp(1.4);
    case 96: return apply(cx, inf, (x) => { x.eastGermany[0] += 3; }, ['eastGermany']) + vp(f.willyBrandt ? 1.0 : 0.6);
    case 97: return vp(1 + (f.flowerPower ? 1.2 : 0));
    case 98: return vp(2.0);
    case 99: return vp(1) + greedyRemove(cx, inf, exec, 'US', 3, (c) => inR(c, 'westernEurope'), 1, () => 1, true).value;
    case 100: {
      if (v.defcon !== 2) return 0;
      const after = v.vp + (exec === 'US' ? -6 : 6);
      const win = exec === 'US' ? after > 0 : after < 0;
      return win ? vp(500) : 0;
    }
    case 101: return f.johnPaul ? apply(cx, inf, (x) => { x.poland[0] += 3; }, ['poland']) : 0;
    case 102: return sg * Math.max(sg * warEV(cx, inf, exec, 'iraq', 4, 2), sg * warEV(cx, inf, exec, 'iran', 4, 2)) + vp(0.3);
    case 103: return 0;
    case 104: return v.turn <= 7 ? vp(0.6) : 0;
    case 105: {
      if (ctrl(inf, 'uk') !== 'US') return 0;
      if (f.nato) return vp(2) + greedyAdd(cx, inf, exec, 1, (c) => inR(c, 'westernEurope')).value * 2;
      return greedyAdd(cx, inf, exec, 1, (c) => COUNTRIES.uk.adj.includes(c)).value;
    }
    case 106: return vp(0.8);
    case 107: return vp(1.4);
    case 108: return Object.keys(inf).some((c) => inR(c, 'middleEast') && ctrl(inf, c) === 'US') ? vp(0.7) : 0;
    case 109: return vp(0.5);
    case 110: return apply(cx, inf, (x) => { x.saudiArabia[0] += 2; }, ['saudiArabia']) + vp(0.5);
    case 111: return (inf.japan ? apply(cx, inf, (x) => { x.japan[0] = Math.max(0, x.japan[0] - 1); }, ['japan']) : 0) + vp(f.usJapan ? 1.5 : 0.3);
    case 112: return inf.china ? apply(cx, inf, (x) => { x.china[1] += 2 + (ctrl(inf, 'mongolia') === 'USSR' ? 1 : 0); }, ['china']) : 0;
    case 113: return apply(cx, inf, (x) => { for (const c of ['japan', 'australia', 'philippines']) if (x[c]) x[c][0] += 1; }, ['japan', 'australia', 'philippines']);
    case 114: return greedyRemove(cx, inf, exec, them, 3, () => true, 1).value;
    // ---- 不死不休专属牌 ----
    case 115: return greedyAdd(cx, inf, exec, 4, (c) => inR(c, 'easternEurope'), 2).value;
    case 116: case 132: return greedyAdd(cx, inf, exec, 3, (c) => inR(c, 'africa'), 1).value;
    case 117: return greedyAdd(cx, inf, exec, ctrl(inf, 'cuba') === exec ? 4 : 3, (c) => inR(c, 'centralAmerica'), 2).value;
    case 118: {
      const n = Math.min(4, OIL.filter((c) => inf[c] && ctrl(inf, c) === exec).length);
      return n ? greedyAdd(cx, inf, exec, n, (c) => inR(c, 'europe')).value : 0;
    }
    case 119: case 130: return v.space[exec] >= 8 ? vp(2.5) : vp(spaceValue(cx, exec));
    case 120: return ops(4, ['influence']);
    case 121: case 133: return vp(1.2);
    case 122: return greedyRemove(cx, inf, exec, them, 3, (c) => inR(c, 'southAmerica'), 2).value;
    case 123: return vp(1.0);
    case 124: return apply(cx, inf, (x) => { for (const c of ['mongolia', 'china', 'northKorea', 'southKorea']) if (x[c]) x[c][exec === 'US' ? 0 : 1] += 1; }, ['mongolia', 'china', 'northKorea', 'southKorea'].filter((c) => inf[c]));
    case 125: return greedyAdd(cx, inf, exec, 2, (c) => inR(c, 'westernEurope'), 1).value + vp(0.3);
    case 126: return greedyAdd(cx, inf, exec, 5, (c) => inR(c, 'westernEurope'), 2).value;
    case 127: return greedyAdd(cx, inf, exec, 3, (c) => inR(c, 'centralAmerica'), 1).value;
    case 128: return greedyAdd(cx, inf, exec, 3, (c) => inR(c, 'southeastAsia'), 1).value;
    case 129: return greedyRemove(cx, inf, exec, them, 3, (c) => inR(c, 'easternEurope'), 1).value;
    case 131: return greedyAdd(cx, inf, exec, 3, (c) => inR(c, 'middleEast'), 1).value;
    case 134: return greedyAdd(cx, inf, exec, 2, (c) => COUNTRIES[c].adj.includes(exec === 'US' ? 'ussr' : 'usa'), 2).value;
    case 135: return greedyRemove(cx, inf, exec, them, 4, (c) => OIL.includes(c), 1).value;
    case 136: return ops(4, ['coup', 'realign']);
    case 137: return ops(3, ['influence']) - (v.defcon > 2 ? vp(0.4) : 0);
    case 138: return greedyRemove(cx, inf, exec, them, 2, (c) => inR(c, 'africa') || inR(c, 'southAmerica')).value;
    case 139: return greedyAdd(cx, inf, exec, 2, (c) => inR(c, 'europe'), 1).value;
    case 140: return v.china.holder !== exec ? vp(2.0) : greedyAdd(cx, inf, exec, 2, (c) => ['uk', 'france', 'china'].includes(c)).value;
    case 141: return ops(3, ['realign']);
    case 142: return vp(1.5);
    case 143: return vp(0.8);
    case 144: return greedyAdd(cx, inf, exec, 3, (c) => OIL.includes(c), 1).value;
    case 145: return vp(v.defcon <= 3 ? 1.2 : 0.2);
    case 146: return vp(0.7);
    default: return 0;
  }
}

export function isScoring(c: number) {
  return !!CARDS[c]?.scoring;
}

