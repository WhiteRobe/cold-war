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

/** 这个国家要显示的卡：只要当前期和未来期的；没开可选卡时去掉 #104–110 */
export function countryCards(v: GameView, country: string): number[] {
  const now = eraNow(v.turn);
  return (COUNTRY_CARDS[country] ?? []).filter((id) => ERA_IDX[CARDS[id].era] >= now && (v.options?.optionalCards !== false || !CARDS[id].optional));
}
