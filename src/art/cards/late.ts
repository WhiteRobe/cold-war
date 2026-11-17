import {
  C, S, at, barrel, blast, chessKing, coins, crowd, disc, documentStamp, facet, flag, globe, ground, handshake, jet, kremlin,
  leader, line, missile, mosque, mountains, ngon, night, poly, protester, rays, rect, satellite, sea, sky, skyline, spy, star,
  tank, wall, warship, podium, ship, type At,
} from '../kit';

/** 起重机（船厂） */
const crane = (o: At) => at(o, rect(-3, -90, 6, 90, C.ink3), poly([-3, -90, 60, -90, 60, -84, -3, -84], C.ink3), line(50, -84, 50, -50, 1, C.ink), rect(44, -50, 12, 8, C.su));

/** 海上钻井平台 */
const platform = (o: At) =>
  at(o, rect(-30, -10, 4, 30, C.ink3), rect(26, -10, 4, 30, C.ink3), rect(-2, -10, 4, 30, C.ink3), rect(-40, -20, 80, 10, C.ne3), rect(-30, -40, 30, 20, C.white2), poly([10, -20, 18, -80, 22, -80, 30, -20], C.ink2), poly([22, -80, 36, -96, 40, -94, 26, -78], C.fire));

/** 核电站反应堆 */
const reactor = (o: At) =>
  at(o, poly([-30, 0, -24, -50, 24, -50, 30, 0], C.white2), poly([-30, 0, -24, -50, 0, -50, 0, 0], C.white), rect(40, -40, 50, 40, C.ne2), rect(70, -70, 8, 30, C.ne3));

/** 电脑屏幕 */
const screen = (o: At, inner: string) => at(o, rect(-70, -50, 140, 90, C.ink2), rect(-62, -42, 124, 74, C.night3), inner, rect(-20, 40, 40, 10, C.ink3));

