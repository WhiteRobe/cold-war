// 点名影响具体国家的卡：地图方框右下角的闪电标记，点开列出这些卡和它们现在的状态。
import { CARDS, CHINA_CARD, type Side } from '../../data';
import type { GameView } from '../../engine/view';

/** 国家 → 点名它的卡（只收录卡面效果针对该国的，整片区域的卡不算） */
export const COUNTRY_CARDS: Record<string, number[]> = {
  cuba: [8, 40],
  vietnam: [9],
  westGermany: [10, 40, 55],
  eastGermany: [96],
  northKorea: [11],
  southKorea: [11, 89],
  romania: [12, 22],
  czechoslovakia: [22],
  hungary: [22],
  yugoslavia: [22],
  bulgaria: [22],
  poland: [68, 101],
  israel: [13, 28, 65],
  egypt: [15, 56, 61, 65, 72],
  france: [17, 28],
  uk: [28, 83, 105],
  turkey: [40],
  canada: [106],
  pakistan: [24],
  india: [24],
  japan: [27],
  taiwan: [35],
  thailand: [38],
  angola: [52],
  seAfricanStates: [52],
  southAfrica: [53],
  chile: [54],
  argentina: [83],
  syria: [56],
  jordan: [56, 65],
  sudan: [56],
  iraq: [56, 61, 102],
  iran: [56, 61, 82, 102],
  saudiArabia: [56, 61, 110],
  libya: [56, 61, 84],
  gulfStates: [61],
  venezuela: [61, 64],
  costaRica: [64],
  panama: [64],
  lebanon: [88],
  nicaragua: [91],
};

const ERA_IDX = { early: 0, mid: 1, late: 2 } as const;
export const ERA_ZH = ['冷战早期', '冷战中期', '冷战后期'] as const;
export const eraNow = (turn: number) => (turn <= 3 ? 0 : turn <= 7 ? 1 : 2);

export type CardStatus = 'active' | 'removed' | 'discard' | 'mine' | 'theirs' | 'unseen' | 'future';
export const STATUS_ZH: Record<CardStatus, string> = {
  active: '生效中',
  removed: '已移除',
  discard: '在弃牌堆',
  mine: '在你手中',
  theirs: '在对手手中',
  unseen: '可能出现',
  future: '尚未加入牌库',
};

export function cardStatus(v: GameView, id: number): CardStatus {
  if (v.inPlay.includes(id)) return 'active';
  if (v.removed.includes(id)) return 'removed';
  if (v.discard.includes(id)) return 'discard';
  const me = v.me;
  if (me && (v.hands[me].includes(id) || (id === CHINA_CARD && v.china.holder === me))) return 'mine';
  const opp: Side = me === 'US' ? 'USSR' : 'US';
  if (me && v.hands[opp].includes(id)) return 'theirs';
  if (ERA_IDX[CARDS[id].era] > eraNow(v.turn)) return 'future';
  return 'unseen';
}

export type CardKind = 'bolt' | 'war' | 'score' | 'missile' | 'oil' | 'muslim' | 'canal';
/** 按一组国家生效的卡单独成标记：油滴（石油输出国组织）、新月（穆斯林革命）、河流（归还巴拿马运河）；
 *  后面跟着会让它失效的卡（北海油田、向沙特出售预警机） */
const GROUP: Partial<Record<CardKind, { main: number; extra: number[] }>> = {
  oil: { main: 61, extra: [86] },
  muslim: { main: 56, extra: [110] },
  canal: { main: 64, extra: [] },
};
const GROUP_OF: Record<number, CardKind> = { 61: 'oil', 56: 'muslim', 64: 'canal' };
/** 标记种类：战争卡 = 航弹，计分卡 = 皇冠，古巴导弹危机 = 导弹，成组国家卡 = 各自图标，其余 = 闪电 */
export const cardKind = (id: number): CardKind => GROUP_OF[id] ?? (id === 40 ? 'missile' : CARDS[id].war ? 'war' : CARDS[id].scoring ? 'score' : 'bolt');
export const GROUP_NOTE: Partial<Record<CardKind, string>> = {
  oil: '产油国：「石油输出国组织」打出时，苏联每控制一个产油国 +1 VP；「北海油田」发动后失效。',
  muslim: '穆斯林革命目标国：苏联打出「穆斯林革命」时，从这些国家里选两个清空美国影响力；「向沙特出售预警机」发动后失效。',
  canal: '巴拿马运河：美国打出「归还巴拿马运河」时，在巴拿马、哥斯达黎加、委内瑞拉各加 1 点美国影响力。',
};

/** 这个国家要显示的卡：只要当前期和未来期的；没开可选卡时去掉 #104–110。
 *  kind：bolt = 闪电，war = 航弹（战争卡），score = 皇冠（计分卡，如东南亚计分里泰国算 2 分），不传则全部 */
export function countryCards(v: GameView, country: string, kind?: CardKind): number[] {
  const now = eraNow(v.turn);
  const opt = (id: number) => v.options?.optionalCards !== false || !CARDS[id].optional;
  // 成组标记不按时期过滤：只要还没失效就一直显示
  const g = kind && GROUP[kind];
  if (g) return (COUNTRY_CARDS[country] ?? []).includes(g.main) ? [g.main, ...g.extra].filter(opt) : [];
  return (COUNTRY_CARDS[country] ?? []).filter(
    (id) => ERA_IDX[CARDS[id].era] >= now && (v.options?.optionalCards !== false || !CARDS[id].optional) && (!kind || cardKind(id) === kind),
  );
}
