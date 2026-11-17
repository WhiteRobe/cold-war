import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game';
import { scoreRegion } from '../src/engine/scoring';
import { DEFAULT_OPTIONS } from '../src/engine/types';
import { blank, dice, drive, opts, set } from './helpers';

describe('控制与放置影响力', () => {
  it('控制判定', () => {
    const g = blank();
    set(g, 'italy', 2, 0);
    expect(g.controller('italy')).toBe('US');
    set(g, 'italy', 3, 2);
    expect(g.controller('italy')).toBe(null);
    set(g, 'westGermany', 4, 0);
    expect(g.controls('US', 'westGermany')).toBe(true);
  });

  it('只能放在有己方影响力的国家或其邻国，新放的不能当跳板', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    const snap = g.snapshot('US');
    expect(g.canPlaceOps('US', 'southKorea', snap)).toBe(true); // 邻国
    expect(g.canPlaceOps('US', 'northKorea', snap)).toBe(false);
    g.addInf('southKorea', 'US', 1); // 本轮新放
    expect(g.canPlaceOps('US', 'northKorea', snap)).toBe(false);
    expect(g.canPlaceOps('US', 'mexico', snap)).toBe(true); // 与美国相邻
  });

  it('敌控国每点 2 行动点，控制被打破后按 1 点计', () => {
    const g = blank();
    set(g, 'turkey', 0, 2);
    expect(g.placeCost('US', 'turkey')).toBe(2);
    g.addInf('turkey', 'US', 1);
    expect(g.placeCost('US', 'turkey')).toBe(1);
  });

  it('行动点必须花完', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    const r = drive(g.opsPlay('US', 3, {}), ['japan', 'japan', 'japan']);
    expect(r.asked.at(-1)!.options.some((o) => o.v === 'done')).toBe(false);
    expect(g.inf('japan', 'US')).toBe(4);
  });
});

describe('行动点修正', () => {
  it('中国牌全部用于亚洲 +1，离开亚洲后失去加成', () => {
    const g = blank();
    set(g, 'japan', 1, 0);
    expect(g.opsBudget('US', 4, 6, 'asia')).toBe(5);
    expect(g.opsBudget('US', 4, 6, 'other')).toBe(4);
  });

  it('遏制政策 +1，单卡最多 4；中国牌在亚洲可到 5', () => {
    const g = blank();
    g.s.flags.containment = true;
    expect(g.opsBudget('US', 3, 1, 'other')).toBe(4);
    expect(g.opsBudget('US', 4, 1, 'other')).toBe(4);
    expect(g.opsBudget('US', 4, 6, 'asia')).toBe(5);
    expect(g.opsBudget('US', 1, 26, 'other')).toBe(2); // CIA Created
  });

  it('红色恐慌 -1，最低 1；与越南起义叠加（规则书 7.4 例）', () => {
    const g = blank();
    g.s.flags.redScare = ['USSR'];
    expect(g.opsBudget('USSR', 1, 1, 'other')).toBe(1);
    g.s.flags.vietnamRevolts = true;
    expect(g.opsBudget('USSR', 4, 6, 'sea')).toBe(5);
  });
});

describe('政变', () => {
  it('成功：差值先移除对手，再增加己方；战场国降 DEFCON；计入军事行动', () => {
    const g = blank();
    set(g, 'iran', 0, 1);
    dice(g, 4);
    drive(g.coup('US', 'iran', 3));
    // 4 + 3 - 2*2 = 3：移除 1，增加 2
    expect(g.s.inf.iran).toEqual([2, 0]);
    expect(g.s.defcon).toBe(4);
    expect(g.s.milops.US).toBe(3);
  });

  it('DEFCON 地区限制与北约保护', () => {
    const g = blank();
    set(g, 'italy', 3, 1);
    g.s.defcon = 4;
    expect(g.canTarget('USSR', 'italy', 'coup')).toBe(false);
    g.s.defcon = 5;
    expect(g.canTarget('USSR', 'italy', 'coup')).toBe(true);
    g.s.flags.nato = true;
    expect(g.canTarget('USSR', 'italy', 'coup')).toBe(false);
    set(g, 'france', 3, 1);
    g.s.flags.deGaulle = true;
    expect(g.canTarget('USSR', 'france', 'coup')).toBe(true);
  });

  it('DEFCON 2 时战场国政变引发核战争，行动方输', () => {
    const g = blank();
    set(g, 'pakistan', 0, 1);
    g.s.defcon = 2;
    g.s.phasing = 'US';
    dice(g, 1);
    const r = drive(g.coup('US', 'pakistan', 2));
    expect(r.over?.winner).toBe('USSR');
  });

  it('核潜艇：美方行动点政变战场国不降 DEFCON', () => {
    const g = blank();
    set(g, 'iran', 0, 1);
    g.s.flags.nuclearSubs = true;
    dice(g, 6);
    drive(g.coup('US', 'iran', 2));
    expect(g.s.defcon).toBe(5);
  });

  it('古巴导弹危机期间政变：不解除即输', () => {
    const g = blank();
    set(g, 'iran', 0, 1);
    g.s.flags.cmc = 'US';
    const r = drive(g.coup('US', 'iran', 2));
    expect(r.over?.winner).toBe('USSR');
    const g2 = blank();
    set(g2, 'iran', 0, 1);
    set(g2, 'turkey', 2, 0);
    g2.s.flags.cmc = 'US';
    dice(g2, 1);
    const r2 = drive(g2.coup('US', 'iran', 2), ['turkey']);
    expect(r2.over).toBeUndefined();
    expect(g2.s.flags.cmc).toBeUndefined();
  });
});

