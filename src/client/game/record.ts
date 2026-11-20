// 战绩：每局按对局 id 只记一个结果（撤销后结果会被覆盖），和存档分开存，删存档不影响这里。
import type { GameView } from '../../engine/view';

const KEY = 'cw.record.v1';
export type Outcome = 'US' | 'USSR' | 'draw' | 'pending';

export function loadRecord(): Record<string, Outcome> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

/** 局面更新时调用：已结束记胜负 / 平局，没结束记“争夺中” */
export function recordResult(id: string, v: GameView) {
  const all = loadRecord();
  const o: Outcome = v.phase === 'over' ? (v.winner ?? 'draw') : 'pending';
  if (all[id] === o) return;
  all[id] = o;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function tally(): Record<Outcome, number> {
  const t: Record<Outcome, number> = { US: 0, USSR: 0, draw: 0, pending: 0 };
  for (const o of Object.values(loadRecord())) t[o] = (t[o] ?? 0) + 1;
  return t;
}
