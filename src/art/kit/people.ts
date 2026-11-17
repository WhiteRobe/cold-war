import { C, S, at, disc, facet, ngon, poly, type At, type Shades } from './core';

/** 正面领导人半身像，原点在胸底中心，高约 60 */
export function leader(o: At, suit: Shades = S.ink, o2: { tie?: string; hair?: string; cap?: string; beard?: boolean; glasses?: boolean } = {}): string {
  const tie = o2.tie ?? C.su;
  let s = '';
  // 肩与躯干
  s += poly([-26, 0, -22, -24, -10, -30, 0, -26, 0, 0], suit[0]);
  s += poly([26, 0, 22, -24, 10, -30, 0, -26, 0, 0], suit[2]);
  s += poly([-10, -30, 0, -26, 10, -30, 6, -14, 0, 0, -6, -14], suit[1]);
  // 衬衫与领带
  s += poly([-6, -30, 0, -22, 6, -30, 0, -32], C.white);
  s += poly([-2, -26, 2, -26, 3, -12, 0, -8, -3, -12], tie);
  // 脖子与头
  s += poly([-5, -34, 5, -34, 4, -29, -4, -29], C.skin3);
  s += facet(ngon(0, -46, 12, 7, -90, 14), S.skin, 1);
  if (o2.hair !== 'none') s += poly([-12, -50, -9, -60, 0, -62, 9, -60, 12, -50, 8, -55, -6, -56], o2.hair ?? C.ink2);
  if (o2.cap) s += poly([-14, -54, -10, -64, 10, -64, 14, -54, 18, -52, -18, -52], o2.cap);
  if (o2.beard) s += poly([-10, -42, -6, -34, 0, -32, 6, -34, 10, -42, 6, -38, -6, -38], C.ink2);
  if (o2.glasses) s += poly([-9, -48, -2, -48, -2, -45, -9, -45], C.ink) + poly([2, -48, 9, -48, 9, -45, 2, -45], C.ink);
  // 眼睛
  s += poly([-6, -47, -3, -47, -3, -45, -6, -45], C.ink) + poly([3, -47, 6, -47, 6, -45, 3, -45], C.ink);
  return at(o, s);
}

/** 侧面领导人（朝右），原点胸底 */
export function profile(o: At, suit: Shades = S.ink, o2: { hair?: string; cap?: string; nose?: number; beard?: boolean } = {}): string {
  const nose = o2.nose ?? 5;
  let s = '';
  s += poly([-24, 0, -20, -26, -4, -32, 14, -26, 18, 0], suit[1]);
  s += poly([-24, 0, -20, -26, -4, -32, -6, 0], suit[2]);
  s += poly([4, -32, 10, -30, 8, -22, 2, -26], C.white);
  s += poly([-6, -34, 4, -34, 4, -30, -6, -30], C.skin3);
  // 头部侧面：后脑、额、鼻、下巴
  s += poly([-10, -40, -10, -56, -2, -64, 8, -62, 12, -54, 12 + nose, -48, 12, -46, 12, -40, 6, -34, -4, -34], C.skin);
  s += poly([-10, -40, -10, -56, -2, -64, 0, -48, -4, -34], C.skin3);
  s += poly([4, -54, 7, -54, 7, -52, 4, -52], C.ink);
  if (o2.hair !== 'none') s += poly([-12, -44, -12, -58, -4, -66, 8, -64, 10, -60, -2, -60, -6, -48], o2.hair ?? C.ink2);
  if (o2.cap) s += poly([-14, -58, -10, -68, 10, -68, 16, -60, 22, -59, 22, -57, -14, -56], o2.cap);
  if (o2.beard) s += poly([0, -40, 12, -40, 10, -34, 2, -32], C.ink2);
  return at(o, s);
}

