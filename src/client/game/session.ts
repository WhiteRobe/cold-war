import { signal, type Signal } from '@preact/signals';
import type { AiLevel } from '../../ai';
import type { Choice, GameOptions, LogEntry, Side } from '../../engine/types';
import type { GameView } from '../../engine/view';

/** 对局会话：离线（Web Worker 里跑引擎 + AI）或在线（WebSocket 连 GameDO） */
export interface GameSession {
  kind: 'offline' | 'online';
  view: Signal<GameView | null>;
  /** 完整日志（增量合并） */
  log: Signal<LogEntry[]>;
  names: Signal<Record<Side, string>>;
  choose(v: Choice): void;
  undo?(): void;
  /** 对局结束后进入不死不休（仅人机离线局） */
  endless?(): void;
  canUndo: Signal<boolean>;
  close(): void;
}

export interface OfflineSave {
  id: string;
  seed: number;
  options: GameOptions;
  human: Side;
  ai: AiLevel;
  /** 新手教程局：强制显示引导 */
  tutorial?: boolean;
  history: { side: Side; v: Choice }[];
  createdAt: number;
  updatedAt: number;
  /** 存档列表显示用 */
  summary: { turn: number; vp: number; defcon: number; over: boolean; winner?: Side | null };
}

export type WorkerIn =
  | { type: 'start'; save: OfflineSave }
  | { type: 'choose'; v: Choice }
  | { type: 'undo' }
  | { type: 'endless' };

export type WorkerOut =
  | { type: 'view'; view: GameView; history: OfflineSave['history']; canUndo: boolean }
  | { type: 'error'; msg: string };

export const mkSignal = signal;
