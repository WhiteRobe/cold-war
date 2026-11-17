import {
  C, S, astronaut, at, barrel, blast, canal, capitol, coins, cross, crowd, disc, documentStamp, eye, facet, flag, globe, ground,
  handshake, hut, jet, lander, leader, line, missile, moonSurface, mosque, mountains, mushroom, ngon, night, oilWell, pagoda,
  palm, pine, podium, pointHand, poly, profile, protester, radar, rays, rect, sea, ship, sky, soldier, spy, star, submarine,
  table, tank, warship, wheat, flame, chain, pyramid, type At,
} from '../kit';

/** 新月 */
const crescent = (cx: number, cy: number, r: number, fill: string, bg: string) => poly(ngon(cx, cy, r, 10, 18), fill) + poly(ngon(cx + r * 0.35, cy - r * 0.1, r * 0.82, 10, 18), bg);

/** 花 */
const flower = (o: At, petal: string) => at(o, line(0, 0, 0, 24, 2, C.green3), ...[0, 72, 144, 216, 288].map((a) => poly(ngon(Math.cos((a * Math.PI) / 180) * 6, Math.sin((a * Math.PI) / 180) * 6, 5, 5, a), petal)), disc(0, 0, 3, C.gold2, 6));

/** 智利国旗 */
const chile = (o: At) => at(o, rect(-2, -74, 3, 74, C.ink2), rect(2, -70, 48, 15, C.white), rect(2, -55, 48, 15, C.su), rect(2, -70, 16, 15, C.us), star(10, -62, 4, C.white));

