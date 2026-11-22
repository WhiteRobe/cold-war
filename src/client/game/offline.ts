import { signal } from '@preact/signals';
import type { AiLevel } from '../../ai';
import type { Choice, GameOptions, LogEntry, Side } from '../../engine/types';
import type { GameView } from '../../engine/view';
import { AI_LEVEL_ZH } from '../../ai';
import { recordResult, voidRecord } from './record';
import type { GameSession, OfflineSave, WorkerIn, WorkerOut } from './session';

const KEY = 'cw.saves.v1';

export function listSaves(): OfflineSave[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, OfflineSave>;
    return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function getSave(id: string): OfflineSave | undefined {
  return listSaves().find((s) => s.id === id);
}

export function putSave(s: OfflineSave) {
  const all = Object.fromEntries(listSaves().map((x) => [x.id, x]));
  all[s.id] = s;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteSave(id: string) {
  const all = Object.fromEntries(listSaves().map((x) => [x.id, x]));
  delete all[id];
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function newSave(human: Side, ai: AiLevel, options: GameOptions, tutorial = false): OfflineSave {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const seed = crypto.getRandomValues(new Uint32Array(1))[0] | 0;
  const now = Date.now();
  const save: OfflineSave = { id, seed, options, human, ai, tutorial, history: [], createdAt: now, updatedAt: now, summary: { turn: 1, vp: 0, defcon: 5, over: false } };
  putSave(save);
  return save;
}

export function offlineSession(save: OfflineSave): GameSession {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const view = signal<GameView | null>(null);
  const log = signal<LogEntry[]>([]);
  const canUndo = signal(false);
  const names = signal<Record<Side, string>>(
    save.human === 'US' ? { US: '你', USSR: `AI·${AI_LEVEL_ZH[save.ai]}` } : { US: `AI·${AI_LEVEL_ZH[save.ai]}`, USSR: '你' },
  );
  let cur = save;
  worker.onmessage = (e: MessageEvent<WorkerOut>) => {
    const m = e.data;
    if (m.type === 'error') {
      console.warn(m.msg);
      return;
    }
    view.value = m.view;
    log.value = m.view.log;
    canUndo.value = m.canUndo;
    const v = m.view;
    // 撤销回到终局之前时，worker 会退出不死不休，这里同步存档
    if (!!cur.options.endless !== !!v.options.endless) {
      const { endless: _, ...plain } = cur.options;
      cur = { ...cur, options: v.options.endless ? { ...plain, endless: true } : plain };
      if (!v.options.endless) voidRecord(`off:${cur.id}:endless`);
    }
    cur = { ...cur, history: m.history, updatedAt: Date.now(), summary: { turn: v.turn, vp: v.vp, defcon: v.defcon, over: v.phase === 'over', winner: v.winner } };
    putSave(cur);
    // 不死不休另记一局，原来那局的胜负不被覆盖
    recordResult(cur.options.endless ? `off:${cur.id}:endless` : `off:${cur.id}`, v);
  };
  const post = (m: WorkerIn) => worker.postMessage(m);
  post({ type: 'start', save });
  return {
    kind: 'offline',
    view,
    log,
    names,
    canUndo,
    choose: (v: Choice) => post({ type: 'choose', v }),
    undo: () => post({ type: 'undo' }),
    endless: () => {
      cur = { ...cur, options: { ...cur.options, endless: true } };
      putSave(cur);
      post({ type: 'endless' });
    },
    close: () => worker.terminate(),
  };
}
