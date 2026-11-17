import {
  C, S, at, barbed, blast, chain, coins, crowd, documentStamp, eye, facet, flag, ground, globe, grid, handshake, hammerSickle,
  jet, leader, line, mountains, mushroom, ngon, night, palm, pagoda, podium, poly, profile, protester, pyramid, radar, rays,
  rect, rocket, scientist, sea, ship, skyline, sky, soldier, spy, star, tank, warship, wheat, crown, table,
} from '../kit';

export const EARLY_ART: Record<number, () => string> = {
  // 卧倒掩护：课桌下的孩子，远处蘑菇云
  4: () =>
    sky(S.sky, { seed: 4 }) +
    at({ x: 196, y: 112, s: 0.55 }, mushroom({})) +
    ground(112, S.paper, 4) +
    table({ x: 92, y: 104 }, S.ne, 110) +
    at({ x: 92, y: 132, s: 0.7 }, crowd({}, 4, S.us, 2, 90)),

  // 五年计划：工厂烟囱、红色放射光、麦穗
  5: () =>
    rect(0, 0, 240, 150, C.su3) +
    rays(120, 160, C.su, 14) +
    skyline(120, [C.ink3, C.ink2, C.ink], 5, 20, 220) +
    rect(54, 30, 10, 60, C.ink2) + rect(170, 22, 10, 70, C.ink2) +
    at({ x: 59, y: 26 }, facet(ngon(0, 0, 10, 6), S.white)) +
    at({ x: 175, y: 18 }, facet(ngon(0, 0, 12, 6), S.white)) +
    ground(120, S.gold, 5) +
    at({ x: 30, y: 148 }, wheat({})) + at({ x: 210, y: 148 }, wheat({})) +
    at({ x: 120, y: 60, s: 1.1 }, hammerSickle({})),

  // 中国牌：红色放射光、宝塔、金星
  6: () =>
    rect(0, 0, 240, 150, C.su) +
    rays(120, 80, C.su2, 16) +
    mountains(130, [C.su3, C.su3, C.su3], [[30, 40], [210, 46]]) +
    at({ x: 120, y: 132, s: 1.2 }, pagoda({}, [C.su3, C.ink2, C.ink])) +
    star(120, 34, 22, C.gold2, C.gold) +
    star(70, 24, 7, C.gold2) + star(170, 24, 7, C.gold2) + star(56, 50, 6, C.gold2) + star(184, 50, 6, C.gold2) +
    rect(0, 132, 240, 18, C.su3),

  // 社会主义政府：议会讲台、红旗、人群
  7: () =>
    rect(0, 0, 240, 150, C.paper2) +
    rect(0, 0, 240, 20, C.ne) + rect(20, 20, 10, 100, C.paper3) + rect(210, 20, 10, 100, C.paper3) +
    flag({ x: 60, y: 96 }, 'su', 44, 28) +
    podium({ x: 150, y: 120 }, S.ne, C.su) +
    leader({ x: 150, y: 86, s: 0.6 }, S.ink, { tie: C.su }) +
    at({ x: 120, y: 150 }, crowd({}, 9, S.ink, 3, 220)),

  // 卡斯特罗：侧面像、古巴国旗、棕榈
  8: () =>
    sky(S.sky, { seed: 8 }) +
    sea(110, S.sea, 8) +
    poly([0, 150, 0, 112, 80, 104, 240, 118, 240, 150], C.green) +
    poly([0, 150, 0, 112, 80, 104, 60, 150], C.green2) +
    at({ x: 30, y: 128, s: 1.2 }, palm({})) + at({ x: 210, y: 126 }, palm({}, C.ne3, S.green)) +
    flag({ x: 170, y: 112 }, 'cu', 48, 30) +
    profile({ x: 92, y: 150, s: 1.6 }, S.green, { cap: C.green3, beard: true, hair: C.ink }),

  // 越南起义：丛林、红星旗、士兵
  9: () =>
    sky(S.green, { seed: 9 }) +
    at({ x: 20, y: 120 }, palm({}, C.ne3, [C.green3, C.green3, C.ink3])) +
    at({ x: 220, y: 116, s: 1.2 }, palm({}, C.ne3, [C.green3, C.green3, C.ink3])) +
    ground(118, S.green, 9) +
    flag({ x: 120, y: 92 }, 'plain', 46, 30, [C.su]) + star(144, 37, 8, C.gold2) +
    soldier({ x: 80, y: 136 }, S.green, C.green3) + soldier({ x: 160, y: 138, flip: true }, S.green, C.green3) +
    soldier({ x: 120, y: 144, s: 1.1 }, S.green, C.sand3),

  // 封锁：柏林空运
  10: () =>
    sky(S.sky, { seed: 10 }) +
    skyline(128, S.ne, 10) +
    barbed(128) +
    ground(128, S.ne, 10) +
    jet({ x: 80, y: 40, r: -8 }, S.us) + jet({ x: 170, y: 64, r: -8, s: 0.7 }, S.us) +
    at({ x: 120, y: 112 }, flag({}, 'de', 30, 20)),

  // 朝鲜战争：山地、坦克、士兵
  11: () =>
    sky(S.sky, { seed: 11 }) +
    mountains(112, S.ne, [[30, 50], [100, 70], [200, 56]]) +
    ground(112, S.green, 11) +
    tank({ x: 70, y: 134 }, S.green) +
    soldier({ x: 150, y: 140 }, S.green) + soldier({ x: 176, y: 136 }, S.green) + soldier({ x: 200, y: 140 }, S.green) +
    flag({ x: 216, y: 110, s: 0.6 }, 'un', 40, 26) + blast({ x: 120, y: 90 }, 14),

  // 罗马尼亚国王退位：坠落的王冠、红旗
  12: () =>
    rect(0, 0, 240, 150, C.paper2) +
    rays(120, 60, C.paper, 12) +
    flag({ x: 150, y: 140 }, 'su', 56, 36) +
    crown({ x: 80, y: 120, r: 30 }) +
    poly([0, 150, 0, 130, 240, 126, 240, 150], C.paper3),

  // 阿以战争：沙漠、坦克、以色列国旗
  13: () =>
    sky(S.sand, { seed: 13 }) +
    ground(112, S.sand, 13) +
    tank({ x: 70, y: 128 }, S.sand) + tank({ x: 180, y: 136, flip: true }, S.ne) +
    flag({ x: 120, y: 106, s: 0.8 }, 'il', 44, 30) + blast({ x: 136, y: 116 }, 12),

  // 经互会：红色握手、工厂
  14: () =>
    rect(0, 0, 240, 150, C.su3) +
    skyline(150, [C.su3, C.ink3, C.ink2], 14) +
    rays(120, 80, C.su, 10) +
    handshake({ x: 120, y: 80, s: 1.4 }, S.su, [C.su2, C.su3, C.su3]),

  // 纳赛尔：侧面像、金字塔
  15: () =>
    sky(S.sand, { seed: 15 }) +
    pyramid({ x: 180, y: 120 }) + pyramid({ x: 222, y: 120, s: 0.7 }) +
    ground(120, S.sand, 15) +
    flag({ x: 40, y: 120 }, 'tri', 40, 26, [C.su, C.white, C.ink]) +
    profile({ x: 110, y: 150, s: 1.5 }, S.ink, { hair: C.ink }),

  // 华约成立：一排红旗、坦克
  16: () =>
    sky(S.night, { seed: 16 }) +
    ground(120, S.ne, 16) +
    flag({ x: 30, y: 100, s: 0.7 }, 'su', 40, 26) + flag({ x: 80, y: 96, s: 0.7 }, 'pl', 40, 26) + flag({ x: 130, y: 96, s: 0.7 }, 'de', 40, 26) +
    flag({ x: 180, y: 100, s: 0.7 }, 'tri', 40, 26, [C.white, C.green, C.su]) +
    tank({ x: 70, y: 140 }, S.green) + tank({ x: 170, y: 140 }, S.green),

  // 戴高乐：侧面像（军帽）+ 三色旗
  17: () =>
    sky([C.sky2, C.paper2, C.sky], { seed: 17 }) +
    flag({ x: 150, y: 110, s: 1.3 }, 'fr', 56, 36) +
    poly([186, 150, 196, 60, 200, 60, 210, 150], C.ink3) + poly([190, 112, 206, 112, 204, 104, 192, 104], C.ink3) +
    profile({ x: 80, y: 150, s: 1.7 }, S.ne, { cap: C.ink2, nose: 8, hair: 'none' }),

  // 逮捕纳粹科学家：科学家与火箭
  18: () =>
    sky(S.sky, { seed: 18 }) +
    ground(130, S.ne, 18) +
    rocket({ x: 170, y: 130, s: 1.1 }, S.white, C.ink) +
    scientist({ x: 80, y: 150, s: 1.3 }) +
    documentStamp({ x: 30, y: 110, s: 0.6, r: -10 }, C.us),

  // 杜鲁门主义：讲台与美国国旗
  19: () =>
    rect(0, 0, 240, 150, C.paper2) +
    rays(120, 40, C.paper, 12) +
    flag({ x: 40, y: 110 }, 'us', 50, 32) + flag({ x: 190, y: 110 }, 'us', 50, 32) +
    leader({ x: 120, y: 104, s: 0.9 }, S.ink, { tie: C.us, glasses: true }) +
    podium({ x: 120, y: 150 }, S.us, C.white),

  // 奥运会：五环与火炬
  20: () => {
    let s = rect(0, 0, 240, 150, C.white) + rays(120, 150, C.paper, 12);
    const ring = (x: number, y: number, c: string) => poly(ngon(x, y, 22, 8, 22.5), c) + poly(ngon(x, y, 16, 8, 22.5), C.white);
    s += ring(70, 60, C.us) + ring(120, 60, C.ink) + ring(170, 60, C.su) + ring(95, 84, C.gold) + ring(145, 84, C.green);
    s += poly([112, 150, 128, 150, 124, 116, 116, 116], C.ne3) + poly([110, 116, 130, 116, 120, 96], C.fire) + poly([116, 116, 124, 116, 120, 104], C.gold2);
    return s;
  },

  // 北约：北约旗、成员国旗、战机
  21: () =>
    sky(S.us, { seed: 21 }) +
    grid(C.us2, 24) +
    flag({ x: 96, y: 120, s: 1.4 }, 'nato', 56, 36) +
    flag({ x: 30, y: 140, s: 0.6 }, 'us', 40, 26) + flag({ x: 190, y: 140, s: 0.6 }, 'uk', 40, 26) + flag({ x: 214, y: 146, s: 0.5 }, 'fr', 40, 26) +
    jet({ x: 200, y: 36, r: -10, s: 0.8 }, S.white) + jet({ x: 170, y: 60, r: -10, s: 0.6 }, S.white) +
    rect(0, 140, 240, 10, C.us3),

  // 独立的红色：领导人、断链、红星旗
  22: () =>
    sky(S.paper, { seed: 22 }) +
    flag({ x: 160, y: 120 }, 'tri', 50, 32, [C.us, C.white, C.su]) + star(187, 66, 6, C.su3) +
    leader({ x: 80, y: 150, s: 1.3 }, S.ne, { tie: C.us, hair: C.ne2 }) +
    chain({ x: 170, y: 136, s: 0.8 }),

  // 马歇尔计划：货船、物资、钱币
  23: () =>
    sky(S.sky, { seed: 23 }) +
    sea(104, S.sea, 23) +
    ship({ x: 100, y: 108, s: 1.4 }, S.ink, S.us) +
    flag({ x: 160, y: 94, s: 0.5 }, 'us', 40, 26) +
    at({ x: 210, y: 140 }, coins({}, 5)) + at({ x: 30, y: 148 }, wheat({})),

  // 印巴战争：山地、两国国旗、士兵
  24: () =>
    sky(S.sky, { seed: 24 }) +
    mountains(110, S.ne, [[60, 70], [150, 80], [220, 50]]) +
    ground(110, S.sand, 24) +
    flag({ x: 30, y: 118, s: 0.7 }, 'tri', 44, 28, [C.fire2, C.white, C.green]) +
    flag({ x: 200, y: 118, s: 0.7 }, 'tri', 44, 28, [C.white, C.green, C.green]) +
    soldier({ x: 90, y: 140 }, S.sand) + soldier({ x: 150, y: 140, flip: true }, S.green) + blast({ x: 120, y: 120 }, 12),

  // 遏制政策：地球被蓝色防线包围
  25: () => {
    let s = rect(0, 0, 240, 150, C.paper2) + grid(C.paper3, 20);
    s += globe({ x: 120, y: 75 }, 44, S.sea, [C.su2, C.su, C.su3]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += poly([120 + Math.cos(a) * 52, 75 + Math.sin(a) * 52, 120 + Math.cos(a + 0.3) * 60, 75 + Math.sin(a + 0.3) * 60, 120 + Math.cos(a + 0.5) * 52, 75 + Math.sin(a + 0.5) * 52], C.us);
    }
    return s;
  },

  // 中情局成立：间谍、眼睛、机密文件
  26: () =>
    rect(0, 0, 240, 150, C.night3) +
    poly([140, 0, 240, 0, 240, 150, 90, 150], C.night) +
    at({ x: 70, y: 150, s: 1.5 }, spy({}, S.ink)) +
    eye({ x: 180, y: 40 }, C.us) +
    documentStamp({ x: 176, y: 108, r: 8 }, C.us),

  // 美日安保：两国国旗、握手、军舰
  27: () =>
    sky(S.sky, { seed: 27 }) + sea(110, S.sea, 27) +
    warship({ x: 120, y: 128, s: 1.2 }, S.us) +
    flag({ x: 30, y: 100, s: 0.8 }, 'jp', 44, 28) + flag({ x: 180, y: 100, s: 0.8 }, 'us', 44, 28) +
    handshake({ x: 120, y: 50, s: 0.9 }, S.us, S.white),

  // 苏伊士运河危机：沙漠中的运河、军舰、战机
  28: () =>
    sky(S.sand, { seed: 28 }) +
    rect(0, 90, 240, 60, C.sand) +
    poly([96, 150, 108, 90, 132, 90, 144, 150], C.sea) + poly([96, 150, 108, 90, 116, 90, 110, 150], C.sea2) +
    warship({ x: 120, y: 118, r: -70, s: 0.6 }, S.ink) +
    jet({ x: 60, y: 40, r: 12, flip: true }, S.ne) + jet({ x: 190, y: 50, r: 12, flip: true, s: 0.7 }, S.ne) +
    pyramid({ x: 200, y: 110, s: 0.6 }),

  // 东欧动乱：举牌抗议、坦克
  29: () =>
    sky(S.paper, { seed: 29 }) +
    skyline(118, S.ne, 29) + ground(118, S.ne, 29) +
    protester({ x: 50, y: 146 }) + protester({ x: 90, y: 142 }, C.su2) + protester({ x: 128, y: 146 }) +
    tank({ x: 196, y: 140, flip: true }, S.green),

  // 去殖民地化：断开的锁链、太阳、棕榈
  30: () =>
    rect(0, 0, 240, 150, C.gold2) + rays(120, 120, C.gold, 14) +
    poly(ngon(120, 120, 34, 8, 22.5), C.fire2) +
    ground(120, S.green, 30) +
    at({ x: 36, y: 140, s: 1.2 }, palm({})) + at({ x: 206, y: 138 }, palm({})) +
    chain({ x: 120, y: 70, s: 1.4 }, true, C.ink2),

  // 红色恐慌 / 大清洗：监视之眼、红色印章、阴影人群
  31: () =>
    rect(0, 0, 240, 150, C.su3) +
    eye({ x: 120, y: 46, s: 1.6 }, C.su) +
    at({ x: 120, y: 150 }, crowd({}, 9, S.ink, 7, 220)) +
    documentStamp({ x: 36, y: 90, s: 0.7, r: -12 }, C.su) + documentStamp({ x: 204, y: 92, s: 0.7, r: 12 }, C.us),

  // 联合国干预：联合国旗、蓝盔士兵
  32: () =>
    sky(S.sky, { seed: 32 }) + ground(118, S.sand, 32) +
    flag({ x: 120, y: 112, s: 1.2 }, 'un', 50, 32) +
    soldier({ x: 60, y: 142 }, S.ne, C.sky2) + soldier({ x: 180, y: 142, flip: true }, S.ne, C.sky2) +
    soldier({ x: 34, y: 136, s: 0.8 }, S.ne, C.sky2) + soldier({ x: 206, y: 136, s: 0.8, flip: true }, S.ne, C.sky2),

  // 去斯大林化：被推倒的雕像
  33: () =>
    sky(S.paper, { seed: 33 }) + ground(120, S.ne, 33) +
    poly([150, 120, 150, 96, 200, 96, 200, 120], C.ne3) +
    at({ x: 120, y: 132, r: -78, s: 1.3 }, profile({}, [C.ne2, C.ne, C.ne3], { hair: C.ne3, beard: true })) +
    at({ x: 186, y: 96 }, crowd({}, 3, S.ink, 4, 40)),

  // 禁止核试验：条约文件、被划掉的蘑菇云
  34: () =>
    rect(0, 0, 240, 150, C.paper2) +
    at({ x: 70, y: 130, s: 0.8 }, mushroom({})) +
    line(30, 40, 112, 128, 8, C.su) + line(112, 40, 30, 128, 8, C.su) +
    documentStamp({ x: 170, y: 80, s: 1.3, r: 6 }, C.us),

  // 台湾决议：海岛、军舰、美国国旗
  35: () =>
    sky(S.sky, { seed: 35 }) + sea(96, S.sea, 35) +
    facet([80, 110, 110, 90, 150, 92, 170, 110, 140, 122, 100, 120], S.green) +
    mountains(104, S.green, [[124, 14]]) +
    warship({ x: 60, y: 136 }, S.us) + warship({ x: 190, y: 132, flip: true, s: 0.8 }, S.us) +
    flag({ x: 140, y: 100, s: 0.5 }, 'us', 40, 26),

  // 叛逃者：越过铁丝网的人
  103: () =>
    night(103) + ground(116, S.night, 103) +
    barbed(100) + barbed(112) +
    rect(30, 60, 4, 60, C.ink) + rect(200, 60, 4, 60, C.ink) +
    poly([200, 60, 160, 80, 164, 86, 204, 66], C.gold2) +
    at({ x: 120, y: 136, r: 10 }, spy({}, S.ne)),

  // 剑桥五杰：五个间谍剪影、英国国旗
  104: () =>
    rect(0, 0, 240, 150, C.night) +
    flag({ x: 170, y: 84, s: 0.8 }, 'uk', 50, 32) +
    at({ x: 30, y: 150 }, spy({}, S.ink)) + at({ x: 70, y: 146 }, spy({}, S.ink)) + at({ x: 110, y: 150 }, spy({}, S.ink)) +
    at({ x: 150, y: 146 }, spy({}, S.ink)) + at({ x: 190, y: 150 }, spy({}, S.ink)) +
    star(110, 30, 10, C.su),

  // 特殊关系：美英握手
  105: () =>
    sky(S.sky, { seed: 105 }) +
    flag({ x: 20, y: 100 }, 'us', 50, 32) + flag({ x: 170, y: 100 }, 'uk', 50, 32) +
    handshake({ x: 120, y: 120, s: 1.3 }, S.us, [C.su2, C.su, C.su3]),

  // 北美防空司令部：雷达、北极格网、战机
  106: () => {
    let s = rect(0, 0, 240, 150, C.night);
    for (let r = 30; r <= 150; r += 30) s += poly(ngon(120, 170, r, 16, 0, r * 0.6), C.night2) + poly(ngon(120, 170, r - 2, 16, 0, (r - 2) * 0.6), C.night);
    for (let i = 0; i < 6; i++) s += line(120, 170, 120 + Math.cos(Math.PI + (i * Math.PI) / 5) * 200, 170 + Math.sin(Math.PI + (i * Math.PI) / 5) * 120, 1, C.night2);
    s += mountains(138, [C.white, C.white2, C.paper3], [[40, 30], [200, 36]]);
    s += radar({ x: 120, y: 138, s: 1.2 }, S.white);
    s += jet({ x: 50, y: 40, s: 0.6, r: -6 }, S.white) + jet({ x: 190, y: 30, s: 0.5, r: -6 }, S.white);
    return s;
  },
};

