/**
 * 卡牌插画：返回 SVG 内部片段（不含外层 <svg>），坐标系 viewBox="0 0 240 150"。
 * low poly 风格：全部由多边形拼成，无渐变无滤镜。
 */
export function cardArt(id: number): string {
  void id;
  return '<rect width="240" height="150" fill="#d9cdb0"/>';
}
