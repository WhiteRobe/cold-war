// 战绩：每局按对局 id 只记一个结果（撤销后结果会被覆盖），和存档分开存，删存档不影响这里。
import type { GameView } from '../../engine/view';

const KEY = 'cw.record.v1';
const CLIENT_KEY = 'cw.client';
const SYNC_KEY = 'cw.record.synced';
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
  upload([[id, o]]);
}

/** 撤销导致某局不存在了（如退回不死不休之前）：本机删掉，云端标记作废（不计入统计） */
export function voidRecord(id: string) {
  const all = loadRecord();
  if (!(id in all)) return;
  delete all[id];
  localStorage.setItem(KEY, JSON.stringify(all));
  upload([[id, 'void' as Outcome]]);
}

/** 本浏览器的匿名编号（全局战绩按“浏览器 + 对局 id”去重） */
function clientId(): string {
  let c = localStorage.getItem(CLIENT_KEY);
  if (!c || !/^c_[A-Za-z0-9]{8,32}$/.test(c)) {
    c = 'c_' + Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('');
    localStorage.setItem(CLIENT_KEY, c);
  }
  return c;
}

/** 上报到云端（失败就算了，下次首页会整体补传） */
function upload(list: [string, Outcome][]) {
  if (!list.length) return;
  const cid = clientId();
  const items = list.filter(([id]) => id.startsWith('off:')).map(([id, outcome]) => ({ id: `${cid}:${id}`, outcome }));
  if (!items.length) return;
  fetch('/api/records', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }), keepalive: true })
    .then((r) => { if (!r.ok) localStorage.removeItem(SYNC_KEY); })
    .catch(() => localStorage.removeItem(SYNC_KEY));
}

/** 首页打开时：把本机以前的战绩补传一次 */
export function syncRecords() {
  if (localStorage.getItem(SYNC_KEY)) return;
  localStorage.setItem(SYNC_KEY, '1');
  const all = Object.entries(loadRecord()) as [string, Outcome][];
  for (let i = 0; i < all.length; i += 200) upload(all.slice(i, i + 200));
}

/** 全局战绩（所有玩家的离线人机局 + 在线局） */
export async function globalTally(): Promise<Record<Outcome, number> | null> {
  try {
    const r = await fetch('/api/records');
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export function tally(): Record<Outcome, number> {
  const t: Record<Outcome, number> = { US: 0, USSR: 0, draw: 0, pending: 0 };
  for (const o of Object.values(loadRecord())) t[o] = (t[o] ?? 0) + 1;
  return t;
}
