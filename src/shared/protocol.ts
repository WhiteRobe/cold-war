import type { GameOptions, Side, Choice } from '../engine/types';
import type { GameView } from '../engine/view';
import type { AiLevel } from '../ai';

export interface Me {
  id: string;
  name: string;
  guest: boolean;
}

export type SeatChoice = Side | 'random';

export interface RoomConfig {
  options: GameOptions;
  /** 房主的阵营 */
  hostSide: SeatChoice;
  /** 对手为 AI 时的档位；null 表示等待真人 */
  ai: AiLevel | null;
}

export interface Seat {
  userId?: string;
  name: string;
  ai?: AiLevel;
  online?: boolean;
}

export interface RoomInfo {
  id: string;
  code: string;
  name: string;
  host: string;
  status: 'waiting' | 'playing' | 'ended';
  config: RoomConfig;
  seats: Partial<Record<Side, Seat>>;
  /** 加入但未入座（阵营待定）的玩家 */
  pending?: Seat[];
}

export interface RoomSummary {
  id: string;
  code: string;
  name: string;
  host: string;
  status: RoomInfo['status'];
  humans: number;
  vsAi: boolean;
  updatedAt: number;
}

/** 客户端 → 对局 DO */
export type ClientMsg =
  | { type: 'hello'; logFrom: number }
  | { type: 'choose'; seq: number; v: Choice }
  | { type: 'start' }
  | { type: 'config'; config: RoomConfig }
  | { type: 'undo' }
  | { type: 'undoAnswer'; ok: boolean }
  | { type: 'chat'; text: string }
  | { type: 'resign' };

/** 对局 DO → 客户端 */
export type ServerMsg =
  | { type: 'room'; room: RoomInfo; you: Side | null; host: boolean }
  | { type: 'view'; view: GameView; logReset: boolean }
  | { type: 'undoAsk'; from: Side }
  | { type: 'chat'; from: string; text: string; at: number }
  | { type: 'error'; msg: string };

export type LobbyMsg = { type: 'rooms'; rooms: RoomSummary[] } | { type: 'upsert'; room: RoomSummary } | { type: 'remove'; id: string };
