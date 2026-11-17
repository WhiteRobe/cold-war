import type { GameView } from '../engine/view';
import type { Choice, Decision } from '../engine/types';

export type AiLevel = 1 | 2 | 3;

export const AI_LEVEL_ZH: Record<AiLevel, string> = { 1: '新兵', 2: '参谋', 3: '将军' };

/**
 * AI 选择。只能看到 view（与真人同样的信息），不能作弊。
 * rand 返回 [0,1) 随机数（由调用方提供，便于复现）。
 */
export function chooseAI(view: GameView, d: Decision, level: AiLevel, rand: () => number): Choice {
  // TODO(M6)：启发式 AI；目前随机
  void view;
  void level;
  return d.options[Math.floor(rand() * d.options.length)].v;
}
