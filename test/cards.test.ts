import { describe, expect, it } from 'vitest';
import { blank, dice, drive, opts, set } from './helpers';

describe('早期卡', () => {
  it('#8 卡斯特罗：清除美国并控制古巴', () => {
    const g = blank();
    set(g, 'cuba', 2, 0);
    drive(g.fireEvent(8, 'USSR', {}));
    expect(g.s.inf.cuba).toEqual([0, 3]);
  });

  it('#15 纳赛尔：美国减半向上取整', () => {
    const g = blank();
    set(g, 'egypt', 3, 0);
    drive(g.fireEvent(15, 'USSR', {}));
    expect(g.s.inf.egypt).toEqual([1, 2]);
  });

  it('#21 北约需要马歇尔计划或华约', () => {
    const g = blank();
    expect(g.canFire(21, 'US', 'US')).toBe(false);
    g.s.flags.marshall = true;
    expect(g.canFire(21, 'US', 'US')).toBe(true);
  });

  it('打出条件不满足的对手事件牌：事件不发动，带星卡进弃牌堆', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    set(g, 'poland', 0, 1);
    g.s.hands.USSR = [21];
    g.s.phasing = 'USSR';
    drive(g.playCard('USSR', 21, {}), ['ops', 'influence', 'poland', 'poland', 'poland', 'poland']);
    expect(g.s.flags.nato).toBeUndefined();
    expect(g.s.discard).toContain(21);
  });

  it('打出对手事件牌换行动点：事件由对手执行，可选先后', () => {
    const g = blank();
    set(g, 'poland', 0, 1);
    set(g, 'cuba', 1, 0);
    g.s.hands.US = [8];
    const r = drive(g.playCard('US', 8, {}), ['ops', 'opsFirst', 'influence', 'cuba', 'cuba']);
    expect(opts(r.asked[1])).toEqual(['eventFirst', 'opsFirst']);
    expect(g.s.inf.cuba).toEqual([0, 3]);
    expect(g.s.removed).toContain(8);
  });

  it('#20 奥运会抵制：DEFCON -1 并获得 4 行动点', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    drive(g.fireEvent(20, 'US', {}), ['boycott', 'influence', 'japan', 'japan', 'japan', 'japan']);
    expect(g.s.defcon).toBe(4);
    expect(g.inf('japan', 'US')).toBe(5);
  });

  it('#31 红色恐慌作用于对手', () => {
    const g = blank();
    drive(g.fireEvent(31, 'US', {}));
    expect(g.effOps('USSR', 14)).toBe(2);
    expect(g.effOps('US', 25)).toBe(3);
  });

  it('#32 联合国干预：取消对手事件并用其行动点；U-2 加 1 VP', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    g.s.hands.US = [32, 8];
    g.s.flags.u2 = true;
    drive(g.playCard('US', 32, {}), ['event', 'influence', 'japan', 'japan']);
    expect(g.inf('japan', 'US')).toBe(3);
    expect(g.s.inf.cuba).toEqual([0, 0]);
    expect(g.s.discard).toEqual(expect.arrayContaining([8, 32]));
    expect(g.s.vp).toBe(-1);
  });

  it('#5 五年计划：抽中美国事件即发动', () => {
    const g = blank();
    g.s.hands.USSR = [25];
    drive(g.fireEvent(5, 'US', {}));
    expect(g.s.flags.containment).toBe(true);
    expect(g.s.removed).toContain(25);
  });

  it('#103 叛逃者头条取消苏联头条', () => {
    const g = blank();
    g.s.hands.US = [103];
    g.s.hands.USSR = [4];
    const gen = (g as unknown as { headlinePhase(): Generator }).headlinePhase();
    const r = drive(gen as never, [4, 103]);
    expect(r.over).toBeUndefined();
    expect(g.s.defcon).toBe(5);
    expect(g.s.discard).toEqual(expect.arrayContaining([103, 4]));
  });

  it('#104 剑桥五杰在后期不能作为事件', () => {
    const g = blank();
    g.s.turn = 8;
    expect(g.canFire(104, 'USSR', 'USSR')).toBe(false);
  });
});

