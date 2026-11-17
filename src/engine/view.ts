import type { Game } from './game';
import type { Decision, GameState, LogEntry, Side } from './types';

/** 某一方（或观战者）能看到的局面。对手手牌只保留已知的牌。 */
export interface GameView extends Omit<GameState, 'deck' | 'rng' | 'rngCount' | 'log'> {
  me: Side | null;
  deckCount: number;
  handCounts: Record<Side, number>;
  log: LogEntry[];
  /** 我方当前的选择 */
  decision?: Decision;
  /** 正在等待哪些玩家 */
  waitingFor: Side[];
  /** 已提交选择的步数（同步用） */
  seq: number;
}

export function viewFor(g: Game, me: Side | null, logFrom = 0): GameView {
  const s = g.s;
  const hide = (side: Side) => (me === side ? [...s.hands[side]] : s.hands[side].filter((c) => s.known[side].includes(c)));
  const { deck, rng: _r, rngCount: _c, log, ...rest } = s;
  const waitingFor = g.waiting.filter((_, i) => g.answers[i] === undefined).map((d) => d.side);
  const view: GameView = {
    ...structuredClone(rest),
    me,
    deckCount: deck.length,
    handCounts: { US: s.hands.US.length, USSR: s.hands.USSR.length },
    hands: { US: hide('US'), USSR: hide('USSR') },
    log: log.slice(logFrom).filter((e) => !e.to || e.to === me),
    waitingFor,
    seq: g.history.length,
  };
  // 未公开的头条：对手看不到（头条牌在提交后才写入 headline，这里只是保险）
  if (s.phase === 'headline' && me) {
    for (const side of ['US', 'USSR'] as Side[]) if (side !== me && !g.over && waitingFor.includes(me)) delete view.headline[side];
  }
  if (me) {
    const d = g.pendingFor(me);
    if (d) view.decision = structuredClone(d);
  }
  return view;
}
