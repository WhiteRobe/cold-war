// 首页军力对比条：左苏右美，红蓝分界按双方胜场比例移动；分界处两只大手腕掰手腕，手下两个小兵拼刺刀；
// 两端按胜场多少排兵（兵 + 坦克）。数据来自按对局 id 记的战绩，删存档不影响。
import type { JSX } from 'preact';
import { tally } from '../game/record';

const W = 760, H = 128, X0 = 30, X1 = W - 30, BAR_Y = 104, BAR_H = 16;

function Soldier({ x, y, side, flip }: { x: number; y: number; side: 'us' | 'ussr'; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -1 : 1},1)`} class={`sb-unit ${side}`}>
      <circle cx="0" cy="-15" r="3.2" class="sb-helmet" />
      <rect x="-2.6" y="-12" width="5.2" height="8" rx="1.4" class="sb-body" />
      <path d="M-1.6,-4 L-2.4,1.6 M1.6,-4 L2.6,1.6" class="sb-leg" />
      <path d="M1.6,-10 L9,-12.6" class="sb-rifle" />
    </g>
  );
}

function Tank({ x, y, side, flip }: { x: number; y: number; side: 'us' | 'ussr'; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -1 : 1},1)`} class={`sb-unit ${side}`}>
      <rect x="-9" y="-6" width="18" height="5" rx="2.4" class="sb-track" />
      <rect x="-7" y="-10" width="13" height="4.4" rx="1" class="sb-body" />
      <rect x="-3" y="-13.4" width="7" height="3.6" rx="1.2" class="sb-body" />
      <path d="M4,-11.8 L13,-12.8" class="sb-rifle" />
    </g>
  );
}

/** 一侧的部队：胜场越多兵越多，每 4 个兵换一辆坦克 */
function Army({ wins, side }: { wins: number; side: 'us' | 'ussr' }) {
  const n = Math.min(12, 2 + wins);
  const out: JSX.Element[] = [];
  const left = side === 'ussr';
  for (let i = 0; i < n; i++) {
    const x = left ? X0 + 10 + i * 17 : X1 - 10 - i * 17;
    const y = BAR_Y - 10 - (i % 2) * 5;
    out.push((i + 1) % 4 === 0 ? <Tank key={i} x={x} y={y} side={side} flip={!left} /> : <Soldier key={i} x={x} y={y} side={side} flip={!left} />);
  }
  return <g>{out}</g>;
}

export function StrengthBar() {
  const t = tally();
  const total = t.US + t.USSR;
  // 加 1 平滑：没打过时停在正中，也不会一局就推到底
  const share = (t.USSR + 1) / (total + 2);
  const sx = X0 + (X1 - X0) * share;
  const tilt = Math.max(-15, Math.min(15, (t.USSR - t.US) * 4));
  return (
    <section class="panel strength-panel">
      <div class="sb-head">
        <span class="sb-side ussr">苏联 <b>{t.USSR}</b> 胜</span>
        <span class="sb-mid">
          {t.pending > 0 && <span>争夺中 {t.pending} 局</span>}
          {t.draw > 0 && <span>平局 {t.draw}</span>}
          {!total && !t.pending && <span>还没有分出胜负的对局</span>}
        </span>
        <span class="sb-side us"><b>{t.US}</b> 胜 美国</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} class="sb-svg" role="img" aria-label={`军力对比：苏联 ${t.USSR} 胜，美国 ${t.US} 胜，争夺中 ${t.pending} 局`}>
        <Army wins={t.USSR} side="ussr" />
        <Army wins={t.US} side="us" />
        {/* 军力条 */}
        <rect x={X0} y={BAR_Y} width={sx - X0} height={BAR_H} rx="4" class="sb-bar ussr" />
        <rect x={sx} y={BAR_Y} width={X1 - sx} height={BAR_H} rx="4" class="sb-bar us" />
        <rect x={X0} y={BAR_Y} width={X1 - X0} height={BAR_H} rx="4" class="sb-frame" />
        {/* 分界处：两只大手腕掰手腕，领先的一方把对方的手往下压 */}
        <g transform={`rotate(${tilt} ${sx} ${BAR_Y - 6})`} class="sb-arms">
          <path d={`M${sx - 58},${BAR_Y - 2} L${sx - 46},${BAR_Y - 14} L${sx - 8},${BAR_Y - 58} L${sx + 2},${BAR_Y - 50} L${sx - 34},${BAR_Y - 4}Z`} class="sb-sleeve ussr" />
          <path d={`M${sx + 58},${BAR_Y - 2} L${sx + 46},${BAR_Y - 14} L${sx + 8},${BAR_Y - 58} L${sx - 2},${BAR_Y - 50} L${sx + 34},${BAR_Y - 4}Z`} class="sb-sleeve us" />
          <path d={`M${sx - 14},${BAR_Y - 52} L${sx - 4},${BAR_Y - 66} L${sx + 6},${BAR_Y - 66} L${sx + 14},${BAR_Y - 54} L${sx + 8},${BAR_Y - 46} L${sx - 8},${BAR_Y - 46}Z`} class="sb-fist" />
          <path d={`M${sx - 6},${BAR_Y - 62} L${sx + 4},${BAR_Y - 50} M${sx},${BAR_Y - 64} L${sx + 9},${BAR_Y - 54}`} class="sb-knuckle" />
          <circle cx={sx - 52} cy={BAR_Y - 8} r="7" class="sb-cuff ussr" />
          <circle cx={sx + 52} cy={BAR_Y - 8} r="7" class="sb-cuff us" />
        </g>
        {/* 手腕下两个小兵拼刺刀 */}
        <g class="sb-duel">
          <Soldier x={sx - 12} y={BAR_Y - 2} side="ussr" />
          <Soldier x={sx + 12} y={BAR_Y - 2} side="us" flip />
          <path d={`M${sx - 3},${BAR_Y - 22} l2,-3 l2,3 M${sx - 1},${BAR_Y - 25} l0,-4`} class="sb-spark" />
        </g>
      </svg>
    </section>
  );
}