describe('调整阵营', () => {
  it('修正：相邻受控国、影响力更多、与本国相邻（规则书朝鲜例）', () => {
    const g = blank();
    set(g, 'northKorea', 0, 3);
    expect(g.realignMods('US', 'northKorea')).toBe(0);
    expect(g.realignMods('USSR', 'northKorea')).toBe(2);
  });
});

describe('计分', () => {
  it('支配需要至少一个非战场国', () => {
    const g = blank();
    set(g, 'iran', 2, 0);
    set(g, 'iraq', 3, 0);
    expect(scoreRegion(g.s, 'middleEast').US.level).toBe('presence');
    set(g, 'jordan', 2, 0);
    expect(scoreRegion(g.s, 'middleEast').US.level).toBe('domination');
  });

  it('欧洲计分：控制即胜', () => {
    const g = blank();
    for (const c of ['france', 'westGermany', 'eastGermany', 'poland', 'italy']) set(g, c, 6, 0);
    set(g, 'uk', 5, 0);
    const r = scoreRegion(g.s, 'europe');
    expect(r.autoWin).toBe('US');
  });

  it('穿梭外交扣苏方一个战场国', () => {
    const g = blank();
    set(g, 'iran', 0, 2);
    set(g, 'iraq', 0, 3);
    set(g, 'israel', 4, 0);
    const r = scoreRegion(g.s, 'middleEast', { shuttle: true });
    expect(r.USSR.bgs).toBe(1);
    expect(r.USSR.countries).toBe(1);
  });

  it('军事行动不足给对手 VP', () => {
    const g = new Game({ seed: 3, options: DEFAULT_OPTIONS });
    g.s.defcon = 3;
    g.s.milops = { US: 1, USSR: 3 };
    // 直接走回合结束逻辑
    const end = (g as unknown as { endTurn(): Generator }).endTurn();
    g.s.hands = { US: [], USSR: [] };
    end.next();
    expect(g.s.vp).toBe(-2);
  });
});

describe('太空竞赛', () => {
  it('先到 / 后到 VP', () => {
    const g = blank();
    g.advanceSpace('US', 1);
    expect(g.s.vp).toBe(2);
    g.advanceSpace('USSR', 1);
    expect(g.s.vp).toBe(1);
  });
  it('一小步只拿最终格 VP', () => {
    const g = blank();
    g.s.space = { US: 0, USSR: 2 };
    g.advanceSpace('US', 2);
    expect(g.s.space.US).toBe(2);
    expect(g.s.vp).toBe(0);
  });
});

describe('战争', () => {
  it('局部战争：防守方超级大国算一个相邻敌控国', () => {
    const g = blank();
    set(g, 'mexico', 2, 0);
    dice(g, 3);
    drive(g.war('USSR', 36, 'mexico', { need: 3, vp: 1, milops: 3 }));
    expect(g.s.inf.mexico).toEqual([2, 0]); // 3-1=2 失败
    dice(g, 4);
    drive(g.war('USSR', 36, 'mexico', { need: 3, vp: 1, milops: 3 }));
    expect(g.s.inf.mexico).toEqual([0, 2]);
  });
});

describe('回放', () => {
  it('同样的种子和选择得到同样的局面', () => {
    const g = new Game({ seed: 42, options: DEFAULT_OPTIONS });
    let k = 0;
    while (!g.over && k < 400) {
      const d = g.waiting.find((_, j) => g.answers[j] === undefined)!;
      g.submit(d.side, d.options[(k * 7) % d.options.length].v);
      k++;
    }
    const r = Game.replay(g.setup, g.history);
    expect(r.s).toEqual(g.s);
  });
});

void opts;
