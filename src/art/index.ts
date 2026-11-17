/**
 * 卡牌插画：返回 SVG 内部片段（不含外层 <svg>），坐标系 viewBox="0 0 240 150"。
 * low poly 风格：全部由多边形拼成，无渐变无滤镜。
 */
import { EARLY_ART } from './cards/early';
import { MID_ART } from './cards/mid';
import { LATE_ART } from './cards/late';
import { SCORING_ART } from './cards/scoring';
import { C, rect } from './kit';

const ART: Record<number, () => string> = { ...SCORING_ART, ...EARLY_ART, ...MID_ART, ...LATE_ART };

/** 先给用户过目的 10 张样板 */
export const SAMPLES = [2, 6, 8, 17, 21, 40, 48, 80, 96, 106];

const cache = new Map<number, string>();

export function cardArt(id: number): string {
  let s = cache.get(id);
  if (s === undefined) {
    s = ART[id]?.() ?? rect(0, 0, 240, 150, C.paper2);
    cache.set(id, s);
  }
  return s;
}
