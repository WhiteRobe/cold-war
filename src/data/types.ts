export type Side = 'US' | 'USSR';
export type CardSide = Side | 'NEUTRAL';
export type Era = 'early' | 'mid' | 'late';
export type RegionId = 'europe' | 'asia' | 'middleEast' | 'africa' | 'centralAmerica' | 'southAmerica';
export type SubRegionId = 'westernEurope' | 'easternEurope' | 'southeastAsia';

export interface CountryDef {
  id: string;
  name: string;
  zh: string;
  region: RegionId;
  sub: SubRegionId[];
  stability: number;
  bg: boolean;
  /** 邻接国 id；与超级大国相邻时含 'usa' / 'ussr' */
  adj: string[];
  pos: [number, number];
  /** 固定开局影响力 [美, 苏] */
  start: [number, number];
}

export interface CardDef {
  id: number;
  name: string;
  zh: string;
  side: CardSide;
  ops: number;
  era: Era;
  starred: boolean;
  ongoing: boolean;
  scoring: boolean;
  war: boolean;
  optional: boolean;
  text: string;
  textEn: string;
  /** 不死不休专属卡 */
  endless?: boolean;
}
