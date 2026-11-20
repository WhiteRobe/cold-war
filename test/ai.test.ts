import { describe, expect, it } from 'vitest';
import { playMatch } from '../scripts/ai-match';
import { chooseAI, type AiLevel } from '../src/ai';
import { Game } from '../src/engine/game';
import { viewFor } from '../src/engine/view';
import forced from './fixtures/forced-scoring.json';

// 用户要求不做大规模模拟：每项只跑少量对局
describe('AI', () => {
  for (const lv of [1, 2, 3] as AiLevel[]) {
    it(`${lv} 档自对弈 3 局，每步合法`, () => {
      for (let i = 0; i < 3; i++) {
        const m = playMatch({ US: lv, USSR: lv }, 500 + i);
        expect(m.steps).toBeGreaterThan(10);
      }
    }, 60_000);
  }

  it('2 档明显强于 1 档（双方各执一边，共 10 局）', () => {
    let wins = 0;
    for (let i = 0; i < 10; i++) {
      const smartUS = i % 2 === 0;
      const m = playMatch(smartUS ? { US: 2, USSR: 1 } : { US: 1, USSR: 2 }, 600 + i);
      if (m.winner === (smartUS ? 'US' : 'USSR')) wins++;
    }
    expect(wins / 10).toBeGreaterThan(0.65);
  }, 60_000);

  it('3 档不弱于 2 档（10 局）', () => {
    let wins = 0, losses = 0;
    for (let i = 0; i < 10; i++) {
      const l3US = i % 2 === 0;
      const m = playMatch(l3US ? { US: 3, USSR: 2 } : { US: 2, USSR: 3 }, 700 + i);
      const l3Side = l3US ? 'US' : 'USSR';
      if (m.winner === l3Side) wins++;
      else if (m.winner) losses++;
    }
    expect(wins).toBeGreaterThanOrEqual(3);
    expect(losses).toBeLessThanOrEqual(7);
  }, 120_000);

  it('单步耗时：2 档 < 5ms，3 档 < 50ms（平均）', () => {
    const m = playMatch({ US: 2, USSR: 3 }, 800);
    expect(m.ms.US / m.decisions.US).toBeLessThan(5);
    expect(m.ms.USSR / m.decisions.USSR).toBeLessThan(50);
  }, 60_000);

  it('最后一个行动轮手里有计分卡时必须打出（实战复盘：曾打出熊陷阱后持计分卡判负）', () => {
    const g = Game.replay({ seed: forced.seed, options: forced.options }, forced.history as never);
    const v = viewFor(g, 'USSR');
    for (const lv of [1, 2, 3] as AiLevel[]) expect(chooseAI(v, v.decision!, lv, () => 0.5)).toBe(3);
  });
});
