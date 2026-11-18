// 掷骰动画：新的掷骰先播动画，播完才把局面更新出来，避免结果先于骰子出现。
import { useEffect, useRef, useState } from 'preact/hooks';
import { COUNTRIES } from '../../data';
import type { LogEntry, RollInfo, Side } from '../../engine/types';
import type { GameView } from '../../engine/view';
import { sfx } from '../audio';

/** 每次掷骰动画的总时长 */
const ROLL_MS = 1900;
const TITLE: Record<RollInfo['type'], string> = {
  coup: '政变', realign: '调整阵营', war: '战争', space: '太空竞赛', olympics: '奥运会', summit: '首脑峰会', trap: '脱困检定',
};
const SIDE_ZH: Record<Side, string> = { US: '美国', USSR: '苏联' };

export interface RollShow {
  key: number;
  roll: RollInfo;
}

/**
 * 局面节奏控制：收到带新掷骰的局面时，先保持旧局面播放骰子动画，播完再切到新局面。
 * 动画期间又来的新局面会排在后面。
 */
export function useRollPacing(incoming: GameView | null): { view: GameView | null; show: RollShow | null; skip: () => void } {
  const [shown, setShown] = useState<GameView | null>(incoming);
  const [show, setShow] = useState<RollShow | null>(null);
  const latest = useRef<GameView | null>(incoming);
  const busy = useRef(false);
  const queue = useRef<RollInfo[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);
  const shownRef = useRef<GameView | null>(incoming);

  const finish = () => {
    clearTimeout(timer.current);
    busy.current = false;
    queue.current = [];
    setShow(null);
    shownRef.current = latest.current;
    setShown(latest.current);
  };

  const next = () => {
    const r = queue.current.shift();
    if (!r) return finish();
    setShow({ key: ++seq.current, roll: r });
    timer.current = setTimeout(next, ROLL_MS);
  };

  useEffect(() => {
    latest.current = incoming;
    if (!incoming) return;
    if (busy.current) return; // 播放中：播完会取最新局面
    const prev = shownRef.current;
    const from = prev && prev.log.length <= incoming.log.length ? prev.log.length : incoming.log.length;
    const rolls = prev ? incoming.log.slice(from).map((e: LogEntry) => e.roll).filter((r): r is RollInfo => !!r) : [];
    if (!rolls.length) {
      shownRef.current = incoming;
      setShown(incoming);
      return;
    }
    busy.current = true;
    // 太多就只播最后几次（比如回放跳转）
    queue.current = rolls.slice(-4);
    next();
  }, [incoming]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { view: shown, show, skip: finish };
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

export function DiceOverlay({ show, onSkip }: { show: RollShow | null; onSkip: () => void }) {
  useEffect(() => {
    if (show) sfx('dice');
  }, [show?.key]);
  if (!show) return null;
  const r = show.roll;
  const two = r.dice.length === 2;
  const sides: (Side | undefined)[] = two ? [r.side, r.side ? (r.side === 'US' ? 'USSR' : 'US') : undefined] : [r.side];
  const fmt = (m?: number) => (m ? (m > 0 ? ` +${m}` : ` −${-m}`) : '');
  return (
    <div class="dice-overlay" key={show.key} onClick={onSkip} title="点击跳过">
      <div class="dice-title">
        {r.side && <span class={`dice-who ${r.side.toLowerCase()}`}>{SIDE_ZH[r.side]}</span>}
        {TITLE[r.type]}
        {r.target && COUNTRIES[r.target] && <span class="dice-target">· {COUNTRIES[r.target].zh}</span>}
      </div>
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
