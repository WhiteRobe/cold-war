// 首页军力对比条：左美右苏（按苏左美右绘制后整体翻转），红蓝分界按双方胜场比例移动；分界处两只低多边形手臂肘撑在条上掰手腕，
// 领先一方把对方压下去；手臂之间两个小兵拼刺刀；两端是按胜场多少排列的方阵（钢盔兵 + 坦克 + 军旗）。
// 数据来自云端全局战绩（所有浏览器的离线人机局 + 在线局）；取不到时退回本机战绩。
import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { globalTally, syncRecords, tally } from '../game/record';

const W = 760, H = 150, X0 = 24, X1 = W - 24, BAR_Y = 118, BAR_H = 14;
type S = 'us' | 'ussr';

function star(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** 低多边形钢盔兵半身（面朝 +x；flip 时面朝 -x） */
function Trooper({ x, y, s, side, flip }: { x: number; y: number; s: number; side: S; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`} class={`sbt ${side}`}>
      <polygon points="-7,0 -6,-9 0,-12 6,-9 7,0" class="t-body" />
      <polygon points="0,-12 6,-9 7,0 0,0" class="t-body-d" />
      <polygon points="-3.4,-12 3.4,-12 3,-15.6 -3,-15.6" class="t-face" />
      <polygon points="-5.4,-15.4 -4.6,-19.6 0,-21.4 4.6,-19.6 6.4,-15.4" class="t-helm" />
      <polygon points="0,-21.4 4.6,-19.6 6.4,-15.4 0,-15.4" class="t-helm-d" />
      <polygon points="4,-8 13,-23 14,-22.4 5.6,-7" class="t-rifle" />
    </g>
  );
}

function TankS({ x, y, s, side, flip }: { x: number; y: number; s: number; side: S; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`} class={`sbt ${side}`}>
      <polygon points="-15,0 -17,-4 17,-4 15,0" class="t-track" />
      <polygon points="-14,-4 -12,-10 12,-10 14,-4" class="t-body" />
      <polygon points="0,-10 12,-10 14,-4 0,-4" class="t-body-d" />
      <polygon points="-6,-10 -4,-15 6,-15 8,-10" class="t-helm" />
      <polygon points="6,-13.4 22,-14.4 22,-12.6 7,-11.6" class="t-rifle" />
    </g>
  );
}

