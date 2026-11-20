import { signal } from '@preact/signals';
import type { Choice, LogEntry, Side } from '../../engine/types';
import type { GameView } from '../../engine/view';
import type { ClientMsg, RoomInfo, ServerMsg } from '../../shared/protocol';
import { Conn, type ConnStatus } from '../net';
import { toast } from '../store';
import { recordResult } from './record';
import type { GameSession } from './session';

export interface OnlineRoom extends GameSession {
  room: ReturnType<typeof signal<RoomInfo | null>>;
  you: ReturnType<typeof signal<Side | null>>;
  host: ReturnType<typeof signal<boolean>>;
  status: ReturnType<typeof signal<ConnStatus>>;
  undoAsk: ReturnType<typeof signal<Side | null>>;
  chat: ReturnType<typeof signal<{ from: string; text: string; at: number }[]>>;
  send(m: ClientMsg): void;
}

export function onlineSession(roomId: string): OnlineRoom {
  const view = signal<GameView | null>(null);
  const log = signal<LogEntry[]>([]);
  const room = signal<RoomInfo | null>(null);
  const you = signal<Side | null>(null);
  const host = signal(false);
  const status = signal<ConnStatus>('connecting');
  const undoAsk = signal<Side | null>(null);
  const chat = signal<{ from: string; text: string; at: number }[]>([]);
  const names = signal<Record<Side, string>>({ US: '美国', USSR: '苏联' });
  const canUndo = signal(false);

  const onMsg = (m: ServerMsg) => {
    if (m.type === 'room') {
      room.value = m.room;
      you.value = m.you;
      host.value = m.host;
      names.value = { US: m.room.seats.US?.name ?? '美国', USSR: m.room.seats.USSR?.name ?? '苏联' };
    } else if (m.type === 'view') {
      log.value = m.logReset ? m.view.log : [...log.value, ...m.view.log];
      view.value = { ...m.view, log: log.value };
      canUndo.value = !!m.view.me && m.view.phase !== 'over';
      // 自己参与的在线对局也计入首页战绩（观战不算）
      if (m.view.me) recordResult(`on:${roomId}`, view.value);
    } else if (m.type === 'undoAsk') {
      undoAsk.value = m.from;
    } else if (m.type === 'chat') {
      chat.value = [...chat.value.slice(-50), m];
      toast(`${m.from}：${m.text}`);
    } else if (m.type === 'error') {
      toast(m.msg);
    }
  };

  const conn = new Conn<ServerMsg, ClientMsg>(`/ws/game/${roomId}`, onMsg, (s) => (status.value = s), () => ({ type: 'hello', logFrom: 0 }));

  return {
    kind: 'online',
    view,
    log,
    names,
    canUndo,
    room,
    you,
    host,
    status,
    undoAsk,
    chat,
    send: (m) => conn.send(m),
    choose: (v: Choice) => conn.send({ type: 'choose', seq: view.value?.seq ?? 0, v }),
    undo: () => {
      conn.send({ type: 'undo' });
      toast('已发出悔棋请求');
    },
    close: () => conn.close(),
  };
}
