import { C, S, at, facet, line, ngon, poly, rect, type At, type Shades } from './core';

/** 火箭，原点底部中心，高约 100 */
export function rocket(o: At, body: Shades = S.white, accent: string = C.su): string {
  let s = '';
  s += poly([-10, 0, -10, -70, 0, -100, 0, 0], body[0]);
  s += poly([10, 0, 10, -70, 0, -100, 0, 0], body[2]);
  s += poly([-10, -70, 0, -100, 10, -70, 0, -78], accent);
  s += poly([-10, -10, -22, 6, -22, 10, -10, 0], accent);
  s += poly([10, -10, 22, 6, 22, 10, 10, 0], accent);
  s += poly(ngon(0, -52, 5, 8, 22.5), C.sky);
  s += rect(-10, -30, 20, 3, accent);
  return at(o, s);
}

/** 尾焰 + 烟 */
export function exhaust(o: At): string {
  let s = poly([-8, 0, 0, 30, 8, 0], C.fire) + poly([-4, 0, 0, 16, 4, 0], C.gold2);
  s += facet(ngon(-20, 36, 14, 6), S.white) + facet(ngon(16, 38, 16, 6), S.white) + facet(ngon(0, 42, 12, 6), S.white);
  return at(o, s);
}

/** 空间站 */
export function station(o: At): string {
  let s = '';
  s += rect(-60, -2, 120, 4, C.ne2);
  for (const x of [-56, -36, 24, 44]) s += poly([x, -26, x + 14, -26, x + 14, -4, x, -4], C.us) + poly([x, 4, x + 14, 4, x + 14, 26, x, 26], C.us3);
  s += facet(ngon(0, 0, 14, 8, 22.5), S.white);
  s += rect(-24, -6, 48, 12, C.white2);
  return at(o, s);
}

/** 月面（底部弧形 + 环形山） */
export function moonSurface(y: number): string {
  let s = poly([0, 150, 0, y + 10, 60, y, 120, y - 4, 180, y, 240, y + 8, 240, 150], C.ne2);
  s += poly([0, 150, 0, y + 10, 60, y, 90, 150], C.white2);
  for (const [x, yy, r] of [[50, y + 22, 10], [140, y + 14, 14], [200, y + 30, 8]]) s += poly(ngon(x, yy, r, 8, 0, r * 0.4), C.ne3) + poly(ngon(x + 2, yy - 1, r * 0.7, 8, 0, r * 0.25), C.ne);
  return s;
}

/** 月球（天空中） */
export function moon(o: At, r = 18): string {
  return at(o, facet(ngon(0, 0, r, 8, 22.5), S.white), poly(ngon(-5, -4, r * 0.25, 6), C.paper3), poly(ngon(6, 6, r * 0.18, 6), C.paper3));
}

/** 登月舱 */
export function lander(o: At): string {
  let s = '';
  s += line(-16, 0, -10, -14, 2, C.ink3) + line(16, 0, 10, -14, 2, C.ink3);
  s += poly([-14, -14, 14, -14, 12, -26, -12, -26], C.gold);
  s += poly([-14, -14, 0, -14, 0, -26, -12, -26], C.gold2);
  s += poly([-10, -26, 10, -26, 6, -38, -6, -38], C.white2);
  s += poly(ngon(0, -32, 3, 6), C.ink);
  return at(o, s);
}

/** 狗（太空犬莱卡） */
export function dog(o: At, fur: Shades = S.white): string {
  let s = '';
  s += poly([-16, 0, -14, -14, 14, -14, 16, 0, 10, 0, 8, -6, -8, -6, -10, 0], fur[1]);
  s += poly([12, -14, 18, -26, 26, -22, 22, -12], fur[0]);
  s += poly([18, -26, 18, -32, 22, -26], fur[2]);
  s += poly([-14, -12, -24, -18, -22, -12], fur[2]);
  s += poly([24, -22, 25, -21, 24, -20], C.ink);
  return at(o, s);
}

