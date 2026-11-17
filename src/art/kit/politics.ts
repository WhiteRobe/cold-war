import { C, S, at, disc, facet, line, ngon, poly, rect, type At, type Shades } from './core';

/** 五角星 */
export function star(cx: number, cy: number, r: number, fill: string, fill2?: string): string {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (-90 + i * 36) * (Math.PI / 180), rr = i % 2 ? r * 0.42 : r;
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  if (!fill2) return poly(pts, fill);
  // 左右分色
  const left: number[] = [];
  for (let i = 0; i < 10; i++) left.push(Math.min(pts[2 * i], cx), pts[2 * i + 1]);
  return poly(pts, fill2) + poly(left, fill);
}

export type FlagKind = 'us' | 'su' | 'fr' | 'uk' | 'cn' | 'nato' | 'un' | 'de' | 'pl' | 'cu' | 'il' | 'jp' | 'plain' | 'tri';

/** 旗帜，原点旗杆底部，旗面 w×h，带折面 */
export function flag(o: At, kind: FlagKind, w = 50, h = 32, colors?: string[]): string {
  const top = -70;
  let face = '';
  const R = (x: number, y: number, ww: number, hh: number, f: string) => rect(x, y, ww, hh, f);
  const x0 = 2;
  switch (kind) {
    case 'us':
      for (let i = 0; i < 7; i++) face += R(x0, top + (i * h) / 7, w, h / 7 + 0.5, i % 2 ? C.white : C.su);
      face += R(x0, top, w * 0.42, h * 0.55, C.us3);
      face += star(x0 + w * 0.21, top + h * 0.27, 5, C.white);
      break;
    case 'su':
      face += R(x0, top, w, h, C.su);
      face += star(x0 + 9, top + 7, 3, C.gold2) + hammerSickleFace(x0 + 9, top + 15, 0.35);
      break;
    case 'cn':
      face += R(x0, top, w, h, C.su);
      face += star(x0 + 10, top + 9, 5, C.gold2);
      for (let i = 0; i < 4; i++) face += star(x0 + 19 + (i % 2) * 3, top + 4 + i * 4, 1.6, C.gold2);
      break;
    case 'fr':
      face += R(x0, top, w / 3, h, C.us) + R(x0 + w / 3, top, w / 3, h, C.white) + R(x0 + (2 * w) / 3, top, w / 3, h, C.su);
      break;
    case 'de':
      face += R(x0, top, w, h / 3, C.ink) + R(x0, top + h / 3, w, h / 3, C.su) + R(x0, top + (2 * h) / 3, w, h / 3, C.gold);
      break;
    case 'pl':
      face += R(x0, top, w, h / 2, C.white) + R(x0, top + h / 2, w, h / 2, C.su);
      break;
    case 'jp':
      face += R(x0, top, w, h, C.white) + poly(ngon(x0 + w / 2, top + h / 2, h / 4, 8, 22.5), C.su);
      break;
    case 'il':
      face += R(x0, top, w, h, C.white) + R(x0, top + 4, w, 3, C.us) + R(x0, top + h - 7, w, 3, C.us);
      face += poly([x0 + w / 2, top + 10, x0 + w / 2 + 6, top + 20, x0 + w / 2 - 6, top + 20], C.us);
      break;
    case 'cu':
      for (let i = 0; i < 5; i++) face += R(x0, top + (i * h) / 5, w, h / 5 + 0.5, i % 2 ? C.white : C.us);
      face += poly([x0, top, x0 + w * 0.45, top + h / 2, x0, top + h], C.su) + star(x0 + 7, top + h / 2, 4, C.white);
      break;
    case 'uk':
      face += R(x0, top, w, h, C.us3);
      face += line(x0, top, x0 + w, top + h, 5, C.white) + line(x0 + w, top, x0, top + h, 5, C.white);
      face += line(x0, top, x0 + w, top + h, 2, C.su) + line(x0 + w, top, x0, top + h, 2, C.su);
      face += R(x0 + w / 2 - 5, top, 10, h, C.white) + R(x0, top + h / 2 - 5, w, 10, C.white);
      face += R(x0 + w / 2 - 3, top, 6, h, C.su) + R(x0, top + h / 2 - 3, w, 6, C.su);
      break;
    case 'nato':
      face += R(x0, top, w, h, C.us3);
      face += star(x0 + w / 2, top + h / 2, h * 0.36, C.white, C.white2);
      face += line(x0 + w / 2 - h * 0.45, top + h / 2, x0 + w / 2 + h * 0.45, top + h / 2, 1, C.white);
      break;
    case 'un':
      face += R(x0, top, w, h, C.sky2);
      face += poly(ngon(x0 + w / 2, top + h / 2, h * 0.32, 8, 22.5), C.white);
      face += poly(ngon(x0 + w / 2, top + h / 2, h * 0.2, 8, 22.5), C.sky2);
      break;
    case 'tri': {
      const cs = colors ?? [C.green, C.white, C.su];
      face += R(x0, top, w / 3, h, cs[0]) + R(x0 + w / 3, top, w / 3, h, cs[1]) + R(x0 + (2 * w) / 3, top, w / 3, h, cs[2]);
      break;
    }
    default:
      face += R(x0, top, w, h, colors?.[0] ?? C.ne);
  }
  // 折面阴影：右半略暗的三角
  const shade = poly([x0 + w * 0.5, top, x0 + w, top, x0 + w, top + h, x0 + w * 0.5, top + h], '#0000001f');
  return at(o, rect(-2, top - 4, 3, 74, C.ink2), face, shade, disc(0, top - 5, 3, C.gold, 6));
}

