import { describe, expect, it } from 'vitest';
import { CARD_LIST, COUNTRIES, COUNTRY_LIST, REGIONS, countriesIn } from '../src/data';

describe('地图数据', () => {
  it('84 国、29 个战场国', () => {
    expect(COUNTRY_LIST.length).toBe(84);
    expect(COUNTRY_LIST.filter((c) => c.bg).length).toBe(29);
  });
  it('各区域国家数', () => {
    const n = Object.fromEntries(REGIONS.map((r) => [r, countriesIn(r).length]));
    expect(n).toEqual({ europe: 21, asia: 15, middleEast: 10, africa: 18, centralAmerica: 10, southAmerica: 10 });
    expect(countriesIn('southeastAsia').length).toBe(7);
    expect(countriesIn('westernEurope').length).toBe(14);
    expect(countriesIn('easternEurope').length).toBe(9);
  });
  it('邻接对称且引用有效', () => {
    for (const c of COUNTRY_LIST) for (const a of c.adj) {
      if (a === 'usa' || a === 'ussr') continue;
      expect(COUNTRIES[a], `${c.id}->${a}`).toBeTruthy();
      expect(COUNTRIES[a].adj).toContain(c.id);
    }
  });
  it('超级大国邻接', () => {
    expect(COUNTRY_LIST.filter((c) => c.adj.includes('usa')).map((c) => c.id).sort()).toEqual(['canada', 'cuba', 'japan', 'mexico']);
    expect(COUNTRY_LIST.filter((c) => c.adj.includes('ussr')).map((c) => c.id).sort()).toEqual(['afghanistan', 'finland', 'northKorea', 'poland', 'romania']);
  });
  it('固定开局影响力', () => {
    const us = COUNTRY_LIST.reduce((s, c) => s + c.start[0], 0);
    const ussr = COUNTRY_LIST.reduce((s, c) => s + c.start[1], 0);
    expect(us).toBe(18); // 25 - 自由放置 7
    expect(ussr).toBe(9); // 15 - 自由放置 6
  });
});

describe('卡牌数据', () => {
  it('110 张、编号连续', () => {
    expect(CARD_LIST.map((c) => c.id)).toEqual(Array.from({ length: 110 }, (_, i) => i + 1));
  });
  it('时期分布', () => {
    const n = (e: string) => CARD_LIST.filter((c) => c.era === e).length;
    expect([n('early'), n('mid'), n('late')]).toEqual([39, 48, 23]);
  });
  it('计分卡与战争卡', () => {
    expect(CARD_LIST.filter((c) => c.scoring).map((c) => c.id)).toEqual([1, 2, 3, 37, 38, 79, 81]);
    expect(CARD_LIST.filter((c) => c.war).map((c) => c.id)).toEqual([11, 13, 24, 36, 102]);
  });
  it('都有中文名和文本', () => {
    for (const c of CARD_LIST) {
      expect(c.zh, `#${c.id}`).toBeTruthy();
      expect(c.text, `#${c.id}`).toBeTruthy();
    }
  });
});
