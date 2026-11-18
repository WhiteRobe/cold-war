// 掷骰动画：新的掷骰先播动画，播完才把局面更新出来，避免结果先于骰子出现。
import { useEffect, useRef, useState } from 'preact/hooks';
import { COUNTRIES } from '../../data';
import type { LogEntry, RollInfo, Side } from '../../engine/types';
import type { GameView } from '../../engine/view';
import { sfx } from '../audio';
import { CardFace } from './CardFace';

/** 每次掷骰动画的总时长 */
const ROLL_MS = 1900;
/** 太空竞赛动画更长一点 */
const SPACE_MS = 2600;
/** 真人对手出牌展示时长（AI 出牌需要点确定） */
const HUMAN_CARD_MS = 6000;
const TITLE: Record<RollInfo['type'], string> = {
  coup: '政变', realign: '调整阵营', war: '战争', space: '太空竞赛', olympics: '奥运会', summit: '首脑峰会', trap: '脱困检定',
};
const SIDE_ZH: Record<Side, string> = { US: '美国', USSR: '苏联' };
const HOW_ZH = { event: '作为事件', ops: '使用行动点', space: '用于太空竞赛', headline: '作为头条' } as const;

export type Beat =
  | { key: number; kind: 'roll'; roll: RollInfo }
  | { key: number; kind: 'card'; card: number; side: Side; how: keyof typeof HOW_ZH; needConfirm: boolean };

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
      if (i >= from && e.roll) items.push({ at: i, beat: { key: ++seq.current, kind: 'roll', roll: e.roll } });
    });
    const me = incoming.me;
    const prevPlays = prev.plays?.length ?? 0;
    for (const p of (incoming.plays ?? []).slice(prevPlays)) {
      if (p.side === me) continue;
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
    if (beat?.kind === 'roll') sfx('dice');
    if (beat?.kind === 'card') sfx('card');
  }, [beat?.key]);
  if (!beat) return null;
  if (beat.kind === 'card') {
    return (
      <div class="beat-card" key={beat.key}>
        <div class={`pp-who ${beat.side.toLowerCase()}`}>
          {names[beat.side]}（{SIDE_ZH[beat.side]}）{HOW_ZH[beat.how]}打出
        </div>
        <CardFace id={beat.card} />
        <div class="row">
          <button type="button" class="btn primary" onClick={onNext}>确定</button>
          {!beat.needConfirm && <span class="beat-auto">几秒后自动关闭</span>}
        </div>
      </div>
    );
  }
  return <DiceOverlay roll={beat.roll} key={beat.key} onSkip={onNext} onSkipAll={onSkipAll} />;
}

function DiceOverlay({ roll: r, onSkip }: { roll: RollInfo; onSkip: () => void; onSkipAll: () => void }) {
  const two = r.dice.length === 2;
  const sides: (Side | undefined)[] = two ? [r.side, r.side ? (r.side === 'US' ? 'USSR' : 'US') : undefined] : [r.side];
  const fmt = (m?: number) => (m ? (m > 0 ? ` +${m}` : ` −${-m}`) : '');
  const space = r.type === 'space';
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
        {r.dice.map((v, i) => (
          <div key={i} class="dice-col">
            {two && sides[i] && <div class={`dice-label ${sides[i]!.toLowerCase()}`}>{SIDE_ZH[sides[i]!]}</div>}
            <Die value={v} side={sides[i]} delay={i * 120} />
            <div class="dice-sum">
              {v}
              {fmt(r.mods?.[i])}
              {r.mods?.[i] ? ` = ${v + r.mods[i]}` : ''}
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