function hammerSickleFace(cx: number, cy: number, s: number): string {
  return at({ x: cx, y: cy, s }, hammerSickleRaw(C.gold2));
}

function hammerSickleRaw(fill: string): string {
  let s = '';
  // 镰刀：多段折线弧
  const arc: number[] = [];
  for (let i = 0; i <= 6; i++) {
    const a = (-200 + i * 40) * (Math.PI / 180);
    arc.push(Math.cos(a) * 16, Math.sin(a) * 16);
  }
  const inner: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const a = (-200 + i * 40) * (Math.PI / 180);
    inner.push(Math.cos(a) * 11 + 2, Math.sin(a) * 11 + 1);
  }
  s += poly([...arc, ...inner], fill);
  s += poly([-14, 10, -10, 6, -4, 12, -8, 16], fill);
  // 锤子
  s += poly([-12, -10, 10, 12, 7, 15, -15, -7], fill);
  s += poly([-16, -14, -6, -20, -2, -16, -12, -8], fill);
  return s;
}

/** 锤子镰刀 */
export function hammerSickle(o: At, fill: string = C.gold2): string {
  return at(o, hammerSickleRaw(fill));
}

/** 讲台，原点底部中心 */
export function podium(o: At, sh: Shades = S.ne, emblem?: string): string {
  let s = '';
  s += poly([-22, 0, -18, -40, 18, -40, 22, 0], sh[1]);
  s += poly([-22, 0, -18, -40, 0, -40, 0, 0], sh[0]);
  s += poly([-26, -40, 26, -40, 24, -46, -24, -46], sh[2]);
  s += line(6, -46, 12, -58, 1.5, C.ink);
  s += disc(12, -59, 2.5, C.ink, 6);
  if (emblem) s += poly(ngon(0, -22, 8, 8, 22.5), emblem);
  return at(o, s);
}

/** 文件 + 印章 */
export function documentStamp(o: At, stamp: string = C.su, paperSh: Shades = S.white): string {
  let s = '';
  s += poly([-24, -32, 18, -32, 24, -26, 24, 32, -24, 32], paperSh[0]);
  s += poly([18, -32, 24, -26, 18, -26], paperSh[2]);
  for (let i = 0; i < 6; i++) s += rect(-18, -22 + i * 7, i === 5 ? 20 : 36, 2, C.ne2);
  s += poly(ngon(10, 18, 10, 8, 22.5), stamp);
  s += poly(ngon(10, 18, 6, 8, 22.5), paperSh[0]);
  s += star(10, 18, 4, stamp);
  return at(o, s);
}

/** 墙（柏林墙 / 铁幕），从 x0 到 x1，顶部 y，底部 150 */
export function wall(x0: number, x1: number, y: number, sh: Shades = S.ne, cracked = false): string {
  let s = '';
  const seg = 24;
  for (let x = x0, i = 0; x < x1; x += seg, i++) {
    s += poly([x, 150, x, y + 4, x + 2, y, x + seg - 1, y, x + seg - 1, 150], sh[i % 2]);
    s += poly([x + seg - 4, y, x + seg - 1, y, x + seg - 1, 150, x + seg - 4, 150], sh[2]);
  }
  s += rect(x0, y - 6, x1 - x0, 6, C.paper3);
  if (cracked) {
    const mx = (x0 + x1) / 2;
    s += poly([mx - 14, y - 6, mx + 10, y - 6, mx + 2, y + 20, mx + 12, y + 40, mx - 4, 150, mx - 18, 150, mx - 6, y + 34, mx - 16, y + 14], C.sky2);
  }
  return s;
}

/** 铁幕：垂下的铁帘 */
export function ironCurtain(x: number, w: number, sh: Shades = S.ink): string {
  let s = '';
  for (let i = 0; i < w; i += 10) s += poly([x + i, 0, x + i + 10, 0, x + i + 8, 150, x + i + 2, 150], sh[(i / 10) % 3]);
  s += rect(x - 4, 0, w + 8, 6, C.ink);
  return s;
}

/** 投票箱 */
export function ballotBox(o: At, sh: Shades = S.ne): string {
  let s = '';
  s += poly([-20, 0, -20, -30, 20, -30, 20, 0], sh[1]);
  s += poly([-20, -30, -12, -38, 28, -38, 20, -30], sh[0]);
  s += poly([20, 0, 20, -30, 28, -38, 28, -8], sh[2]);
  s += rect(-8, -36, 18, 3, C.ink);
  s += poly([-4, -36, 6, -36, 8, -50, -2, -50], C.white);
  return at(o, s);
}

