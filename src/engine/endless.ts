// 不死不休（第 11 回合起）的新机制：区域红利、区域压制、乌云压境、轨道打击、石油经济、铁幕纵深。
// 每个触发都写一条带过场（scene）的日志，界面逐条点击展开，不会一闪而过。
import { COUNTRIES, COUNTRY_LIST, REGIONS, REGION_ZH, koreaKeep, setWorld, worldOf, type RegionId } from '../data';
import type { Game, Gen } from './game';
import { controller, scoreRegion } from './scoring';
import { SIDE_ZH, opp, type GameState, type Scene, type Side } from './types';
import { countryName } from './util';

/** 石油国（同「石油输出国组织」） */
export const OIL_COUNTRIES = ['egypt', 'iran', 'libya', 'saudiArabia', 'iraq', 'gulfStates', 'venezuela'];

/** 从这一回合起 DEFCON 失效：不再锁地区，降到 1 改为安理会制裁 */
export const DEFCON_OFF_TURN = 25;
export const defconOff = (s: { options: { endless?: boolean }; turn: number }) => !!s.options.endless && s.turn >= DEFCON_OFF_TURN;

/** 轨道打击：太空竞赛到顶后的额外一格 */
export const ORBIT = { ops: 3, roll: 4 };

export type RegionLevel = 'none' | 'presence' | 'domination' | 'control';

export function regionLevels(s: GameState, side: Side): Record<RegionId, RegionLevel> {
  const out = {} as Record<RegionId, RegionLevel>;
  for (const r of REGIONS) out[r] = scoreRegion(s, r, { formosan: s.flags.formosan })[side].level;
  return out;
}

/** 支配或控制的洲数 */
export function strongRegions(s: GameState, side: Side): number {
  return Object.values(regionLevels(s, side)).filter((l) => l === 'domination' || l === 'control').length;
}

/** 区域红利：支配 1 点、控制 2 点 */
export function regionBonus(s: GameState, side: Side): { total: number; parts: [RegionId, RegionLevel, number][] } {
  const parts: [RegionId, RegionLevel, number][] = [];
  for (const [r, l] of Object.entries(regionLevels(s, side)) as [RegionId, RegionLevel][]) {
    if (l === 'domination') parts.push([r, l, 1]);
    if (l === 'control') parts.push([r, l, 2]);
  }
  return { total: parts.reduce((a, p) => a + p[2], 0), parts };
}

/** 乌云：side 控制的、与对手本土相邻的国家 */
export function cloudCountries(s: GameState, side: Side): string[] {
  const home = side === 'US' ? 'ussr' : 'usa';
  return COUNTRY_LIST.filter((c) => c.adj.includes(home) && s.inf[c.id] && controller(s, c.id) === side).map((c) => c.id);
}

/** 没有被任何一方控制的洲（轨道打击的目标范围） */
export function openRegions(s: GameState): RegionId[] {
  return REGIONS.filter((r) => {
    const sc = scoreRegion(s, r, { formosan: s.flags.formosan });
    return sc.US.level !== 'control' && sc.USSR.level !== 'control';
  });
}

const LV_ZH: Record<RegionLevel, string> = { none: '无', presence: '存在', domination: '支配', control: '控制' };
const names = (ids: string[]) => ids.map(countryName).join('、');


/**
 * 每回合第一张用行动点打出的牌：乌云压境（对手占着我方本土邻国，每国 -1）。
 * 返回行动点的增减；削减超出这张牌点数的部分，由乌云的主人放置影响力。
 */
