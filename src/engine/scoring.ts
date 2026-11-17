import { COUNTRIES, COUNTRY_LIST, countriesIn, type RegionId, type Side } from '../data';
import type { GameState } from './types';

export function controller(s: GameState, c: string): Side | null {
  const def = COUNTRIES[c];
  const [us, ussr] = s.inf[c];
  if (us >= def.stability && us - ussr >= def.stability) return 'US';
  if (ussr >= def.stability && ussr - us >= def.stability) return 'USSR';
  return null;
}

export const controls = (s: GameState, side: Side, c: string) => controller(s, c) === side;

export interface RegionTally {
  countries: number;
  bgs: number;
  /** 与敌方超级大国相邻的己控国数 */
  adjEnemy: number;
  level: 'none' | 'presence' | 'domination' | 'control';
}

export interface RegionScore {
  region: RegionId;
  US: RegionTally;
  USSR: RegionTally;
  /** 美方净得分（正数美方得分） */
  net: number;
  points: Record<Side, number>;
  /** 欧洲控制即胜 */
  autoWin?: Side;
  shuttleApplied?: boolean;
}

export const REGION_POINTS: Record<RegionId, [number, number, number]> = {
  europe: [3, 7, 0],
  asia: [3, 7, 9],
  middleEast: [3, 5, 7],
  africa: [1, 4, 6],
  centralAmerica: [1, 3, 5],
  southAmerica: [2, 5, 6],
};

/** 计算区域计分。shuttle：苏方扣一个战场国（Shuttle Diplomacy）。 */
export function scoreRegion(s: GameState, region: RegionId, opts: { shuttle?: boolean; formosan?: boolean } = {}): RegionScore {
  const list = countriesIn(region);
  const isBg = (c: string) => COUNTRIES[c].bg || (opts.formosan && region === 'asia' && c === 'taiwan' && controls(s, 'US', 'taiwan'));
  const totalBg = list.filter((c) => isBg(c.id)).length;
  const tally = (side: Side): RegionTally => {
    const mine = list.filter((c) => controls(s, side, c.id));
    const enemySp = side === 'US' ? 'ussr' : 'usa';
    return {
      countries: mine.length,
      bgs: mine.filter((c) => isBg(c.id)).length,
      adjEnemy: mine.filter((c) => c.adj.includes(enemySp)).length,
      level: 'none',
    };
  };
  const t = { US: tally('US'), USSR: tally('USSR') };
  let shuttleApplied = false;
  if (opts.shuttle && t.USSR.bgs > 0) {
    t.USSR.bgs--;
    t.USSR.countries--;
    shuttleApplied = true;
  }
  const level = (me: RegionTally, them: RegionTally): RegionTally['level'] => {
    if (me.countries === 0) return 'none';
    if (me.bgs === totalBg && totalBg > 0 && me.countries > them.countries) return 'control';
    if (me.countries > them.countries && me.bgs > them.bgs && me.countries > me.bgs) return 'domination';
    return 'presence';
  };
  t.US.level = level(t.US, t.USSR);
  t.USSR.level = level(t.USSR, t.US);
  const [p, d, c] = REGION_POINTS[region];
  const pts = (x: RegionTally) => {
    const base = x.level === 'control' ? c : x.level === 'domination' ? d : x.level === 'presence' ? p : 0;
    return base + x.bgs + x.adjEnemy;
  };
  const points = { US: pts(t.US), USSR: pts(t.USSR) };
  const res: RegionScore = { region, US: t.US, USSR: t.USSR, net: points.US - points.USSR, points, shuttleApplied };
  if (region === 'europe') {
    if (t.US.level === 'control') res.autoWin = 'US';
    else if (t.USSR.level === 'control') res.autoWin = 'USSR';
  }
  return res;
}

export const SEA_POINTS: Record<string, number> = {
  burma: 1, laosCambodia: 1, vietnam: 1, malaysia: 1, indonesia: 1, philippines: 1, thailand: 2,
};

export function scoreSEA(s: GameState): { net: number; points: Record<Side, number> } {
  const points = { US: 0, USSR: 0 };
  for (const [c, v] of Object.entries(SEA_POINTS)) {
    const who = controller(s, c);
    if (who) points[who] += v;
  }
  return { net: points.US - points.USSR, points };
}

/** 双方控制的战场国数（Kitchen Debates） */
export function bgCount(s: GameState, side: Side): number {
  return COUNTRY_LIST.filter((c) => c.bg && controls(s, side, c.id)).length;
}
