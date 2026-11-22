// 不死不休（第 11 回合起）的新机制：区域红利、区域压制、乌云压境、轨道打击、石油经济、铁幕纵深。
// 每个触发都写一条带过场（scene）的日志，界面逐条点击展开，不会一闪而过。
import { COUNTRIES, COUNTRY_LIST, REGIONS, REGION_ZH, koreaKeep, setWorld, worldOf, type RegionId } from '../data';
import type { Game, Gen } from './game';
import { controller, scoreRegion } from './scoring';
import { SIDE_ZH, opp, type GameState, type Side } from './types';
import { countryName } from './util';

/** 石油国（同「石油输出国组织」） */
export const OIL_COUNTRIES = ['egypt', 'iran', 'libya', 'saudiArabia', 'iraq', 'gulfStates', 'venezuela'];

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
export function ironDepth(g: Game, side: Side, c: string): number {
  return g.endlessOn && side === 'US' && COUNTRIES[c].sub.includes('easternEurope') && g.controls('USSR', c) ? -1 : 0;
}

/** 任一行动轮开始：台湾和中国同属一方 → 中国统一；朝鲜和韩国同属一方 → 朝鲜半岛统一 */
export function unifyCheck(g: Game) {
  const s = g.s, f = s.flags;
  if (!f.unifyChina && s.inf.taiwan && s.inf.china) {
    const x = controller(s, 'taiwan');
    if (x && controller(s, 'china') === x) {
      const loser = opp(x);
      f.unifyChina = x;
      delete s.inf.taiwan;
      s.inf.china = x === 'US' ? [6, 0] : [0, 6];
      // 台湾的国家牌（#35 台湾决议）移出游戏
      const where = g.purgeCard(35);
      f.formosan = false;
      setWorld(worldOf(f));
      g.log(`中国统一：${SIDE_ZH[x]}同时控制中国和台湾，台湾并入中国`, {
        side: x,
        scene: {
          title: '中国统一', side: x, art: 'unifyChina',
          sub: `${SIDE_ZH[x]}在同一时间控制了中国和台湾，海峡两岸合而为一。`,
          steps: [
            { text: '台湾从地图上消失，它的邻接关系一并取消；原来与台湾相邻的国家不再与它相邻。', country: 'china' },
            { text: `中国：稳定度 5，不再是战场国。${SIDE_ZH[loser]}的影响力全部清除，${SIDE_ZH[x]}影响力设为 6（多出的影响力直接丢弃）。`, country: 'china' },
            { text: `台湾的国家牌「#35 台湾决议」移出游戏${where ? `（原在${where}）` : ''}。` },
            {
              text: x === 'USSR'
                ? '从此苏联每个行动轮开始时，可以在中东或非洲任一国家放置 1 点影响力。'
                : `从此美国每个行动轮开始时，可以在${COUNTRIES[f.unifyKorea ? koreaKeep(f.unifyKorea) : 'northKorea'].zh}放置 1 点影响力。`,
            },
          ],
        },
      });
    }
  }
  if (!f.unifyKorea && s.inf.northKorea && s.inf.southKorea) {
    const x = controller(s, 'northKorea');
    if (x && controller(s, 'southKorea') === x) {
      const keep = koreaKeep(x), drop = keep === 'northKorea' ? 'southKorea' : 'northKorea';
      f.unifyKorea = x;
      delete s.inf[drop];
      s.inf[keep] = x === 'US' ? [3, 0] : [0, 3];
      setWorld(worldOf(f));
      const name = COUNTRIES[keep].zh;
      g.log(`朝鲜半岛统一：${SIDE_ZH[x]}同时控制朝鲜和韩国，合并为${name}`, {
        side: x,
        scene: {
          title: '朝鲜半岛统一', side: x, art: 'unifyKorea',
          sub: `${SIDE_ZH[x]}在同一时间控制了朝鲜和韩国，三八线不复存在。`,
          steps: [
            { text: `朝鲜与韩国合并为「${name}」：仍是战场国（计分时算一个），稳定度 3。`, country: keep },
            { text: `${SIDE_ZH[opp(x)]}的影响力全部清除，${SIDE_ZH[x]}影响力设为 3。`, country: keep },
            { text: `${name}与苏联、中国、日本${f.unifyChina ? '' : '、台湾'}相邻。`, country: keep },
            { text: `从此每个回合开始，${name}向日本发射导弹：日本的${SIDE_ZH[opp(x)]}影响力 -1（没有就跳过）。`, country: 'japan' },
          ],
        },
      });
    }
  }
}

/** 一次合并放置里的一项来源：n 点，可放的国家（不填为全图任意） */
interface Grant {
  label: string;
  n: number;
  ok?: (c: string) => boolean;
  where?: string;
}

