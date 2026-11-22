// 掷骰动画：新的掷骰先播动画，播完才把局面更新出来，避免结果先于骰子出现。
import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { st } from '../streamer';
import { CARDS, COUNTRIES } from '../../data';
import type { CardMove, LogEntry, RollInfo, Scene, Side, WarRound } from '../../engine/types';
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
/** 对手逐点放置影响力，每一点的间隔 */
const PLACE_MS = 520;
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
  | { key: number; kind: 'place'; side: Side; country: string; n: number }
  /** 过场说明的一步（点击继续）；world：这一段改变了世界（新国家），开始播放前先切到最新局面 */
  | { key: number; kind: 'scene'; scene: Scene; step: number; world?: boolean }
  /** 世界大战的一轮：落到地图上后等玩家点击（或自动播放） */
  | { key: number; kind: 'war'; war: WarRound }
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
    if (b.kind === 'scene') {
      // 结算汇总：先把之前的操作全部落到地图上（直接切到最新局面），后面的逐点放置动画就不必再播
      // 世界大战的开场说明除外：后面还要逐轮播放
      if (b.scene.flat && b.step === 0 && latest.current && !queue.current.some((x) => x.kind === 'war')) {
        shownRef.current = latest.current;
        setShown(latest.current);
        queue.current = queue.current.filter((x) => x.kind !== 'place');
        return;
      }
      if (b.world && b.step === 0 && latest.current) {
        shownRef.current = latest.current;
        setShown(latest.current);
      }
      return; // 等玩家点击
    }
    if (b.kind === 'war') {
      // 这一轮所有国家同时加影响力
      setShown((v) => {
        if (!v) return v;
        const inf = { ...v.inf };
        for (const x of b.war.changes) {
          const cur = inf[x.c];
          inf[x.c] = (x.side === 'US' ? [cur[0] + x.n, cur[1]] : [cur[0], cur[1] + x.n]) as [number, number];
        }
        const nv = { ...v, inf };
        shownRef.current = nv;
        return nv;
      });
      return; // 等玩家点击
    }
    if (b.kind === 'place') {
      // 在当前显示的局面上逐点加影响力，地图上的插旗动画和音效随之播放
      setShown((v) => {
        if (!v) return v;
        const cur = v.inf[b.country];
        const nv = { ...v, inf: { ...v.inf, [b.country]: (b.side === 'US' ? [cur[0] + b.n, cur[1]] : [cur[0], cur[1] + b.n]) as [number, number] } };
        shownRef.current = nv;
        return nv;
      });
      timer.current = setTimeout(next, PLACE_MS);
      return;
    }
    if (b.kind === 'roll') timer.current = setTimeout(next, b.roll.type === 'space' ? SPACE_MS : ROLL_MS);
    else if (b.kind === 'move') timer.current = setTimeout(next, MOVE_MS);
    else if (b.own) timer.current = setTimeout(next, OWN_EVENT_MS);
    else if (!b.needConfirm) timer.current = setTimeout(next, HUMAN_CARD_MS);
  };

  // 已经排进动画队列的日志条数 / 出牌条数（播放期间新到的局面接着往后排，不会丢）
  const scannedLog = useRef(incoming?.log.length ?? 0);
  const scannedPlays = useRef(incoming?.plays?.length ?? 0);

  useEffect(() => {
    latest.current = incoming;
    if (!incoming) return;
    // 第一次拿到局面，或读档、撤销等让日志变短：直接跳到新局面
    if (!shownRef.current || incoming.log.length < scannedLog.current) {
      clearTimeout(timer.current);
      busy.current = false;
      queue.current = [];
      setBeat(null);
      scannedLog.current = incoming.log.length;
      scannedPlays.current = incoming.plays?.length ?? 0;
      shownRef.current = incoming;
      setShown(incoming);
      return;
    }
    const from = scannedLog.current;
    const items: { at: number; beat: Beat }[] = [];
    incoming.log.forEach((e: LogEntry, i: number) => {
      if (i < from) return;
      if (e.move) items.push({ at: i - 0.5, beat: { key: ++seq.current, kind: 'move', move: e.move } });
      if (e.roll) items.push({ at: i, beat: { key: ++seq.current, kind: 'roll', roll: e.roll } });
      // 例行结算（minor）只给行动方自己看；flat 的结算汇总一次显示全部条目
      if (e.scene && !(e.scene.minor && e.scene.side !== incoming.me)) {
        const world = !!e.scene.world || ['eastRise', 'pacific'].includes(e.scene.art ?? '');
        const n = e.scene.flat ? 1 : Math.max(1, e.scene.steps.length);
        for (let k = 0; k < n; k++) items.push({ at: i - 0.45 + k * 0.001, beat: { key: ++seq.current, kind: 'scene', scene: e.scene, step: k, world } });
      }
      if (e.war) items.push({ at: i, beat: { key: ++seq.current, kind: 'war', war: e.war } });
      // 对手放影响力逐点播放（自己点的不必重播）
      if (e.place && e.place.side !== incoming.me) {
        e.place.steps.forEach(([country, n], k) => items.push({ at: i - 0.4 + k * 0.001, beat: { key: ++seq.current, kind: 'place', side: e.place!.side, country, n } }));
      }
    });
    const me = incoming.me;
    for (const p of (incoming.plays ?? []).slice(scannedPlays.current)) {
      if (p.side === me) {
        // 自己打出的事件也播动画（行动点 / 太空不必再提示）
        if (p.how === 'event' || p.how === 'headline') items.push({ at: p.at ?? Infinity, beat: { key: ++seq.current, kind: 'card', card: p.card, side: p.side, how: p.how, needConfirm: false, own: true } });
        continue;
      }
      items.push({ at: p.at ?? Infinity, beat: { key: ++seq.current, kind: 'card', card: p.card, side: p.side, how: p.how, needConfirm: aiOpponent } });
    }
    scannedLog.current = incoming.log.length;
    scannedPlays.current = incoming.plays?.length ?? 0;
    items.sort((a, b) => a.at - b.at);
    const beats = items.map((x) => x.beat);
    if (busy.current) {
      // 正在播放：接到队尾，播完再切到最新局面
      queue.current.push(...beats);
      return;
    }
    if (!beats.length) {
      shownRef.current = incoming;
      setShown(incoming);
      return;
    }
    busy.current = true;
    // 一次太多（读档、跳转）就只展示最后几项
    // 逐点放影响力不算在内，只看出牌 / 掷骰 / 移牌的数量
    const keep = (b: Beat) => b.kind === 'scene' || b.kind === 'war';
    const heavy = beats.filter((b) => b.kind !== 'place' && !keep(b)).length;
    // 过场说明、世界大战的每一轮一律保留（机制触发要讲清楚）
    queue.current = heavy > 12 || beats.length > 40 ? [...beats.filter(keep), ...beats.filter((b) => b.kind !== 'place' && !keep(b)).slice(-6)] : beats;
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
  if (!beat || beat.kind === 'place') return null;
  if (beat.kind === 'scene') return <SceneOverlay beat={beat} onNext={onNext} key={beat.key} />;
  if (beat.kind === 'war') return <WarOverlay war={beat.war} onNext={onNext} onSkipAll={onSkipAll} key={beat.key} />;
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

/** 过场插图：几种机制各一张简单的剪影 */
function SceneArt({ art }: { art?: string }) {
  switch (art) {
    case 'eastRise':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <circle cx="60" cy="40" r="22" fill="#d8463a" />
          <path d="M0,46 L120,46 L120,60 L0,60Z" fill="#5a3a2a" />
          {[[26, 46, 14], [44, 46, 22], [76, 46, 18], [94, 46, 12]].map(([x, y, h], i) => (
            <g key={i}><rect x={x - 3} y={y - h} width="6" height={h} fill="#2a1a12" /><path d={`M${x - 7},${y - h} L${x},${y - h - 6} L${x + 7},${y - h}Z`} fill="#2a1a12" /></g>
          ))}
        </svg>
      );
    case 'pacific':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#2a5f8a" />
          {[14, 26, 38, 50].map((y) => <path key={y} d={`M0,${y} q10,-4 20,0 t20,0 t20,0 t20,0 t20,0 t20,0`} stroke="#9cc6f0" fill="none" opacity="0.5" />)}
          <polygon points="30,44 92,44 98,38 26,38" fill="#3a4656" /><rect x="70" y="30" width="8" height="8" fill="#3a4656" />
          <polygon points="12,52 22,46 24,56" fill="#c9a06a" /><polygon points="100,20 110,16 112,26 104,28" fill="#c9a06a" />
        </svg>
      );
    case 'oil':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#3a2a1a" />
          {[24, 48, 72, 96].map((x) => (
            <g key={x}><rect x={x - 8} y="22" width="16" height="26" rx="2" fill="#1b1712" stroke="#f5d76e" /><path d={`M${x},28 c3,4 4,6 4,8 a4,4 0 0 1 -8,0 c0,-2 1,-4 4,-8z`} fill="#f5d76e" /></g>
          ))}
        </svg>
      );
    case 'squeeze':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#2a2420" />
          {[20, 44, 68, 92].map((x) => <g key={x}><rect x={x} y="34" width="16" height="8" rx="3" fill="#5f6b4a" /><rect x={x + 4} y="28" width="8" height="6" fill="#5f6b4a" /><path d={`M${x + 12},31 L${x + 24},30`} stroke="#5f6b4a" stroke-width="2" /></g>)}
        </svg>
      );
    case 'bonus':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#2a2a1e" />
          {[30, 60, 90].map((x, i) => <g key={x}><rect x={x - 1} y={14 + i * 4} width="2" height={34 - i * 4} fill="#a89878" /><path d={`M${x + 1},${14 + i * 4} l16,4 l-16,4z`} fill={i === 1 ? '#f5d76e' : '#c9503f'} /></g>)}
          <rect x="0" y="48" width="120" height="12" fill="#3a3626" />
        </svg>
      );
    case 'worldWar':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#2a1a16" />
          <path d="M0,60 L0,44 Q30,36 60,44 T120,42 L120,60z" fill="#3a2a20" />
          {[[24, 30, 9], [62, 22, 12], [96, 32, 8]].map(([x, y, r]) => <g key={x}><circle cx={x} cy={y} r={r} fill="#e07a3a" opacity="0.85" /><circle cx={x} cy={y} r={r * 0.5} fill="#f5d76e" /></g>)}
          <path d="M8,14 l14,-2 l-14,-2 l3,2z M86,10 l14,-2 l-14,-2 l3,2z" fill="#c9c0aa" />
        </svg>
      );
    case 'orbit':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#0f1420" />
          <circle cx="60" cy="72" r="34" fill="#2a5f8a" />
          <ellipse cx="60" cy="40" rx="50" ry="12" fill="none" stroke="#9cc6f0" stroke-dasharray="3 3" opacity="0.6" />
          <rect x="88" y="22" width="10" height="6" fill="#d9d2c0" /><rect x="80" y="23.5" width="7" height="3" fill="#5a8ac8" /><rect x="99" y="23.5" width="7" height="3" fill="#5a8ac8" />
          <path d="M92,28 L62,50" stroke="#f5d76e" stroke-width="1.6" /><circle cx="62" cy="50" r="3" fill="#d8463a" />
        </svg>
      );
    case 'unifyChina':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#8f2c23" />
          <path d="M18,40 L40,22 L66,26 L84,18 L100,30 L92,44 L60,48 L30,50Z" fill="#c9503f" />
          <path d="M98,40 l4,-6 l3,4 l-3,8z" fill="#c9503f" />
          <path d="M86,40 q6,-2 10,0" stroke="#f5d76e" stroke-width="1.4" fill="none" />
          <polygon points="40,12 42,18 48,18 43,22 45,28 40,24 35,28 37,22 32,18 38,18" fill="#f5d76e" />
        </svg>
      );
    case 'unifyKorea':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#22303c" />
          <path d="M50,8 L66,10 L70,24 L64,34 L68,46 L58,54 L50,48 L54,36 L48,22Z" fill="#c9bb98" />
          <path d="M40,30 L80,30" stroke="#f5d76e" stroke-width="1.6" stroke-dasharray="4 3" />
          <path d="M36,26 l8,8 M44,26 l-8,8" stroke="#d8463a" stroke-width="2" />
        </svg>
      );
    case 'missile':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#1f2a36" />
          <path d="M20,50 Q60,-6 100,40" stroke="#f5d76e" stroke-width="1.4" stroke-dasharray="3 3" fill="none" />
          <path d="M96,32 l8,10 l-10,-2z" fill="#d8463a" />
          <path d="M92,48 L108,44 L112,52 L96,56Z" fill="#c9bb98" />
          <path d="M10,52 L30,46 L34,56 L14,58Z" fill="#c9bb98" />
        </svg>
      );
    case 'cloud':
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#2a2d33" />
          <path d="M30,34 a12,12 0 0 1 20,-10 a16,16 0 0 1 30,4 a10,10 0 0 1 4,20 h-52 a8,8 0 0 1 -2,-14z" fill="#4a4e58" />
          <path d="M52,46 l-6,10 l8,-4 l-4,10" stroke="#f5d76e" stroke-width="2" fill="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 60" class="sc-art">
          <rect width="120" height="60" fill="#1f1c17" />
          <circle cx="60" cy="30" r="20" fill="none" stroke="#f5d76e" stroke-width="2" />
          <path d="M40,30 h40 M60,10 v40" stroke="#f5d76e" stroke-width="1" opacity="0.6" />
          <circle cx="60" cy="30" r="6" fill="#c9503f" />
        </svg>
      );
  }
}

