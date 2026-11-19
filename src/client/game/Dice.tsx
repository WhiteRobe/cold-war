// 掷骰动画：新的掷骰先播动画，播完才把局面更新出来，避免结果先于骰子出现。
import { useEffect, useRef, useState } from 'preact/hooks';
import { CARDS, COUNTRIES } from '../../data';
import type { CardMove, LogEntry, RollInfo, Side } from '../../engine/types';
import type { GameView } from '../../engine/view';
import { sfx } from '../audio';
import { CardFace, MiniCard } from './CardFace';
import { EventStage } from './EventFx';

/** 每次掷骰动画的总时长 */
const ROLL_MS = 1900;
/** 太空竞赛动画更长一点 */
const SPACE_MS = 2600;
/** 真人对手出牌展示时长（AI 出牌需要点确定） */
const HUMAN_CARD_MS = 6000;
/** 卡牌移动展示时长 */
const MOVE_MS = 2400;
/** 自己打出事件的动画时长 */
const OWN_EVENT_MS = 3400;
const TITLE: Record<RollInfo['type'], string> = {
  coup: '政变', realign: '调整阵营', war: '战争', space: '太空竞赛', olympics: '奥运会', summit: '首脑峰会', trap: '脱困检定',
};
const SIDE_ZH: Record<Side, string> = { US: '美国', USSR: '苏联' };
const HOW_ZH = { event: '作为事件', ops: '使用行动点', space: '用于太空竞赛', headline: '作为头条' } as const;

export type Beat =
  | { key: number; kind: 'roll'; roll: RollInfo }
  | { key: number; kind: 'move'; move: CardMove }
  | { key: number; kind: 'card'; card: number; side: Side; how: keyof typeof HOW_ZH; needConfirm: boolean; own?: boolean };

/**
 * 局面节奏控制：新局面里有对手出牌或掷骰时，先保持旧局面依次展示（对手的牌、骰子动画），
 * 展示完再切到最新局面。AI 出的牌要点「确定」才继续。
 */
export function useEventPacing(incoming: GameView | null, aiOpponent: boolean): { view: GameView | null; beat: Beat | null; next: () => void; skipAll: () => void } {
  const [shown, setShown] = useState<GameView | null>(incoming);
  const [beat, setBeat] = useState<Beat | null>(null);
  const latest = useRef<GameView | null>(incoming);
  const busy = useRef(false);
  const queue = useRef<Beat[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);
  const shownRef = useRef<GameView | null>(incoming);

  const finish = () => {
    clearTimeout(timer.current);
    busy.current = false;
    queue.current = [];
    setBeat(null);
    shownRef.current = latest.current;
    setShown(latest.current);
  };

  const next = () => {
    clearTimeout(timer.current);
    const b = queue.current.shift();
    if (!b) return finish();
    setBeat(b);
    if (b.kind === 'roll') timer.current = setTimeout(next, b.roll.type === 'space' ? SPACE_MS : ROLL_MS);
    else if (b.kind === 'move') timer.current = setTimeout(next, MOVE_MS);
    else if (b.own) timer.current = setTimeout(next, OWN_EVENT_MS);
    else if (!b.needConfirm) timer.current = setTimeout(next, HUMAN_CARD_MS);
  };

  useEffect(() => {
    latest.current = incoming;
    if (!incoming || busy.current) return;
    const prev = shownRef.current;
    if (!prev || prev.log.length > incoming.log.length) {
      shownRef.current = incoming;
      setShown(incoming);
      return;
    }
    const from = prev.log.length;
    const items: { at: number; beat: Beat }[] = [];
    incoming.log.forEach((e: LogEntry, i: number) => {
      if (i < from) return;
      if (e.move) items.push({ at: i - 0.5, beat: { key: ++seq.current, kind: 'move', move: e.move } });
      if (e.roll) items.push({ at: i, beat: { key: ++seq.current, kind: 'roll', roll: e.roll } });
    });
    const me = incoming.me;
    const prevPlays = prev.plays?.length ?? 0;
    for (const p of (incoming.plays ?? []).slice(prevPlays)) {
      if (p.side === me) {
        // 自己打出的事件也播动画（行动点 / 太空不必再提示）
        if (p.how === 'event' || p.how === 'headline') items.push({ at: p.at ?? Infinity, beat: { key: ++seq.current, kind: 'card', card: p.card, side: p.side, how: p.how, needConfirm: false, own: true } });
        continue;
      }
      items.push({ at: p.at ?? Infinity, beat: { key: ++seq.current, kind: 'card', card: p.card, side: p.side, how: p.how, needConfirm: aiOpponent } });
    }
    if (!items.length) {
      shownRef.current = incoming;
      setShown(incoming);
      return;
    }
    items.sort((a, b) => a.at - b.at);
    busy.current = true;
    // 一次太多（读档、跳转）就只展示最后几项
    queue.current = items.map((x) => x.beat).slice(-6);
    next();
  }, [incoming]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { view: shown, beat, next, skipAll: finish };
}

/** 骰面点位（0–1 坐标） */
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};

