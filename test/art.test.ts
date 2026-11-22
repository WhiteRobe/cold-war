import { describe, expect, it } from 'vitest';
import { CARD_LIST } from '../src/data';
import { SAMPLES, cardArt } from '../src/art';

/** 简单良构检查：标签成对且正确嵌套 */
function wellFormed(s: string): boolean {
  const stack: string[] = [];
  const re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) {
      if (stack.pop() !== name) return false;
    } else stack.push(name);
  }
  return stack.length === 0;
}

describe('卡牌插画', () => {
  it('110 张都有插画且符合 low poly 约束', () => {
    for (const c of CARD_LIST) {
      const s = cardArt(c.id);
      expect(s.length, `#${c.id}`).toBeGreaterThan(200);
      for (const bad of ['<text', 'gradient', 'filter', '<image', '<circle', '<ellipse']) expect(s.includes(bad), `#${c.id} 含 ${bad}`).toBe(false);
      expect(wellFormed(s), `#${c.id} 标签不配对`).toBe(true);
    }
  });

  it('每张插画各不相同', () => {
    const set = new Set(CARD_LIST.map((c) => cardArt(c.id)));
    expect(set.size).toBe(CARD_LIST.length);
  });

  it('10 张样板', () => {
    expect(SAMPLES.length).toBe(10);
  });
});
