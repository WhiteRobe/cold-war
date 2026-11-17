// 逐卡测试：每张卡至少一个用例，重点是规则边界与交互。
import { describe, expect, it } from 'vitest';
import { CARDS, COUNTRY_LIST } from '../src/data';
import type { Game } from '../src/engine/game';
import type { Choice, Side } from '../src/engine/types';
import { blank, dice, drive, opts, set, type Answer } from './helpers';

const ev = (g: Game, id: number, side: Side, answers: Answer[] = []) => drive(g.fireEvent(id, side, {}), answers);
/** 自动回答：总选第一个合法选项 */
const first = (d: { options: { v: Choice }[] }) => d.options[0].v;
const many = (n: number, a: Answer = first) => Array.from({ length: n }, () => a);
const tag = (g: Game, s: string) => g.s.log.some((e) => e.t.includes(s));

describe('计分卡 #1 #2 #3 #37 #38 #79 #81', () => {
  it('#1 亚洲计分：支配 + 战场国 + 邻接敌方本土', () => {
    const g = blank();
    set(g, 'japan', 4, 0); // 战场国
    set(g, 'northKorea', 3, 0); // 战场国 + 邻接苏联
    set(g, 'taiwan', 3, 0);
    ev(g, 1, 'US');
    // 支配 7 + 战场国 2 + 邻接苏联 1
    expect(g.s.vp).toBe(10);
  });
  it('#2 欧洲计分：控制欧洲立即获胜', () => {
    const g = blank();
    for (const c of ['france', 'westGermany', 'eastGermany', 'poland', 'italy', 'uk']) set(g, c, 6, 0);
    const r = ev(g, 2, 'USSR');
    expect(r.over?.winner).toBe('US');
  });
  it('#3 中东计分：存在 3', () => {
    const g = blank();
    set(g, 'lebanon', 0, 1);
    ev(g, 3, 'US');
    expect(g.s.vp).toBe(-3);
  });
  it('#37 中美洲计分：古巴（战场国、邻接美国）', () => {
    const g = blank();
    set(g, 'cuba', 0, 3);
    ev(g, 37, 'USSR');
    // 苏：控制（唯一... 不，需全部战场国）→ 支配需非战场国 → 存在 1 + 战场国 1 + 邻接美国 1
    expect(g.s.vp).toBe(-3);
  });
  it('#38 东南亚计分：泰国 2 分，打出后移出游戏', () => {
    const g = blank();
    set(g, 'thailand', 2, 0);
    set(g, 'vietnam', 0, 1);
    g.s.hands.US = [38];
    drive(g.playCard('US', 38, {}));
    expect(g.s.vp).toBe(1);
    expect(g.s.removed).toContain(38);
  });
  it('#79 非洲计分 / #81 南美洲计分不移出', () => {
    const g = blank();
    set(g, 'angola', 0, 1);
    g.s.hands.USSR = [79, 81];
    drive(g.playCard('USSR', 79, {}));
    drive(g.playCard('USSR', 81, {}));
    expect(g.s.vp).toBe(-(1 + 1));
    expect(g.s.discard).toEqual(expect.arrayContaining([79, 81]));
  });
  it('计分卡只能当事件打出，没有行动点选项', () => {
    expect(CARDS[2].ops).toBe(0);
    const g = blank();
    g.s.hands.US = [3];
    const r = drive(g.playCard('US', 3, {}));
    expect(r.asked.length).toBe(0);
  });
});

