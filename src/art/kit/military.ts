import { C, S, at, disc, facet, line, ngon, poly, type At, type Shades } from './core';

/** 导弹，原点在底部中心，竖直高约 80（可旋转） */
export function missile(o: At, body: Shades = S.white, accent: string = C.su): string {
  let s = '';
  s += poly([-6, 0, -6, -60, 0, -80, 0, 0], body[0]);
  s += poly([6, 0, 6, -60, 0, -80, 0, 0], body[2]);
  s += poly([-6, -60, 0, -80, 6, -60, 0, -66], accent);
  s += poly([-6, -2, -14, 6, -6, -18], accent);
  s += poly([6, -2, 14, 6, 6, -18], accent);
  s += poly([-6, -30, 6, -30, 6, -26, -6, -26], body[1]);
  return at(o, s);
}

/** 火焰尾焰 */
export function flame(o: At): string {
  return at(o, poly([-6, 0, 0, 22, 6, 0], C.fire) + poly([-3, 0, 0, 12, 3, 0], C.gold2));
}

/** 潜艇（朝右），长约 120 */
export function submarine(o: At, sh: Shades = S.ink): string {
  let s = '';
  s += poly([-60, 0, -50, -10, 50, -10, 62, -2, 50, 8, -50, 8], sh[1]);
  s += poly([-60, 0, -50, -10, 50, -10, 62, -2], sh[0]);
  s += poly([-10, -10, -6, -26, 12, -26, 16, -10], sh[2]);
  s += poly([-4, -26, -3, -36, -1, -36, 0, -26], sh[2]);
  s += poly([-62, -4, -70, -12, -70, 10, -62, 4], sh[2]);
  return at(o, s);
}

/** 坦克（朝右），长约 80 */
export function tank(o: At, sh: Shades = S.green): string {
  let s = '';
  s += poly([-40, 0, -44, -8, 40, -8, 36, 0], C.ink2);
  for (let i = -32; i <= 32; i += 16) s += disc(i, -4, 4, C.ink3, 6);
  s += poly([-38, -8, -34, -20, 34, -20, 40, -8], sh[1]);
  s += poly([-38, -8, -34, -20, 0, -20, 0, -8], sh[0]);
  s += poly([-18, -20, -12, -32, 14, -32, 18, -20], sh[2]);
  s += poly([14, -28, 54, -28, 54, -24, 14, -24], sh[2]);
  return at(o, s);
}

/** 喷气战机（朝右），长约 80 */
export function jet(o: At, sh: Shades = S.ne): string {
  let s = '';
  s += poly([-40, 0, 30, -4, 44, 0, 30, 4], sh[1]);
  s += poly([-40, 0, 30, -4, 44, 0], sh[0]);
  s += poly([-4, -2, -24, -30, -14, -30, 10, -2], sh[0]);
  s += poly([-4, 2, -24, 30, -14, 30, 10, 2], sh[2]);
  s += poly([-36, -1, -44, -14, -38, -14, -28, -1], sh[2]);
  s += poly([24, -3, 32, -3, 30, -6, 26, -6], C.sky2);
  return at(o, s);
}

/** 轰炸机（朝右，更宽大） */
export function bomber(o: At, sh: Shades = S.ne): string {
  return at({ ...o }, jet({ s: 1.3 }, sh));
}

/** 蘑菇云，原点地面中心，高约 110 */
export function mushroom(o: At): string {
  let s = '';
  s += poly([-12, 0, -8, -60, 8, -60, 12, 0], C.fire3);
  s += poly([-8, 0, -5, -60, 0, -60, 0, 0], C.fire);
  s += facet(ngon(0, -78, 40, 8, 0, 24), [C.fire2, C.fire, C.gold2, C.fire3]);
  s += facet(ngon(0, -66, 26, 6, 0, 8), [C.fire3, C.fire]);
  s += facet(ngon(0, -2, 40, 8, 0, 6), [C.fire2, C.fire3]);
  return at(o, s);
}

/** 雷达天线，原点底座 */
export function radar(o: At, sh: Shades = S.white): string {
  let s = '';
  s += poly([-10, 0, -4, -30, 4, -30, 10, 0], C.ink3);
  s += poly([-30, -40, -20, -58, 0, -64, 20, -58, 30, -40, 0, -34], sh[0]);
  s += poly([30, -40, 20, -58, 0, -64, 0, -34], sh[2]);
  s += line(0, -36, 14, -66, 2, C.ink);
  s += disc(14, -67, 3, C.su, 6);
  return at(o, s);
}

/** 卫星 */
export function satellite(o: At, panel: Shades = S.us): string {
  let s = '';
  s += facet(ngon(0, 0, 8, 6), S.white);
  s += poly([-34, -6, -10, -6, -10, 6, -34, 6], panel[1]);
  s += poly([-34, -6, -22, -6, -22, 6, -34, 6], panel[0]);
  s += poly([34, -6, 10, -6, 10, 6, 34, 6], panel[2]);
  s += line(0, -8, 4, -20, 1.5, C.ink);
  return at(o, s);
}

/** 军舰（朝右） */
export function warship(o: At, sh: Shades = S.ink): string {
  let s = '';
  s += poly([-50, -8, 50, -8, 40, 4, -44, 4], sh[1]);
  s += poly([-50, -8, 50, -8, 46, -4, -48, -4], sh[0]);
  s += poly([-20, -8, -16, -20, 10, -20, 14, -8], sh[2]);
  s += poly([-6, -20, -4, -32, 0, -32, 2, -20], sh[2]);
  s += poly([18, -12, 40, -14, 40, -12, 18, -10], sh[2]);
  return at(o, s);
}

/** 爆炸星芒 */
export function blast(o: At, r = 20): string {
  const pts: number[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r;
    pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  return at(o, poly(pts, C.fire), poly(ngon(0, 0, r * 0.45, 8), C.gold2));
}
