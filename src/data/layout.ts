/**
 * 地图横向重排：DeepStruggle 布局里欧洲、中东、非洲挤在中间，两侧（大西洋、太平洋）空得多。
 * 这里把中间段横向拉开约 1.4 倍；美洲和亚洲也拉宽约 1.3 倍，让两侧比例接近正常世界地图。输入输出都是 DeepStruggle 的 1000 宽坐标。
 */
const STOPS: [number, number][] = [
  [0, -15],
  [55, 56],
  [295, 368],
  [330, 393],
  [640, 828],
  [675, 863],
  [945, 1214],
  [1000, 1286],
];

export function remapX(x: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    const [a0, b0] = STOPS[i - 1], [a1, b1] = STOPS[i];
    if (x <= a1 || i === STOPS.length - 1) return b0 + ((x - a0) * (b1 - b0)) / (a1 - a0);
  }
  return x;
}