describe('早期卡', () => {
  it('#4 卧倒掩护：先降 DEFCON 再得 5-DEFCON', () => {
    const g = blank();
    ev(g, 4, 'US');
    expect(g.s.defcon).toBe(4);
    expect(g.s.vp).toBe(1);
  });
  it('#4 DEFCON 2 时苏联用行动点打卧倒掩护：苏联（行动方）输', () => {
    const g = blank();
    set(g, 'poland', 0, 1);
    g.s.defcon = 2;
    g.s.phasing = 'USSR';
    g.s.hands.USSR = [4];
    const r = drive(g.playCard('USSR', 4, {}), ['ops', 'eventFirst']);
    expect(r.over?.winner).toBe('US');
  });
  it('#5 五年计划：抽中苏联/中立事件只弃掉', () => {
    const g = blank();
    g.s.hands.USSR = [14];
    ev(g, 5, 'US');
    expect(g.s.discard).toContain(14);
    expect(g.inf('poland', 'USSR')).toBe(0);
  });
  it('#6 中国牌：没有事件；打出后背面朝上交给对手；美国打出后台湾决议失效', () => {
    const g = blank();
    expect(g.canFire(6, 'US', 'US')).toBe(false);
    set(g, 'japan', 1, 0);
    g.s.china = { holder: 'US', faceUp: true };
    g.s.flags.formosan = true;
    g.s.inPlay.push(35);
    drive(g.playCard('US', 6, {}), ['ops', ...many(5, 'japan')]);
    expect(g.s.china).toEqual({ holder: 'USSR', faceUp: false });
    expect(g.inf('japan', 'US')).toBe(6); // 全部用于亚洲 +1
    expect(g.s.flags.formosan).toBe(false);
    expect(g.s.removed).toContain(35);
  });
  it('#7 社会主义政府：每国最多 2 点；铁娘子后不能发动', () => {
    const g = blank();
    set(g, 'uk', 5, 0);
    ev(g, 7, 'USSR', ['uk', 'uk', 'canada']);
    expect(g.inf('uk', 'US')).toBe(3);
    g.s.flags.ironLady = true;
    expect(g.canFire(7, 'USSR', 'USSR')).toBe(false);
  });
  it('#9 越南起义：越南 +2，东南亚行动点 +1', () => {
    const g = blank();
    ev(g, 9, 'USSR');
    expect(g.inf('vietnam', 'USSR')).toBe(2);
    expect(g.opsBudget('USSR', 2, 1, 'sea')).toBe(3);
    expect(g.opsBudget('USSR', 2, 1, 'asia')).toBe(2);
  });
  it('#10 封锁：美国没有 ≥3 的牌则失去西德', () => {
    const g = blank();
    set(g, 'westGermany', 4, 0);
    g.s.hands.US = [26];
    ev(g, 10, 'USSR');
    expect(g.inf('westGermany', 'US')).toBe(0);
    const g2 = blank();
    set(g2, 'westGermany', 4, 0);
    g2.s.hands.US = [25];
    ev(g2, 10, 'USSR', [25]);
    expect(g2.inf('westGermany', 'US')).toBe(4);
    expect(g2.s.discard).toContain(25);
  });
  it('#10 封锁：红色恐慌下 3 点牌只算 2 点，不能用来满足', () => {
    const g = blank();
    set(g, 'westGermany', 4, 0);
    g.s.hands.US = [25];
    g.s.flags.redScare = ['US'];
    const r = ev(g, 10, 'USSR');
    expect(r.asked.length).toBe(0);
    expect(g.inf('westGermany', 'US')).toBe(0);
  });
  it('#11 朝鲜战争：每个美控邻国 -1，计入军事行动 2', () => {
    const g = blank();
    set(g, 'southKorea', 2, 0);
    set(g, 'japan', 4, 0);
    dice(g, 4);
    ev(g, 11, 'USSR');
    expect(g.s.inf.southKorea).toEqual([2, 0]);
    expect(g.s.milops.USSR).toBe(2);
    dice(g, 5);
    ev(g, 11, 'USSR');
    expect(g.s.inf.southKorea).toEqual([0, 2]);
    expect(g.s.vp).toBe(-2);
  });
  it('#12 罗马尼亚国王退位', () => {
    const g = blank();
    set(g, 'romania', 2, 1);
    ev(g, 12, 'USSR');
    expect(g.s.inf.romania).toEqual([0, 3]);
  });
  it('#13 阿以战争：戴维营后不能发动', () => {
    const g = blank();
    g.s.flags.campDavid = true;
    expect(g.canFire(13, 'USSR', 'USSR')).toBe(false);
  });
  it('#14 经济互助委员会：只能选未被美国控制的东欧国家', () => {
    const g = blank();
    set(g, 'poland', 4, 0);
    const r = ev(g, 14, 'USSR', many(4));
    expect(opts(r.asked[0])).not.toContain('poland');
    expect(COUNTRY_LIST.filter((c) => g.inf(c.id, 'USSR') === 1).length).toBe(4);
  });
  it('#16 华约：放 5 点（每国最多 2），并使北约可用', () => {
    const g = blank();
    ev(g, 16, 'USSR', ['add', 'poland', 'poland', 'hungary', 'hungary', 'bulgaria']);
    expect(g.inf('poland', 'USSR')).toBe(2);
    expect(g.s.flags.warsawPact).toBe(true);
    expect(g.canFire(21, 'US', 'US')).toBe(true);
  });
  it('#16 华约：移除 4 国全部美国影响力', () => {
    const g = blank();
    set(g, 'poland', 2, 0);
    set(g, 'hungary', 1, 0);
    ev(g, 16, 'USSR', ['remove', 'poland', 'hungary']);
    expect(g.inf('poland', 'US') + g.inf('hungary', 'US')).toBe(0);
  });
  it('#17 戴高乐：法国不再受北约保护', () => {
    const g = blank();
    set(g, 'france', 5, 0);
    g.s.flags.nato = true;
    expect(g.natoProtects('france')).toBe(true);
    ev(g, 17, 'USSR');
    expect(g.s.inf.france).toEqual([3, 1]);
    expect(g.natoProtects('france')).toBe(false);
  });
  it('#18 逮捕纳粹科学家：太空 +1', () => {
    const g = blank();
    ev(g, 18, 'USSR');
    expect(g.s.space.USSR).toBe(1);
    expect(g.s.vp).toBe(-2);
  });
  it('#19 杜鲁门主义：只能选未受控国', () => {
    const g = blank();
    set(g, 'poland', 0, 4);
    set(g, 'italy', 1, 1);
    const r = ev(g, 19, 'US');
    expect(r.asked.length).toBe(0); // 只有意大利，自动
    expect(g.s.inf.italy).toEqual([1, 0]);
    expect(g.inf('poland', 'USSR')).toBe(4);
  });
  it('#20 奥运会参加：主办方 +2，平局重掷', () => {
    const g = blank();
    dice(g, 3, 5, 1, 1);
    ev(g, 20, 'USSR', ['go']);
    // 第一轮 3+2=5 对 5 平局重掷；第二轮 1+2 对 1
    expect(g.s.vp).toBe(-2);
  });
  it('#22 独立的红色：追平苏联影响力', () => {
    const g = blank();
    set(g, 'hungary', 1, 3);
    ev(g, 22, 'US');
    expect(g.s.inf.hungary).toEqual([3, 3]);
  });
  it('#23 马歇尔计划：7 个未被苏联控制的西欧国家', () => {
    const g = blank();
    set(g, 'france', 0, 3);
    const r = ev(g, 23, 'US', many(7));
    expect(opts(r.asked[0])).not.toContain('france');
    expect(g.s.flags.marshall).toBe(true);
  });
  it('#24 印巴战争：可选目标', () => {
    const g = blank();
    set(g, 'india', 2, 0);
    dice(g, 6);
    ev(g, 24, 'USSR', ['india']);
    expect(g.s.inf.india).toEqual([0, 2]);
    expect(g.s.milops.USSR).toBe(2);
  });
  it('#25 遏制政策', () => {
    const g = blank();
    ev(g, 25, 'US');
    expect(g.effOps('US', 26)).toBe(2);
    expect(g.effOps('US', 21)).toBe(4);
  });
  it('#26 中情局成立：公开苏联手牌，1 行动点（遏制下 2）可以放弃', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    g.s.hands.USSR = [14, 15];
    g.s.flags.containment = true;
    ev(g, 26, 'US', ['influence', 'japan', 'japan']);
    expect(g.s.known.USSR).toEqual([14, 15]);
    expect(g.inf('japan', 'US')).toBe(3);
    const g2 = blank();
    set(g2, 'japan', 1, 0);
    ev(g2, 26, 'US', ['skip']);
    expect(g2.inf('japan', 'US')).toBe(1);
  });
  it('#27 美日防卫协定', () => {
    const g = blank();
    set(g, 'japan', 1, 2);
    ev(g, 27, 'US');
    expect(g.controls('US', 'japan')).toBe(true);
    expect(g.canTarget('USSR', 'japan', 'realign')).toBe(false);
  });
  it('#28 苏伊士运河危机：每国最多 2 点', () => {
    const g = blank();
    set(g, 'uk', 5, 0);
    set(g, 'israel', 1, 0);
    ev(g, 28, 'USSR', ['uk', 'uk', 'israel']);
    expect(g.inf('uk', 'US')).toBe(3);
    expect(g.inf('israel', 'US')).toBe(0);
  });
  it('#29 东欧动乱：后期每国移除 2', () => {
    const g = blank();
    g.s.turn = 8;
    for (const c of ['poland', 'hungary', 'romania']) set(g, c, 0, 3);
    ev(g, 29, 'US', ['poland', 'hungary', 'romania']);
    expect(g.inf('poland', 'USSR')).toBe(1);
  });
  it('#30 去殖民地化', () => {
    const g = blank();
    ev(g, 30, 'USSR', ['angola', 'zaire', 'vietnam', 'burma']);
    expect(g.inf('burma', 'USSR')).toBe(1);
  });
  it('#32 联合国干预不能在头条阶段作为事件', () => {
    const g = blank();
    g.s.hands.US = [8];
    g.s.phase = 'headline';
    expect(g.canFire(32, 'US', 'US')).toBe(false);
    g.s.phase = 'action';
    expect(g.canFire(32, 'US', 'US')).toBe(true);
  });
  it('#33 去斯大林化：撤出后放到未被美国控制的国家（每国最多 2）', () => {
    const g = blank();
    set(g, 'poland', 0, 4);
    set(g, 'italy', 3, 0);
    const r = ev(g, 33, 'USSR', ['poland', 'poland', 'done', 'cuba', 'cuba']);
    expect(g.inf('poland', 'USSR')).toBe(2);
    expect(g.inf('cuba', 'USSR')).toBe(2);
    expect(opts(r.asked[3])).not.toContain('italy');
  });
  it('#34 禁止核试验', () => {
    const g = blank();
    g.s.defcon = 3;
    ev(g, 34, 'USSR');
    expect(g.s.vp).toBe(-1);
    expect(g.s.defcon).toBe(5);
  });
  it('#35 台湾决议：美控台湾在亚洲计分（含终局）中视为战场国', () => {
    const g = blank();
    set(g, 'taiwan', 3, 0);
    ev(g, 35, 'US');
    ev(g, 1, 'US');
    // 存在 3 + 战场国 1
    expect(g.s.vp).toBe(4);
  });
  it('#103 叛逃者：苏联行动轮打出美方 +1；美国行动轮不能作为事件', () => {
    const g = blank();
    set(g, 'poland', 0, 1);
    g.s.phasing = 'USSR';
    g.s.hands.USSR = [103];
    const r = drive(g.playCard('USSR', 103, {}), ['ops', 'poland', 'poland']);
    expect(g.s.vp).toBe(1);
    expect(opts(r.asked[0])).toEqual(['ops', 'space']);
    const g2 = blank();
    g2.s.hands.US = [103];
    const r2 = drive(g2.playCard('US', 103, {}), ['ops', ...many(2)]);
    expect(opts(r2.asked[0])).not.toContain('event');
  });
  it('#104 剑桥五杰：公开计分卡并在其区域放 1 点', () => {
    const g = blank();
    g.s.hands.US = [3, 25];
    const r = ev(g, 104, 'USSR', ['iran']);
    expect(g.s.known.US).toEqual([3]);
    expect(g.inf('iran', 'USSR')).toBe(1);
    expect(opts(r.asked[0])).not.toContain('poland');
  });
  it('#105 美英特殊关系：北约生效时西欧 +2 并得 2 VP；英国不受控时无效果', () => {
    const g = blank();
    set(g, 'uk', 5, 0);
    g.s.flags.nato = true;
    ev(g, 105, 'US', ['italy']);
    expect(g.inf('italy', 'US')).toBe(2);
    expect(g.s.vp).toBe(2);
    const g2 = blank();
    expect(drive(g2.fireEvent(105, 'US', {})).value).toBe(false);
  });
  it('#106 北美防空司令部：行动轮内 DEFCON 降到 2 且美控加拿大', () => {
    const g = blank();
    set(g, 'canada', 4, 0);
    set(g, 'japan', 1, 0);
    ev(g, 106, 'US');
    g.s.defcon = 3;
    g.s.hands.USSR = [4];
    g.s.phasing = 'USSR';
    const ar = (g as unknown as { actionRound(s: Side, o: boolean): Generator }).actionRound('USSR', false);
    drive(ar as never, [4, 'ops', 'eventFirst', ...many(3, 'poland'), 'japan']);
    expect(g.s.defcon).toBe(2);
    expect(g.inf('japan', 'US')).toBe(2);
  });
});

