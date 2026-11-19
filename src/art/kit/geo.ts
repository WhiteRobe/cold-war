import { CONTINENT_GEN } from './continents.gen';
import { C, S, at, disc, facet, line, ngon, poly, prng, rect, type At, type Shades } from './core';

/** 地球（八边形分面 + 大陆块） */
export function globe(o: At, r = 40, seaSh: Shades = S.sea, land: Shades = S.green): string {
  let s = facet(ngon(0, 0, r, 10, 18), [seaSh[0], seaSh[1], seaSh[2], seaSh[1]]);
  s += poly([-r * 0.6, -r * 0.5, -r * 0.1, -r * 0.7, r * 0.1, -r * 0.3, -r * 0.2, r * 0.1, -r * 0.5, 0], land[1]);
  s += poly([-r * 0.6, -r * 0.5, -r * 0.1, -r * 0.7, -r * 0.3, -r * 0.3], land[0]);
  s += poly([r * 0.2, r * 0.1, r * 0.6, -r * 0.1, r * 0.5, r * 0.5, r * 0.2, r * 0.6], land[2]);
  return at(o, s);
}

/** 山（2–3 峰） */
export function mountains(y: number, sh: Shades = S.ne, peaks: [number, number][] = [[40, 60], [110, 80], [190, 50]]): string {
  let s = '';
  for (const [x, h] of peaks) {
    s += poly([x - h, y, x, y - h, x + h * 0.9, y], sh[1]);
    s += poly([x - h, y, x, y - h, x - h * 0.1, y], sh[0]);
    s += poly([x - h * 0.18, y - h * 0.82, x, y - h, x + h * 0.16, y - h * 0.84, x, y - h * 0.76], C.white);
  }
  return s;
}

/** 油井架，原点底部 */
export function oilWell(o: At, sh: Shades = S.ink): string {
  let s = '';
  s += poly([-16, 0, -2, -60, 2, -60, 16, 0, 12, 0, 0, -50, -12, 0], sh[1]);
  for (let i = 1; i < 4; i++) s += rect(-14 + i * 3, -i * 14, 28 - i * 6, 2, sh[2]);
  s += poly([-30, -40, 20, -46, 22, -42, -28, -36], sh[0]);
  s += poly([-34, -44, -24, -44, -26, -30, -32, -30], sh[2]);
  return at(o, s);
}

/** 油桶 */
export function barrel(o: At, sh: Shades = S.ink): string {
  return at(o, poly([-10, 0, -10, -28, 10, -28, 10, 0], sh[1]), poly([-10, 0, -10, -28, 0, -28, 0, 0], sh[0]), rect(-10, -20, 20, 2, sh[2]), rect(-10, -8, 20, 2, sh[2]));
}

/** 棕榈树，原点树根 */
export function palm(o: At, trunk: string = C.ne3, leaf: Shades = S.green): string {
  let s = '';
  s += poly([-3, 0, 3, 0, 6, -40, 2, -42], trunk);
  const top = [4, -44];
  const fronds: [number, number][] = [[-28, -36], [-22, -54], [4, -62], [28, -54], [32, -36]];
  fronds.forEach(([x, y], i) => {
    s += poly([top[0], top[1], x, y, (top[0] + x) / 2 + 4, (top[1] + y) / 2 + 6], leaf[i % 3]);
  });
  return at(o, s);
}

/** 城市天际线，底边 y */
export function skyline(y: number, sh: Shades = S.ink, seed = 2, x0 = 0, x1 = 240): string {
  const rnd = prng(seed);
  let s = '';
  for (let x = x0; x < x1; ) {
    const w = 10 + Math.floor(rnd() * 14), h = 16 + Math.floor(rnd() * 40);
    s += rect(x, y - h, w, h, sh[Math.floor(rnd() * 3)]);
    if (rnd() > 0.6) s += poly([x, y - h, x + w / 2, y - h - 8, x + w, y - h], sh[2]);
    for (let wy = y - h + 4; wy < y - 4; wy += 8) if (rnd() > 0.4) s += rect(x + 3, wy, 3, 3, C.gold2);
    x += w + 1;
  }
  return s;
}

