import type { LobbyDO } from './lobby';
import type { GameDO } from './game';

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  LOBBY: DurableObjectNamespace<LobbyDO>;
  GAME: DurableObjectNamespace<GameDO>;
  SESSION_SECRET: string;
  PBKDF2_ITERATIONS: string;
  AI_DELAY_MS: string;
}

export interface Identity {
  id: string;
  name: string;
  guest: boolean;
}

export function lobbyStub(env: Env) {
  return env.LOBBY.get(env.LOBBY.idFromName('lobby'));
}

export function gameStub(env: Env, roomId: string) {
  return env.GAME.get(env.GAME.idFromName(roomId));
}