describe('中期卡', () => {
  it('#36 局部战争：北约保护的国家不能当目标', () => {
    const g = blank();
    set(g, 'italy', 3, 0);
    g.s.flags.nato = true;
    dice(g, 6);
    const r = ev(g, 36, 'USSR', ['greece']);
    expect(opts(r.asked[0])).not.toContain('italy');
    expect(g.s.milops.USSR).toBe(3);
  });
  it('#39 军备竞赛：领先且达标 3 VP', () => {
    const g = blank();
    g.s.defcon = 3;
    g.s.milops = { US: 1, USSR: 3 };
    ev(g, 39, 'USSR');
    expect(g.s.vp).toBe(-3);
    g.s.milops = { US: 1, USSR: 2 };
    ev(g, 39, 'USSR');
    expect(g.s.vp).toBe(-4);
  });
  it('#40 古巴导弹危机：DEFCON 设为 2，对手政变即输', () => {
    const g = blank();
    ev(g, 40, 'USSR');
    expect(g.s.defcon).toBe(2);
    expect(g.s.flags.cmc).toBe('US');
  });
  it('#41 核潜艇只对行动点政变有效，免费政变照降 DEFCON', () => {
    const g = blank();
    set(g, 'westGermany', 0, 1);
    g.s.flags.nuclearSubs = true;
    dice(g, 6);
    drive(g.coup('US', 'westGermany', 3, { free: true }));
    expect(g.s.defcon).toBe(4);
  });
  it('#44 熊陷阱：苏联下回合须弃 ≥2 的牌', () => {
    const g = blank();
    ev(g, 44, 'US');
    expect(g.s.flags.bearTrap).toBe(true);
    g.s.hands.USSR = [9, 30];
    g.s.flags.brezhnev = true;
    dice(g, 6);
    const tr = (g as unknown as { trapRound(s: Side): Generator }).trapRound('USSR');
    drive(tr as never, [9]);
    expect(g.s.flags.bearTrap).toBe(true);
  });
  it('陷阱：没有可弃的牌时只能打计分卡；计分卡数 ≥ 剩余行动轮时也可打计分卡', () => {
    const g = blank();
    g.s.flags.quagmire = true;
    g.s.hands.US = [26, 3];
    const tr = (g as unknown as { trapRound(s: Side): Generator }).trapRound('US');
    const r = drive(tr as never, [3]);
    expect(opts(r.asked[0])).toEqual([3]);
    const g2 = blank();
    g2.s.flags.quagmire = true;
    g2.s.ar = 6; // 共 7 轮，剩 2 轮
    g2.s.hands.US = [25, 3, 1];
    const tr2 = (g2 as unknown as { trapRound(s: Side): Generator }).trapRound('US');
    const r2 = drive(tr2 as never, [25]);
    expect(opts(r2.asked[0])).toEqual([25, 3, 1]);
  });
  it('#45 首脑峰会：支配/控制的区域数加骰', () => {
    const g = blank();
    set(g, 'iran', 2, 0);
    set(g, 'jordan', 2, 0);
    dice(g, 3, 3);
    ev(g, 45, 'US', ['none']);
    expect(g.s.vp).toBe(2);
  });
  it('#46 奇爱博士：任意 DEFCON，军事行动 +5；设为 1 则自己输', () => {
    const g = blank();
    ev(g, 46, 'US', ['3']);
    expect(g.s.defcon).toBe(3);
    expect(g.s.milops.US).toBe(5);
    const g2 = blank();
    g2.s.phasing = 'USSR';
    expect(ev(g2, 46, 'USSR', ['1']).over?.winner).toBe('US');
  });
  it('#47 军政府：+2 并可免费政变（不计军事行动）', () => {
    const g = blank();
    set(g, 'panama', 1, 0);
    dice(g, 6);
    ev(g, 47, 'USSR', ['chile', 'coup', 'panama']);
    expect(g.inf('chile', 'USSR')).toBe(2);
    expect(g.s.milops.USSR).toBe(0);
    expect(g.s.defcon).toBe(4); // 巴拿马是战场国
  });
  it('#48 厨房辩论：美控战场国更多时 +2', () => {
    const g = blank();
    set(g, 'japan', 4, 0);
    ev(g, 48, 'US');
    expect(g.s.vp).toBe(2);
  });
  it('#49 导弹嫉妒：计分卡不能被换走', () => {
    const g = blank();
    g.s.hands.USSR = [3, 9];
    set(g, 'japan', 1, 0);
    ev(g, 49, 'US', ['japan', 'japan']);
    expect(g.s.hands.USSR).toEqual([3, 49]);
    const g2 = blank();
    g2.s.hands.USSR = [3];
    ev(g2, 49, 'US');
    expect(g2.s.hands.USSR).toEqual([3]);
  });
  it('#51 勃列日涅夫主义', () => {
    const g = blank();
    ev(g, 51, 'USSR');
    expect(g.effOps('USSR', 9)).toBe(3);
  });
  it('#52 葡萄牙帝国崩溃 / #54 阿连德', () => {
    const g = blank();
    ev(g, 52, 'USSR');
    ev(g, 54, 'USSR');
    expect([g.inf('angola', 'USSR'), g.inf('seAfricanStates', 'USSR'), g.inf('chile', 'USSR')]).toEqual([2, 2, 2]);
  });
  it('#53 南非动荡：南非 +1 且邻国 +2', () => {
    const g = blank();
    ev(g, 53, 'USSR', ['split', 'angola']);
    expect(g.inf('southAfrica', 'USSR')).toBe(1);
    expect(g.inf('angola', 'USSR')).toBe(2);
  });
  it('#55 维利·勃兰特：西德不受北约保护', () => {
    const g = blank();
    set(g, 'westGermany', 5, 0);
    g.s.flags.nato = true;
    ev(g, 55, 'USSR');
    expect(g.natoProtects('westGermany')).toBe(false);
    expect(g.s.vp).toBe(-1);
  });
  it('#56 穆斯林革命 / #110 预警机', () => {
    const g = blank();
    set(g, 'iran', 2, 0);
    set(g, 'egypt', 1, 0);
    ev(g, 56, 'USSR', ['iran', 'egypt']);
    expect(g.inf('iran', 'US') + g.inf('egypt', 'US')).toBe(0);
    ev(g, 110, 'US');
    expect(g.inf('saudiArabia', 'US')).toBe(2);
    expect(g.canFire(56, 'USSR', 'USSR')).toBe(false);
  });
  it('#57 反弹道导弹条约：DEFCON +1 后 4 行动点', () => {
    const g = blank();
    g.s.defcon = 3;
    set(g, 'japan', 1, 0);
    ev(g, 57, 'US', many(4, 'japan'));
    expect(g.s.defcon).toBe(4);
    expect(g.inf('japan', 'US')).toBe(5);
  });
  it('#58 文化大革命', () => {
    const g = blank();
    g.s.china = { holder: 'US', faceUp: false };
    ev(g, 58, 'USSR');
    expect(g.s.china).toEqual({ holder: 'USSR', faceUp: true });
    ev(g, 58, 'USSR');
    expect(g.s.vp).toBe(-1);
  });
  it('#59 花之力：美国打出战争牌（行动点或事件）苏联 +2，太空不算；#97 取消', () => {
    const g = blank();
    ev(g, 59, 'USSR');
    set(g, 'japan', 1, 0);
    g.s.hands.US = [24];
    dice(g, 1);
    drive(g.playCard('US', 24, {}), ['event', 'india']);
    expect(g.s.vp).toBe(-2);
    ev(g, 97, 'US');
    expect(g.s.flags.flowerPower).toBe(false);
    expect(g.s.vp).toBe(-1);
  });
  it('#60 U-2 / #61 OPEC', () => {
    const g = blank();
    set(g, 'egypt', 0, 2);
    set(g, 'venezuela', 0, 2);
    ev(g, 60, 'USSR');
    ev(g, 61, 'USSR');
    expect(g.s.vp).toBe(-3);
    g.s.flags.northSeaOil = true;
    expect(g.canFire(61, 'USSR', 'USSR')).toBe(false);
  });
  it('#62 孤胆枪手：公开美国手牌，苏联 1 行动点', () => {
    const g = blank();
    g.s.hands.US = [25];
    set(g, 'poland', 0, 1);
    ev(g, 62, 'USSR', ['influence', 'poland']);
    expect(g.s.known.US).toEqual([25]);
    expect(g.inf('poland', 'USSR')).toBe(2);
  });
  it('#63 殖民地后卫 / #64 巴拿马运河 / #65 戴维营', () => {
    const g = blank();
    ev(g, 63, 'US', ['angola', 'zaire', 'vietnam', 'burma']);
    ev(g, 64, 'US');
    ev(g, 65, 'US');
    expect([g.inf('burma', 'US'), g.inf('panama', 'US'), g.inf('egypt', 'US')]).toEqual([1, 1, 1]);
    expect(g.s.vp).toBe(1);
    expect(g.canFire(13, 'USSR', 'USSR')).toBe(false);
  });
  it('#66 傀儡政府：只能放在双方都没有影响力的国家，可以提前结束', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    const r = ev(g, 66, 'US', ['mexico', 'done']);
    expect(opts(r.asked[0])).not.toContain('japan');
    expect(g.inf('mexico', 'US')).toBe(1);
  });
  it('#68 约翰·保罗二世 → #101 团结工会', () => {
    const g = blank();
    set(g, 'poland', 0, 3);
    expect(g.canFire(101, 'US', 'US')).toBe(false);
    ev(g, 68, 'US');
    expect(g.s.inf.poland).toEqual([1, 1]);
    ev(g, 101, 'US');
    expect(g.inf('poland', 'US')).toBe(4);
  });
  it('#69 拉美敢死队：打出者 +1，对手 -1', () => {
    const g = blank();
    ev(g, 69, 'USSR');
    set(g, 'chile', 1, 0);
    dice(g, 3);
    drive(g.coup('USSR', 'chile', 2));
    // 3+2+1=6 > 6? 稳定度 3：需 >6，失败
    expect(g.s.inf.chile).toEqual([1, 0]);
    set(g, 'brazil', 0, 1);
    dice(g, 6);
    drive(g.coup('US', 'brazil', 1));
    // 6+1-1=6 > 4：成功 2
    expect(g.s.inf.brazil).toEqual([1, 0]);
  });
  it('#70 美洲国家组织 / #75 解放神学', () => {
    const g = blank();
    ev(g, 70, 'US', ['mexico', 'chile']);
    const r = ev(g, 75, 'USSR', ['cuba', 'cuba', 'haiti']);
    expect(g.inf('cuba', 'USSR')).toBe(2);
    expect(opts(r.asked[2])).not.toContain('cuba');
  });
  it('#71 尼克松：苏联持有时给美国背面；美国持有时 +2', () => {
    const g = blank();
    ev(g, 71, 'US');
    expect(g.s.china).toEqual({ holder: 'US', faceUp: false });
    ev(g, 71, 'US');
    expect(g.s.vp).toBe(2);
  });
  it('#72 萨达特驱逐苏联', () => {
    const g = blank();
    set(g, 'egypt', 0, 3);
    ev(g, 72, 'US');
    expect(g.s.inf.egypt).toEqual([1, 0]);
  });
  it('#73 穿梭外交：下一次中东/亚洲计分生效后弃掉；终局不生效', () => {
    const g = blank();
    g.s.hands.US = [73];
    drive(g.playCard('US', 73, {}), ['event']);
    expect(g.s.inPlay).toContain(73);
    set(g, 'iran', 0, 2);
    set(g, 'lebanon', 0, 1);
    ev(g, 3, 'US');
    // 苏联失去伊朗（战场国）→ 只剩黎巴嫩：存在 3
    expect(g.s.vp).toBe(-3);
    expect(g.s.discard).toContain(73);
    expect(g.s.flags.shuttle).toBe(false);
  });
  it('#74 美国之音：非欧洲、每国最多 2', () => {
    const g = blank();
    set(g, 'poland', 0, 3);
    set(g, 'cuba', 0, 3);
    set(g, 'iraq', 0, 3);
    const r = ev(g, 74, 'US', ['cuba', 'cuba', 'iraq', 'iraq']);
    expect(opts(r.asked[0])).not.toContain('poland');
    expect(g.inf('cuba', 'USSR')).toBe(1);
  });
  it('#76 乌苏里江冲突', () => {
    const g = blank();
    ev(g, 76, 'US');
    expect(g.s.china).toEqual({ holder: 'US', faceUp: true });
    ev(g, 76, 'US', ['japan', 'japan', 'india', 'india']);
    expect(g.inf('japan', 'US')).toBe(2);
  });
  it('#77 不要问：先定弃牌数再抽；牌库抽空当场洗入弃牌堆', () => {
    const g = blank();
    g.s.hands.US = [3, 4];
    g.s.deck = [5];
    g.s.discard = [];
    ev(g, 77, 'US', [3, 4, 'pass']);
    expect(g.s.hands.US.length).toBe(2);
    expect(tag(g, '洗入')).toBe(true);
  });
  it('#78 美洲进步同盟', () => {
    const g = blank();
    set(g, 'cuba', 3, 0);
    set(g, 'chile', 3, 0);
    ev(g, 78, 'US');
    expect(g.s.vp).toBe(2);
  });
  it('#80 一小步：落后时推进 2 格，只拿最后一格的 VP', () => {
    const g = blank();
    g.s.space = { US: 1, USSR: 3 };
    expect(g.canFire(80, 'USSR', 'USSR')).toBe(false);
    ev(g, 80, 'US');
    expect(g.s.space.US).toBe(3);
    expect(g.s.vp).toBe(0); // 载人航天后到 0
  });
  it('#107 切·格瓦拉：不能对战场国', () => {
    const g = blank();
    set(g, 'panama', 1, 0);
    expect(drive(g.fireEvent(107, 'USSR', {})).asked.length).toBe(0);
  });
  it('#108 我们的人在德黑兰：控制中东国家才有效果；剩余的牌放回洗匀', () => {
    const g = blank();
    expect(drive(g.fireEvent(108, 'US', {})).value).toBe(false);
    set(g, 'israel', 4, 0);
    g.s.deck = [4, 5, 7, 8];
    g.s.discard = [9, 10];
    ev(g, 108, 'US', [4, 'pass']);
    expect(g.s.discard).toContain(4);
    expect(g.s.deck.length + g.s.discard.length).toBe(6);
  });
});