/** 克里姆林宫塔楼，原点底部 */
export function kremlin(o: At, sh: Shades = S.su): string {
  let s = '';
  s += poly([-14, 0, -14, -50, 14, -50, 14, 0], sh[1]);
  s += poly([-14, 0, -14, -50, 0, -50, 0, 0], sh[0]);
  s += poly([-16, -50, 16, -50, 10, -62, -10, -62], sh[2]);
  s += poly([-10, -62, 10, -62, 0, -96], C.ne3);
  s += poly([-10, -62, 0, -62, 0, -96], C.green3);
  s += poly([-5, -100, 0, -108, 5, -100, 0, -96], C.su2);
  s += rect(-4, -20, 8, 20, C.ink2);
  return at(o, s);
}

/** 国会大厦 / 白宫穹顶，原点底部 */
export function capitol(o: At, sh: Shades = S.white): string {
  let s = '';
  s += poly([-50, 0, -50, -24, 50, -24, 50, 0], sh[1]);
  for (let i = -44; i <= 44; i += 11) s += rect(i, -22, 4, 22, sh[0]);
  s += poly([-54, -24, 54, -24, 0, -36], sh[2]);
  s += facet(ngon(0, -40, 18, 8, 180, 16).slice(0, 10).concat([18, -40]), sh);
  s += rect(-2, -62, 4, 8, sh[2]);
  return at(o, s);
}

/** 港口吊车 + 货船 */
export function ship(o: At, hull: Shades = S.ink, cargo: Shades = S.su): string {
  let s = '';
  s += poly([-50, -10, 50, -10, 40, 6, -42, 6], hull[1]);
  s += poly([-50, -10, 50, -10, 48, -6, -48, -6], hull[0]);
  for (let i = -36; i < 30; i += 16) s += rect(i, -22, 14, 12, cargo[(i + 36) / 16 % 3]);
  s += poly([30, -10, 32, -30, 44, -30, 44, -10], hull[2]);
  return at(o, s);
}

/** 简单房屋 */
export function hut(o: At, wallC: string = C.sand, roof: string = C.ne3): string {
  return at(o, rect(-14, -18, 28, 18, wallC), poly([-18, -18, 0, -32, 18, -18], roof), rect(-4, -10, 8, 10, C.ink3));
}

/** 金字塔 */
export function pyramid(o: At, sh: Shades = S.sand): string {
  return at(o, poly([-40, 0, 0, -40, 40, 0], sh[1]), poly([-40, 0, 0, -40, 6, 0], sh[0]));
}

/** 清真寺穹顶 + 宣礼塔 */
export function mosque(o: At, sh: Shades = S.sand, dome: Shades = S.green): string {
  let s = '';
  s += rect(-30, -24, 60, 24, sh[1]);
  s += facet(ngon(0, -24, 20, 8, 180, 18).slice(0, 10).concat([20, -24]), dome);
  s += rect(36, -60, 7, 60, sh[0]) + poly([35, -60, 44, -60, 39.5, -72], dome[2]);
  return at(o, s);
}

/** 宝塔（东亚） */
export function pagoda(o: At, sh: Shades = S.su): string {
  let s = '';
  for (let i = 0; i < 4; i++) {
    const y = -i * 16, w = 30 - i * 6;
    s += rect(-w / 2 + 4, y - 12, w - 8, 12, C.paper2);
    s += poly([-w / 2 - 6, y - 10, w / 2 + 6, y - 10, w / 2 - 2, y - 16, -w / 2 + 2, y - 16], sh[i % 2]);
  }
  s += rect(-1, -76, 2, 12, C.ink);
  return at(o, s);
}

/** 运河闸门（巴拿马） */
export function canal(y: number): string {
  return rect(0, y, 240, 150 - y, C.green) + poly([70, 150, 90, y, 150, y, 170, 150], C.sea) + poly([90, y, 120, y, 100, 150, 70, 150], C.sea2);
}

/** 带刺铁丝网 */
export function barbed(y: number, x0 = 0, x1 = 240): string {
  let s = line(x0, y, x1, y, 1.5, C.ink2);
  for (let x = x0 + 6; x < x1; x += 14) s += poly([x - 3, y - 3, x + 3, y + 3, x + 3, y - 3, x - 3, y + 3], C.ink2);
  return s;
}