/** 把几项来源的影响力合成一次放置：每点优先记到限制最严的来源上 */
function* placeGrants(g: Game, side: Side, grants: Grant[], title: string): Gen {
  const left = grants.map((x) => x.n);
  const total = left.reduce((a, b) => a + b, 0);
  if (!total) return;
  const steps: [string, number][] = [];
  const placed: Record<string, number> = {};
  const src = grants.map((x, i) => `${x.label} ${x.n}${x.where ? `（${x.where}）` : ''}`).join('，');
  for (let i = 0; i < total; i++) {
    const usable = (c: string) => grants.some((x, k) => left[k] > 0 && (!x.ok || x.ok(c)));
    const ids = COUNTRY_LIST.map((c) => c.id).filter(usable);
    if (!ids.length) break;
    const c = yield* g.askCountry(side, 'placeEvent', `${title}：${src}（剩余 ${total - i}）`, ids, { ops: { total, spent: i } });
    // 先用有限制的来源，再用全图任意的
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
 * 回合开始结算（补牌之后、第一个行动轮之前）：先固定调整（半岛导弹、区域压制），再放置影响力（石油经济）。
 * 所有变化合成一段说明。
 */
export function* turnStart(g: Game): Gen {
  const s = g.s;
  const lines: { text: string; country?: string }[] = [];
  // 固定调整 1：统一后的朝鲜半岛向日本发射导弹
  const k = s.flags.unifyKorea;
  if (k) {
    const enemy = opp(k), name = COUNTRIES[koreaKeep(k)].zh;
    if (g.inf('japan', enemy)) {
      g.removeInf('japan', enemy, 1);
      lines.push({ text: `${name}向日本发射导弹：日本${SIDE_ZH[enemy]}影响力 -1。`, country: 'japan' });
    } else lines.push({ text: `${name}向日本发射导弹：日本没有${SIDE_ZH[enemy]}影响力，没有效果。`, country: 'japan' });
  }
  // 固定调整 2：区域压制
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
  // 固定调整 3：载人环绕地球特权（不死不休没有头条）改为每回合开始看到对手手牌
  for (const side of ['USSR', 'US'] as Side[]) {
    if (!g.hasPerk(side, 4)) continue;
    g.revealHand(opp(side), '载人环绕地球特权');
    lines.push({ text: `载人环绕地球特权：没有头条了，改为${SIDE_ZH[opp(side)]}向${SIDE_ZH[side]}公开手牌。` });
  }
  // 放置：石油经济
  const held = OIL_COUNTRIES.filter((c) => g.controls('USSR', c));
  if (held.length) lines.push({ text: `石油经济：苏联控制 ${held.length} 个石油国（${names(held)}），在全图放置 ${held.length} 点影响力。`, country: held[0] });
  if (!lines.length) return;
  g.log(`第 ${s.turn} 回合开始结算：${lines.map((x) => x.text).join(' ')}`, {
    kind: 'turn',
    scene: {
      title: `第 ${s.turn} 回合开始结算`, art: 'squeeze', flat: true,
      sub: '先结算固定调整（导弹、区域压制、太空特权），再放置影响力（石油经济）。',
      steps: lines,
    },
  });
  if (held.length) yield* placeGrants(g, 'USSR', [{ label: '石油经济', n: held.length }], '回合开始结算 · 苏联放置影响力');
}

/**
 * 行动轮开始结算（行动方行动之前）：先固定调整（中国统一、朝鲜半岛统一），
 * 再把行动方的区域红利、中国统一红利，以及双方持续事件换来的影响力一次放完。
 */
export function* arStart(g: Game, side: Side): Gen {
  unifyCheck(g);
  const s = g.s, f = s.flags;
  const bySide: Record<Side, Grant[]> = { US: [], USSR: [] };
  const { parts } = regionBonus(s, side);
  if (parts.length) {
    bySide[side].push({ label: `区域红利（${parts.map(([r, l, n]) => `${l === 'control' ? '控制' : '支配'}${REGION_ZH[r]} +${n}`).join('、')}）`, n: parts.reduce((a, p) => a + p[2], 0) });
  }
  if (f.unifyChina === side) {
    if (side === 'USSR') bySide.USSR.push({ label: '中国统一红利', n: 1, ok: (c) => COUNTRIES[c].region === 'middleEast' || COUNTRIES[c].region === 'africa', where: '中东或非洲' });
    else {
      const kr = f.unifyKorea ? koreaKeep(f.unifyKorea) : 'northKorea';
      if (s.inf[kr]) bySide.US.push({ label: '中国统一红利', n: 1, ok: (c) => c === kr, where: COUNTRIES[kr].zh });
    }
  }
  for (const x of ['US', 'USSR'] as Side[]) {
    const p = g.takePendingInf(x);
    if (p) bySide[x].push({ label: `持续事件（${p.why}）`, n: p.n });
  }
  const lines: { text: string }[] = [];
  for (const x of [side, opp(side)] as Side[]) {
    const gs = bySide[x];
    if (!gs.length) continue;
    const n = gs.reduce((a, b) => a + b.n, 0);
    lines.push({ text: `${SIDE_ZH[x]}放置 ${n} 点影响力：${gs.map((y) => `${y.label} ${y.n}${y.where ? `（限${y.where}）` : ''}`).join('，')}。` });
  }
  if (!lines.length) return;
  g.log(`行动轮开始结算：${lines.map((x) => x.text).join(' ')}`, {
    side,
    scene: { title: `${SIDE_ZH[side]}行动轮开始结算`, side, art: 'bonus', flat: true, minor: true, sub: '不受限制的点数可以放在全图任意国家。', steps: lines },
  });
  for (const x of [side, opp(side)] as Side[]) yield* placeGrants(g, x, bySide[x], `${SIDE_ZH[x]}行动轮开始结算`);
}

export { LV_ZH };
