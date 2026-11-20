/// <reference lib="webworker" />
// 离线模式：引擎与 AI 都在 Web Worker 里跑，界面线程只收视图。
import { chooseAI, type AiLevel } from '../../ai';
import { Game } from '../../engine/game';
import { opp, type Side } from '../../engine/types';
import { viewFor } from '../../engine/view';
import type { OfflineSave, WorkerIn, WorkerOut } from './session';

let game: Game | null = null;
let human: Side = 'US';
let level: AiLevel = 2;
let seed = 1;
let timer: ReturnType<typeof setTimeout> | undefined;
let aiRand = 1;

const AI_STEP_MS = 320;
/** 连续的逐点放置走快一点 */
const FAST_TAGS = new Set(['setup']);
/** 放影响力、移除影响力逐点放慢，看得清每一步 */
const POINT_TAGS = new Set(['placeOps', 'placeEvent', 'removeEvent']);
const POINT_MS = 450;

function rand() {
  aiRand = (aiRand * 1103515245 + 12345) & 0x7fffffff;
  return aiRand / 0x80000000;
}

function post(m: WorkerOut) {
  (self as unknown as Worker).postMessage(m);
}

/** 上次发送后新增的掷骰次数：AI 要等骰子动画播完再走下一步 */
let sentLog = 0;
let rollWait = 0;
const ROLL_MS = 1900;

function send() {
  if (!game) return;
  const log = game.s.log;
  const rolls = log.slice(Math.min(sentLog, log.length)).filter((e) => e.roll).length;
  sentLog = log.length;
  rollWait = Math.min(rolls, 4) * ROLL_MS;
  post({ type: 'view', view: viewFor(game, human), history: game.history, canUndo: game.history.some((h) => h.side === human) });
}

function aiSide() {
  return opp(human);
}

/** AI 每次只走一步，带一点间隔，界面能看清对手在做什么 */
function pump() {
  clearTimeout(timer);
  if (!game || game.over) return;
  const d = game.pendingFor(aiSide());
  if (!d) return;
  timer = setTimeout(() => {
    if (!game) return;
    const dd = game.pendingFor(aiSide());
    if (!dd) return;
    let v;
    try {
      v = chooseAI(viewFor(game, aiSide()), dd, level, rand);
    } catch (e) {
      console.error('AI 出错，改用第一个选项', e);
      v = dd.options[0].v;
    }
    const err = game.submit(aiSide(), v);
    if (err) game.submit(aiSide(), dd.options[0].v);
    send();
    pump();
  }, (game.pendingFor(human) ? 0 : FAST_TAGS.has(d.tag) ? 120 : POINT_TAGS.has(d.tag) ? POINT_MS : AI_STEP_MS) + rollWait);
}

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const m = e.data;
  try {
    if (m.type === 'start') {
      const s: OfflineSave = m.save;
      human = s.human;
      level = s.ai;
      seed = s.seed;
      aiRand = (s.seed ^ 0x5bd1e995) & 0x7fffffff || 1;
      game = Game.replay({ seed: s.seed, options: s.options }, s.history);
      sentLog = game.s.log.length;
      // AI 的随机数也要可复现：按已走步数推进
      for (let i = 0; i < s.history.length; i++) rand();
      send();
      pump();
    } else if (m.type === 'choose') {
      if (!game) return;
      const err = game.submit(human, m.v);
      if (err) post({ type: 'error', msg: err });
      send();
      pump();
    } else if (m.type === 'undo') {
      if (!game) return;
      clearTimeout(timer);
      const h = game.history;
      let i = h.length - 1;
      while (i >= 0 && h[i].side !== human) i--;
      if (i < 0) return;
      game = Game.replay({ seed, options: game.setup.options }, h.slice(0, i));
      sentLog = game.s.log.length;
      send();
      pump();
    }
  } catch (err) {
    console.error(err);
    post({ type: 'error', msg: String(err) });
  }
};