/** 士兵（钢盔 + 步枪），原点脚底中心，高约 56 */
export function soldier(o: At, uni: Shades = S.green, helmet: string = C.green3): string {
  let s = '';
  s += poly([-8, 0, -6, -22, -1, -22, -2, 0], uni[2]);
  s += poly([8, 0, 6, -22, 1, -22, 2, 0], uni[1]);
  s += poly([-10, -22, -9, -40, 0, -44, 9, -40, 10, -22], uni[1]);
  s += poly([-10, -22, -9, -40, 0, -44, 0, -22], uni[0]);
  s += facet(ngon(0, -49, 5, 6, -90, 6), S.skin);
  s += poly([-8, -50, -6, -56, 0, -58, 6, -56, 8, -50, 0, -52], helmet);
  // 步枪
  s += poly([10, -54, 12, -54, 13, -18, 11, -18], C.ink);
  s += poly([9, -30, 14, -30, 14, -24, 9, -24], C.ne3);
  return at(o, s);
}

/** 人群：一排头肩剪影 */
export function crowd(o: At, n = 7, sh: Shades = S.ink, seed = 1, w = 200): string {
  let s = '';
  let k = seed;
  for (let i = 0; i < n; i++) {
    k = (k * 7 + 3) % 11;
    const x = -w / 2 + (w / (n - 1 || 1)) * i;
    const h = 18 + (k % 4) * 3;
    s += poly([x - 11, 0, x - 9, -h + 6, x, -h + 2, x + 9, -h + 6, x + 11, 0], sh[i % 3]);
    s += disc(x, -h - 4, 6, sh[(i + 1) % 3], 6);
  }
  return at(o, s);
}

/** 抗议者举牌 */
export function protester(o: At, sign: string = C.white, sh: Shades = S.ink): string {
  let s = '';
  s += poly([-9, 0, -7, -26, 0, -30, 7, -26, 9, 0], sh[1]);
  s += disc(0, -36, 6, sh[0], 6);
  s += poly([7, -26, 11, -48, 13, -48, 9, -26], sh[2]);
  s += poly([4, -66, 22, -66, 22, -50, 4, -50], sign);
  return at(o, s);
}

/** 科学家（白大褂 + 眼镜） */
export function scientist(o: At): string {
  return leader(o, S.white, { tie: C.ink2, glasses: true, hair: C.ne2 });
}

/** 宇航员，原点脚底 */
export function astronaut(o: At, suit: Shades = S.white, visor: string = C.gold): string {
  let s = '';
  s += poly([-10, 0, -9, -18, -2, -18, -3, 0], suit[2]);
  s += poly([10, 0, 9, -18, 2, -18, 3, 0], suit[1]);
  s += poly([-13, -18, -12, -40, 12, -40, 13, -18], suit[1]);
  s += poly([-13, -18, -12, -40, 0, -40, 0, -18], suit[0]);
  s += poly([-18, -38, -13, -40, -13, -26, -18, -24], suit[2]);
  s += poly([18, -38, 13, -40, 13, -26, 18, -24], suit[2]);
  s += poly([-6, -34, 6, -34, 6, -26, -6, -26], C.us);
  s += facet(ngon(0, -50, 12, 8, 22.5), suit);
  s += poly(ngon(0, -50, 8, 6, 0, 6), visor);
  s += poly([2, -54, 6, -52, 4, -48], C.gold2);
  return at(o, s);
}

/** 握手 */
export function handshake(o: At, left: Shades = S.us, right: Shades = S.su): string {
  let s = '';
  s += poly([-50, -6, -18, -10, -16, 6, -50, 8], left[1]);
  s += poly([-50, -6, -18, -10, -18, -2, -50, 0], left[0]);
  s += poly([50, -6, 18, -10, 16, 6, 50, 8], right[1]);
  s += poly([50, 0, 18, -2, 16, 6, 50, 8], right[2]);
  s += poly([-18, -8, -4, -14, 14, -10, 18, 0, 8, 10, -10, 8], C.skin);
  s += poly([-4, -14, 14, -10, 6, -4, -8, -6], C.skin2);
  s += poly([-10, 8, 8, 10, 2, 2], C.skin3);
  return at(o, s);
}

/** 大手（伸出手指指点） */
export function pointHand(o: At, cuff: Shades = S.ink): string {
  let s = '';
  s += poly([-30, -8, -6, -8, -6, 10, -30, 10], cuff[1]);
  s += poly([-6, -10, 14, -10, 16, 0, 14, 10, -6, 10], C.skin);
  s += poly([14, -8, 36, -6, 36, -1, 14, -2], C.skin2);
  s += poly([-6, 2, 14, 2, 14, 10, -6, 10], C.skin3);
  return at(o, s);
}