/** 世界大战自动播放（跨轮保持） */
const warAuto = signal(false);
const WAR_AUTO_MS = 1600;

/** 世界大战的一轮：双方国家数、这一轮每个未定国家的施压与结果 */
function WarOverlay({ war, onNext, onSkipAll }: { war: WarRound; onNext: () => void; onSkipAll: () => void }) {
  const auto = warAuto.value;
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(onNext, WAR_AUTO_MS);
    return () => clearTimeout(t);
  }, [auto]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const { count: n } = war;
  const total = n.US + n.USSR + n.open;
  // 按结算顺序列出（前面的结果会影响后面的国家）
  const list = war.changes;
  const zh = (sd: Side) => (sd === 'US' ? '美' : '苏');
  return (
    <div class="scene-box war-box">
      <div class="scene-title">世界大战 · 第 {war.round} 轮</div>
      <div class="war-bar">
        <span class="us" style={{ flexGrow: n.US }}>美控 {n.US}</span>
        {n.open > 0 && <span class="open" style={{ flexGrow: n.open }}>未定 {n.open}</span>}
        <span class="ussr" style={{ flexGrow: n.USSR }}>苏控 {n.USSR}</span>
      </div>
      <div class="war-sum">本轮 {war.changes.length} 国交战，{war.changes.filter((x) => x.won).length} 国易手；共 {total} 国</div>
      <ul class="war-list">
        {list.map((x) => (
          <li key={x.c} class={x.won ? 'won' : ''}>
            <b>{st(COUNTRIES[x.c].zh)}</b>
            {!x.nuke && <span class="war-push">施压 美 {x.push[0]} : 苏 {x.push[1]}</span>}
            {x.nuke && <span class="war-nuke">☢ 引发核战争</span>}
            {x.dice && <span class="war-dice">掷骰 {x.dice.map((d) => `${d[0]}${d[1] ? `+${d[1]}` : ''} : ${d[2]}${d[3] ? `+${d[3]}` : ''}`).join('，平，重掷 ')}</span>}
            <span class={`war-gain ${x.side.toLowerCase()}`}>{zh(x.side)} +{x.n}{x.won ? `，归${zh(x.side)}` : ''}</span>
          </li>
        ))}
      </ul>
      <div class="war-btns">
        <button type="button" class="btn small ghost" onClick={onSkipAll}>跳到结果</button>
        <button type="button" class="btn small" onClick={() => (warAuto.value = !auto)}>{auto ? '暂停' : '自动播放'}</button>
        <button type="button" class="btn primary" onClick={onNext}>下一轮</button>
      </div>
    </div>
  );
}

/** 过场说明：标题、为什么发生、逐条展开的变化；每条都要点击继续，不会一闪而过 */
function SceneOverlay({ beat, onNext }: { beat: Extract<Beat, { kind: 'scene' }>; onNext: () => void }) {
  const { scene, step } = beat;
  const n = scene.flat ? 1 : Math.max(1, scene.steps.length);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return (
    <div class={`scene-box${scene.side ? ` side-${scene.side.toLowerCase()}` : ''}`}>
      <SceneArt art={scene.art} />
      <div class="scene-title">{st(scene.title)}</div>
      {scene.sub && <div class="scene-sub">{st(scene.sub)}</div>}
      <ol class="scene-steps">
        {/* 还没轮到的条目用省略号占位，让人知道后面还有几步 */}
        {scene.steps.map((x, i) => (
          scene.flat ? <li key={i} class="now">{st(x.text)}</li>
            : <li key={i} class={i < step ? 'done' : i === step ? 'now' : 'todo'}>{i <= step ? st(x.text) : '……'}</li>
        ))}
      </ol>
      <button type="button" class="btn primary" onClick={onNext}>{step + 1 < n ? `下一步（${step + 1}/${n}）` : '继续'}</button>
    </div>
  );
}
