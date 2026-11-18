import { describe, expect, it } from 'vitest';
import { cardPreview, effectiveOps } from '../src/client/game/preview';
import { viewFor } from '../src/engine/view';
import { blank, set } from './helpers';

describe('打出前预估', () => {
  it('首脑峰会：按支配/控制区域数给修正和胜率', () => {
    const g = blank();
    g.s.phase = 'action';
    for (const c of ['iran', 'iraq', 'jordan']) set(g, c, 3, 0);
    const v = viewFor(g, 'US');
    const p = cardPreview(v, 45)!;
    expect(p.lines.join('\n')).toContain('美国支配/控制 1 个区域');
    expect(p.tone).toBe('good');
  });
  it('朝鲜战争：相邻美控国减骰', () => {
    const g = blank();
    set(g, 'japan', 4, 0);
    const p = cardPreview(viewFor(g, 'USSR'), 11)!;
    expect(p.lines.join('\n')).toContain('修正 −1');
  });
  it('遏制政策下行动点 +1，上限 4', () => {
    const g = blank();
    g.s.flags.containment = true;
    expect(effectiveOps(viewFor(g, 'US'), 'US', 4).ops).toBe(4);
    expect(effectiveOps(viewFor(g, 'US'), 'US', 21).ops).toBe(4);
  });
  it('北约条件不满足时提示', () => {
    const g = blank();
    expect(cardPreview(viewFor(g, 'US'), 21)!.lines.some((l) => l.includes('不能发动'))).toBe(true);
  });
});