export const LATE_ART: Record<number, () => string> = {
  // 伊朗人质危机：大使馆、愤怒人群
  82: () =>
    sky(S.sand, { seed: 82 }) + rect(60, 50, 140, 76, C.white2) + [70, 100, 130, 160].map((x) => rect(x, 64, 18, 22, C.ne3)).join('') +
    flag({ x: 190, y: 56, s: 0.5 }, 'us', 40, 26) + barbed2(110) + ground(126, S.sand, 82) +
    at({ x: 120, y: 150 }, crowd({}, 11, S.ink, 12, 220)) + protester({ x: 40, y: 150 }, C.white),

  // 铁娘子：英国国旗、舰队
  83: () =>
    sky(S.sky, { seed: 83 }) + sea(108, S.sea, 83) + warship({ x: 170, y: 126 }, S.ink) + warship({ x: 220, y: 116, s: 0.6 }, S.ink) +
    flag({ x: 30, y: 100, s: 0.8 }, 'uk', 46, 30) +
    leader({ x: 100, y: 150, s: 1.2 }, S.us, { tie: C.white, hair: C.gold3 }) +
    poly([84, -0 + 92, 100, 80, 116, 92, 110, 84, 90, 84], C.gold3),

  // 里根轰炸利比亚：轰炸机、沙漠爆炸
  84: () =>
    sky(S.sand, { seed: 84 }) + ground(120, S.sand, 84) + mosque({ x: 60, y: 120, s: 0.8 }) +
    jet({ x: 150, y: 36, r: 10, s: 1.1 }, S.ne) + jet({ x: 200, y: 56, r: 10, s: 0.7 }, S.ne) +
    blast({ x: 120, y: 112 }, 18) + blast({ x: 170, y: 120 }, 12),

  // 星球大战：卫星激光拦截导弹
  85: () =>
    night(85) + globe({ x: 120, y: 190 }, 90) +
    satellite({ x: 70, y: 36, s: 1.2 }, S.us) + line(80, 40, 170, 90, 3, C.su2) + line(80, 40, 200, 60, 2, C.su2) +
    at({ x: 170, y: 96, r: 40 }, missile({ s: 0.4 }, S.white, C.su)) + blast({ x: 170, y: 90 }, 10) +
    at({ x: 204, y: 66, r: 40 }, missile({ s: 0.4 }, S.white, C.su)),

  // 北海油田：海上钻井平台
  86: () => sky(S.sky, { seed: 86 }) + sea(110, S.sea, 86) + platform({ x: 120, y: 120, s: 1.1 }) + ship({ x: 40, y: 126, s: 0.4 }),

  // 改革者：带胎记的领导人、红旗
  87: () =>
    rect(0, 0, 240, 150, C.su3) + rays(120, 30, C.su, 12) + kremlin({ x: 30, y: 150, s: 0.9 }) +
    leader({ x: 130, y: 150, s: 1.5 }, S.ink, { hair: 'none', tie: C.su }) +
    poly([124, 72, 134, 68, 140, 74, 130, 78], C.su3),

  // 海军陆战队军营爆炸：废墟、烟尘
  88: () =>
    sky(S.sand, { seed: 88 }) + ground(124, S.sand, 88) +
    poly([60, 124, 60, 80, 80, 70, 100, 90, 110, 70, 130, 84, 150, 64, 170, 80, 180, 124], C.white2) +
    poly([60, 124, 60, 80, 80, 70, 90, 124], C.paper3) +
    facet(ngon(120, 46, 40, 8, 0, 26), S.ink) + blast({ x: 120, y: 86 }, 22),

  // 苏联击落大韩航空 007
  89: () =>
    night(89) + sea(118, S.night, 89) + jet({ x: 130, y: 50, s: 1.4, r: 6 }, S.white) +
    line(30, 118, 120, 56, 2, C.white2) + blast({ x: 124, y: 54 }, 14) + star(30, 20, 6, C.su),

  // 公开性：克里姆林宫透出的光
  90: () =>
    rect(0, 0, 240, 150, C.sky2) + rays(120, 150, C.white, 12) + kremlin({ x: 120, y: 150, s: 1.2 }) +
    kremlin({ x: 60, y: 150, s: 0.8 }) + kremlin({ x: 180, y: 150, s: 0.8 }) + rect(0, 140, 240, 10, C.su3),

  // 奥尔特加当选尼加拉瓜总统
  91: () =>
    sky(S.sky, { seed: 91 }) + mountains(120, S.green, [[60, 50], [190, 64]]) + ground(120, S.green, 91) +
    at({ x: 170, y: 120 }, rect(-2, -74, 3, 74, C.ink2), rect(2, -70, 48, 10, C.us2), rect(2, -60, 48, 10, C.white), rect(2, -50, 48, 10, C.us2)) +
    leader({ x: 80, y: 150, s: 1.3 }, S.green, { glasses: true, tie: C.su, hair: C.ink }),

  // 恐怖主义：城市爆炸
  92: () => sky(S.night, { seed: 92 }) + skyline(150, S.ink, 92) + blast({ x: 120, y: 70 }, 30) + facet(ngon(120, 40, 34, 7), S.ink),

  // 伊朗门丑闻：秘密文件、钱、间谍
  93: () =>
    rect(0, 0, 240, 150, C.night3) + at({ x: 60, y: 150, s: 1.3 }, spy({}, S.ne)) +
    documentStamp({ x: 150, y: 70, r: -8 }, C.su) + documentStamp({ x: 190, y: 86, r: 10, s: 0.8 }, C.us) +
    at({ x: 130, y: 140 }, coins({}, 4)) + barrel({ x: 210, y: 146 }),

  // 切尔诺贝利：反应堆与放射标记
  94: () => {
    let s = sky([C.gold2, C.sand, C.ne2], { seed: 94 }) + ground(126, S.ne, 94) + reactor({ x: 90, y: 126 });
    for (let i = 0; i < 3; i++) {
      const a = (i * 120 - 90) * (Math.PI / 180);
      s += poly([190, 40, 190 + Math.cos(a - 0.5) * 26, 40 + Math.sin(a - 0.5) * 26, 190 + Math.cos(a + 0.5) * 26, 40 + Math.sin(a + 0.5) * 26], C.ink);
    }
    return s + disc(190, 40, 5, C.gold2, 6) + facet(ngon(90, 60, 22, 6), S.ink);
  },

  // 拉美债务危机：下跌的柱状图与散落钱币
  95: () =>
    rect(0, 0, 240, 150, C.paper2) + rect(30, 40, 30, 100, C.green) + rect(80, 70, 30, 70, C.gold) + rect(130, 100, 30, 40, C.fire) + rect(180, 124, 30, 16, C.su) +
    line(30, 30, 210, 120, 4, C.su3) + poly([210, 120, 196, 108, 214, 104], C.su3) +
    at({ x: 120, y: 148, r: 20 }, coins({}, 2)) + at({ x: 220, y: 148 }, coins({}, 1)) + rect(0, 140, 240, 10, C.paper3),

  // 推倒这堵墙
  96: () =>
    sky(S.sky, { seed: 96 }) +
    wall(0, 240, 70, S.ne, true) +
    at({ x: 120, y: 64 }, crowd({}, 9, S.ink, 9, 200)) +
    protester({ x: 40, y: 146 }, C.white) + protester({ x: 200, y: 146 }, C.su2) +
    flag({ x: 120, y: 148, s: 0.6 }, 'de', 40, 26),

  // “邪恶帝国”：演讲台与阴影中的克里姆林宫
  97: () =>
    rect(0, 0, 240, 150, C.night3) + kremlin({ x: 190, y: 150, s: 1.2 }, [C.night2, C.night, C.night3]) +
    flag({ x: 30, y: 110 }, 'us', 46, 30) +
    leader({ x: 110, y: 112 }, S.ink, { tie: C.su, hair: C.ink3 }) + podium({ x: 110, y: 150 }, S.us, C.gold),

  // 艾姆斯间谍案
  98: () =>
    rect(0, 0, 240, 150, C.su3) + at({ x: 70, y: 150, s: 1.4 }, spy({}, S.ink)) +
    documentStamp({ x: 160, y: 70, r: 12 }, C.us) + at({ x: 190, y: 140 }, coins({}, 5)) + star(200, 24, 8, C.gold2),

  // 部署潘兴 II：欧洲的导弹发射车
  99: () =>
    sky(S.sky, { seed: 99 }) + mountains(120, S.green, [[50, 40], [200, 50]]) + ground(120, S.green, 99) +
    at({ x: 120, y: 132 }, rect(-50, -10, 100, 14, C.green3), disc(-36, 6, 6, C.ink, 6), disc(0, 6, 6, C.ink, 6), disc(36, 6, 6, C.ink, 6)) +
    at({ x: 100, y: 122, r: 60 }, missile({ s: 0.9 }, S.green, C.ink)) + flag({ x: 30, y: 116, s: 0.6 }, 'de', 40, 26),

  // 战争游戏：电脑屏幕上的世界地图与棋王
  100: () => {
    let inner = '';
    for (let x = -52; x <= 52; x += 13) inner += rect(x, -40, 1, 70, C.night2);
    for (let y = -34; y <= 26; y += 12) inner += rect(-60, y, 120, 1, C.night2);
    inner += poly([-50, -26, -30, -32, -20, -18, -34, -6, -46, -12], C.green) + poly([-30, 0, -20, -4, -16, 14, -26, 22], C.green);
    inner += poly([-6, -30, 14, -32, 40, -26, 46, -10, 24, -4, 6, -14], C.green) + poly([0, -2, 12, -2, 14, 16, 4, 20], C.green);
    // 导弹弹道
    for (const [a, b, c, d] of [[-40, -18, 24, -20], [30, -18, -36, -20], [20, -10, -24, 8]]) {
      const mx = (a + c) / 2, my = Math.min(b, d) - 18;
      inner += line(a, b, mx, my, 1.5, C.su2) + line(mx, my, c, d, 1.5, C.su2);
    }
    return rect(0, 0, 240, 150, C.ink) + screen({ x: 110, y: 80 }, inner) + chessKing({ x: 210, y: 140 });
  },

  // 团结工会：船厂起重机、波兰国旗、工人
  101: () =>
    sky(S.sky, { seed: 101 }) + crane({ x: 160, y: 120 }) + crane({ x: 210, y: 120, s: 0.7 }) + ground(120, S.ne, 101) +
    flag({ x: 40, y: 116 }, 'pl', 46, 30) + at({ x: 120, y: 150 }, crowd({}, 9, S.ne, 13, 200)),

  // 两伊战争：沙漠坦克、两国旗
  102: () =>
    sky(S.sand, { seed: 102 }) + ground(116, S.sand, 102) +
    tank({ x: 60, y: 136 }, S.sand) + tank({ x: 180, y: 136, flip: true }, S.ne) +
    flag({ x: 20, y: 108, s: 0.6 }, 'tri', 40, 26, [C.green, C.white, C.su]) + flag({ x: 200, y: 108, s: 0.6 }, 'tri', 40, 26, [C.su, C.white, C.ink]) +
    blast({ x: 120, y: 112 }, 14),

  // 尤里和萨曼莎：两个孩子握手
  109: () =>
    sky(S.sky, { seed: 109 }) + ground(124, S.green, 109) +
    at({ x: 80, y: 150, s: 0.8 }, leader({}, S.us, { tie: C.white, hair: C.ne3 })) + at({ x: 160, y: 150, s: 0.8 }, leader({}, S.su, { tie: C.white, hair: C.gold3 })) +
    handshake({ x: 120, y: 118, s: 0.5 }, S.us, S.su) + flag({ x: 20, y: 110, s: 0.6 }, 'us', 40, 26) + flag({ x: 200, y: 110, s: 0.6 }, 'su', 40, 26),

  // 向沙特出售预警机
  110: () =>
    sky(S.sand, { seed: 110 }) + ground(120, S.sand, 110) + mosque({ x: 60, y: 120, s: 0.7 }) +
    jet({ x: 140, y: 56, s: 1.4 }, S.white) + poly(ngon(130, 46, 16, 8, 0, 4), C.ink2) + rect(128, 48, 4, 4, C.ink2) +
    flag({ x: 200, y: 116, s: 0.6 }, 'plain', 40, 26, [C.green]),
};

function barbed2(y: number) {
  let s = line(0, y, 240, y, 1.5, C.ink2);
  for (let x = 6; x < 240; x += 14) s += poly([x - 3, y - 3, x + 3, y + 3, x + 3, y - 3, x - 3, y + 3], C.ink2);
  return s;
}

