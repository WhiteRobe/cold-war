import type { Me, RoomConfig } from '../shared/protocol';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const text = await res.text();
  let data: { error?: string } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* 非 JSON */
  }
  if (res.status === 429 && !data?.error) throw new Error('今天的免费额度用完了，请北京时间 8 点后再来');
  if (!res.ok) throw new Error(data?.error || `请求失败（${res.status}）`);
  return data as T;
}

export interface MatchRow {
  id: number;
  room_id: string;
  us_name: string;
  ussr_name: string;
  winner: string | null;
  reason: string;
  turn: number;
  vp: number;
  finished_at: number;
}

export const api = {
  me: () => call<Me>('GET', '/api/me'),
  login: (username: string, password: string) => call<Me>('POST', '/api/login', { username, password }),
  register: (username: string, password: string) => call<Me>('POST', '/api/register', { username, password }),
  guest: () => call<Me>('POST', '/api/guest', {}),
  logout: () => call<unknown>('POST', '/api/logout', {}),
  createRoom: (name: string, config: RoomConfig, isPrivate: boolean) => call<{ id: string; code: string }>('POST', '/api/rooms', { name, config, private: isPrivate }),
  joinByCode: (code: string) => call<{ id: string }>('POST', '/api/rooms/join', { code }),
  matches: () => call<MatchRow[]>('GET', '/api/matches'),
  replay: (roomId: string) => call<{ seed: number; options: import('../engine/types').GameOptions; history: { side: 'US' | 'USSR'; v: string | number }[]; names: Record<'US' | 'USSR', string> }>('GET', `/api/replay/${roomId}`),
};
