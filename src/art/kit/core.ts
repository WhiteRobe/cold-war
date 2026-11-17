/** low poly 绘图基础：多边形、分组、扇形分面。坐标全部取整以压缩体积。 */

export const C = {
  paper: '#e9dfc7', paper2: '#d9cdb0', paper3: '#c9bb98',
  ink: '#2b2b2b', ink2: '#3d3d3d', ink3: '#55524a',
  us: '#2f5d8a', us2: '#3d73a8', us3: '#24486b',
  su: '#b23a2e', su2: '#c9503f', su3: '#8f2c23',
  ne: '#8a7f6a', ne2: '#a39883', ne3: '#6e6553',
  sky: '#9fb0b8', sky2: '#b7c4c8', sky3: '#8597a0',
  sand: '#c9a96a', sand2: '#d8bd85', sand3: '#a98a50',
  green: '#6f8360', green2: '#86996f', green3: '#56684a',
  white: '#f4efe2', white2: '#e2dccb',
  gold: '#d4a83a', gold2: '#e6c25a', gold3: '#b08a2a',
  sea: '#5f7f8f', sea2: '#7392a0', sea3: '#4b6878',
  skin: '#c8a07c', skin2: '#d9b48f', skin3: '#a9825f',
  night: '#3a4654', night2: '#4a5866', night3: '#2c3640',
  fire: '#d9772f', fire2: '#e89a45', fire3: '#b85a24',
};

/** 三色阶：亮、中、暗 */
export type Shades = [string, string, string];
export const S = {
  us: [C.us2, C.us, C.us3] as Shades,
  su: [C.su2, C.su, C.su3] as Shades,
  ne: [C.ne2, C.ne, C.ne3] as Shades,
  ink: [C.ink3, C.ink2, C.ink] as Shades,
  paper: [C.paper, C.paper2, C.paper3] as Shades,
  sky: [C.sky2, C.sky, C.sky3] as Shades,
  sand: [C.sand2, C.sand, C.sand3] as Shades,
  green: [C.green2, C.green, C.green3] as Shades,
  white: [C.white, C.white2, C.paper2] as Shades,
  gold: [C.gold2, C.gold, C.gold3] as Shades,
  sea: [C.sea2, C.sea, C.sea3] as Shades,
  skin: [C.skin2, C.skin, C.skin3] as Shades,
  night: [C.night2, C.night, C.night3] as Shades,
  fire: [C.fire2, C.fire, C.fire3] as Shades,
};

const r = (n: number) => Math.round(n);

export const poly = (pts: number[], fill: string) => `<polygon points="${pts.map(r).join(' ')}" fill="${fill}"/>`;

export const rect = (x: number, y: number, w: number, h: number, fill: string) => poly([x, y, x + w, y, x + w, y + h, x, y + h], fill);

export interface At {
  x?: number;
  y?: number;
  s?: number;
  flip?: boolean;
  r?: number;
}

/** 平移、旋转、缩放、水平翻转 */
export function at(o: At, ...kids: string[]): string {
  let t = '';
  if (o.x || o.y) t += `translate(${r(o.x ?? 0)} ${r(o.y ?? 0)})`;
  if (o.r) t += ` rotate(${o.r})`;
  const s = o.s ?? 1;
  if (s !== 1 || o.flip) t += ` scale(${o.flip ? -s : s} ${s})`;
  return t ? `<g transform="${t.trim()}">${kids.join('')}</g>` : kids.join('');
}

/** 正 n 边形顶点 */
export function ngon(cx: number, cy: number, rad: number, n = 8, rot = 0, ry = rad): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (rot + (i * 360) / n) * (Math.PI / 180);
    pts.push(cx + rad * Math.cos(a), cy + ry * Math.sin(a));
  }
  return pts;
}

/** 扇形分面：从质心向各边连三角形，按色阶交替着色，产生 low poly 光照感 */
export function facet(pts: number[], sh: Shades | string[], light = 0): string {
  const n = pts.length / 2;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    cx += pts[2 * i];
    cy += pts[2 * i + 1];
  }
  cx /= n;
  cy /= n;
  let out = '';
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    out += poly([cx, cy, pts[2 * i], pts[2 * i + 1], pts[2 * j], pts[2 * j + 1]], sh[(i + light) % sh.length]);
  }
  return out;
}

/** 两色分面：沿竖直中线切开，左亮右暗 */
export function split(pts: number[], sh: Shades): string {
  return poly(pts, sh[1]) + facetHalf(pts, sh[0]);
}

function facetHalf(pts: number[], fill: string): string {
  const n = pts.length / 2;
  let minX = Infinity, maxX = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, pts[2 * i]);
    maxX = Math.max(maxX, pts[2 * i]);
  }
  const mid = (minX + maxX) / 2;
  // 左半边：把右侧点压到中线
  const left: number[] = [];
  for (let i = 0; i < n; i++) left.push(Math.min(pts[2 * i], mid), pts[2 * i + 1]);
  return poly(left, fill);
}

/** 八边形“圆” */
export const disc = (cx: number, cy: number, rad: number, fill: string, n = 8) => poly(ngon(cx, cy, rad, n, 22.5), fill);

/** 细线（用细长四边形） */
export function line(x1: number, y1: number, x2: number, y2: number, w: number, fill: string): string {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (w / 2), ny = (dx / len) * (w / 2);
  return poly([x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, x1 - nx, y1 - ny], fill);
}

/** 确定性伪随机（插画用，保证每次渲染一致） */
export function prng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
