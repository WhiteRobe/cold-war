/**
 * 地图横向重排：DeepStruggle 布局里欧洲、中东、非洲挤在中间，两侧（大西洋、太平洋）空得多。
 * 这里把中间段横向拉开，美洲稍往左收、亚洲往右收。输入输出都是 DeepStruggle 的 1000 宽坐标。
 */
const STOPS: [number, number][] = [
  [0, -15],
  [55, 40],
  [295, 280],
  [330, 305],
  [640, 740],
  [675, 775],
  [945, 1045],
  [1000, 1100],
];

export function remapX(x: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    const [a0, b0] = STOPS[i - 1], [a1, b1] = STOPS[i];
    if (x <= a1 || i === STOPS.length - 1) return b0 + ((x - a0) * (b1 - b0)) / (a1 - a0);
  }
  return x;
}
