import type { Game, Gen } from '../game';
import type { Side } from '../types';
import { EARLY } from './early';
import { MID } from './mid';
import { LATE } from './late';
import { SCORING } from './scoring';
import { ENDLESS } from './endless';

export interface EffectCtx {
  /** 打出这张牌的玩家（行动方） */
  player: Side;
  headline: boolean;
}

export interface Effect {
  /** 事件前提（如 NATO 需要先有马歇尔计划或华约） */
  can?(g: Game, me: Side, player: Side): boolean;
  /** 局面条件：不满足时事件“没有效果”，带星卡也不移出 */
  effect?(g: Game, me: Side): boolean;
  run(g: Game, me: Side, ctx: EffectCtx): Gen;
}

export const EFFECTS: Record<number, Effect> = { ...SCORING, ...EARLY, ...MID, ...LATE, ...ENDLESS };