export function* firstOpsCard(g: Game, side: Side, eff: number): Gen<number> {
  const f = g.s.flags;
  if ((f.firstOps ?? []).includes(side)) return 0;
  f.firstOps = [...(f.firstOps ?? []), side];
  const enemy = opp(side);
  const clouds = cloudCountries(g.s, enemy);
  if (!clouds.length) return 0;
  const n = clouds.length;
  const cut = Math.min(n, eff);
  const over = n - cut;
  g.log(`乌云压境：${SIDE_ZH[enemy]}控制${SIDE_ZH[side]}本土邻国 ${names(clouds)}，这张牌 -${cut} 行动点${over ? `，差额 ${over} 点由${SIDE_ZH[enemy]}放置影响力` : ''}`, {
    side: enemy,
    scene: {
      title: '乌云压境', side: enemy, art: 'cloud',
      sub: `${SIDE_ZH[enemy]}占着${SIDE_ZH[side]}家门口的国家，${SIDE_ZH[side]}每回合第一张用行动点打出的牌，每个这样的国家 -1 行动点。`,
      steps: [
        { text: `${SIDE_ZH[enemy]}控制的${SIDE_ZH[side]}本土邻国：${names(clouds)}（共 ${n} 个）。`, country: clouds[0] },
        { text: `${SIDE_ZH[side]}这张牌 ${eff} 点 → ${eff - cut} 点。` },
        ...(over ? [{ text: `还差 ${over} 点扣不下来：改由${SIDE_ZH[enemy]}在全图任意国家放置 ${over} 点影响力。` }] : []),
      ],
    },
  });
  if (over) yield* g.placeInfluence(enemy, 0, over, () => true, { prompt: `乌云压境：差额 ${over} 点，在全图任意国家放置影响力` });
  return -cut;
}

/** 胜利所需的关键国：全部战场国 + 对手本土的邻国 */
export function keyCountries(side: Side): string[] {
  const home = side === 'US' ? 'ussr' : 'usa';
  return COUNTRY_LIST.filter((c) => c.bg || c.adj.includes(home)).map((c) => c.id);
}

/** 关键国的控制进度 */
export function keyProgress(s: GameState, side: Side): { have: number; total: number; missing: string[] } {
  const all = keyCountries(side);
  const missing = all.filter((c) => !s.inf[c] || controller(s, c) !== side);
  return { have: all.length - missing.length, total: all.length, missing };
}

/** 轨道打击：空间站之后每次太空竞赛成功，在没有被任何一方控制的洲里免费政变一次（不降 DEFCON） */
export function* orbitalStrike(g: Game, side: Side): Gen {
  const regions = openRegions(g.s);
  const ops = strongRegions(g.s, side) + 2;
  const targets = COUNTRY_LIST.filter((c) => regions.includes(c.region) && g.canTarget(side, c.id, 'coup', { free: true })).map((c) => c.id);
  g.log(`轨道打击：${SIDE_ZH[side]}可在${regions.map((r) => REGION_ZH[r]).join('、') || '（无）'}免费政变，行动点 ${ops}`, {
    side,
    scene: {
      title: '轨道打击', side, art: 'orbit',
      sub: '空间站之后，太空就是战场。每次太空竞赛成功，可以在一个没有被任何一方控制的洲里免费政变一次：不降 DEFCON、不计军事行动。',
      steps: [
        { text: `政变行动点 = ${SIDE_ZH[side]}支配 / 控制的洲数 ${ops - 2} + 2 = ${ops}。` },
        { text: targets.length ? `可选目标：${regions.map((r) => REGION_ZH[r]).join('、')}里有对手影响力的国家。` : '没有可以打击的目标，这次轨道打击落空。' },
      ],
    },
  });
  if (!targets.length) return;
  const c = yield* g.askCountry(side, 'coupTarget', `轨道打击：选择政变目标（${ops} 点）`, targets);
  yield* g.coup(side, c, ops, { free: true, orbital: true });
}

/** 铁幕纵深：美国对苏联控制的东欧国家政变 -1 */
/** 铁幕纵深：美国对苏联控制的东欧国家、苏联对美国控制的西欧国家政变 -1 */
export function ironDepth(g: Game, side: Side, c: string): number {
  if (!g.endlessOn) return 0;
  const sub = side === 'US' ? 'easternEurope' : 'westernEurope';
  return COUNTRIES[c].sub.includes(sub) && g.controls(opp(side), c) ? -1 : 0;
}

/** 欧洲经济心脏：德国的邻国 */
export const GERMANY_NEIGHBORS = ['denmark', 'poland', 'czechoslovakia', 'austria', 'france', 'benelux'];

/**
 * 回合开始的合并检查：中国统一、朝鲜半岛统一、两德合并。返回说明文字（地图变化玩家自己看）。
 */
