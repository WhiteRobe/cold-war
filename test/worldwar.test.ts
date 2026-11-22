import { describe, expect, it } from 'vitest';
import { COUNTRY_LIST } from '../src/data';
import { WAR_NUKE_AFTER, worldWar } from '../src/engine/endless';
import { Game, GameOver } from '../src/engine/game';
import { controller } from '../src/engine/scoring';
import { DEFAULT_OPTIONS } from '../src/engine/types';

function war(seed: number, inf: Record<string, [number, number]>) {
  const g = new Game({ seed, options: { ...DEFAULT_OPTIONS, endless: true } });
  for (const c of COUNTRY_LIST) g.s.inf[c.id] = inf[c.id] ?? [0, 0];
  let over: GameOver | null = null;
  try {
    worldWar(g);
  } catch (e) {
    over = e as GameOver;
  }
  return { g, over };
}

describe('世界大战', () => {
  it('推演到每个国家都有归属，控制多的一方获胜', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { g, over } = war(seed, { mexico: [4, 2], elSalvador: [0, 1], poland: [0, 4], france: [3, 0] });
      expect(over).toBeInstanceOf(GameOver);
      expect(COUNTRY_LIST.every((c) => controller(g.s, c.id))).toBe(true);
      const n = { US: 0, USSR: 0 };
      for (const c of COUNTRY_LIST) n[controller(g.s, c.id)!]++;
      expect(over!.winner).toBe(n.US > n.USSR ? 'US' : n.USSR > n.US ? 'USSR' : null);
      // 争夺次数有上限，轮数不会超过上限 + 1
      expect(g.s.log.filter((l) => l.war).length).toBeLessThanOrEqual(WAR_NUKE_AFTER + 1);
    }
  });

  it('被控制的邻国只算控制方：墨西哥（美 4 苏 2）对邻国只施压美 4', () => {
    const { g } = war(7, { mexico: [4, 2] });
    const first = g.s.log.find((l) => l.war)!.war!.changes.find((x) => x.c === 'guatemala')!;
    // 危地马拉的邻国里只有墨西哥有影响力（同洲先结算的国家可能已加上影响力，只核对美方）
    expect(first.push[0]).toBe(4);
  });

  it('同一种子推演结果一致', () => {
    const a = war(9, { mexico: [4, 2] }).g.s.inf;
    const b = war(9, { mexico: [4, 2] }).g.s.inf;
    expect(a).toEqual(b);
  });
});