/** 王冠 */
export function crown(o: At, sh: Shades = S.gold): string {
  return at(o, poly([-20, 0, -22, -20, -12, -10, 0, -24, 12, -10, 22, -20, 20, 0], sh[1]), poly([-20, 0, -22, -20, -12, -10, 0, -24, 0, 0], sh[0]), rect(-20, -4, 40, 4, sh[2]));
}

/** 锁链：交错倾斜的链环；broken 时中间断开 */
export function chain(o: At, broken = true, fill: string = C.ink3): string {
  let s = '';
  const ring = (x: number, y: number, rot: number, k: number) => {
    const pts = ngon(0, 0, 12, 8, 22.5, 6);
    const hole = ngon(0, 0, 7, 8, 22.5, 2);
    return `<g transform="translate(${x} ${y}) rotate(${rot})">` + poly(pts, k % 2 ? fill : C.ink2) + poly(pts.map((v, i) => (i % 2 ? Math.min(v, 0) : v)), k % 2 ? C.ne2 : C.ink3) + poly(hole, C.ink) + '</g>';
  };
  for (let i = 0; i < 8; i++) {
    if (broken && (i === 3 || i === 4)) continue;
    const dx = broken ? (i < 4 ? -6 : 6) : 0;
    s += ring(-56 + i * 16 + dx, broken ? (i < 4 ? -2 : 2) : 0, i % 2 ? -35 : 35, i);
  }
  if (broken) s += ring(-6, 4, 70, 1).replace('rotate(70)', 'rotate(70) scale(0.8)') + ring(8, -6, -60, 0).replace('rotate(-60)', 'rotate(-60) scale(0.8)');
  return at(o, s);
}

/** 天平 / 谈判桌 */
export function table(o: At, sh: Shades = S.ne, w = 120): string {
  return at(o, poly([-w / 2, 0, w / 2, 0, w / 2 - 10, -10, -w / 2 + 10, -10], sh[0]), poly([-w / 2, 0, w / 2, 0, w / 2, 4, -w / 2, 4], sh[2]), rect(-w / 2 + 6, 4, 4, 26, sh[2]), rect(w / 2 - 10, 4, 4, 26, sh[2]));
}

/** 钱币 / 金币堆 */
export function coins(o: At, n = 4): string {
  let s = '';
  for (let i = 0; i < n; i++) s += facet(ngon(0, -i * 5, 12, 8, 22.5, 4), S.gold);
  return at(o, s);
}

/** 粮袋 / 麦穗 */
export function wheat(o: At, fill: string = C.gold): string {
  let s = line(0, 0, 0, -50, 2, C.gold3);
  for (let i = 0; i < 5; i++) {
    const y = -20 - i * 7;
    s += poly([0, y, -7, y - 4, -2, y - 8], fill) + poly([0, y, 7, y - 4, 2, y - 8], C.gold3);
  }
  return at(o, s);
}

/** 十字架 / 教皇冠 */
export function cross(o: At, fill: string = C.gold): string {
  return at(o, rect(-3, -50, 6, 50, fill), rect(-14, -40, 28, 6, fill));
}

/** 钥匙孔 / 眼睛（间谍） */
export function eye(o: At, iris: string = C.us): string {
  return at(o, poly([-30, 0, -14, -12, 14, -12, 30, 0, 14, 12, -14, 12], C.white), poly(ngon(0, 0, 10, 8, 22.5), iris), poly(ngon(0, 0, 4, 6), C.ink));
}

/** 帽檐压低的间谍（风衣 + 礼帽） */
export function spy(o: At, coat: Shades = S.ne): string {
  let s = '';
  s += poly([-16, 0, -12, -40, 0, -46, 12, -40, 16, 0], coat[1]);
  s += poly([-16, 0, -12, -40, 0, -46, 0, 0], coat[0]);
  s += poly([-4, -46, 0, -30, 4, -46], coat[2]);
  s += facet(ngon(0, -54, 8, 6, -90, 9), S.skin);
  s += poly([-16, -58, 16, -58, 10, -62, -10, -62], C.ink);
  s += poly([-9, -62, -8, -72, 8, -72, 9, -62], C.ink2);
  s += poly([-8, -52, 8, -52, 8, -46, -8, -46], coat[2]);
  return at(o, s);
}

/** 国际象棋王（战争游戏） */
export function chessKing(o: At, sh: Shades = S.white): string {
  let s = '';
  s += poly([-16, 0, 16, 0, 12, -8, -12, -8], sh[2]);
  s += poly([-8, -8, 8, -8, 6, -40, -6, -40], sh[1]);
  s += poly([-8, -8, 0, -8, 0, -40, -6, -40], sh[0]);
  s += poly([-12, -40, 12, -40, 8, -50, -8, -50], sh[1]);
  s += rect(-2, -62, 4, 12, sh[2]) + rect(-6, -58, 12, 4, sh[2]);
  return at(o, s);
}
