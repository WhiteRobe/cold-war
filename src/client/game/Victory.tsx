// 胜利动画：苏联满屏红潮 + 镰刀锤子旗；美国星条旗飘扬 + 自由女神；平局两面旗并立。
import type { Side } from '../../data';

const STRIPS = 18;

/** 飘动的旗：把整面旗切成竖条，每条错开时间上下摆动 */
function WavingFlag({ id, w, h, children }: { id: string; w: number; h: number; children: preact.ComponentChildren }) {
  const sw = w / STRIPS;
  return (
    <g class="waving-flag">
      <defs>
        {Array.from({ length: STRIPS }, (_, i) => (
          <clipPath id={`${id}-s${i}`} key={i}>
            <rect x={i * sw - 0.5} y={-20} width={sw + 1} height={h + 40} />
          </clipPath>
        ))}
      </defs>
      {Array.from({ length: STRIPS }, (_, i) => (
        <g key={i} clip-path={`url(#${id}-s${i})`}>
          <g class="flag-strip" style={{ animationDelay: `${-i * 0.09}s` }}>
            {children}
            {/* 褶皱明暗 */}
            <rect x={i * sw} y={0} width={sw + 1} height={h} fill={i % 2 ? '#0000001a' : '#ffffff10'} />
          </g>
        </g>
      ))}
    </g>
  );
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function SovietFlag({ id }: { id: string }) {
  return (
    <WavingFlag id={id} w={300} h={200}>
      <rect width="300" height="200" fill="#c8102e" />
      <polygon points={star(56, 34, 13)} fill="none" stroke="#ffd34d" stroke-width="2.5" />
      {/* 镰刀 */}
      <path d="M38,62 A26,26 0 1 0 82,96 L76,92 A19,19 0 1 1 46,66 Z" fill="#ffd34d" />
      <polygon points="40,104 44,108 34,118 30,114" fill="#ffd34d" />
      {/* 锤子 */}
      <polygon points="46,98 50,102 80,72 76,68" fill="#ffd34d" />
      <polygon points="70,62 86,78 90,74 74,58" fill="#ffd34d" />
    </WavingFlag>
  );
}

function USFlag({ id }: { id: string }) {
  const stripes = Array.from({ length: 13 }, (_, i) => (
    <rect key={i} y={(i * 200) / 13} width="300" height={200 / 13 + 0.3} fill={i % 2 ? '#fff' : '#b22234'} />
  ));
  const stars = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) stars.push(<polygon key={`${r}-${c}`} points={star(12 + c * 21, 12 + r * 19, 5)} fill="#fff" />);
  return (
    <WavingFlag id={id} w={300} h={200}>
      {stripes}
      <rect width="130" height="108" fill="#3c3b6e" />
      {stars}
    </WavingFlag>
  );
}

/** low poly 自由女神 */
function Liberty() {
  return (
    <svg class="liberty" viewBox="0 0 200 400">
      <polygon points="40,400 160,400 150,330 50,330" fill="#5c6b5f" />
      <polygon points="56,330 144,330 138,300 62,300" fill="#6d7d70" />
      <polygon points="66,300 134,300 124,160 76,160" fill="#5fa08a" />
      <polygon points="100,300 134,300 124,160 100,160" fill="#4e8c77" />
      <polygon points="76,160 124,160 116,130 84,130" fill="#6fb39b" />
      <polygon points="88,130 112,130 110,104 90,104" fill="#7cc2a8" />
      {/* 冠冕 */}
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
        <polygon key={k} points={`${100 + k * 4 - 1.5},104 ${100 + k * 9},84 ${100 + k * 4 + 1.5},104`} fill="#7cc2a8" />
      ))}
      {/* 举火炬的手臂 */}
      <polygon points="114,140 124,136 140,60 132,58" fill="#5fa08a" />
      <polygon points="126,58 146,58 142,44 130,44" fill="#c9a227" />
      <g class="torch-flame">
        <polygon points="128,44 144,44 136,16" fill="#f5a623" />
        <polygon points="132,44 140,44 136,26" fill="#fff3b0" />
      </g>
      {/* 左手的书 */}
      <polygon points="72,170 88,166 92,196 76,200" fill="#4e8c77" />
    </svg>
  );
}

function Confetti({ side }: { side: Side | null }) {
  const n = 36;
  return (
    <div class="confetti">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          class={`cf-star ${side ? side.toLowerCase() : ''}`}
          style={{ left: `${(i * 97) % 100}%`, animationDelay: `${(i % 12) * 0.35}s`, animationDuration: `${4 + (i % 5)}s`, fontSize: `${12 + (i % 4) * 6}px` }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function Fireworks() {
  return (
    <div class="fireworks">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} class="fw" style={{ left: `${15 + i * 17}%`, top: `${12 + (i % 3) * 10}%`, animationDelay: `${0.8 + i * 0.7}s` }} />
      ))}
    </div>
  );
}

export function VictoryScene({ winner, me, children }: { winner: Side | null; me: Side | null; children: preact.ComponentChildren }) {
  const lost = !!me && !!winner && winner !== me;
  return (
    <div class={`victory v-${winner ? winner.toLowerCase() : 'draw'}${lost ? ' lost' : ''}`}>
      {winner === 'USSR' && <div class="red-tide"><svg viewBox="0 0 1200 60" preserveAspectRatio="none"><path d="M0,30 Q150,0 300,30 T600,30 T900,30 T1200,30 V60 H0Z" fill="#a30d22" /></svg></div>}
      {winner === 'US' && <Fireworks />}
      <Confetti side={winner} />
      <div class="victory-stage">
        {winner === 'US' && <Liberty />}
        <div class="victory-flags">
          {(winner === 'USSR' || winner === null) && (
            <svg class="flag-svg" viewBox="-10 -30 320 260"><g transform="translate(0,0)"><SovietFlag id="fs" /></g></svg>
          )}
          {(winner === 'US' || winner === null) && (
            <svg class="flag-svg" viewBox="-10 -30 320 260"><USFlag id="fu" /></svg>
          )}
        </div>
      </div>
      <div class="victory-box">{children}</div>
    </div>
  );
}