export function unifyCheck(g: Game): string[] {
  const s = g.s, f = s.flags;
  const out: string[] = [];
  if (!f.unifyChina && s.inf.taiwan && s.inf.china) {
    const x = controller(s, 'taiwan');
    if (x && controller(s, 'china') === x) {
      f.unifyChina = x;
      delete s.inf.taiwan;
      s.inf.china = x === 'US' ? [4, 0] : [0, 4];
      g.purgeCard(35);
      f.formosan = false;
      out.push(`中国统一：${SIDE_ZH[x]}同时控制中国和台湾，台湾并入中国（非战场国，${SIDE_ZH[x]} 4 点、${SIDE_ZH[opp(x)]}清零）；之后${SIDE_ZH[x]}每回合开始 +2 点。`);
    }
  }
  if (!f.unifyKorea && s.inf.northKorea && s.inf.southKorea) {
    const x = controller(s, 'northKorea');
    if (x && controller(s, 'southKorea') === x) {
      const keep = koreaKeep(x), drop = keep === 'northKorea' ? 'southKorea' : 'northKorea';
      f.unifyKorea = x;
      delete s.inf[drop];
      s.inf[keep] = x === 'US' ? [3, 0] : [0, 3];
      out.push(`朝鲜半岛统一：${SIDE_ZH[x]}同时控制朝鲜和韩国，合并为${COUNTRIES[keep].zh}（${SIDE_ZH[x]} 3 点、${SIDE_ZH[opp(x)]}清零）；之后每回合开始向日本发射导弹。`);
    }
  }
  if (!f.unifyGermany && s.inf.westGermany && s.inf.eastGermany) {
    const x = controller(s, 'westGermany');
    if (x && controller(s, 'eastGermany') === x) {
      const n = 4;
      f.unifyGermany = x;
      delete s.inf.westGermany;
      delete s.inf.eastGermany;
      s.inf.germany = x === 'US' ? [n, 0] : [0, n];
      out.push(`两德合并：${SIDE_ZH[x]}同时控制东德和西德，合并为德国（战场国，${SIDE_ZH[x]} ${n} 点、${SIDE_ZH[opp(x)]}清零）；控制德国的一方拥有「欧洲经济心脏」。`);
    }
  }
  if (out.length) setWorld(worldOf(f));
  return out;
}

/** 一次合并放置里的一项来源：n 点，可放的国家（不填为全图任意） */
interface Grant {
  label: string;
  n: number;
  ok?: (c: string) => boolean;
  where?: string;
}

/** 把几项来源的影响力合成一次放置（全图任意）：每点优先记到限制最严的来源上 */
function* placeGrants(g: Game, side: Side, grants: Grant[], title: string): Gen {
  const left = grants.map((x) => x.n);
  const total = left.reduce((a, b) => a + b, 0);
  if (!total) return;
  const steps: [string, number][] = [];
  const placed: Record<string, number> = {};
  const src = grants.map((x) => `${x.label} ${x.n}${x.where ? `（${x.where}）` : ''}`).join('，');
  for (let i = 0; i < total; i++) {
    const usable = (c: string) => grants.some((x, k) => left[k] > 0 && (!x.ok || x.ok(c)));
    const ids = COUNTRY_LIST.map((c) => c.id).filter(usable);
    if (!ids.length) break;
    const c = yield* g.askCountry(side, 'placeEvent', `${title}：${src}（剩余 ${total - i}）`, ids, { ops: { total, spent: i } });
    let k = grants.findIndex((x, j) => left[j] > 0 && x.ok && x.ok(c));
    if (k < 0) k = grants.findIndex((x, j) => left[j] > 0 && !x.ok);
    left[k]--;
    g.addInf(c, side, 1);
    placed[c] = (placed[c] ?? 0) + 1;
    steps.push([c, 1]);
  }
  const list = Object.entries(placed).map(([c, n]) => `${countryName(c)} +${n}`).join('，');
  if (list) g.log(`${SIDE_ZH[side]}：${list}`, { side, place: { side, steps } });
}

/**
 * 回合开始结算（补牌之后、第一个行动轮之前），一次结算、一段说明：
 * 1. 固定调整：合并检查（中国 / 朝鲜半岛 / 德国）、半岛导弹、区域压制、太空特权；
 * 2. 回合红利（行动点，可放影响力或调整阵营，不能政变）：石油经济、中国统一、欧洲经济心脏。
 */
