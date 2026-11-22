// 不死不休的世界变化：第 11 回合起中国、蒙古成为国家，澳大利亚、菲律宾成为美国本土邻国，中国牌换成联合国牌。
// 国家表是全局数据，这里原地修改（每个线程同时只有一局在跑；Game 构造时会重置回标准世界）。
import { COUNTRY_LIST } from './countries.gen';
import type { CardDef, CountryDef } from './types';

export const CHINA: CountryDef = {
  id: 'china', name: 'China', zh: '中国', region: 'asia', sub: [], stability: 4, bg: true,
  adj: ['ussr', 'northKorea', 'india', 'taiwan', 'mongolia'], pos: [812, 268], start: [1, 2],
};
export const MONGOLIA: CountryDef = {
  id: 'mongolia', name: 'Mongolia', zh: '蒙古', region: 'asia', sub: [], stability: 2, bg: false,
  adj: ['ussr', 'china'], pos: [800, 205], start: [0, 2],
};

/** 两德合并后的德国：横跨西欧、东欧的战场国 */
export const GERMANY: CountryDef = {
  id: 'germany', name: 'Germany', zh: '德国', region: 'europe', sub: ['westernEurope', 'easternEurope'], stability: 4, bg: true,
  adj: ['denmark', 'poland', 'czechoslovakia', 'austria', 'france', 'benelux'], pos: [435, 131], start: [0, 0],
};

/** 新增邻接：[国家, 新邻居] */
const LINKS: [string, string][] = [
  ['northKorea', 'china'], ['india', 'china'], ['taiwan', 'china'],
  ['australia', 'usa'], ['philippines', 'usa'],
  ['southAfrica', 'brazil'], ['brazil', 'southAfrica'],
];

const UN_CARD: Partial<CardDef> = {
  name: 'The UN Card',
  zh: '联合国牌',
  text: '固定 4 点行动点；持有方每控制英国、法国、中国中的一个，使用时行动点 +1。不能作为事件打出，也不能用于太空竞赛。打出后正面朝下交给对手，下个回合才能使用。',
  textEn: '4 Ops; +1 Op for each of UK, France, China you control. Cannot be played as an event or for the Space Race. After use, pass it face down to your opponent.',
};
export type WorldSide = 'US' | 'USSR';
/** 世界状态：是否进入不死不休、中国统一 / 朝鲜半岛统一由哪一方完成 */
export interface WorldState {
  endless?: boolean;
  china?: WorldSide;
  korea?: WorldSide;
  germany?: WorldSide;
}

// 标准世界的原始数据（切换世界前先恢复）
const BASE_LIST = COUNTRY_LIST.slice();
const BASE = new Map(COUNTRY_LIST.map((c) => [c.id, { adj: c.adj.slice(), stability: c.stability, bg: c.bg }]));
const EXTRA_BASE = new Map([CHINA, MONGOLIA, GERMANY].map((c) => [c.id, { adj: c.adj.slice(), stability: c.stability, bg: c.bg }]));
let chinaCardBackup: Partial<CardDef> | null = null;

let cur = '';
let on = false;
let gone = new Set<string>();
/** 世界版本号：界面据此重算地图上的连线等缓存 */
export let worldVersion = 0;
export const endlessWorld = () => on;
export const getWorldVersion = () => worldVersion;
/** 国家名等显示数据变了（主播模式）：让依赖国家表的缓存重算 */
export const bumpWorldVersion = () => {
  worldVersion++;
};
/** 因统一而从地图上消失的国家（名字仍可查，但不再参与任何结算） */
export const goneCountry = (id: string) => gone.has(id);

/** 依赖国家表的缓存：世界变化后自动重算 */
export function byWorld<T>(fn: () => T): () => T {
  let v = -1;
  let val: T;
  return () => {
    if (v !== worldVersion) {
      val = fn();
      v = worldVersion;
    }
    return val;
  };
}

/** 朝鲜半岛统一后保留的国家 */
export const koreaKeep = (side: WorldSide) => (side === 'USSR' ? 'northKorea' : 'southKorea');

/**
 * 切换世界。countries / cards 是 index.ts 里的索引表，一起更新。
 * 消失的国家仍留在 countries 里（旧日志要查名字），但从 COUNTRY_LIST 和所有邻接里删掉。
 */
export function applyWorld(w: WorldState, countries: Record<string, CountryDef>, cards: Record<number, CardDef>) {
  const key = w.endless ? `e${w.china ?? ''}/${w.korea ?? ''}/${w.germany ?? ''}` : '';
  if (key === cur) return;
  cur = key;
  worldVersion++;
  // 先恢复标准世界
  COUNTRY_LIST.length = 0;
  COUNTRY_LIST.push(...BASE_LIST);
  for (const c of BASE_LIST) Object.assign(c, { ...BASE.get(c.id)!, adj: BASE.get(c.id)!.adj.slice() });
  for (const c of [CHINA, MONGOLIA, GERMANY]) {
    Object.assign(c, { ...EXTRA_BASE.get(c.id)!, adj: EXTRA_BASE.get(c.id)!.adj.slice() });
    delete countries[c.id];
  }
  if (chinaCardBackup) Object.assign(cards[6], chinaCardBackup);
  chinaCardBackup = null;
  gone = new Set();
  on = !!w.endless;
  if (!on) return;

  for (const c of [CHINA, MONGOLIA]) {
    COUNTRY_LIST.push(c);
    countries[c.id] = c;
  }
  for (const [a, b] of LINKS) if (!countries[a].adj.includes(b)) countries[a].adj.push(b);
  const china = cards[6];
  chinaCardBackup = { name: china.name, zh: china.zh, text: china.text, textEn: china.textEn };
  Object.assign(china, UN_CARD);

  const drop = (id: string) => {
    gone.add(id);
    const i = COUNTRY_LIST.findIndex((c) => c.id === id);
    if (i >= 0) COUNTRY_LIST.splice(i, 1);
    for (const c of COUNTRY_LIST) {
      const j = c.adj.indexOf(id);
      if (j >= 0) c.adj.splice(j, 1);
    }
  };
  // 中国统一：台湾并入中国，中国不再是战场国
  if (w.china) {
    drop('taiwan');
    CHINA.stability = 4;
    CHINA.bg = false;
  }
  // 朝鲜半岛统一：并成一个战场国，稳定度 3，与苏联、中国、日本、台湾（若还在）相邻
  if (w.korea) {
    const keep = koreaKeep(w.korea);
    drop(keep === 'northKorea' ? 'southKorea' : 'northKorea');
    const k = countries[keep];
    k.stability = 3;
    k.bg = true;
    k.adj = ['ussr', 'china', 'japan', 'taiwan'].filter((x) => x === 'ussr' || !gone.has(x));
    for (const x of k.adj) if (x !== 'ussr' && !countries[x].adj.includes(keep)) countries[x].adj.push(keep);
  }
  // 两德合并：东德、西德消失，换成德国
  if (w.germany) {
    drop('westGermany');
    drop('eastGermany');
    COUNTRY_LIST.push(GERMANY);
    countries.germany = GERMANY;
    for (const x of GERMANY.adj) if (!countries[x].adj.includes('germany')) countries[x].adj.push('germany');
  }
}
