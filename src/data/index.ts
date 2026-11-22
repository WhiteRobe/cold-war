import { CARD_LIST } from './cards.gen';
import { COUNTRY_LIST } from './countries.gen';
import type { CardDef, CountryDef, RegionId, SubRegionId } from './types';
import { applyEndlessWorld } from './world';

export * from './types';
export { CARD_LIST, COUNTRY_LIST };

export const COUNTRIES: Record<string, CountryDef> = Object.fromEntries(COUNTRY_LIST.map((c) => [c.id, c]));
export const CARDS: Record<number, CardDef> = Object.fromEntries(CARD_LIST.map((c) => [c.id, c]));
export const COUNTRY_IDS = COUNTRY_LIST.map((c) => c.id);

export const REGIONS: RegionId[] = ['europe', 'asia', 'middleEast', 'africa', 'centralAmerica', 'southAmerica'];

export const REGION_ZH: Record<RegionId | SubRegionId, string> = {
  europe: '欧洲', asia: '亚洲', middleEast: '中东', africa: '非洲', centralAmerica: '中美洲', southAmerica: '南美洲',
  westernEurope: '西欧', easternEurope: '东欧', southeastAsia: '东南亚',
};

export function inRegion(c: CountryDef, r: RegionId | SubRegionId): boolean {
  return c.region === r || c.sub.includes(r as SubRegionId);
}

export function countriesIn(r: RegionId | SubRegionId): CountryDef[] {
  return COUNTRY_LIST.filter((c) => inRegion(c, r));
}

export const CHINA_CARD = 6;

/** 切换不死不休的世界（中国、蒙古、新邻接、联合国牌） */
export function setEndlessWorld(enable: boolean) {
  applyEndlessWorld(enable, COUNTRIES, CARDS);
  COUNTRY_IDS.length = 0;
  COUNTRY_IDS.push(...COUNTRY_LIST.map((c) => c.id));
}
export { endlessWorld, getWorldVersion, byWorld, CHINA, MONGOLIA } from './world';
