// DEFCON 降到 1 时的终局过场：导弹从两侧划弧飞向对方，落点闪光、蘑菇云升起，最后全屏白光、褪成灰烬，
// 播完（或点击跳过）再弹出胜负结算。
import { useEffect } from 'preact/hooks';
import { sfx } from '../audio';

const W = 1000, H = 560, GROUND = 470;

/** 导弹航线：起点（发射方） → 终点（目标），一条向上拱起的二次曲线 */
const SHOTS: { from: [number, number]; to: [number, number]; side: 'us' | 'ussr'; delay: number }[] = [
  { from: [120, GROUND], to: [760, GROUND], side: 'us', delay: 0.2 },
  { from: [880, GROUND], to: [260, GROUND], side: 'ussr', delay: 0.4 },
  { from: [180, GROUND], to: [640, GROUND], side: 'us', delay: 0.7 },
  { from: [820, GROUND], to: [380, GROUND], side: 'ussr', delay: 0.9 },
  { from: [90, GROUND], to: [900, GROUND], side: 'us', delay: 1.1 },
  { from: [930, GROUND], to: [110, GROUND], side: 'ussr', delay: 1.25 },
];
const FLIGHT = 1.5;

function arc([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 330;
  return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
}

/** 蘑菇云：烟柱 + 层叠的云团 + 底部冲击环 */
function Mushroom({ x, delay }: { x: number; delay: number }) {
  return (
    <g class="nk-cloud" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${GROUND}px` }}>
      <ellipse cx={x} cy={GROUND} rx="70" ry="10" class="nk-ring" />
      <path d={`M${x - 10},${GROUND} C${x - 8},${GROUND - 60} ${x - 14},${GROUND - 100} ${x - 6},${GROUND - 130} L${x + 6},${GROUND - 130} C${x + 14},${GROUND - 100} ${x + 8},${GROUND - 60} ${x + 10},${GROUND}Z`} class="nk-stem" />
      <ellipse cx={x} cy={GROUND - 112} rx="34" ry="9" class="nk-collar" />
      <circle cx={x - 26} cy={GROUND - 150} r="26" class="nk-cap d" />
      <circle cx={x + 26} cy={GROUND - 150} r="26" class="nk-cap d" />
      <circle cx={x} cy={GROUND - 168} r="34" class="nk-cap" />
      <circle cx={x - 14} cy={GROUND - 178} r="16" class="nk-cap l" />
    </g>
  );
}

export function NukeScene({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    sfx('defconDown');
    const t1 = setTimeout(() => sfx('launch'), 200);
    const t2 = setTimeout(() => sfx('spaceFail'), (0.2 + FLIGHT) * 1000);
    const t3 = setTimeout(() => sfx('spaceFail'), (0.9 + FLIGHT) * 1000);
    const end = setTimeout(onDone, 5600);
    return () => [t1, t2, t3, end].forEach(clearTimeout);
  }, []);
  const hits = SHOTS.map((s) => ({ x: s.to[0], delay: s.delay + FLIGHT }));
  return (
    <div class="nuke-scene" onClick={onDone} title="点击跳过">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="nkFlash"><stop offset="0" stop-color="#fff" /><stop offset="0.35" stop-color="#fff6c0" /><stop offset="1" stop-color="#ff9a30" stop-opacity="0" /></radialGradient>
        </defs>
        {/* 地平线上的城市剪影 */}
        <path d={`M0,${GROUND} L0,${GROUND - 20} L40,${GROUND - 20} L40,${GROUND - 44} L70,${GROUND - 44} L70,${GROUND - 28} L120,${GROUND - 28} L120,${GROUND - 60} L140,${GROUND - 60} L140,${GROUND - 24} L210,${GROUND - 24} L210,${GROUND - 38} L260,${GROUND - 38} L260,${GROUND - 18} L330,${GROUND - 18} L330,${GROUND - 50} L350,${GROUND - 70} L370,${GROUND - 50} L370,${GROUND - 22} L460,${GROUND - 22} L460,${GROUND - 34} L540,${GROUND - 34} L540,${GROUND - 16} L620,${GROUND - 16} L620,${GROUND - 46} L660,${GROUND - 46} L660,${GROUND - 26} L740,${GROUND - 26} L740,${GROUND - 58} L760,${GROUND - 58} L760,${GROUND - 30} L840,${GROUND - 30} L840,${GROUND - 42} L900,${GROUND - 42} L900,${GROUND - 20} L${W},${GROUND - 20} L${W},${H} L0,${H}Z`} class="nk-city" />
        {SHOTS.map((s, i) => (
          <g key={i}>
            <path d={arc(s.from, s.to)} class={`nk-trail ${s.side}`} pathLength="1" style={{ animationDelay: `${s.delay}s`, animationDuration: `${FLIGHT}s` }} />
          </g>
        ))}
        {hits.map((h, i) => (
          <g key={i}>
            <circle cx={h.x} cy={GROUND - 10} r="90" fill="url(#nkFlash)" class="nk-flash" style={{ animationDelay: `${h.delay}s`, transformOrigin: `${h.x}px ${GROUND - 10}px` }} />
            <Mushroom x={h.x} delay={h.delay + 0.15} />
          </g>
        ))}
      </svg>
      <div class="nk-white" />
      <div class="nk-text">
        <div class="nk-title">DEFCON 1</div>
        <div class="nk-sub">全面核战争</div>
      </div>
    </div>
  );
}
