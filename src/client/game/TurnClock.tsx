// 新回合过场：屏幕中间一只时钟，指针从上一回合走到这一回合；10 个回合对应冷战的年份段，最后一回合红字提醒。

/** 第 n 回合覆盖 YEARS[n-1]–YEARS[n]（大致对应早期 1945–57、中期 57–73、后期 73–89） */
const YEARS = [1945, 1949, 1953, 1957, 1961, 1965, 1969, 1973, 1978, 1984, 1989];
const ERA = (t: number) => (t <= 3 ? '冷战早期' : t <= 7 ? '冷战中期' : '冷战后期');

export function TurnClock({ turn, last: lastTurn = 10 }: { turn: number; last?: number }) {
  const R = 84;
  const ang = (t: number) => -90 + (t - 0.5) * 36; // 每回合占 36°，指针指在该格中间
  const from = ang(Math.max(1, turn - 1)), to = ang(turn);
  const last = turn >= lastTurn;
  return (
    <div class={`turn-clock${last ? ' last' : ''}`}>
      <svg viewBox="-110 -110 220 220" width="220" height="220">
        <circle r="100" class="tc-face" />
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((-90 + i * 36) * Math.PI) / 180;
          const mid = ((-90 + (i + 0.5) * 36) * Math.PI) / 180;
          const t = i + 1;
          return (
            <g key={i} class={`tc-seg${t < turn ? ' past' : t === turn ? ' now' : ''}${t <= 3 ? ' early' : t <= 7 ? ' mid' : ' late'}`}>
              <path d={`M${92 * Math.cos(a)},${92 * Math.sin(a)} L${100 * Math.cos(a)},${100 * Math.sin(a)}`} class="tc-tick" />
              <path d={`M${R * Math.cos(a)},${R * Math.sin(a)} A${R},${R} 0 0 1 ${R * Math.cos(a + Math.PI / 5)},${R * Math.sin(a + Math.PI / 5)}`} class="tc-arc" />
              <text x={68 * Math.cos(mid)} y={68 * Math.sin(mid)} class="tc-num">{t}</text>
            </g>
          );
        })}
        <g class="tc-hand" style={{ '--from': `${from + 90}deg`, '--to': `${to + 90}deg` } as Record<string, string>}>
          <path d="M0,10 L-3.4,0 L0,-74 L3.4,0Z" />
        </g>
        <circle r="6" class="tc-pin" />
      </svg>
      <div class="tc-text">
        <div class="tc-turn">第 {turn} 回合</div>
        <div class="tc-years">{YEARS[turn - 1]}–{YEARS[turn]} · {ERA(turn)}</div>
        {last && <div class="tc-last">最后一回合！回合结束即终局计分</div>}
      </div>
    </div>
  );
}
