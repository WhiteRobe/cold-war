// 剧本：开局设定（起止回合、DEFCON、胜利点、太空竞赛、影响力、已发生的事件）+ 背景故事。
// 剧本作为开局参数的一部分存进对局（options.scenario），回放、撤销、复盘都不受影响。
import { CARDS, COUNTRIES, type Side } from '../data';
import type { Flags } from './types';

export interface Scenario {
  id: string;
  name: string;
  author?: string;
  /** 时代说明，如“1962 年 10 月” */
  year?: string;
  /** 背景故事 */
  story: string;
  /** 从第几回合开始（1–10） */
  startTurn: number;
  /** 打到第几回合结束（≥ startTurn，≤ 10） */
  endTurn: number;
  defcon?: number;
  /** 起始胜利点，正数美方领先 */
  vp?: number;
  space?: Partial<Record<Side, number>>;
  /** 中国牌持有方 */
  china?: Side;
  /** 指定国家的起始影响力 [美, 苏]；没列出的国家沿用标准开局 */
  inf?: Record<string, [number, number]>;
  /** 开局前已经发生过的事件（卡号） */
  events?: number[];
  /** 是否保留开局自由布置（只在第 1 回合开始时有效） */
  placement?: boolean;
  /** 内置剧本（不能删除） */
  builtin?: boolean;
}

/** 持续性事件发生后要置上的标记（以及要清掉的标记） */
export const EVENT_FLAGS: Record<number, { set?: (keyof Flags)[]; clear?: (keyof Flags)[] }> = {
  16: { set: ['warsawPact'] },
  17: { set: ['deGaulle'] },
  21: { set: ['nato'] },
  23: { set: ['marshall'] },
  27: { set: ['usJapan'] },
  35: { set: ['formosan'] },
  42: { set: ['quagmire'], clear: ['norad'] },
  44: { set: ['bearTrap'] },
  55: { set: ['willyBrandt'] },
  59: { set: ['flowerPower'] },
  65: { set: ['campDavid'] },
  68: { set: ['johnPaul'] },
  73: { set: ['shuttle'] },
  82: { set: ['iranianHostage'] },
  83: { set: ['ironLady'] },
  86: { set: ['northSeaOil'] },
  87: { set: ['reformer'] },
  96: { set: ['tearDownWall'], clear: ['willyBrandt'] },
  97: { set: ['evilEmpire'], clear: ['flowerPower'] },
  106: { set: ['norad'] },
  110: { set: ['awacs'] },
};

/** 校验剧本；返回错误说明，合法时返回 null */
export function validateScenario(x: unknown): string | null {
  if (!x || typeof x !== 'object') return '剧本格式不对';
  const s = x as Scenario;
  if (typeof s.name !== 'string' || !s.name.trim() || s.name.length > 40) return '剧本名称必填，且不超过 40 字';
  if (typeof s.story !== 'string' || s.story.trim().length < 20 || s.story.length > 2000) return '背景故事必填，20–2000 字';
  const int = (n: unknown, lo: number, hi: number) => typeof n === 'number' && Number.isInteger(n) && n >= lo && n <= hi;
  if (!int(s.startTurn, 1, 10)) return '开始回合要在 1–10 之间';
  if (!int(s.endTurn, s.startTurn, 10)) return '结束回合要在开始回合到 10 之间';
  if (s.defcon !== undefined && !int(s.defcon, 2, 5)) return 'DEFCON 要在 2–5 之间';
  if (s.vp !== undefined && !int(s.vp, -19, 19)) return '胜利点要在 -19 到 19 之间';
  for (const side of ['US', 'USSR'] as const) if (s.space?.[side] !== undefined && !int(s.space[side], 0, 8)) return '太空竞赛进度要在 0–8 之间';
  if (s.china !== undefined && s.china !== 'US' && s.china !== 'USSR') return '中国牌持有方不对';
  for (const [c, v] of Object.entries(s.inf ?? {})) {
    if (!COUNTRIES[c]) return `没有这个国家：${c}`;
    if (!Array.isArray(v) || v.length !== 2 || !int(v[0], 0, 20) || !int(v[1], 0, 20)) return `${COUNTRIES[c].zh}的影响力要是 0–20 的整数`;
  }
  for (const id of s.events ?? []) if (!CARDS[id] || CARDS[id].scoring || id === 6) return `事件卡号不对：${id}`;
  return null;
}

/** 开局时已加入牌库的时期 */
export const erasUpTo = (turn: number) => (['early', ...(turn >= 4 ? ['mid'] : []), ...(turn >= 8 ? ['late'] : [])] as ('early' | 'mid' | 'late')[]);

const ussr = (n: number): [number, number] => [0, n];
const us = (n: number): [number, number] => [n, 0];

