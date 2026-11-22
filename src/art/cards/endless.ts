import { C, S, at, coins, documentStamp, flag, globe, ground, handshake, pagoda, palm, rays, rect, sea, ship, sky, star, warship } from '../kit';

export const ENDLESS_ART: Record<number, () => string> = {
  // 日美贸易摩擦：货轮、钱币、两面旗
  111: () =>
    sky(S.sky, { seed: 111 }) +
    sea(96, S.sea, 111) +
    at({ x: 120, y: 112, s: 1.1 }, ship({}, S.ink, S.su)) +
    at({ x: 46, y: 92 }, flag({}, 'jp', 40, 26)) +
    at({ x: 170, y: 92 }, flag({}, 'us', 40, 26)) +
    at({ x: 120, y: 54 }, coins({}, 5)),

  // 中苏友好条约：握手、条约、宝塔
  112: () =>
    rect(0, 0, 240, 150, C.su3) +
    rays(120, 70, C.su, 14) +
    at({ x: 196, y: 140, s: 0.8 }, pagoda({}, [C.su2, C.ink2, C.ink])) +
    at({ x: 58, y: 120, s: 0.9 }, documentStamp({}, C.gold)) +
    at({ x: 128, y: 92, s: 1.2 }, handshake({}, S.su, S.ink)) +
    star(120, 26, 12, C.gold2, C.gold),

  // 太平洋同盟：海面、军舰、棕榈岛
  113: () =>
    sky(S.sky, { seed: 113 }) +
    sea(84, S.sea, 113) +
    at({ x: 120, y: 114, s: 1.2 }, warship({}, S.us)) +
    at({ x: 34, y: 96, s: 0.7 }, palm({})) + at({ x: 206, y: 92, s: 0.6 }, palm({})) +
    star(120, 34, 14, C.white, C.white2),

  // 联合国维和行动：蓝盔、地球、沙地
  114: () =>
    rect(0, 0, 240, 150, C.sky2) +
    rays(120, 60, C.sky, 16) +
    at({ x: 120, y: 58 }, globe({}, 34, S.sea, S.white)) +
    ground(118, S.sand, 114) +
    at({ x: 120, y: 146 }, flag({}, 'un', 44, 28)),
};
