// 点名影响具体国家的卡：地图方框下沿的各种标记（闪电、步枪、油滴……），悬停列出这些卡和它们现在的状态。
import { CARDS, CHINA_CARD, type Side } from '../../data';
import type { GameView } from '../../engine/view';

/** 国家 → 点名它的卡（只收录卡面效果针对该国的，整片区域的卡不算） */
export const COUNTRY_CARDS: Record<string, number[]> = {
  cuba: [8, 40],
  vietnam: [9],
  westGermany: [10, 40, 55],
  eastGermany: [96],
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

export type CardKind =
  | 'bolt' | 'war' | 'score' | 'missile' | 'reds' | 'tent' | 'wall' | 'radar' | 'suez' | 'usjp' | 'fist' | 'ship' | 'hostage' | 'unrest' | 'solidarity' | 'chain' | 'awacs'
  | 'oil' | 'muslim' | 'canal' | 'portugal' | 'kal' | 'leader' | 'pope' | 'lady' | 'shake' | 'leaderUs' | 'scepter';

/** 单独成标记的卡 → 标记种类（其余：战争卡 = 交叉步枪，计分卡 = 皇冠，剩下的 = 闪电） */
const SPECIAL_OF: Record<number, CardKind> = {
  40: 'missile', 22: 'reds', 65: 'tent', 96: 'wall', 106: 'radar', 28: 'suez', 27: 'usjp', 9: 'fist', 35: 'ship', 82: 'hostage', 53: 'unrest', 101: 'solidarity', 10: 'chain', 110: 'awacs',
  61: 'oil', 56: 'muslim', 64: 'canal', 52: 'portugal', 89: 'kal',
  8: 'leader', 91: 'leader', 54: 'leader', 15: 'leader', 17: 'leader', 68: 'pope', 83: 'lady', 105: 'shake', 72: 'leaderUs', 55: 'leader', 12: 'scepter',
};
/** 跟在主卡后面一起列出的“让它失效”的卡 */
const EXTRA: Partial<Record<CardKind, number[]>> = { oil: [86] };
export const cardKind = (id: number): CardKind => SPECIAL_OF[id] ?? (CARDS[id].war ? 'war' : CARDS[id].scoring ? 'score' : 'bolt');
export const isSpecial = (k: CardKind) => k !== 'bolt' && k !== 'war' && k !== 'score';

/** 方框右下角（从右往左，闪电永远最右，导弹最左）/ 左下角（从左往右） */
export const RIGHT_KINDS: CardKind[] = ['bolt', 'usjp', 'ship', 'fist', 'hostage', 'unrest', 'solidarity', 'chain', 'awacs', 'war', 'score', 'reds', 'tent', 'wall', 'radar', 'suez', 'missile'];
export const LEFT_KINDS: CardKind[] = ['scepter', 'oil', 'muslim', 'canal', 'portugal', 'kal', 'leader', 'leaderUs', 'pope', 'lady', 'shake'];

export const GROUP_NOTE: Partial<Record<CardKind, string>> = {
  oil: '产油国：「石油输出国组织」打出时，苏联每控制一个产油国 +1 VP；「北海油田」发动后失效。',
  muslim: '穆斯林革命目标国：苏联打出「穆斯林革命」时，从这些国家里选两个清空美国影响力；美国的「向沙特出售预警机」（见沙特的闪电标记）发动后失效。',
  canal: '巴拿马运河：美国打出「归还巴拿马运河」时，在巴拿马、哥斯达黎加、委内瑞拉各加 1 点美国影响力。',
};

/** 这个国家要显示的卡：只要当前期和未来期的；没开可选卡时去掉 #104–110。
 *  kind：bolt = 闪电，war = 航弹（战争卡），score = 皇冠（计分卡，如东南亚计分里泰国算 2 分），不传则全部 */
export function countryCards(v: GameView, country: string, kind?: CardKind): number[] {
  const now = eraNow(v.turn);
  const opt = (id: number) => v.options?.optionalCards !== false || !CARDS[id].optional;
  // 单独成标记的卡不按时期过滤：只要还没失效就一直显示（未来时期的半透明）
  if (kind && isSpecial(kind)) {
    const mains = (COUNTRY_CARDS[country] ?? []).filter((id) => cardKind(id) === kind);
    return mains.length ? [...mains, ...(EXTRA[kind] ?? [])].filter(opt) : [];
  }
  return (COUNTRY_CARDS[country] ?? []).filter(
    (id) => ERA_IDX[CARDS[id].era] >= now && (v.options?.optionalCards !== false || !CARDS[id].optional) && (!kind || cardKind(id) === kind),
  );
}

/** 某国方框上要画的标记：左右两组，以及哪些是“还没到时期”的（半透明） */
export function countryMarks(v: GameView, country: string): { right: CardKind[]; left: CardKind[]; future: Set<CardKind> } {
  const now = eraNow(v.turn);
  const future = new Set<CardKind>();
  const pick = (kinds: CardKind[]) =>
    kinds.filter((k) => {
      const cards = countryCards(v, country, k);
      if (!cards.length) return false;
      const mains = isSpecial(k) ? cards.filter((id) => cardKind(id) === k) : cards;
      if (isSpecial(k)) {
        if (mains.every((id) => v.removed.includes(id))) return false;
        if (k === 'oil' && v.flags.northSeaOil) return false;
        if (k === 'muslim' && v.flags.awacs) return false;
      }
      if (mains.every((id) => ERA_IDX[CARDS[id].era] > now)) future.add(k);
      return true;
    });
  return { right: pick(RIGHT_KINDS), left: pick(LEFT_KINDS), future };
}