describe('后期卡', () => {
  it('#82 伊朗人质危机', () => {
    const g = blank();
    set(g, 'iran', 2, 0);
    ev(g, 82, 'USSR');
    expect(g.s.inf.iran).toEqual([0, 2]);
    expect(g.s.flags.iranianHostage).toBe(true);
  });
  it('#83 铁娘子', () => {
    const g = blank();
    set(g, 'uk', 5, 2);
    ev(g, 83, 'US');
    expect(g.s.inf.uk).toEqual([5, 0]);
    expect(g.inf('argentina', 'USSR')).toBe(1);
    expect(g.s.vp).toBe(1);
  });
  it('#84 里根轰炸利比亚', () => {
    const g = blank();
    set(g, 'libya', 0, 5);
    ev(g, 84, 'US');
    expect(g.s.vp).toBe(2);
  });
  it('#85 星球大战：需要美国太空领先', () => {
    const g = blank();
    expect(g.canFire(85, 'US', 'US')).toBe(false);
  });
  it('#86 北海油田：美国本回合 8 个行动轮', () => {
    const g = blank();
    ev(g, 86, 'US');
    expect(g.maxARs('US')).toBe(8);
    expect(g.maxARs('USSR')).toBe(7);
  });
  it('#88 海军陆战队军营爆炸', () => {
    const g = blank();
    set(g, 'lebanon', 2, 0);
    set(g, 'iran', 2, 0);
    ev(g, 88, 'USSR', ['iran', 'iran']);
    expect(g.inf('lebanon', 'US') + g.inf('iran', 'US')).toBe(0);
  });
  it('#89 击落 KAL-007：美控韩国才给行动点', () => {
    const g = blank();
    ev(g, 89, 'US');
    expect(g.s.defcon).toBe(4);
    expect(g.s.vp).toBe(2);
    const g2 = blank();
    set(g2, 'southKorea', 3, 0);
    ev(g2, 89, 'US', ['influence', ...many(4, 'japan')]);
    expect(g2.inf('japan', 'US')).toBe(4);
  });
  it('#90 公开性：改革者之后才给行动点', () => {
    const g = blank();
    g.s.defcon = 4;
    ev(g, 90, 'USSR');
    expect(g.s.defcon).toBe(5);
    expect(g.s.vp).toBe(-2);
  });
  it('#91 奥尔特加：尼加拉瓜清零并可对邻国免费政变', () => {
    const g = blank();
    set(g, 'nicaragua', 2, 0);
    set(g, 'costaRica', 1, 0);
    dice(g, 6);
    ev(g, 91, 'USSR', ['coup', 'costaRica']);
    expect(g.s.inf.nicaragua[0]).toBe(0);
    expect(g.s.inf.costaRica).toEqual([0, 1]); // 6+2-6=2：移除 1、增加 1
    expect(g.s.milops.USSR).toBe(0);
  });
  it('#93 伊朗门：美国调整 -1', () => {
    const g = blank();
    set(g, 'cuba', 0, 1);
    const before = g.realignMods('US', 'cuba');
    ev(g, 93, 'USSR');
    expect(g.realignMods('US', 'cuba')).toBe(before - 1);
  });
  it('#94 切尔诺贝利：苏联不能用行动点在该区域放影响力', () => {
    const g = blank();
    set(g, 'poland', 0, 1);
    ev(g, 94, 'US', ['europe']);
    expect(g.canPlaceOps('USSR', 'eastGermany', g.snapshot('USSR'))).toBe(false);
    expect(g.canPlaceOps('USSR', 'afghanistan', g.snapshot('USSR'))).toBe(true);
  });
  it('#95 拉美债务危机', () => {
    const g = blank();
    set(g, 'chile', 0, 2);
    set(g, 'peru', 0, 1);
    g.s.hands.US = [26];
    ev(g, 95, 'USSR', ['chile', 'peru']);
    expect(g.inf('chile', 'USSR')).toBe(4);
    expect(g.inf('peru', 'USSR')).toBe(2);
  });
  it('#96 推倒这堵墙：免费政变无视 DEFCON 地区限制', () => {
    const g = blank();
    g.s.defcon = 3;
    set(g, 'poland', 0, 1);
    dice(g, 6);
    ev(g, 96, 'US', ['coup', 'poland']);
    expect(g.s.inf.poland).toEqual([2, 0]); // 6+3-6=3
    expect(g.s.defcon).toBe(2);
    expect(g.s.milops.US).toBe(0);
  });
  it('#98 艾姆斯：公开美国手牌，苏联选一张弃掉', () => {
    const g = blank();
    g.s.hands.US = [25, 26];
    ev(g, 98, 'USSR', [26]);
    expect(g.s.hands.US).toEqual([25]);
    expect(g.s.known.US).toEqual([25]);
  });
  it('#99 部署潘兴 II', () => {
    const g = blank();
    set(g, 'uk', 5, 0);
    set(g, 'italy', 2, 0);
    ev(g, 99, 'USSR', ['uk', 'italy']);
    expect(g.s.vp).toBe(-1);
    expect(g.inf('uk', 'US')).toBe(4);
  });
  it('#102 两伊战争', () => {
    const g = blank();
    set(g, 'iran', 2, 0);
    dice(g, 4);
    ev(g, 102, 'USSR', ['iran']);
    expect(g.s.inf.iran).toEqual([0, 2]);
  });
  it('#109 尤里和萨曼莎：美国政变苏联 +1', () => {
    const g = blank();
    ev(g, 109, 'USSR');
    set(g, 'cuba', 0, 1);
    dice(g, 1);
    drive(g.coup('US', 'cuba', 1));
    expect(g.s.vp).toBe(-1);
  });
});