/** 大陆轮廓（计分卡），坐标系 240×150 */
export const CONTINENTS: Record<string, number[][]> = {
  europe: [
    [40, 110, 50, 70, 70, 50, 96, 40, 110, 20, 130, 18, 146, 30, 170, 30, 190, 46, 200, 70, 186, 92, 160, 100, 150, 120, 124, 116, 110, 132, 92, 118, 72, 126],
    [44, 40, 56, 22, 66, 30, 58, 46],
  ],
  asia: [
    [20, 60, 40, 30, 80, 20, 130, 14, 180, 22, 222, 40, 216, 70, 196, 82, 172, 76, 160, 96, 140, 92, 124, 116, 104, 104, 86, 120, 70, 96, 44, 92],
    [200, 98, 214, 92, 220, 112, 206, 116],
    [150, 116, 176, 112, 190, 126, 162, 132],
  ],
  middleEast: [
    [30, 60, 70, 40, 110, 36, 150, 44, 190, 60, 210, 84, 196, 110, 160, 120, 140, 136, 116, 120, 96, 96, 70, 90, 46, 100, 28, 84],
  ],
  africa: [
    [60, 20, 110, 14, 150, 22, 180, 40, 196, 66, 180, 80, 172, 104, 150, 126, 132, 142, 120, 136, 108, 110, 96, 80, 72, 72, 50, 52],
    [190, 104, 198, 100, 200, 120, 192, 124],
  ],
  centralAmerica: [
    [20, 20, 70, 14, 100, 30, 110, 56, 130, 76, 150, 92, 170, 110, 182, 128, 170, 132, 150, 116, 124, 104, 98, 80, 70, 60, 40, 44],
    [150, 50, 186, 44, 214, 54, 190, 60],
    [196, 66, 210, 64, 216, 72, 200, 74],
  ],
  southAmerica: [
    [70, 14, 120, 10, 166, 24, 196, 44, 190, 74, 160, 96, 140, 120, 124, 140, 112, 144, 108, 120, 96, 90, 80, 60, 64, 36],
  ],
  southeastAsia: [
    [30, 20, 70, 14, 96, 30, 104, 56, 90, 80, 76, 70, 64, 44, 44, 40],
    [100, 96, 140, 90, 170, 104, 150, 116, 112, 112],
    [150, 40, 172, 36, 180, 60, 162, 66],
    [176, 120, 214, 116, 222, 130, 186, 134],
  ],
};

/** 画大陆：真实国界生成的 low poly 三角面，周边国家浅色衬底；没有生成数据时退回手绘轮廓 */
export function continent(key: string, land: Shades = S.green): string {
  const g = CONTINENT_GEN[key];
  if (!g) {
    let s = '';
    for (const pts of CONTINENTS[key]) s += facet(pts, land, 1);
    return s;
  }
  let s = '';
  for (const pts of g.ctx) s += poly(pts, '#b9b19a');
  for (const t of g.tris) s += poly(t.slice(0, 6), land[t[6]]);
  return s;
}

/** 星形标记的城市点 */
export function pin(x: number, y: number, fill: string): string {
  return poly([x, y, x - 5, y - 10, x, y - 14, x + 5, y - 10], fill) + disc(x, y - 10, 2, C.white, 6);
}

/** 公路 / 弯曲小径 */
export function road(fill: string = C.paper3): string {
  return poly([100, 150, 112, 100, 120, 80, 124, 80, 130, 100, 150, 150], fill);
}

/** 地面裂缝 */
export function crack(x: number, y: number): string {
  return poly([x, y, x + 6, y + 10, x + 2, y + 18, x + 10, y + 30, x + 4, y + 30, x - 4, y + 16, x, y + 8], C.ink2);
}

/** 树（针叶） */
export function pine(o: At, sh: Shades = S.green): string {
  return at(o, rect(-2, -8, 4, 8, C.ne3), poly([-14, -8, 0, -40, 14, -8], sh[1]), poly([-14, -8, 0, -40, 0, -8], sh[0]));
}