describe('中期卡', () => {
  it('#13 阿以战争：以色列本身被美控也 -1', () => {
    const g = blank();
    set(g, 'israel', 4, 0);
    dice(g, 4);
    drive(g.fireEvent(13, 'USSR', {}));
    expect(g.s.inf.israel).toEqual([4, 0]);
    expect(g.s.milops.USSR).toBe(2);
  });

  it('#42 泥潭：弃牌并掷 1–4 脱困', () => {
    const g = blank();
    g.s.flags.quagmire = true;
    g.s.inPlay.push(42);
    g.s.hands.US = [25, 4];
    dice(g, 3);
    const gen = (g as unknown as { trapRound(s: string): Generator }).trapRound('US');
    drive(gen as never, [25]);
    expect(g.s.flags.quagmire).toBe(false);
    expect(g.s.removed).toContain(42);
  });

  it('#48 厨房辩论没有效果时不移出', () => {
    const g = blank();
    g.s.hands.US = [48];
    drive(g.playCard('US', 48, {}), ['event']);
    expect(g.s.discard).toContain(48);
    expect(g.s.vp).toBe(0);
  });

  it('#49 导弹嫉妒：换走最高行动点牌，对手下轮必须用行动点打出', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    g.s.hands.US = [49];
    g.s.hands.USSR = [14, 9];
    drive(g.playCard('US', 49, {}), ['event', 'japan', 'japan', 'japan']);
    expect(g.s.hands.USSR).toEqual([9, 49]);
    expect(g.s.flags.missileEnvy).toBe('USSR');
    expect(g.inf('japan', 'US')).toBe(4);
  });

  it('#67 出售谷物：还回去则用 2 点行动点', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    g.s.hands.USSR = [14];
    drive(g.fireEvent(67, 'US', {}), ['return', 'influence', 'japan', 'japan']);
    expect(g.s.hands.USSR).toEqual([14]);
    expect(g.s.known.USSR).toContain(14);
    expect(g.inf('japan', 'US')).toBe(3);
  });

  it('#67 出售谷物：打出抽到的苏联牌', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    g.s.hands.USSR = [25];
    drive(g.fireEvent(67, 'US', {}), ['play', 'event']);
    expect(g.s.flags.containment).toBe(true);
    expect(g.s.hands.USSR).toEqual([]);
  });

  it('#50 我们将埋葬你们：美国下一行动轮没打联合国干预则苏联 +3', () => {
    const g = blank();
    drive(g.fireEvent(50, 'USSR', {}));
    expect(g.s.flags.wwby).toBe(true);
    g.s.hands.US = [4];
    g.s.phasing = 'US';
    const gen = (g as unknown as { actionRound(s: string, o: boolean): Generator }).actionRound('US', false);
    drive(gen as never, [4, 'event']);
    expect(g.s.vp).toBe(-3 + (5 - 3));
  });

  it('#107 切·格瓦拉：移除美国影响力后可再政变一次', () => {
    const g = blank();
    set(g, 'guatemala', 1, 0);
    set(g, 'bolivia', 1, 0);
    dice(g, 6);
    const r = drive(g.fireEvent(107, 'USSR', {}), ['guatemala', 'bolivia']);
    expect(r.asked.length).toBe(2);
    expect(g.s.inf.guatemala[0]).toBe(0);
    expect(g.s.milops.USSR).toBe(5);
  });

  it('#43 SALT：DEFCON +2，政变 -1，可从弃牌堆拿牌', () => {
    const g = blank();
    g.s.defcon = 2;
    g.s.discard = [1, 14];
    drive(g.fireEvent(43, 'USSR', {}), [14]);
    expect(g.s.defcon).toBe(4);
    expect(g.s.hands.USSR).toEqual([14]);
    expect(g.s.discard).toEqual([1]);
  });
});

describe('后期卡', () => {
  it('#100 战争游戏：给对手 6 VP 后结束', () => {
    const g = blank();
    g.s.defcon = 2;
    g.s.vp = 8;
    const r = drive(g.fireEvent(100, 'US', {}), ['end']);
    expect(r.over?.winner).toBe('US');
    expect(g.s.vp).toBe(2);
  });

  it('#85 星球大战：从弃牌堆打出事件', () => {
    const g = blank();
    g.s.space = { US: 2, USSR: 1 };
    g.s.discard = [25];
    drive(g.fireEvent(85, 'US', {}), []);
    expect(g.s.flags.containment).toBe(true);
  });

  it('#87 改革者：苏联领先时放 6 点', () => {
    const g = blank();
    g.s.vp = -1;
    const r = drive(g.fireEvent(87, 'USSR', {}), ['poland', 'poland', 'eastGermany', 'eastGermany', 'hungary', 'hungary']);
    expect(r.asked.length).toBe(6);
    expect(g.canTarget('USSR', 'italy', 'coup')).toBe(false);
  });

  it('#96 推倒这堵墙取消维利·勃兰特', () => {
    const g = blank();
    drive(g.fireEvent(55, 'USSR', {}));
    expect(g.s.flags.willyBrandt).toBe(true);
    drive(g.fireEvent(96, 'US', {}), ['skip']);
    expect(g.s.flags.willyBrandt).toBe(false);
    expect(g.canFire(55, 'USSR', 'USSR')).toBe(false);
  });

  it('#92 恐怖主义：伊朗人质危机后美国弃 2 张', () => {
    const g = blank();
    g.s.flags.iranianHostage = true;
    g.s.hands.US = [4, 25, 26];
    drive(g.fireEvent(92, 'USSR', {}));
    expect(g.s.hands.US.length).toBe(1);
  });
});
