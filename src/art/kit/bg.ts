import { C, S, poly, prng, rect, type Shades } from './core';

/** 三角网格天空：cols×rows 个格子，每格两个三角形 */
export function sky(sh: Shades = S.sky, o: { y0?: number; y1?: number; cols?: number; rows?: number; seed?: number } = {}): string {
  const y0 = o.y0 ?? 0, y1 = o.y1 ?? 150, cols = o.cols ?? 5, rows = o.rows ?? 2;
  const rnd = prng(o.seed ?? 7);
  const w = 240 / cols, h = (y1 - y0) / rows;
  const pt: number[][][] = [];
  for (let j = 0; j <= rows; j++) {
    pt.push([]);
    for (let i = 0; i <= cols; i++) {
      const edgeX = i === 0 || i === cols, edgeY = j === 0 || j === rows;
      pt[j].push([i * w + (edgeX ? 0 : (rnd() - 0.5) * w * 0.6), y0 + j * h + (edgeY ? 0 : (rnd() - 0.5) * h * 0.6)]);
    }
  }
  let out = rect(0, y0, 240, y1 - y0, sh[1]);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const [a, b, c, d] = [pt[j][i], pt[j][i + 1], pt[j + 1][i + 1], pt[j + 1][i]];
      const k = (i + j) % 3;
      out += poly([...a, ...b, ...c], sh[k]);
      out += poly([...a, ...c, ...d], sh[(k + 1) % 3]);
    }
  return out;
}

/** 起伏地面：从 y 到底部 */
export function ground(y: number, sh: Shades = S.sand, seed = 3, bumps = 5): string {
  const rnd = prng(seed);
  const pts: number[] = [0, 150, 0, y];
  for (let i = 1; i < bumps; i++) pts.push((240 / bumps) * i, y + (rnd() - 0.5) * 10);
  pts.push(240, y, 240, 150);
  let out = poly(pts, sh[1]);
  // 前景分面
  for (let i = 0; i < bumps; i++) {
    const x = (240 / bumps) * i;
    out += poly([x, 150, x + 240 / bumps / 2, y + 6 + rnd() * 8, x + 240 / bumps, 150], sh[i % 2 === 0 ? 0 : 2]);
  }
  return out;
}

/** 放射光（宣传画风格） */
export function rays(cx: number, cy: number, fill: string, n = 12, len = 260): string {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a0 = ((i * 2) / (n * 2)) * Math.PI * 2, a1 = ((i * 2 + 1) / (n * 2)) * Math.PI * 2;
    out += poly([cx, cy, cx + Math.cos(a0) * len, cy + Math.sin(a0) * len, cx + Math.cos(a1) * len, cy + Math.sin(a1) * len], fill);
  }
  return out;
}

/** 地图格网（经纬线） */
export function grid(fill: string = C.paper3, step = 20): string {
  let out = '';
  for (let x = step; x < 240; x += step) out += rect(x, 0, 1, 150, fill);
  for (let y = step; y < 150; y += step) out += rect(0, y, 240, 1, fill);
  return out;
}

/** 海面 */
export function sea(y: number, sh: Shades = S.sea, seed = 5): string {
  const rnd = prng(seed);
  let out = rect(0, y, 240, 150 - y, sh[1]);
  for (let i = 0; i < 6; i++) {
    const x = rnd() * 220, yy = y + 6 + rnd() * (140 - y);
    out += poly([x, yy, x + 16 + rnd() * 14, yy - 2, x + 30, yy + 1], sh[i % 2 ? 0 : 2]);
  }
  return out;
}

/** 纸底 + 边缘暗角 */
export function paper(): string {
  return rect(0, 0, 240, 150, C.paper) + poly([0, 0, 60, 0, 0, 40], C.paper2) + poly([240, 150, 170, 150, 240, 100], C.paper2);
}

/** 夜空 + 星点 */
export function night(seed = 11): string {
  const rnd = prng(seed);
  let out = sky(S.night, { seed });
  for (let i = 0; i < 14; i++) {
    const x = rnd() * 240, y = rnd() * 90;
    out += poly([x, y - 2, x + 1, y, x, y + 2, x - 1, y], C.white2);
  }
  return out;
}
