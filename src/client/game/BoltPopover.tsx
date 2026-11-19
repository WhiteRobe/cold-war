// 国家方框右下角闪电点开：列出点名影响该国的卡，按时期分组，标出生效 / 移除 / 位置。
import { useEffect } from 'preact/hooks';
import { CARDS, COUNTRIES } from '../../data';
import type { GameView } from '../../engine/view';
import { ERA_ZH, STATUS_ZH, cardStatus, countryCards, eraNow } from './countryCards';

const ERA_IDX = { early: 0, mid: 1, late: 2 } as const;
const SIDE_CLS = { US: 'us', USSR: 'ussr', NEUTRAL: 'neutral' } as const;

export function BoltPopover({ view, at, onClose, onEnter, onLeave, onPeek }: { view: GameView; at: { id: string; x: number; y: number }; onClose: () => void; onEnter: () => void; onLeave: () => void; onPeek: (c: number | null, rect?: { left: number; right: number; top: number; bottom: number }) => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const cards = countryCards(view, at.id);
  const now = eraNow(view.turn);
  const groups = [0, 1, 2].filter((e) => e >= now).map((e) => ({ era: e, list: cards.filter((c) => ERA_IDX[CARDS[c].era] === e) })).filter((g) => g.list.length);
  const W = 300;
  const left = Math.max(8, Math.min(window.innerWidth - W - 8, at.x + 12));
  const top = Math.max(8, Math.min(window.innerHeight - 60 - cards.length * 44 - groups.length * 24, at.y - 20));
  return (
    <>
      <div class="bolt-pop" style={{ left: `${left}px`, top: `${top}px`, width: `${W}px` }} onPointerEnter={onEnter} onPointerLeave={() => { onPeek(null); onLeave(); }}>
        <div class="bp-title">
          <span>⚡ 点名{COUNTRIES[at.id].zh}的卡</span>
          <button type="button" onClick={onClose}>✕</button>
        </div>
        {groups.map((g) => (
          <div key={g.era} class="bp-group">
            <div class="bp-era">{ERA_ZH[g.era]}{g.era === now ? '（当前）' : '（未来）'}</div>
            {g.list.map((c) => {
              const st = cardStatus(view, c);
              const def = CARDS[c];
              return (
                <button
                  type="button"
                  key={c}
                  class={`bp-row st-${st}`}
                  onPointerEnter={(e) => {
                    const pop = (e.currentTarget as HTMLElement).closest('.bolt-pop')!.getBoundingClientRect();
                    const row = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    onPeek(c, { left: pop.left, right: pop.right, top: row.top, bottom: row.bottom });
                  }}
                >
                  <span class={`bp-ops side-${SIDE_CLS[def.side]}`}>{def.scoring ? '计' : def.ops}</span>
                  <span class="bp-name">{def.zh}<small>#{c}</small></span>
                  <span class={`bp-st st-${st}`}>{STATUS_ZH[st]}</span>
                </button>
              );
            })}
          </div>
        ))}
        <div class="bp-note">鼠标移到卡上看完整效果</div>
      </div>
    </>
  );
}