export function* turnStart(g: Game): Gen {
  const s = g.s, f = s.flags;
  const lines: { text: string; country?: string }[] = [];
  const anims: NonNullable<Scene['anims']> = [];
  const merged = unifyCheck(g);
  for (const t of merged) lines.push({ text: t });
  // 半岛导弹
  const k = f.unifyKorea;
  if (k) {
    const enemy = opp(k), name = COUNTRIES[koreaKeep(k)].zh;
    if (g.inf('japan', enemy)) {
      g.removeInf('japan', enemy, 1);
      anims.push({ kind: 'missile', from: koreaKeep(k), to: 'japan' });
      lines.push({ text: `${name}向日本发射导弹：日本${SIDE_ZH[enemy]}影响力 -1。`, country: 'japan' });
    } else lines.push({ text: `${name}向日本发射导弹：日本没有${SIDE_ZH[enemy]}影响力，没有效果。`, country: 'japan' });
  }
  // 区域压制
  for (const side of ['USSR', 'US'] as Side[]) {
    const enemy = opp(side);
    const lv = regionLevels(s, side);
    for (const r of REGIONS) {
      if (lv[r] !== 'control') continue;
      const hit = COUNTRY_LIST.filter((c) => c.region === r && g.inf(c.id, enemy) > 0).map((c) => c.id);
      if (!hit.length) continue;
      for (const c of hit) g.removeInf(c, enemy, 1);
      lines.push({ text: `区域压制：${SIDE_ZH[side]}控制${REGION_ZH[r]}，${names(hit)}的${SIDE_ZH[enemy]}影响力各 -1。`, country: hit[0] });
    }
  }
  // 太空特权：没有头条，载人环绕地球改为看对手手牌
  for (const side of ['USSR', 'US'] as Side[]) {
    if (!g.hasPerk(side, 4)) continue;
    g.revealHand(opp(side), '载人环绕地球特权');
    lines.push({ text: `载人环绕地球特权：${SIDE_ZH[opp(side)]}向${SIDE_ZH[side]}公开手牌。` });
  }
  // 回合红利
  const bonus: Record<Side, string[]> = { US: [], USSR: [] };
  const pts: Record<Side, number> = { US: 0, USSR: 0 };
  for (const side of ['USSR', 'US'] as Side[]) {
    const held = OIL_COUNTRIES.filter((c) => s.inf[c] && g.controls(side, c));
    if (held.length) {
      pts[side] += held.length;
      bonus[side].push(`石油经济 +${held.length}（${names(held)}）`);
      if (!anims.some((a) => a.kind === 'tanker') && s.inf.china) anims.push({ kind: 'tanker', from: s.inf.gulfStates ? 'gulfStates' : held[0], to: 'china' });
    }
    if (f.unifyChina === side) {
      pts[side] += 2;
      bonus[side].push('中国统一 +2');
    }
    if (s.inf.germany && g.controls(side, 'germany')) {
      const open = GERMANY_NEIGHBORS.filter((c) => s.inf[c] && !g.controls(side, c));
      if (open.length) {
        pts[side] += open.length;
        bonus[side].push(`欧洲经济心脏 +${open.length}（${names(open)}尚未控制）`);
        anims.push({ kind: 'train', from: 'germany', to: 'france' });
      }
    }
    if (pts[side]) lines.push({ text: `${SIDE_ZH[side]}回合红利 ${pts[side]} 点行动点：${bonus[side].join('，')}。` });
  }
  if (!lines.length) return;
  g.log(`第 ${s.turn} 回合开始结算：${lines.map((x) => x.text).join(' ')}`, {
    kind: 'turn',
    scene: {
      title: `第 ${s.turn} 回合开始结算`, art: 'squeeze', flat: true, world: merged.length > 0, anims,
      sub: '先结算固定调整，再发回合红利。回合红利是行动点：可以放影响力（全图任意国家）或调整阵营，不能政变。',
      steps: lines,
    },
  });
  for (const side of ['USSR', 'US'] as Side[]) {
    if (!pts[side]) continue;
    g.log(`${SIDE_ZH[side]}使用回合红利 ${pts[side]} 点行动点（${bonus[side].join('，')}）`, { side });
    yield* g.opsPlay(side, pts[side], { modes: ['influence', 'realign'], raw: true, anywhere: true, why: '回合红利', settlement: true });
  }
}

/**
 * 区域红利在某个国家的用法：己方支配 / 控制的洲 → 削弱敌方（不限邻接，须有敌方影响力）；
 * 其他洲 → 增加己方影响力（须本身有己方影响力或与之相邻）。
 */