export const BUILTIN_SCENARIOS: Scenario[] = [
  {
    id: 'standard',
    name: '标准开局',
    year: '1945',
    story: '二战刚刚结束，欧洲满目疮痍。苏联红军驻扎在东欧，美国手握原子弹，两个昔日盟友开始互相提防。双方先在欧洲布下影响力，冷战从这里开始。',
    startTurn: 1,
    endTurn: 10,
    placement: true,
    builtin: true,
  },
  {
    id: 'berlin-1948',
    name: '柏林危机',
    year: '1948',
    story: '1948 年，苏联封锁通往西柏林的陆路，盟军以空运回应。东欧各国已经相继建立亲苏政权，美国的马歇尔计划正把援助源源不断地运往西欧。从第 2 回合开始，欧洲阵线已经划定，真正的较量转向世界其他地方。',
    startTurn: 2,
    endTurn: 10,
    defcon: 4,
    inf: {
      poland: ussr(4), eastGermany: ussr(4), hungary: ussr(3), romania: ussr(3), bulgaria: ussr(3), czechoslovakia: ussr(3), yugoslavia: ussr(1),
      uk: us(5), westGermany: us(4), france: [3, 1], italy: [3, 1], greece: us(2), turkey: us(1), benelux: us(3), canada: us(2), austria: [1, 1],
      northKorea: ussr(3), southKorea: us(1), japan: us(2), iran: us(1), syria: ussr(1), iraq: ussr(1), finland: ussr(1),
    },
    events: [23],
    builtin: true,
  },
  {
    id: 'cuba-1962',
    name: '古巴导弹危机',
    year: '1962 年 10 月',
    story: '美国侦察机在古巴发现了苏联的导弹发射场。肯尼迪下令海上封锁，赫鲁晓夫的船队仍在驶向加勒比海。世界离核战争只差一步，DEFCON 已经降到 2。双方都要小心：任何一次战场国政变都可能是最后一步。',
    startTurn: 5,
    endTurn: 10,
    defcon: 2,
    vp: -2,
    space: { US: 3, USSR: 4 },
    inf: {
      cuba: ussr(3), poland: ussr(4), eastGermany: ussr(4), hungary: ussr(3), romania: ussr(3), bulgaria: ussr(3), czechoslovakia: ussr(3),
      uk: us(5), westGermany: us(5), france: us(3), italy: us(2), benelux: us(3), turkey: us(2), greece: us(2), canada: us(2),
      egypt: ussr(2), syria: ussr(2), iraq: ussr(3), israel: us(4), iran: us(2), saudiArabia: us(3),
      northKorea: ussr(3), southKorea: us(3), japan: us(4), taiwan: us(3), vietnam: ussr(1), india: [1, 1],
      panama: us(2), mexico: us(1), venezuela: us(1),
    },
    events: [8, 15, 16, 21, 23, 27, 35],
    builtin: true,
  },
  {
    id: 'detente-1972',
    name: '缓和年代',
    year: '1972',
    story: '尼克松刚刚访问北京，美苏也签下了第一份限制战略武器的协议。表面上冷战在降温，暗地里双方把争夺转向中东、非洲和拉丁美洲。中国牌此刻在美国手里，但这张牌下回合才能用。',
    startTurn: 7,
    endTurn: 10,
    defcon: 4,
    vp: 3,
    space: { US: 6, USSR: 5 },
    china: 'US',
    inf: {
      poland: ussr(4), eastGermany: ussr(4), hungary: ussr(3), romania: ussr(3), bulgaria: ussr(3), czechoslovakia: ussr(4),
      uk: us(5), westGermany: us(5), france: us(3), italy: us(3), benelux: us(3), turkey: us(2), greece: us(2), canada: us(2),
      egypt: us(2), syria: ussr(2), iraq: ussr(3), israel: us(4), iran: us(2), saudiArabia: us(3), libya: ussr(2),
      northKorea: ussr(3), southKorea: us(3), japan: us(4), taiwan: us(3), vietnam: ussr(3), laosCambodia: ussr(1), india: ussr(3), pakistan: us(2),
      cuba: ussr(3), chile: ussr(2), angola: ussr(1), panama: us(2),
    },
    events: [8, 15, 16, 21, 23, 27, 35, 71, 72],
    builtin: true,
  },
  {
    id: 'lastwar-1983',
    name: '最后的冷战',
    year: '1983',
    story: '里根称苏联为“邪恶帝国”，潘兴导弹正在西欧部署，大韩航空 007 号班机被击落。苏联在阿富汗越陷越深，经济已经难以为继。这是冷战最后、也是最危险的阶段，只剩两个回合决出胜负。',
    startTurn: 9,
    endTurn: 10,
    defcon: 3,
    vp: 2,
    space: { US: 7, USSR: 6 },
    china: 'US',
    inf: {
      poland: [1, 4], eastGermany: ussr(4), hungary: ussr(3), romania: ussr(3), bulgaria: ussr(3), czechoslovakia: ussr(4),
      uk: us(5), westGermany: us(5), france: us(3), italy: us(3), benelux: us(3), turkey: us(2), greece: us(2), canada: us(4),
      egypt: us(3), syria: ussr(3), iraq: ussr(3), israel: us(4), iran: ussr(2), saudiArabia: us(4), libya: ussr(3),
      afghanistan: ussr(2), northKorea: ussr(3), southKorea: us(3), japan: us(4), taiwan: us(3), vietnam: ussr(3), laosCambodia: ussr(2), india: ussr(3), pakistan: us(3),
      cuba: ussr(3), nicaragua: ussr(2), angola: ussr(2), ethiopia: ussr(1), panama: us(2), argentina: us(2),
    },
    events: [8, 15, 16, 21, 23, 27, 35, 44, 65, 68, 71, 72, 83, 89, 97, 99],
    builtin: true,
  },
];