function Die({ value, side, delay }: { value: number; side?: Side; delay: number }) {
  const [face, setFace] = useState(1 + Math.floor(Math.random() * 6));
  const [done, setDone] = useState(false);
  useEffect(() => {
    let n = 0;
    const iv = setInterval(() => {
      n++;
      setFace(1 + Math.floor(Math.random() * 6));
      if (n >= 9) {
        clearInterval(iv);
        setFace(value);
        setDone(true);
      }
    }, 75 + delay / 12);
    return () => clearInterval(iv);
  }, [value]);
  return (
    <div class={`die ${side ? side.toLowerCase() : ''}${done ? ' landed' : ' rolling'}`} style={{ animationDelay: `${delay}ms` }}>
      <svg viewBox="0 0 60 60">
        <rect x="3" y="3" width="54" height="54" rx="10" class="die-face" />
        {PIPS[face].map(([x, y], i) => <circle key={i} cx={x * 60} cy={y * 60} r="5.4" class="die-pip" />)}
      </svg>
    </div>
  );
}

export function BeatOverlay({ beat, names, onNext, onSkipAll }: { beat: Beat | null; names: Record<Side, string>; onNext: () => void; onSkipAll: () => void }) {
  useEffect(() => {
    if (beat?.kind !== 'card') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beat?.key]);
  useEffect(() => {
    if (beat?.kind === 'roll') sfx('dice');
    if (beat?.kind === 'card') sfx('card');
  }, [beat?.key]);
  if (!beat) return null;
  if (beat.kind === 'move') return <MoveOverlay move={beat.move} key={beat.key} onNext={onNext} />;
  if (beat.kind === 'card') {
    const c = CARDS[beat.card];
    // 点屏幕任意处继续
    const catcher = <div class="beat-catch" onClick={onNext} title="点击任意处继续" />;
    const isEvent = beat.how === 'event' || beat.how === 'headline';
    const other: Side = beat.side === 'US' ? 'USSR' : 'US';
    // 用行动点打出对方阵营的事件牌时，事件仍会为对方发动
    const firesForOther = beat.how === 'ops' && c.side === other;
    const who = (
      <div class={`pp-who ${beat.side.toLowerCase()}`}>
        {beat.own ? '你' : `${names[beat.side]}（${SIDE_ZH[beat.side]}）`}{beat.how === 'headline' ? '头条' : ''}打出
        <span class={`beat-mode ${isEvent ? 'event' : beat.how}`}>
          {isEvent ? '事件' : beat.how === 'space' ? '太空竞赛' : `行动点 ${c.ops}`}
        </span>
      </div>
    );
    const confirm = beat.own ? (
      <div class="row">
        <span class="beat-auto">点击任意处跳过</span>
      </div>
    ) : (
      <div class="row">
        <button type="button" class="btn primary" onClick={onNext}>确定</button>
        <span class="beat-auto">{beat.needConfirm ? '点击任意处继续' : '点击任意处继续，几秒后自动关闭'}</span>
      </div>
    );
    if (isEvent) {
      return (
        <>{catcher}<div class="beat-card event" key={beat.key} onClick={onNext}>
          {who}
          <EventStage card={beat.card} side={beat.side} />
          <CardFace id={beat.card} />
          {confirm}
        </div></>
      );
    }
    return (
      <>{catcher}<div class="beat-card" key={beat.key} onClick={onNext}>
        {who}
        <div class="beat-ops-wrap">
          <CardFace id={beat.card} />
          <div class={`beat-ops-stamp ${beat.how}`}>
            {beat.how === 'space' ? '太空竞赛' : `行动点 ×${c.ops}`}
            <small>{firesForOther ? `事件仍为${SIDE_ZH[other]}发动` : '事件不发动'}</small>
          </div>
        </div>
        {firesForOther && <div class="beat-note">这是<b>{SIDE_ZH[other]}</b>的事件牌，用作行动点时事件照样为{SIDE_ZH[other]}发动。</div>}
        {confirm}
      </div></>
    );
  }
  return <DiceOverlay roll={beat.roll} key={beat.key} onSkip={onNext} onSkipAll={onSkipAll} />;
}

const PLACE: Record<string, string> = { US: '美国手牌', USSR: '苏联手牌', deck: '牌库', discard: '弃牌堆', removed: '移出游戏', played: '发动事件' };