export function bonusUse(s: GameState, side: Side, c: string, lv: Record<RegionId, RegionLevel>, snap: Set<string>): 'remove' | 'add' | null {
  const d = COUNTRIES[c];
  if (!s.inf[c]) return null;
  const strong = lv[d.region] === 'domination' || lv[d.region] === 'control';
  if (strong) return s.inf[c][side === 'US' ? 1 : 0] > 0 ? 'remove' : null;
  const home = side === 'US' ? 'usa' : 'ussr';
  return snap.has(c) || d.adj.some((a) => a === home || snap.has(a)) ? 'add' : null;
}

/**
 * 行动轮开始结算（行动方行动之前）：区域红利（只能摆放，不能政变、调整），
 * 以及双方持续事件换来的影响力（全图任意）。一次结算、一段说明。
 */
export function* arStart(g: Game, side: Side): Gen {
  const s = g.s;
  const { parts, total } = regionBonus(s, side);
  const pend: Record<Side, { n: number; why: string } | null> = { US: g.takePendingInf('US'), USSR: g.takePendingInf('USSR') };
  const lines: { text: string }[] = [];
  if (total) {
    lines.push({ text: `${SIDE_ZH[side]}区域红利 ${total} 点（${parts.map(([r, l, n]) => `${l === 'control' ? '控制' : '支配'}${REGION_ZH[r]} +${n}`).join('、')}）：在己方支配 / 控制的洲里每点移除 1 点敌方影响力（不限邻接）；在其他洲每点增加 1 点己方影响力（须与己方影响力相邻）。` });
  }
  for (const x of [side, opp(side)] as Side[]) {
    const p = pend[x];
    if (p) lines.push({ text: `${SIDE_ZH[x]}持续事件换来的影响力 ${p.n} 点（${p.why}）：全图任意放置。` });
  }
  if (!lines.length) return;
  g.log(`行动轮开始结算：${lines.map((x) => x.text).join(' ')}`, {
    side,
    scene: { title: `${SIDE_ZH[side]}行动轮开始结算`, side, art: 'bonus', flat: true, minor: true, steps: lines },
  });
  if (total) yield* regionBonusPlace(g, side, total, parts);
  for (const x of [side, opp(side)] as Side[]) {
    const p = pend[x];
    if (p) yield* placeGrants(g, x, [{ label: `持续事件（${p.why}）`, n: p.n }], `${SIDE_ZH[x]}持续事件换来的影响力`);
  }
}

/** 区域红利的逐点使用 */
function* regionBonusPlace(g: Game, side: Side, total: number, parts: [RegionId, RegionLevel, number][]): Gen {
  const s = g.s;
  const enemy = opp(side);
  const lv = regionLevels(s, side);
  const snap = new Set(COUNTRY_LIST.filter((c) => s.inf[c.id] && g.inf(c.id, side) > 0).map((c) => c.id));
  const src = parts.map(([r, l, n]) => `${l === 'control' ? '控制' : '支配'}${REGION_ZH[r]} +${n}`).join('、');
  const added: Record<string, number> = {};
  const removed: Record<string, number> = {};
  const steps: [string, number][] = [];
  for (let i = 0; i < total; i++) {
    const ids = COUNTRY_LIST.map((c) => c.id).filter((c) => bonusUse(s, side, c, lv, snap));
    if (!ids.length) break;
    const c = yield* g.askCountry(side, 'placeEvent', `区域红利（${src}）：己方支配 / 控制的洲里点国家 = 移除敌方 1 点，其他洲 = 增加己方 1 点（剩余 ${total - i}）`, ids, { ops: { total, spent: i } });
    if (bonusUse(s, side, c, lv, snap) === 'remove') {
      g.removeInf(c, enemy, 1);
      removed[c] = (removed[c] ?? 0) + 1;
    } else {
      g.addInf(c, side, 1);
      added[c] = (added[c] ?? 0) + 1;
      steps.push([c, 1]);
    }
  }
  const a = Object.entries(added).map(([c, n]) => `${countryName(c)} +${n}`).join('，');
  const r = Object.entries(removed).map(([c, n]) => `${countryName(c)}${SIDE_ZH[enemy]} -${n}`).join('，');
  g.log(`区域红利：${[a && `${SIDE_ZH[side]} ${a}`, r].filter(Boolean).join('；') || '没有可用的国家'}`, { side, place: steps.length ? { side, steps } : undefined });
}

export { LV_ZH };
