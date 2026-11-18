import { DurableObject } from 'cloudflare:workers';
import { chooseAI, type AiLevel } from '../ai';
import { Game } from '../engine/game';
import { DEFAULT_OPTIONS, opp, type Choice, type Side } from '../engine/types';
import { viewFor } from '../engine/view';
import type { ClientMsg, RoomConfig, RoomInfo, RoomSummary, Seat, ServerMsg } from '../shared/protocol';
import { lobbyStub, type Env, type Identity } from './env';

interface Meta {
  id: string;
  code: string;
  name: string;
  private: boolean;
  status: RoomInfo['status'];
  config: RoomConfig;
  host: Identity;
  guest?: Identity;
  /** 开局后确定 */
  sides?: Partial<Record<Side, Identity | { ai: AiLevel }>>;
  seed?: number;
  resigned?: { winner: Side; reason: string };
  recorded?: boolean;
  undoAsk?: Side;
  createdAt: number;
}

interface Attach {
  userId: string;
  name: string;
  logSent: number;
}

const isAi = (x: Identity | { ai: AiLevel } | undefined): x is { ai: AiLevel } => !!x && 'ai' in x;

/** 一局对局：权威状态。持久化 = 元数据 + 选择序列；唤醒时回放重建。 */
export class GameDO extends DurableObject<Env> {
  private meta: Meta | null = null;
  private game: Game | null = null;
  private aiTimer: ReturnType<typeof setTimeout> | undefined;
  private aiRand = 1;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS moves (seq INTEGER PRIMARY KEY, side TEXT NOT NULL, v TEXT NOT NULL)');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    const row = ctx.storage.sql.exec<{ v: string }>("SELECT v FROM kv WHERE k = 'meta'").toArray()[0];
    if (row) this.meta = JSON.parse(row.v);
    if (this.meta?.seed !== undefined) {
      const moves = ctx.storage.sql.exec<{ side: string; v: string }>('SELECT side, v FROM moves ORDER BY seq').toArray();
      this.game = Game.replay({ seed: this.meta.seed, options: this.meta.config.options }, moves.map((m) => ({ side: m.side as Side, v: JSON.parse(m.v) as Choice })));
      this.aiRand = (this.meta.seed ^ 0x2545f491) & 0x7fffffff || 1;
      this.sentLog = this.game.s.log.length;
    }
  }

  private saveMeta() {
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO kv (k, v) VALUES ('meta', ?)", JSON.stringify(this.meta));
  }

  // ---------- RPC（Worker 调用） ----------

  async init(o: { id: string; code: string; name: string; private: boolean; host: Identity; config: RoomConfig }) {
    if (this.meta) return;
    this.meta = { ...o, status: 'waiting', createdAt: Date.now() };
    this.saveMeta();
  }

  async replayData() {
    const m = this.meta;
    if (!m || m.seed === undefined || !this.game) return null;
    if (m.status !== 'ended') return null;
    return { seed: m.seed, options: m.config.options, history: this.game.history, names: this.names() };
  }

  // ---------- WebSocket ----------

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    if (!this.meta) return new Response('房间不存在', { status: 404 });
    const user: Identity = { id: req.headers.get('X-User-Id')!, name: decodeURIComponent(req.headers.get('X-User-Name') || '玩家'), guest: req.headers.get('X-Guest') === '1' };
    const m = this.meta;
    // 第二位真人加入
    if (m.status === 'waiting' && user.id !== m.host.id && !m.guest && m.config.ai === null) {
      m.guest = user;
      this.saveMeta();
      this.updateLobby();
    }
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [user.id]);
    pair[1].serializeAttachment({ userId: user.id, name: user.name, logSent: 0 } satisfies Attach);
    queueMicrotask(() => this.broadcastRoom());
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw === 'ping') return;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const att = ws.deserializeAttachment() as Attach;
    const m = this.meta!;
    const side = this.sideOf(att.userId);
    const isHost = att.userId === m.host.id;
    switch (msg.type) {
      case 'hello':
        att.logSent = 0;
        ws.serializeAttachment(att);
        this.sendRoom(ws);
        this.sendView(ws, true);
        break;
      case 'config':
        if (!isHost || m.status !== 'waiting') return;
        m.config = sanitizeConfig(msg.config);
        if (m.config.ai !== null) m.guest = undefined;
        this.saveMeta();
        this.broadcastRoom();
        this.updateLobby();
        break;
      case 'start':
        if (!isHost || m.status !== 'waiting') return;
        if (m.config.ai === null && !m.guest) return this.send(ws, { type: 'error', msg: '还没有对手加入' });
        this.start();
        break;
      case 'choose': {
        if (!this.game || !side || m.status !== 'playing') return;
        if (msg.seq !== this.game.history.length) return this.sendView(ws, false);
        const err = this.game.submit(side, msg.v);
        if (err) return this.send(ws, { type: 'error', msg: err });
        this.recordMove(this.game.history.length - 1);
        this.afterChange();
        break;
      }
      case 'undo': {
        if (!this.game || !side || m.status !== 'playing') return;
        if (!this.game.history.some((h) => h.side === side)) return;
        if (isAi(m.sides?.[opp(side)])) {
          this.undoTo(side);
          return;
        }
        m.undoAsk = side;
        this.saveMeta();
        this.forSide(opp(side), (w) => this.send(w, { type: 'undoAsk', from: side }));
        break;
      }
      case 'undoAnswer': {
        if (!side || !m.undoAsk || m.undoAsk === side) return;
        const from = m.undoAsk;
        m.undoAsk = undefined;
        this.saveMeta();
        if (msg.ok) this.undoTo(from);
        else this.forSide(from, (w) => this.send(w, { type: 'error', msg: '对手拒绝了悔棋' }));
        break;
      }
      case 'resign':
        if (!side || m.status !== 'playing') return;
        m.resigned = { winner: opp(side), reason: `${side === 'US' ? '美国' : '苏联'}认输` };
        this.finish();
        break;
      case 'chat': {
        const text = String(msg.text || '').slice(0, 200).trim();
        if (!text) return;
        const out: ServerMsg = { type: 'chat', from: att.name, text, at: Date.now() };
        for (const w of this.ctx.getWebSockets()) this.send(w, out);
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try { ws.close(code === 1006 ? 1000 : code); } catch { /* 已关闭 */ }
    this.broadcastRoom();
  }

  // ---------- 对局 ----------

  private start() {
    const m = this.meta!;
    const hostSide: Side = m.config.hostSide === 'random' ? (crypto.getRandomValues(new Uint8Array(1))[0] & 1 ? 'US' : 'USSR') : m.config.hostSide;
    const other = m.config.ai !== null ? { ai: m.config.ai } : m.guest!;
    m.sides = { [hostSide]: m.host, [opp(hostSide)]: other };
    m.seed = crypto.getRandomValues(new Uint32Array(1))[0] | 0;
    m.status = 'playing';
    this.saveMeta();
    this.ctx.storage.sql.exec('DELETE FROM moves');
    this.game = new Game({ seed: m.seed, options: m.config.options });
    this.aiRand = (m.seed ^ 0x2545f491) & 0x7fffffff || 1;
    this.broadcastRoom();
    this.afterChange();
    this.updateLobby();
  }

  private recordMove(i: number) {
    const h = this.game!.history[i];
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO moves (seq, side, v) VALUES (?, ?, ?)', i, h.side, JSON.stringify(h.v));
  }

  private undoTo(side: Side) {
    const g = this.game!;
    const h = g.history;
    let i = h.length - 1;
    while (i >= 0 && h[i].side !== side) i--;
    if (i < 0) return;
    this.game = Game.replay(g.setup, h.slice(0, i));
    this.ctx.storage.sql.exec('DELETE FROM moves WHERE seq >= ?', i);
    for (const w of this.ctx.getWebSockets()) this.sendView(w, true);
    this.scheduleAi();
  }

  /** 上次推送后的日志长度（统计新的掷骰，AI 等动画播完再走） */
  private sentLog = 0;
  private rollWait = 0;

  private afterChange() {
    if (this.game) {
      const log = this.game.s.log;
      const rolls = log.slice(Math.min(this.sentLog, log.length)).filter((e) => e.roll).length;
      this.sentLog = log.length;
      this.rollWait = Math.min(rolls, 4) * 1900;
    }
    if (this.game?.over) this.finish();
    for (const w of this.ctx.getWebSockets()) this.sendView(w, false);
    this.scheduleAi();
  }

  private rand() {
    this.aiRand = (this.aiRand * 1103515245 + 12345) & 0x7fffffff;
    return this.aiRand / 0x80000000;
  }

  private scheduleAi() {
    clearTimeout(this.aiTimer);
    const m = this.meta!;
    const g = this.game;
    if (!g || g.over || m.status !== 'playing') return;
    const aiSide = (['US', 'USSR'] as Side[]).find((s) => isAi(m.sides?.[s]) && g.pendingFor(s));
    if (!aiSide) return;
    const level = (m.sides![aiSide] as { ai: AiLevel }).ai;
    const humanWaiting = (['US', 'USSR'] as Side[]).some((s) => s !== aiSide && g.pendingFor(s));
    const tag = g.pendingFor(aiSide)!.tag;
    const fast = tag === 'setup' || tag === 'placeOps' || tag === 'placeEvent' || tag === 'removeEvent' || tag === 'realignTarget';
    const delay = (humanWaiting ? 50 : fast ? 150 : Number(this.env.AI_DELAY_MS) || 900) + this.rollWait;
    this.aiTimer = setTimeout(() => {
      const d = g.pendingFor(aiSide);
      if (!d || this.game !== g) return;
      let v: Choice;
      try {
        // 在线 AI 最高用 2 档，避免占用 DO 的 CPU
        v = chooseAI(viewFor(g, aiSide), d, Math.min(level, 2) as AiLevel, () => this.rand());
      } catch {
        v = d.options[0].v;
      }
      if (g.submit(aiSide, v)) g.submit(aiSide, d.options[0].v);
      this.recordMove(g.history.length - 1);
      this.afterChange();
    }, delay);
  }

  private finish() {
    const m = this.meta!;
    if (m.status === 'ended') return;
    m.status = 'ended';
    this.saveMeta();
    clearTimeout(this.aiTimer);
    this.broadcastRoom();
    for (const w of this.ctx.getWebSockets()) this.sendView(w, false);
    this.updateLobby();
    if (!m.recorded && this.game) {
      m.recorded = true;
      this.saveMeta();
      const s = this.game.s;
      const winner = m.resigned ? m.resigned.winner : s.winner ?? null;
      const reason = m.resigned ? m.resigned.reason : s.winReason ?? '';
      const names = this.names();
      const uid = (x: Side) => {
        const p = m.sides?.[x];
        return p && !isAi(p) && !p.guest ? p.id : null;
      };
      this.ctx.waitUntil(
        this.env.DB.prepare('INSERT INTO match_results (room_id, us_name, ussr_name, us_user, ussr_user, winner, reason, turn, vp, options, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(m.id, names.US, names.USSR, uid('US'), uid('USSR'), winner, reason, s.turn, s.vp, JSON.stringify(m.config.options), Date.now())
          .run()
          .catch((e) => console.error('写战绩失败', e)),
      );
    }
  }

  // ---------- 推送 ----------

  private names(): Record<Side, string> {
    const m = this.meta!;
    const n = (x: Side) => {
      const p = m.sides?.[x];
      if (!p) return '—';
      return isAi(p) ? `AI·${['', '新兵', '参谋', '将军'][p.ai]}` : p.name;
    };
    return { US: n('US'), USSR: n('USSR') };
  }

  private sideOf(userId: string): Side | null {
    const s = this.meta?.sides;
    if (!s) return null;
    for (const x of ['US', 'USSR'] as Side[]) {
      const p = s[x];
      if (p && !isAi(p) && p.id === userId) return x;
    }
    return null;
  }

  private online(): Set<string> {
    return new Set(this.ctx.getWebSockets().map((w) => (w.deserializeAttachment() as Attach).userId));
  }

  private roomInfo(): RoomInfo {
    const m = this.meta!;
    const on = this.online();
    const seat = (p: Identity | { ai: AiLevel } | undefined): Seat | undefined => (!p ? undefined : isAi(p) ? { name: this.names()[this.sideOfAi()!] ?? 'AI', ai: p.ai } : { userId: p.id, name: p.name, online: on.has(p.id) });
    const seats: RoomInfo['seats'] = {};
    const pending: Seat[] = [];
    if (m.sides) {
      seats.US = seat(m.sides.US);
      seats.USSR = seat(m.sides.USSR);
    } else {
      pending.push({ userId: m.host.id, name: m.host.name, online: on.has(m.host.id) });
      if (m.guest) pending.push({ userId: m.guest.id, name: m.guest.name, online: on.has(m.guest.id) });
    }
    return { id: m.id, code: m.code, name: m.name, host: m.host.name, status: m.status, config: m.config, seats, pending };
  }

  private sideOfAi(): Side | null {
    const s = this.meta?.sides;
    if (!s) return null;
    return (['US', 'USSR'] as Side[]).find((x) => isAi(s[x])) ?? null;
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    try { ws.send(JSON.stringify(msg)); } catch { /* 已断开 */ }
  }

  private sendRoom(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attach;
    this.send(ws, { type: 'room', room: this.roomInfo(), you: this.sideOf(att.userId), host: att.userId === this.meta!.host.id });
  }

  private broadcastRoom() {
    for (const w of this.ctx.getWebSockets()) this.sendRoom(w);
  }

  private sendView(ws: WebSocket, reset: boolean) {
    const g = this.game;
    if (!g) return;
    const att = ws.deserializeAttachment() as Attach;
    const side = this.sideOf(att.userId);
    const from = reset ? 0 : att.logSent;
    const view = viewFor(g, side, from);
    const m = this.meta!;
    if (m.resigned) {
      view.phase = 'over';
      view.winner = m.resigned.winner;
      view.winReason = m.resigned.reason;
      view.decision = undefined;
      view.waitingFor = [];
    }
    att.logSent = g.s.log.length;
    ws.serializeAttachment(att);
    this.send(ws, { type: 'view', view, logReset: reset || from === 0 });
  }

  private forSide(side: Side, f: (ws: WebSocket) => void) {
    for (const w of this.ctx.getWebSockets()) if (this.sideOf((w.deserializeAttachment() as Attach).userId) === side) f(w);
  }

  private updateLobby() {
    const m = this.meta!;
    const summary: RoomSummary = {
      id: m.id, code: m.code, name: m.name, host: m.host.name, status: m.status,
      humans: 1 + (m.guest ? 1 : 0), vsAi: m.config.ai !== null, updatedAt: Date.now(),
    };
    this.ctx.waitUntil(lobbyStub(this.env).upsert(summary).catch(() => {}));
  }
}

export function sanitizeConfig(c: Partial<RoomConfig> | undefined): RoomConfig {
  const o = c?.options ?? DEFAULT_OPTIONS;
  const ai = c?.ai === 1 || c?.ai === 2 || c?.ai === 3 ? c.ai : null;
  const hostSide = c?.hostSide === 'US' || c?.hostSide === 'USSR' ? c.hostSide : 'random';
  return {
    options: { optionalCards: o.optionalCards !== false, usBonus: Math.max(-3, Math.min(3, Math.round(Number(o.usBonus) || 0))) },
    hostSide,
    ai,
  };
}