/** 卡牌被弃掉、抽走、换走：牌从一边飞到另一边 */
function MoveOverlay({ move, onNext }: { move: CardMove; onNext: () => void }) {
  useEffect(() => {
    sfx('card');
  }, []);
  const fromSide = move.from === 'US' || move.from === 'USSR' ? move.from.toLowerCase() : 'pile';
  const toSide = move.to === 'US' || move.to === 'USSR' ? move.to.toLowerCase() : 'pile';
  return (
    <div class="move-overlay" onClick={onNext} title="点击跳过">
      <div class="mv-why">{move.why}</div>
      <div class="mv-row">
        <div class={`mv-place ${fromSide}`}>{PLACE[move.from]}</div>
        <div class="mv-cards">
          {move.cards.map((c, i) => (
            <div key={c} class="mv-card" style={{ animationDelay: `${0.35 + i * 0.25}s` }}>
              <MiniCard id={c} />
            </div>
          ))}
        </div>
        <div class={`mv-place ${toSide}`}>{PLACE[move.to]}</div>
      </div>
      <div class="mv-names">{move.cards.map((c) => `#${c} ${CARDS[c].zh}`).join('、')}</div>
    </div>
  );
}

function DiceOverlay({ roll: r, onSkip }: { roll: RollInfo; onSkip: () => void; onSkipAll: () => void }) {
  const two = r.dice.length === 2;
  const sides: (Side | undefined)[] = two ? [r.side, r.side ? (r.side === 'US' ? 'USSR' : 'US') : undefined] : [r.side];
  const fmt = (m?: number) => (m ? (m > 0 ? ` +${m}` : ` −${-m}`) : '');
  const space = r.type === 'space';
  // 双骰时美国固定在左、苏联在右
  const order = two && sides[0] === 'USSR' ? [1, 0] : r.dice.map((_, i) => i);
  useEffect(() => {
    if (!space) return;
    const t = setTimeout(() => sfx(r.ok ? 'launch' : 'spaceFail'), 950);
    return () => clearTimeout(t);
  }, []);
  return (
    <div class={`dice-overlay${space ? ' space' : ''}`} onClick={onSkip} title="点击跳过">
      <div class="dice-title">
        {r.side && <span class={`dice-who ${r.side.toLowerCase()}`}>{SIDE_ZH[r.side]}</span>}
        {TITLE[r.type]}
        {r.target && COUNTRIES[r.target] && <span class="dice-target">· {COUNTRIES[r.target].zh}</span>}
      </div>
      {space && <Rocket ok={r.ok} side={r.side} />}
      <div class="dice-row">
        {order.map((i) => (
          <div key={i} class="dice-col">
            {two && sides[i] && <div class={`dice-label ${sides[i]!.toLowerCase()}`}>{SIDE_ZH[sides[i]!]}</div>}
            <Die value={r.dice[i]} side={sides[i]} delay={i * 120} />
            <div class="dice-sum">
              {r.dice[i]}
              {fmt(r.mods?.[i])}
              {r.mods?.[i] ? ` = ${r.dice[i] + r.mods[i]}` : ''}
            </div>
          </div>
        ))}
      </div>
      {r.need && <div class="dice-need">{r.need}</div>}
      <div class={`dice-result ${r.ok ? 'ok' : 'fail'}`}>{r.result}</div>
    </div>
  );
}

/** low poly 火箭：成功升空，失败爆炸 */
function Rocket({ ok, side }: { ok: boolean; side?: Side }) {
  const body = side === 'USSR' ? '#b23a2e' : '#2f5d8a';
  return (
    <svg class={`rocket-scene ${ok ? 'ok' : 'fail'}`} viewBox="0 0 160 120">
      <polygon points="0,112 160,112 160,120 0,120" fill="#5a5140" />
      <polygon points="58,112 64,88 70,112" fill="#3a352e" />
      <polygon points="90,112 96,88 102,112" fill="#3a352e" />
      <g class="rocket">
        <polygon points="80,30 72,48 88,48" fill="#e9dfc7" />
        <polygon points="72,48 88,48 88,92 72,92" fill={body} />
        <polygon points="80,48 88,48 88,92 80,92" fill="#00000022" />
        <polygon points="72,78 64,96 72,92" fill="#3a352e" />
        <polygon points="88,78 96,96 88,92" fill="#3a352e" />
        <circle cx="80" cy="60" r="4" fill="#9cc6f0" />
        <g class="flame">
          <polygon points="74,92 86,92 80,112" fill="#f5a623" />
          <polygon points="77,92 83,92 80,104" fill="#fff3b0" />
        </g>
      </g>
      <g class="boom">
        <polygon points="80,60 96,48 92,66 110,70 92,78 98,96 80,84 64,98 68,78 50,72 68,64 62,46" fill="#f5a623" />
        <polygon points="80,66 88,58 88,70 98,72 88,78 90,88 80,80 70,90 72,78 62,74 72,68 70,58" fill="#fff3b0" />
      </g>
      <g class="smoke">
        <polygon points="60,112 70,100 82,106 92,98 104,110" fill="#c9c0ab" />
      </g>
    </svg>
  );
}