describe('流程边界', () => {
  it('北美防空司令部不在头条阶段触发', () => {
    const g = blank();
    set(g, 'canada', 4, 0);
    g.s.flags.norad = true;
    g.s.defcon = 3;
    g.s.hands.US = [25];
    g.s.hands.USSR = [4];
    g.s.phase = 'headline';
    const hl = (g as unknown as { headlinePhase(): Generator }).headlinePhase();
    const r = drive(hl as never, [4, 25]);
    expect(g.s.defcon).toBe(2);
    expect(r.asked.some((d) => d.card === 106)).toBe(false);
    expect(g.s.flags.defconTo2).toBe(false);
  });
  it('头条：苏联打出美国牌作头条，美国执行事件、苏联是行动方', () => {
    const g = blank();
    g.s.defcon = 2;
    g.s.hands.US = [26];
    g.s.hands.USSR = [4];
    const hl = (g as unknown as { headlinePhase(): Generator }).headlinePhase();
    const r = drive(hl as never, [4, 26]);
    expect(r.over?.winner).toBe('US');
  });
  it('联合国干预不在头条可选牌中', () => {
    const g = blank();
    g.s.hands.US = [32, 25];
    g.s.hands.USSR = [14];
    const hl = (g as unknown as { headlinePhase(): Generator }).headlinePhase();
    const r = drive(hl as never, [14, 25, ...many(8)]);
    const usDec = r.asked.find((d) => d.side === 'US')!;
    expect(opts(usDec)).toEqual([25]);
  });
  it('终局计分：穿梭外交不生效，中国牌持有者 +1', () => {
    const g = blank();
    g.s.flags.shuttle = true;
    set(g, 'iran', 0, 2);
    const fs = (g as unknown as { finalScore(): void }).finalScore.bind(g);
    try {
      fs();
    } catch {
      /* GameOver */
    }
    // 中东 苏 存在3 + 战场国 1；中国牌在苏联 +1
    expect(g.s.vp).toBe(-5);
  });
  it('所有卡都有事件实现（中国牌除外）', () => {
    const g = blank();
    for (let id = 1; id <= 110; id++) {
      if (id === 6) continue;
      expect(typeof g.canFire(id, 'US', 'US'), `#${id}`).toBe('boolean');
    }
  });
});
