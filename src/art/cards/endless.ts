import {
  C, S, at, barbed, barrel, capitol, chessKing, coins, continent, crowd, documentStamp, eye, flag, globe, ground, handshake, hammerSickle, jet, kremlin, leader,
  missile, mosque, mountains, oilWell, pagoda, palm, pine, podium, protester, radar, rays, rect, rocket, satellite, sea, ship, skyline, sky, soldier, spy, star, station,
  submarine, tank, warship, wheat, hut, night, ballotBox, table, blast, chain, pyramid, wall,
} from '../kit';

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

  // 华约扩编：红旗列队、坦克
  115: () =>
    rect(0, 0, 240, 150, C.su3) + rays(120, 150, C.su, 12) +
    at({ x: 40, y: 100 }, flag({}, 'su', 34, 22)) + at({ x: 100, y: 96 }, flag({}, 'pl', 34, 22)) + at({ x: 160, y: 100 }, flag({}, 'de', 34, 22)) +
    ground(118, S.ink, 115) + at({ x: 70, y: 140, s: 0.9 }, tank({}, S.su)) + at({ x: 170, y: 140, s: 0.9 }, tank({}, S.su)),
  // 第三世界援助：茅屋、麦穗、货船
  116: () =>
    sky(S.sand, { seed: 116 }) + ground(110, S.sand, 116) + at({ x: 60, y: 120 }, hut({})) + at({ x: 110, y: 124 }, hut({}, C.sand2)) +
    at({ x: 190, y: 136 }, wheat({})) + at({ x: 175, y: 70, s: 0.7 }, ship({}, S.ink, S.su)) + star(40, 30, 10, C.su),
  // 古巴模式：棕榈、红星、海
  117: () =>
    sky(S.sky, { seed: 117 }) + sea(100, S.sea, 117) + at({ x: 50, y: 110 }, palm({})) + at({ x: 200, y: 112, s: 0.8 }, palm({})) +
    at({ x: 120, y: 80 }, flag({}, 'cu', 46, 30)) + star(120, 30, 14, C.su, C.su2),
  // 能源武器：油井、输油管、欧洲剪影
  118: () =>
    rect(0, 0, 240, 150, C.night) + at({ x: 60, y: 130 }, oilWell({})) + at({ x: 110, y: 130, s: 0.8 }, oilWell({})) +
    rect(120, 112, 120, 6, C.ink3) + at({ x: 200, y: 140, s: 0.9 }, barrel({}, S.su)) + star(200, 40, 12, C.su2, C.su),
  // 红色卫星：夜空、卫星、红星
  119: () =>
    night(119) + at({ x: 120, y: 70, s: 1.3 }, satellite({}, S.su)) + star(50, 40, 8, C.su2) + at({ x: 200, y: 140, s: 0.6 }, radar({})),
  // 社会主义阵营峰会：讲台、宝塔、握手
  120: () =>
    rect(0, 0, 240, 150, C.su) + rays(120, 40, C.su2, 14) + at({ x: 50, y: 130, s: 0.8 }, pagoda({}, [C.su3, C.ink2, C.ink])) +
    at({ x: 125, y: 120 }, podium({}, S.ne, C.gold)) + at({ x: 190, y: 120, s: 0.6 }, hammerSickle({})),
  // 边境演习：雪松、士兵、坦克
  121: () =>
    sky(S.white, { seed: 121 }) + mountains(110, S.ne, [[40, 50], [120, 70], [200, 45]]) + at({ x: 30, y: 130 }, pine({})) + at({ x: 215, y: 132 }, pine({})) +
    at({ x: 90, y: 140 }, soldier({}, S.su)) + at({ x: 150, y: 142 }, tank({}, S.green)),
  // 反美浪潮：抗议人群、标语
  122: () =>
    rect(0, 0, 240, 150, C.paper2) + skyline(110, S.ne, 122) + at({ x: 70, y: 140 }, protester({}, C.su)) + at({ x: 120, y: 142 }, protester({}, C.white)) +
    at({ x: 170, y: 140 }, protester({}, C.su)) + at({ x: 120, y: 150 }, crowd({}, 8, S.ink, 122, 220)),
  // 克格勃渗透：间谍、眼睛
  123: () =>
    rect(0, 0, 240, 150, C.ink) + at({ x: 120, y: 40, s: 1.2 }, eye({}, C.su)) + at({ x: 80, y: 140 }, spy({}, S.ink)) + at({ x: 170, y: 140, s: 0.8 }, spy({}, S.ne)),
  // 西伯利亚大铁路：雪原、铁轨、松林
  124: () =>
    sky(S.sky, { seed: 124 }) + ground(100, S.white, 124) + rect(0, 112, 240, 4, C.ink3) + rect(0, 122, 240, 4, C.ink3) +
    [10, 40, 70, 100, 130, 160, 190, 220].map((x) => rect(x, 110, 6, 18, C.ne3)).join('') + at({ x: 40, y: 96 }, pine({})) + at({ x: 200, y: 94 }, pine({})),
  // 和平攻势：白鸽色调、握手、克里姆林宫
  125: () =>
    sky(S.white, { seed: 125 }) + at({ x: 190, y: 130, s: 0.7 }, kremlin({})) + at({ x: 90, y: 100, s: 1.1 }, handshake({}, S.su, S.us)) + star(40, 30, 9, C.gold),
  // 新马歇尔计划：货轮、钱币、国会大厦
  126: () =>
    sky(S.sky, { seed: 126 }) + sea(108, S.sea, 126) + at({ x: 70, y: 120, s: 1.1 }, ship({}, S.us, S.white)) + at({ x: 185, y: 100, s: 0.7 }, capitol({})) +
    at({ x: 120, y: 50 }, coins({}, 6)),
  // 自由贸易协定：文件、印章、货船
  127: () =>
    rect(0, 0, 240, 150, C.us3) + rays(120, 75, C.us, 12) + at({ x: 120, y: 120, s: 1.1 }, documentStamp({}, C.us2)) + at({ x: 40, y: 60 }, flag({}, 'us', 34, 22)) +
    at({ x: 200, y: 60 }, flag({}, 'tri', 34, 22, [C.green, C.white, C.su])),
  // 第七舰队巡航：航母、战机
  128: () =>
    sky(S.sky, { seed: 128 }) + sea(96, S.sea, 128) + at({ x: 120, y: 118, s: 1.3 }, warship({}, S.ink)) + at({ x: 60, y: 40, s: 0.8 }, jet({}, S.us)) + at({ x: 180, y: 30, s: 0.6 }, jet({}, S.us)),
  // 民主浪潮：投票箱、断开的锁链
  129: () =>
    rect(0, 0, 240, 150, C.paper) + at({ x: 120, y: 120, s: 1.2 }, ballotBox({}, S.us)) + at({ x: 50, y: 90 }, chain({}, true)) + at({ x: 190, y: 90 }, chain({}, true)) +
    at({ x: 120, y: 150 }, crowd({}, 9, S.us, 129, 230)),
  // 高边疆计划：空间站、火箭
  130: () =>
    night(130) + at({ x: 80, y: 60, s: 1.1 }, station({})) + at({ x: 180, y: 130, s: 0.8 }, rocket({}, S.white, C.us)) + star(200, 30, 6, C.white),
  // 中东和平进程：清真寺、桌子、握手
  131: () =>
    sky(S.sand, { seed: 131 }) + at({ x: 50, y: 110, s: 0.8 }, mosque({})) + at({ x: 130, y: 128 }, table({}, S.ne, 120)) + at({ x: 130, y: 96 }, handshake({}, S.us, S.sand)),
  // 非洲增长法案：草原、棕榈、钱币
  132: () =>
    sky(S.sand, { seed: 132 }) + ground(104, S.green, 132) + at({ x: 40, y: 112 }, palm({})) + at({ x: 200, y: 110 }, hut({})) + at({ x: 120, y: 70 }, coins({}, 4)) +
    at({ x: 120, y: 30 }, flag({}, 'us', 30, 20)),
  // 中情局秘密行动：夜色、间谍、雷达
  133: () =>
    night(133) + at({ x: 70, y: 140 }, spy({}, S.us)) + at({ x: 170, y: 130 }, radar({})) + at({ x: 160, y: 40, s: 0.8 }, eye({}, C.us)),
  // 北极监听站：冰原、雷达罩、潜艇
  134: () =>
    sky(S.white, { seed: 134 }) + sea(100, S.sky, 134) + rect(0, 100, 110, 50, C.white) + at({ x: 60, y: 96, s: 1.2 }, radar({})) + at({ x: 175, y: 120 }, submarine({}, S.ink)),
  // 美元霸权：钱币山、油桶
  135: () =>
    rect(0, 0, 240, 150, C.green3) + rays(120, 150, C.green, 12) + at({ x: 120, y: 80, s: 1.6 }, coins({}, 7)) + at({ x: 40, y: 140 }, barrel({}, S.ink)) + at({ x: 200, y: 140 }, barrel({}, S.ink)),
  // 联合军演：战机编队、军舰
  136: () =>
    sky(S.sky, { seed: 136 }) + sea(110, S.sea, 136) + at({ x: 60, y: 40 }, jet({}, S.us)) + at({ x: 110, y: 50 }, jet({}, S.us)) + at({ x: 160, y: 40 }, jet({}, S.ne)) +
    at({ x: 120, y: 130, s: 1.1 }, warship({}, S.us)),
  // 核威慑升级：导弹、爆炸光
  137: () =>
    rect(0, 0, 240, 150, C.night3) + rays(120, 150, C.fire3, 14) + at({ x: 80, y: 140, s: 1.2 }, missile({}, S.white, C.su)) + at({ x: 160, y: 140, s: 1.2 }, missile({}, S.white, C.us)),
  // 粮食危机：干裂土地、麦穗、人群
  138: () =>
    sky(S.sand, { seed: 138 }) + ground(100, S.sand, 138) + at({ x: 60, y: 140 }, wheat({}, C.ne)) + at({ x: 180, y: 140 }, wheat({}, C.ne)) + at({ x: 120, y: 150 }, crowd({}, 6, S.ne, 138, 140)),
  // 难民潮：铁丝网、人群
  139: () =>
    sky(S.sky, { seed: 139 }) + ground(110, S.ne, 139) + barbed(100) + at({ x: 120, y: 150 }, crowd({}, 10, S.ink, 139, 230)),
  // 安理会决议：圆桌、联合国旗
  140: () =>
    rect(0, 0, 240, 150, C.sky2) + at({ x: 120, y: 60, s: 0.8 }, globe({}, 34, S.sky, S.white)) + at({ x: 120, y: 132 }, table({}, S.us, 180)) +
    at({ x: 50, y: 120 }, flag({}, 'un', 30, 20)) + at({ x: 190, y: 120 }, flag({}, 'un', 30, 20)),
  // 网络战：网格、眼睛、国王棋
  141: () =>
    rect(0, 0, 240, 150, C.ink) + [20, 50, 80, 110, 140, 170, 200, 230].map((x) => rect(x, 0, 1, 150, C.green3)).join('') +
    [25, 55, 85, 115].map((y) => rect(0, y, 240, 1, C.green3)).join('') + at({ x: 120, y: 75, s: 1.2 }, eye({}, C.green2)) + at({ x: 200, y: 140 }, chessKing({})),
  // 代理人战争：山地、两边士兵、爆炸
  142: () =>
    sky(S.sand, { seed: 142 }) + mountains(110, S.sand, [[50, 50], [130, 70], [210, 40]]) + at({ x: 60, y: 140 }, soldier({}, S.su)) + at({ x: 180, y: 140 }, soldier({}, S.us)) +
    at({ x: 120, y: 100 }, blast({}, 18)),
  // 经济危机：下跌的楼群、散落钱币
  143: () =>
    rect(0, 0, 240, 150, C.paper3) + skyline(120, S.ink, 143) + rect(20, 20, 200, 6, C.su) + at({ x: 60, y: 140 }, coins({}, 3)) + at({ x: 180, y: 145 }, coins({}, 2)),
  // 石油危机：沙漠、油井、金字塔
  144: () =>
    sky(S.fire, { seed: 144 }) + ground(110, S.sand, 144) + at({ x: 60, y: 120 }, oilWell({})) + at({ x: 180, y: 118, s: 0.8 }, pyramid({})) + at({ x: 120, y: 138 }, barrel({}, S.su)),
  // 缓和峰会：长桌、两位领导人
  145: () =>
    rect(0, 0, 240, 150, C.paper2) + rect(0, 0, 240, 24, C.ne) + at({ x: 80, y: 108 }, leader({}, S.us, { tie: C.us })) + at({ x: 160, y: 108 }, leader({}, S.ink, { tie: C.su })) +
    at({ x: 120, y: 140 }, table({}, S.ne, 200)),
  // 欧盟成立：蓝底星环
  147: () =>
    rect(0, 0, 240, 150, C.us3) + rays(120, 75, C.us, 16) +
    Array.from({ length: 12 }, (_, i) => star(120 + 46 * Math.cos((i * Math.PI) / 6), 75 + 46 * Math.sin((i * Math.PI) / 6), 7, C.gold2, C.gold)).join('') +
    at({ x: 120, y: 92, s: 0.8 }, flag({}, 'de', 30, 20)),
  // 流行文化攻势：电影院霓虹、人群
  148: () =>
    rect(0, 0, 240, 150, C.night) + skyline(110, S.night, 148) + rect(70, 40, 100, 34, C.su2) + rect(76, 46, 88, 22, C.gold2) +
    star(120, 57, 8, C.su) + at({ x: 120, y: 150 }, crowd({}, 9, S.us, 148, 220)),
  // Z 世代：手机屏幕光、人群、点赞星
  149: () =>
    rect(0, 0, 240, 150, C.night2) + rays(120, 160, C.night, 12) + rect(96, 26, 48, 80, C.ink) + rect(100, 32, 40, 66, C.sky2) +
    star(120, 64, 14, C.gold2, C.gold) + at({ x: 120, y: 150 }, crowd({}, 10, S.sky, 149, 230)),
  // 情报交换：桥上两名间谍
  146: () =>
    night(146) + rect(0, 110, 240, 10, C.ink3) + wall(0, 240, 140, S.ne) + at({ x: 80, y: 110 }, spy({}, S.us)) + at({ x: 160, y: 110 }, spy({}, S.su)),
};