export const MID_ART: Record<number, () => string> = {
  // 局部战争：丛林、士兵、爆炸
  36: () =>
    sky(S.sand, { seed: 36 }) +
    at({ x: 26, y: 118 }, palm({})) + at({ x: 216, y: 116, s: 1.1 }, palm({})) + ground(116, S.green, 36) +
    soldier({ x: 80, y: 140 }, S.green) + soldier({ x: 110, y: 136 }, S.green) + soldier({ x: 176, y: 140, flip: true }, S.sand, C.sand3) +
    blast({ x: 146, y: 106 }, 16),

  // 军备竞赛：红蓝导弹并列升空
  39: () =>
    rect(0, 0, 240, 150, C.paper2) +
    rect(40, 120, 36, 30, C.us3) + rect(100, 96, 36, 54, C.su3) + rect(160, 70, 36, 80, C.us3) +
    missile({ x: 58, y: 118, s: 0.8 }, S.white, C.us) + missile({ x: 118, y: 94, s: 0.8 }, S.white, C.su) +
    missile({ x: 178, y: 68, s: 0.8 }, S.white, C.us) +
    flame({ x: 58, y: 118 }) + flame({ x: 118, y: 94 }) + flame({ x: 178, y: 68 }),

  // 古巴导弹危机
  40: () =>
    night(40) + sea(106, S.night, 40) +
    facet([40, 112, 90, 100, 160, 102, 200, 112, 150, 120, 70, 120], S.green) +
    at({ x: 110, y: 106, r: 30 }, missile({ s: 0.9 }, S.white, C.su)) +
    poly([96, 108, 124, 108, 120, 98, 100, 98], C.ink3) +
    at({ x: 60, y: 102, s: 0.5 }, palm({}, C.ink3, S.night)) +
    warship({ x: 50, y: 136, s: 0.8 }, S.us) + warship({ x: 190, y: 140, s: 0.9, flip: true }, S.us) +
    star(200, 24, 6, C.su2),

  // 核潜艇：水下潜艇
  41: () =>
    rect(0, 0, 240, 150, C.sea3) + rect(0, 0, 240, 30, C.sea2) +
    poly([0, 30, 60, 26, 120, 32, 180, 26, 240, 30, 240, 36, 0, 36], C.sea) +
    submarine({ x: 120, y: 100, s: 1.3 }, S.us) +
    at({ x: 40, y: 28, r: 12 }, missile({ s: 0.35 }, S.white, C.us)) +
    poly([0, 150, 60, 140, 140, 146, 240, 136, 240, 150], C.night3),

  // 泥潭：丛林沼泽、深陷的美军
  42: () =>
    sky(S.green, { seed: 42 }) +
    at({ x: 30, y: 110 }, palm({}, C.ne3, [C.green3, C.green3, C.ink3])) + at({ x: 200, y: 106, s: 1.2 }, palm({}, C.ne3, [C.green3, C.green3, C.ink3])) +
    rect(0, 106, 240, 44, C.ne3) +
    soldier({ x: 120, y: 150, s: 1.3 }, S.us, C.us3) +
    rect(0, 126, 240, 24, C.ne3) + poly([0, 126, 60, 122, 140, 128, 240, 122, 240, 130, 0, 132], C.ne),

  // 战略武器限制谈判：谈判桌、两国国旗、条约
  43: () =>
    rect(0, 0, 240, 150, C.paper) + rect(0, 0, 240, 90, C.paper2) +
    flag({ x: 40, y: 100 }, 'us', 40, 26) + flag({ x: 190, y: 100 }, 'su', 40, 26) +
    leader({ x: 70, y: 108, s: 0.8 }, S.us) + leader({ x: 170, y: 108, s: 0.8 }, S.ink, { hair: C.ne2 }) +
    table({ x: 120, y: 112 }, S.ne, 200) +
    documentStamp({ x: 120, y: 92, s: 0.5, r: 90 }, C.ne3),

  // 熊陷阱：阿富汗山地、苏军坦克、游击队
  44: () =>
    sky(S.sand, { seed: 44 }) +
    mountains(116, S.ne, [[40, 70], [130, 90], [220, 60]]) + ground(116, S.sand, 44) +
    tank({ x: 110, y: 138 }, S.su) +
    soldier({ x: 30, y: 116, s: 0.6 }, S.sand, C.white2) + soldier({ x: 210, y: 112, s: 0.6, flip: true }, S.sand, C.white2) +
    blast({ x: 150, y: 120 }, 12),

  // 首脑峰会：两位领导人、谈判桌
  45: () =>
    rect(0, 0, 240, 150, C.sky2) + rays(120, 50, C.sky, 10) +
    leader({ x: 70, y: 112 }, S.us) + leader({ x: 170, y: 112 }, S.ink, { hair: 'none' }) +
    table({ x: 120, y: 114 }, S.ne, 220) +
    flag({ x: 116, y: 106, s: 0.45 }, 'us', 30, 20) + flag({ x: 130, y: 106, s: 0.45 }, 'su', 30, 20),

  // 我如何学会停止忧虑：骑着核弹俯冲
  46: () =>
    sky(S.sand, { seed: 46 }) + ground(124, S.sand, 46) +
    at({ x: 160, y: 120, s: 0.6 }, mushroom({})) +
    at({ x: 90, y: 60, r: 120 }, missile({ s: 1.1 }, S.ne, C.ink)) +
    at({ x: 80, y: 52, r: -30, s: 0.6 }, soldier({}, S.ne, C.ink2)) +
    poly([60, 30, 68, 24, 74, 34], C.ink2),

  // 军政府：将军、总统府、坦克
  47: () =>
    sky(S.sky, { seed: 47 }) +
    rect(120, 50, 110, 76, C.white2) + poly([116, 50, 234, 50, 175, 30], C.paper3) +
    [130, 152, 174, 196, 218].map((x) => rect(x, 60, 6, 66, C.white)).join('') +
    ground(126, S.ne, 47) +
    leader({ x: 70, y: 150, s: 1.3 }, S.green, { cap: C.green3, tie: C.green3, glasses: true }) +
    tank({ x: 180, y: 146, s: 0.8, flip: true }, S.green),

  // 厨房辩论
  48: () =>
    rect(0, 0, 240, 150, C.paper) +
    rect(0, 0, 240, 70, C.sky2) +
    rect(30, 14, 50, 36, C.white) + rect(32, 16, 22, 32, C.sky) + rect(56, 16, 22, 32, C.sky) +
    rect(150, 20, 70, 26, C.white2) + rect(152, 22, 32, 22, C.paper2) + rect(186, 22, 32, 22, C.paper2) +
    leader({ x: 60, y: 120, s: 1.1 }, S.us, { tie: C.su, hair: C.ink2 }) +
    leader({ x: 180, y: 120, s: 1.1 }, S.ink, { tie: C.ink3, hair: 'none' }) +
    pointHand({ x: 98, y: 86, s: 0.8 }, S.us) + pointHand({ x: 142, y: 82, s: 0.8, flip: true }, S.ink) +
    poly([0, 150, 0, 118, 240, 118, 240, 150], C.ne2) + rect(0, 114, 240, 6, C.white2) +
    rect(20, 124, 40, 22, C.white) + rect(180, 124, 40, 22, C.white) + rect(96, 124, 48, 22, C.ne3),

  // 导弹嫉妒：两位领导人比较导弹
  49: () =>
    rect(0, 0, 240, 150, C.paper2) +
    missile({ x: 90, y: 140, s: 1.2 }, S.white, C.us) + missile({ x: 150, y: 140, s: 0.8 }, S.white, C.su) +
    leader({ x: 40, y: 150, s: 1.0 }, S.ink, { hair: 'none' }) + leader({ x: 200, y: 150, s: 1.0 }, S.us) +
    rect(0, 140, 240, 10, C.paper3),

  // 我们将埋葬你们：拍桌的领导人
  50: () =>
    rect(0, 0, 240, 150, C.su) + rays(120, 150, C.su2, 12) +
    flag({ x: 30, y: 110 }, 'su', 46, 30) +
    leader({ x: 130, y: 120, s: 1.3 }, S.ink, { hair: 'none' }) +
    podium({ x: 130, y: 150 }, S.ne) +
    pointHand({ x: 176, y: 86, r: -30 }, S.ink),

  // 勃列日涅夫主义：浓眉领导人、坦克、红旗
  51: () =>
    rect(0, 0, 240, 150, C.su3) + rays(120, 40, C.su, 12) +
    tank({ x: 46, y: 146, s: 0.7 }, S.green) + tank({ x: 194, y: 146, s: 0.7, flip: true }, S.green) +
    leader({ x: 120, y: 130, s: 1.3 }, S.ink, { hair: C.ink, tie: C.su }) +
    rect(104, 62, 12, 3, C.ink) + rect(124, 62, 12, 3, C.ink) +
    star(120, 20, 10, C.gold2),

  // 葡萄牙帝国崩溃：非洲、断链、新国旗
  52: () =>
    rect(0, 0, 240, 150, C.gold2) + rays(120, 130, C.gold, 12) + ground(118, S.sand, 52) +
    at({ x: 30, y: 136 }, palm({})) + at({ x: 210, y: 134 }, palm({})) +
    flag({ x: 140, y: 116 }, 'tri', 46, 30, [C.su, C.ink, C.gold]) +
    chain({ x: 90, y: 60, s: 1.1 }, true, C.ink2),

  // 南非动荡：抗议人群、太阳
  53: () =>
    rect(0, 0, 240, 150, C.fire2) + poly(ngon(120, 120, 40, 8, 22.5), C.gold2) + ground(118, S.sand, 53) +
    protester({ x: 50, y: 146 }) + protester({ x: 90, y: 142 }, C.gold) + protester({ x: 150, y: 146 }) + protester({ x: 190, y: 142 }, C.su2) +
    at({ x: 120, y: 150 }, crowd({}, 7, S.ink, 5, 200)),

  // 阿连德：戴眼镜的侧面像、智利国旗
  54: () =>
    sky(S.sky, { seed: 54 }) + mountains(120, S.ne, [[180, 60], [230, 40]]) + ground(120, S.green, 54) +
    chile({ x: 170, y: 120 }) +
    leader({ x: 80, y: 150, s: 1.4 }, S.ink, { glasses: true, tie: C.su }),

  // 维利·勃兰特：领导人、西德国旗、握手
  55: () =>
    sky(S.paper, { seed: 55 }) +
    flag({ x: 30, y: 110 }, 'de', 46, 30) +
    leader({ x: 120, y: 150, s: 1.3 }, S.ne, { tie: C.su, hair: C.ink2 }) +
    handshake({ x: 196, y: 120, s: 0.6 }, S.ne, S.su),

  // 穆斯林革命：清真寺、新月、人群
  56: () =>
    rect(0, 0, 240, 150, C.green3) + crescent(190, 36, 18, C.gold2, C.green3) +
    mosque({ x: 100, y: 118, s: 1.4 }) + ground(118, S.sand, 56) +
    at({ x: 120, y: 150 }, crowd({}, 9, S.ink, 6, 220)),

  // 反弹道导弹条约：雷达、拦截导弹、条约
  57: () =>
    sky(S.sky, { seed: 57 }) + ground(124, S.ne, 57) +
    radar({ x: 60, y: 124 }) +
    missile({ x: 150, y: 124, s: 0.8 }, S.white, C.us) + line(130, 120, 190, 40, 4, C.su) + line(190, 120, 130, 40, 4, C.su) +
    documentStamp({ x: 214, y: 110, s: 0.5 }, C.ne3),

  // 文化大革命：红色放射、举红宝书的人群
  58: () =>
    rect(0, 0, 240, 150, C.su) + rays(120, 40, C.su2, 16) + star(120, 40, 16, C.gold2) +
    pagoda({ x: 120, y: 118, s: 0.9 }, [C.su3, C.ink2, C.ink2]) +
    at({ x: 120, y: 150 }, crowd({}, 9, [C.ne, C.ne3, C.green3], 8, 220)) +
    [30, 70, 170, 210].map((x) => rect(x, 104, 8, 10, C.su3)).join(''),

  // 花之力：抗议者与鲜花
  59: () =>
    rect(0, 0, 240, 150, C.gold2) + rays(120, 80, C.white, 14) +
    protester({ x: 70, y: 146 }, C.white) + protester({ x: 170, y: 146 }, C.white) +
    flower({ x: 40, y: 120 }, C.su2) + flower({ x: 120, y: 100 }, C.us2) + flower({ x: 200, y: 116 }, C.fire2) + flower({ x: 140, y: 128 }, C.su2) +
    ground(136, S.green, 59),

  // U-2 事件：高空侦察机被击中
  60: () =>
    sky(S.night, { seed: 60 }) + ground(130, S.ne, 60) +
    jet({ x: 110, y: 50, r: 20, s: 1.2 }, S.ink) + line(40, 130, 120, 62, 2, C.white2) +
    blast({ x: 124, y: 58 }, 14) + rect(0, 140, 240, 10, C.su3),

  // 石油输出国组织：沙漠油井、油桶
  61: () =>
    sky(S.sand, { seed: 61 }) + ground(118, S.sand, 61) +
    oilWell({ x: 70, y: 120 }) + oilWell({ x: 170, y: 116, s: 0.8, flip: true }) +
    barrel({ x: 110, y: 140 }) + barrel({ x: 134, y: 142 }) + barrel({ x: 122, y: 116 }),

  // 孤胆枪手：教科书大楼窗口与车队
  62: () =>
    sky(S.sky, { seed: 62 }) +
    rect(130, 10, 110, 120, C.su3) + [0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3].map((k) => rect(140 + k * 24, 20 + r * 22, 14, 14, r === 1 && k === 1 ? C.ink : C.paper3)).join('')).join('') +
    line(178, 50, 150, 70, 2, C.ink) +
    ground(130, S.ne, 62) + poly([10, 136, 90, 136, 96, 128, 80, 122, 30, 122, 16, 128], C.ink2) +
    disc(30, 138, 5, C.ink, 6) + disc(80, 138, 5, C.ink, 6),

  // 殖民地后卫：殖民军、棕榈
  63: () =>
    sky(S.sand, { seed: 63 }) + ground(118, S.sand, 63) + at({ x: 30, y: 120 }, palm({})) + hut({ x: 200, y: 120 }) +
    soldier({ x: 100, y: 142 }, S.sand, C.white2) + soldier({ x: 130, y: 140 }, S.sand, C.white2) +
    flag({ x: 160, y: 120, s: 0.7 }, 'fr', 40, 26),

  // 归还巴拿马运河
  64: () =>
    sky(S.sky, { seed: 64 }) + canal(90) +
    ship({ x: 120, y: 120, r: -90, s: 0.5 }) +
    flag({ x: 40, y: 100, s: 0.7 }, 'tri', 40, 26, [C.white, C.su, C.us]) + flag({ x: 200, y: 100, s: 0.7 }, 'us', 40, 26),

  // 戴维营协议：三位领导人
  65: () =>
    sky(S.green, { seed: 65 }) + pine({ x: 20, y: 120, s: 1.4 }) + pine({ x: 220, y: 124, s: 1.2 }) + ground(120, S.green, 65) +
    leader({ x: 70, y: 150 }, S.ink, { hair: C.ne2 }) + leader({ x: 120, y: 146 }, S.us) + leader({ x: 170, y: 150 }, S.ink, { glasses: true }) +
    handshake({ x: 120, y: 120, s: 0.6 }, S.ink, S.us),

  // 傀儡政府：提线木偶
  66: () => {
    let s = rect(0, 0, 240, 150, C.paper2) + pointHand({ x: 120, y: 20, r: 90, s: 1.2 }, S.us);
    for (const x of [100, 120, 140]) s += line(120, 44, x, 80, 1, C.ink3);
    s += leader({ x: 120, y: 140, s: 0.9 }, S.ne, { tie: C.us });
    s += rect(0, 140, 240, 10, C.paper3);
    return s;
  },

  // 向苏联出售谷物：麦田与粮船
  67: () =>
    sky(S.sky, { seed: 67 }) + sea(96, S.sea, 67) + ship({ x: 160, y: 100 }, S.us, S.gold) +
    rect(0, 110, 240, 40, C.gold) + [10, 40, 70, 100, 130, 160, 190, 220].map((x) => at({ x, y: 150, s: 0.8 }, wheat({}))).join(''),

  // 约翰·保罗二世当选教皇：白袍、十字架、波兰国旗
  68: () =>
    rect(0, 0, 240, 150, C.gold2) + rays(120, 60, C.white, 14) +
    cross({ x: 120, y: 60, s: 0.8 }) +
    leader({ x: 120, y: 150, s: 1.4 }, S.white, { tie: C.gold, cap: C.white, hair: 'none' }) +
    flag({ x: 30, y: 120, s: 0.7 }, 'pl', 40, 26),

  // 拉美敢死队：夜色中的武装人员
  69: () =>
    night(69) + at({ x: 30, y: 120 }, palm({}, C.ink3, S.night)) + ground(118, S.night, 69) +
    soldier({ x: 90, y: 146 }, S.ink, C.ink) + soldier({ x: 130, y: 142 }, S.ink, C.ink) + soldier({ x: 170, y: 146 }, S.ink, C.ink) +
    poly([200, 120, 236, 120, 236, 104, 210, 104], C.ink2),

  // 美洲国家组织成立：一排美洲国旗
  70: () =>
    sky(S.sky, { seed: 70 }) + ground(126, S.green, 70) +
    flag({ x: 30, y: 126, s: 0.7 }, 'us', 40, 26) + flag({ x: 80, y: 122, s: 0.7 }, 'tri', 40, 26, [C.green, C.white, C.su]) +
    flag({ x: 130, y: 122, s: 0.7 }, 'tri', 40, 26, [C.us2, C.white, C.us2]) + flag({ x: 180, y: 126, s: 0.7 }, 'tri', 40, 26, [C.gold, C.us, C.su]) +
    capitol({ x: 120, y: 148, s: 0.7 }),

  // 尼克松打出中国牌
  71: () =>
    sky(S.paper, { seed: 71 }) + pagoda({ x: 200, y: 120 }) + ground(120, S.ne, 71) +
    flag({ x: 30, y: 116, s: 0.7 }, 'us', 40, 26) + flag({ x: 160, y: 116, s: 0.7 }, 'cn', 40, 26) +
    handshake({ x: 110, y: 80, s: 1.1 }, S.us, S.ne),

  // 萨达特驱逐苏联：侧面像、离去的苏联飞机
  72: () =>
    sky(S.sand, { seed: 72 }) + pyramid({ x: 200, y: 120 }) + ground(120, S.sand, 72) +
    jet({ x: 170, y: 40, r: -20, s: 0.7, flip: true }, S.su) +
    flag({ x: 30, y: 116, s: 0.7 }, 'tri', 40, 26, [C.su, C.white, C.ink]) +
    profile({ x: 110, y: 150, s: 1.4 }, S.ink, { hair: C.ink }),

  // 穿梭外交：在两国国旗间穿梭的飞机
  73: () =>
    rect(0, 0, 240, 150, C.paper2) + globe({ x: 120, y: 90 }, 50, S.sea, S.sand) +
    line(40, 40, 200, 40, 2, C.ne) + jet({ x: 120, y: 36, s: 0.6 }, S.us) +
    flag({ x: 20, y: 110, s: 0.6 }, 'il', 40, 26) + flag({ x: 196, y: 110, s: 0.6 }, 'tri', 40, 26, [C.su, C.white, C.ink]),

  // 美国之音：广播塔与电波
  74: () => {
    let s = rect(0, 0, 240, 150, C.us3);
    for (let r = 30; r <= 110; r += 20) s += poly(ngon(120, 40, r, 12, 0, r * 0.6), C.us) + poly(ngon(120, 40, r - 4, 12, 0, (r - 4) * 0.6), C.us3);
    s += poly([108, 150, 118, 30, 122, 30, 132, 150, 124, 150, 120, 60, 116, 150], C.white2);
    for (let y = 60; y < 150; y += 20) s += line(112, y, 128, y + 14, 1.5, C.white2);
    s += disc(120, 28, 5, C.su, 6) + rect(0, 140, 240, 10, C.night3);
    return s;
  },

  // 解放神学：教堂、十字架、人群
  75: () =>
    sky(S.sand, { seed: 75 }) + rect(80, 60, 80, 66, C.white2) + poly([76, 60, 164, 60, 120, 36], C.su3) +
    cross({ x: 120, y: 36, s: 0.4 }, C.gold) + rect(110, 96, 20, 30, C.ne3) + ground(126, S.sand, 75) +
    at({ x: 120, y: 150 }, crowd({}, 9, S.ne, 10, 220)) + at({ x: 30, y: 130 }, palm({})),

  // 乌苏里江冲突：冰河两岸
  76: () =>
    sky(S.white, { seed: 76 }) + rect(0, 100, 240, 50, C.white) + poly([90, 150, 104, 100, 140, 100, 160, 150], C.sky) +
    soldier({ x: 50, y: 136 }, S.su, C.green3) + soldier({ x: 200, y: 136, flip: true }, S.ne, C.green3) +
    flag({ x: 20, y: 110, s: 0.6 }, 'su', 40, 26) + flag({ x: 214, y: 110, s: 0.6 }, 'cn', 40, 26),

  // 不要问你的国家：演讲者
  77: () =>
    rect(0, 0, 240, 150, C.white2) + rays(120, 30, C.white, 12) +
    flag({ x: 30, y: 110 }, 'us', 46, 30) +
    leader({ x: 130, y: 112, s: 1.0 }, S.ink, { tie: C.us }) + podium({ x: 130, y: 150 }, S.us, C.white),

  // 美洲进步同盟：握手、钱币、拉美国旗
  78: () =>
    sky(S.green, { seed: 78 }) + ground(122, S.green, 78) +
    handshake({ x: 120, y: 70, s: 1.2 }, S.us, S.sand) +
    at({ x: 40, y: 140 }, coins({}, 3)) + at({ x: 200, y: 140 }, coins({}, 4)) + at({ x: 160, y: 150 }, palm({})),

  // 一小步
  80: () =>
    rect(0, 0, 240, 150, C.night3) +
    star(30, 20, 2, C.white2) + star(200, 30, 2, C.white2) + star(150, 14, 2, C.white2) + star(90, 40, 2, C.white2) +
    globe({ x: 190, y: 40 }, 18) +
    moonSurface(110) +
    lander({ x: 70, y: 120, s: 1.3 }) +
    astronaut({ x: 140, y: 130, s: 1.1 }) +
    flag({ x: 170, y: 124, s: 0.5 }, 'us', 40, 26),

  // 切·格瓦拉：贝雷帽红星侧面像
  107: () =>
    rect(0, 0, 240, 150, C.su) + rays(120, 75, C.su2, 14) +
    profile({ x: 120, y: 150, s: 1.8 }, S.ink, { cap: C.ink, beard: true, hair: C.ink }) +
    star(120, 32, 5, C.gold2),

  // 我们的人在德黑兰：间谍、清真寺、文件
  108: () =>
    sky(S.sand, { seed: 108 }) + mosque({ x: 170, y: 120, s: 1.1 }) + ground(120, S.sand, 108) +
    at({ x: 60, y: 150, s: 1.4 }, spy({}, S.ne)) + documentStamp({ x: 110, y: 120, s: 0.5, r: 10 }, C.us) +
    eye({ x: 200, y: 30, s: 0.6 }, C.us),
};