function Banner({ x, y, side, flip }: { x: number; y: number; side: S; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -1 : 1},1)`} class={`sbt ${side}`}>
      <rect x="-0.8" y="-44" width="1.6" height="44" class="t-pole" />
      <path d="M0.8,-44 Q10,-47 19,-43 Q15,-38 19,-33 Q10,-36 0.8,-33Z" class="t-flag" />
      <polygon points={star(8.6, -38.6, 2.8)} class="t-flag-star" />
    </g>
  );
}

/** 一侧的方阵：三排，越靠后越小越淡；胜场越多人越多，前排末尾一辆坦克 */
function Army({ wins, side }: { wins: number; side: S }) {
  const left = side === 'ussr';
  const per = Math.min(9, 3 + wins);
  const out: JSX.Element[] = [];
  const rows = [
    { dy: -30, s: 0.62, o: 0.55 },
    { dy: -16, s: 0.78, o: 0.78 },
    { dy: -2, s: 0.95, o: 1 },
  ];
  rows.forEach((r, ri) => {
    for (let i = 0; i < per; i++) {
      const step = 17 * r.s + 2;
      const x0 = left ? X0 + 30 + ri * 6 : X1 - 30 - ri * 6;
      const x = left ? x0 + i * step : x0 - i * step;
      const y = BAR_Y + r.dy - 1;
      out.push(
        <g key={`${ri}-${i}`} opacity={r.o}>
          {i === per - 1 && ri === 2 ? <TankS x={x + (left ? 8 : -8)} y={y} s={r.s} side={side} flip={!left} /> : <Trooper x={x} y={y} s={r.s} side={side} flip={!left} />}
        </g>,
      );
    }
  });
  return (
    <g>
      <Banner x={left ? X0 + 14 : X1 - 14} y={BAR_Y - 2} side={side} flip={!left} />
      {out}
    </g>
  );
}

/** 一条低多边形前臂：肘在 (ex,ey)，腕在 (wx,wy)；阵营色袖子、袖口星 */
function Forearm({ ex, ey, wx, wy, side }: { ex: number; ey: number; wx: number; wy: number; side: S }) {
  const dx = wx - ex, dy = wy - ey, L = Math.hypot(dx, dy);
  const nx = -dy / L, ny = dx / L;
  const at = (t: number, w: number, k: number) => [ex + dx * t + nx * w * k, ey + dy * t + ny * w * k].map((n) => n.toFixed(1)).join(',');
  const se = 0.42; // 袖子长度占比
  return (
    <g class={`sb-arm ${side}`}>
      <polygon points={`${at(0, 15, 1)} ${at(se, 13, 1)} ${at(se, 13, -1)} ${at(0, 15, -1)}`} class="a-sleeve" />
      <polygon points={`${at(0, 15, 1)} ${at(se, 13, 1)} ${at(se, 0, 1)} ${at(0, 0, 1)}`} class="a-sleeve-d" />
      <polygon points={`${at(se - 0.08, 13.6, 1)} ${at(se, 13, 1)} ${at(se, 13, -1)} ${at(se - 0.08, 13.6, -1)}`} class="a-cuff" />
      <polygon points={star(ex + dx * (se - 0.2), ey + dy * (se - 0.2), 4.2)} class="a-star" />
      <polygon points={`${at(se, 11, 1)} ${at(1, 8, 1)} ${at(1, 8, -1)} ${at(se, 11, -1)}`} class="a-skin" />
      <polygon points={`${at(se, 11, 1)} ${at(1, 8, 1)} ${at(1, 0, 1)} ${at(se, 0, 1)}`} class="a-skin-d" />
      <ellipse cx={ex} cy={ey + 1} rx="13" ry="4" class="a-elbow" />
    </g>
  );
}

/** 互扣的两只拳头（以 (cx,cy) 为中心） */
function Fists({ cx: x, cy: y }: { cx: number; cy: number }) {
  return (
    <g>
      <polygon points={`${x - 13},${y + 10} ${x - 14},${y - 2} ${x - 6},${y - 11} ${x + 4},${y - 10} ${x + 6},${y + 1} ${x - 2},${y + 12}`} class="sb-hand back" />
      <polygon points={`${x + 13},${y + 10} ${x + 14},${y - 1} ${x + 7},${y - 9} ${x - 3},${y - 8} ${x - 5},${y + 2} ${x + 3},${y + 12}`} class="sb-hand front" />
      <polygon points={`${x - 3},${y - 8} ${x + 7},${y - 9} ${x + 6},${y - 3} ${x - 4},${y - 2}`} class="sb-hand knuckle" />
      <polygon points={`${x - 14},${y - 2} ${x - 6},${y - 11} ${x - 8},${y - 2}`} class="sb-hand thumb" />
    </g>
  );
}

export function StrengthBar() {
  // 先显示本机战绩，云端全局统计到了再换上
  const [t, setT] = useState(tally);
  const [global, setGlobal] = useState(false);
  useEffect(() => {
    syncRecords();
    globalTally().then((g) => {
      if (g) {
        setT(g);
        setGlobal(true);
      }
    });
  }, []);
  const total = t.US + t.USSR;
  // 加 1 平滑：没打过时停在正中，也不会一局就推到底
  const share = (t.USSR + 1) / (total + 2);
  const sx = X0 + (X1 - X0) * share;
  // 领先一方把对方的手往下压：正角度 = 顺时针 = 往美国一侧倒
  const tilt = Math.max(-28, Math.min(28, (t.USSR - t.US) * 7));
  // 握手点：两肘固定在桌面上，握手点绕两肘中点沿圆弧往被压的一方倒
  const R = 74, th = (tilt * Math.PI) / 180;
  const gx = sx + R * Math.sin(th), gy = BAR_Y - R * Math.cos(th);
  return (
    <section class="panel strength-panel">
      <div class="sb-head">
        <span class="sb-side us">美国 <b>{t.US}</b> 胜</span>
        <span class="sb-mid">
          <span>{global ? '全服战绩' : '本机战绩'}{t.pending > 0 ? ` · 争夺中 ${t.pending} 局` : ''}</span>
          {t.draw > 0 && <span>平局 {t.draw}</span>}
          {!total && !t.pending && <span>还没有分出胜负的对局</span>}
        </span>
        <span class="sb-side ussr"><b>{t.USSR}</b> 胜 苏联</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} class="sb-svg" role="img" aria-label={`军力对比：苏联 ${t.USSR} 胜，美国 ${t.US} 胜，争夺中 ${t.pending} 局`}>
        <defs>
          <linearGradient id="sbSkyR" x1="0" x2="1"><stop offset="0" stop-color="#8f2c23" stop-opacity="0.55" /><stop offset="1" stop-color="#8f2c23" stop-opacity="0" /></linearGradient>
          <linearGradient id="sbSkyB" x1="1" x2="0"><stop offset="0" stop-color="#24447a" stop-opacity="0.6" /><stop offset="1" stop-color="#24447a" stop-opacity="0" /></linearGradient>
          <radialGradient id="sbGlow"><stop offset="0" stop-color="#f5d76e" stop-opacity="0.55" /><stop offset="1" stop-color="#f5d76e" stop-opacity="0" /></radialGradient>
        </defs>
        {/* 画面按“苏左美右”画好，整体水平翻转成美左苏右 */}
        <g transform={`translate(${W},0) scale(-1,1)`}>
        <rect x={X0} y="6" width={sx - X0} height={BAR_Y - 6} fill="url(#sbSkyR)" />
        <rect x={sx} y="6" width={X1 - sx} height={BAR_Y - 6} fill="url(#sbSkyB)" />
        <Army wins={t.USSR} side="ussr" />
        <Army wins={t.US} side="us" />
        {/* 桌面 = 军力条 */}
        <polygon points={`${X0 - 6},${BAR_Y} ${X1 + 6},${BAR_Y} ${X1},${BAR_Y + BAR_H} ${X0},${BAR_Y + BAR_H}`} class="sb-table" />
        <polygon points={`${X0},${BAR_Y + 3} ${sx},${BAR_Y + 3} ${sx},${BAR_Y + BAR_H - 2} ${X0 + 2},${BAR_Y + BAR_H - 2}`} class="sb-bar ussr" />
        <polygon points={`${sx},${BAR_Y + 3} ${X1},${BAR_Y + 3} ${X1 - 2},${BAR_Y + BAR_H - 2} ${sx},${BAR_Y + BAR_H - 2}`} class="sb-bar us" />
        <line x1={sx} y1={BAR_Y - 2} x2={sx} y2={BAR_Y + BAR_H} class="sb-split" />
        {/* 手臂之间：两个小兵拼刺刀 */}
        <g class="sb-duel">
          <Trooper x={sx - 13} y={BAR_Y - 1} s={0.78} side="ussr" />
          <Trooper x={sx + 13} y={BAR_Y - 1} s={0.78} side="us" flip />
          <polygon points={star(sx, BAR_Y - 19, 4.6)} class="sb-spark" />
        </g>
        {/* 掰手腕：肘不动，握手点倾斜 */}
        <g class="sb-wrestle">
          <circle cx={gx} cy={gy} r="30" fill="url(#sbGlow)" class="sb-glow" />
          <Forearm ex={sx - 62} ey={BAR_Y - 2} wx={gx - 7} wy={gy + 8} side="ussr" />
          <Forearm ex={sx + 62} ey={BAR_Y - 2} wx={gx + 7} wy={gy + 8} side="us" />
          <g transform={`translate(${gx - sx},${gy - (BAR_Y - 74)}) rotate(${tilt} ${sx} ${BAR_Y - 74})`}>
            <Fists cx={sx} cy={BAR_Y - 74} />
          </g>
        </g>
        </g>
      </svg>
    </section>
  );
}
