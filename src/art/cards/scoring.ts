import { C, S, continent, grid, pin, poly, rect, type Shades } from '../kit';

/** 计分卡统一样式：纸底海图 + 格网 + 区域大陆 + 红蓝据点 */
function scoringMap(key: string, land: Shades, pins: [number, number, 'us' | 'su'][]): string {
  let s = rect(0, 0, 240, 150, C.sea2) + grid(C.sea, 20);
  s += poly([0, 0, 240, 0, 240, 18, 0, 10], C.sea);
  s += continent(key, land);
  for (const [x, y, side] of pins) s += pin(x, y, side === 'us' ? C.us : C.su);
  // 角标：计分卡统一的档案标签
  s += poly([0, 150, 0, 128, 22, 150], C.gold) + poly([240, 0, 218, 0, 240, 22], C.gold);
  return s;
}

export const SCORING_ART: Record<number, () => string> = {
  1: () => scoringMap('asia', S.sand, [[70, 60, 'su'], [130, 50, 'su'], [190, 60, 'us'], [150, 90, 'us'], [100, 90, 'su']]),
  2: () => scoringMap('europe', S.green, [[80, 80, 'us'], [110, 60, 'us'], [140, 50, 'su'], [160, 70, 'su'], [120, 100, 'us']]),
  3: () => scoringMap('middleEast', S.sand, [[70, 70, 'us'], [120, 60, 'su'], [160, 80, 'su'], [140, 110, 'us']]),
  37: () => scoringMap('centralAmerica', S.green, [[60, 40, 'us'], [110, 70, 'us'], [150, 100, 'su'], [180, 52, 'su']]),
  38: () => scoringMap('southeastAsia', S.green, [[60, 40, 'su'], [80, 70, 'us'], [130, 104, 'us'], [164, 52, 'su'], [196, 126, 'us']]),
  79: () => scoringMap('africa', S.sand, [[100, 40, 'su'], [150, 60, 'us'], [130, 100, 'su'], [120, 130, 'us']]),
  81: () => scoringMap('southAmerica', S.green, [[110, 30, 'us'], [160, 50, 'su'], [120, 90, 'su'], [118, 130, 'us']]),
};
