// 国家方框右下角闪电 / 航弹点开：列出点名影响该国的卡（航弹只列战争卡），按时期分组，标出生效 / 移除 / 位置。
import { useEffect } from 'preact/hooks';
import { CARDS, COUNTRIES } from '../../data';
import type { GameView } from '../../engine/view';
import { ERA_ZH, GROUP_NOTE, STATUS_ZH, cardStatus, countryCards, eraNow, type CardKind } from './countryCards';

const ERA_IDX = { early: 0, mid: 1, late: 2 } as const;
const TITLE: Record<CardKind, (n: string) => string> = {
  bolt: (n) => `⚡ 点名${n}的卡`,
  war: (n) => `💣 牵涉${n}的战争卡`,
  score: (n) => `👑 ${n}有特殊分值的计分卡`,
  missile: (n) => `🚀 ${n}与古巴导弹危机`,
  oil: (n) => `🛢 ${n}是产油国`,
  muslim: (n) => `☪ ${n}是穆斯林革命目标国`,
  canal: (n) => `🌊 ${n}受巴拿马运河事件影响`,
};
const SIDE_CLS = { US: 'us', USSR: 'ussr', NEUTRAL: 'neutral' } as const;

export function BoltPopover({ view, at, onClose, onEnter, onLeave, onPeek }: { view: GameView; at: { id: string; x: number; y: number; kind: CardKind }; onClose: () => void; onEnter: () => void; onLeave: () => void; onPeek: (c: number | null, rect?: { left: number; right: number; top: number; bottom: number }) => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const cards = countryCards(view, at.id, at.kind);
  const now = eraNow(view.turn);
  const note = GROUP_NOTE[at.kind];
  // 成组标记（油滴 / 新月 / 河流）不按时期截断：之前时期的卡也可能还在牌库里
  const groups = [0, 1, 2].filter((e) => note || e >= now).map((e) => ({ era: e, list: cards.filter((c) => ERA_IDX[CARDS[c].era] === e) })).filter((g) => g.list.length);
  const W = 300;
  const left = Math.max(8, Math.min(window.innerWidth - W - 8, at.x + 12));
  const top = Math.max(8, Math.min(window.innerHeight - 60 - cards.length * 44 - groups.length * 24, at.y - 20));
  return (
    <>
      <div class="bolt-pop" style={{ left: `${left}px`, top: `${top}px`, width: `${W}px` }} onPointerEnter={onEnter} onPointerLeave={() => { onPeek(null); onLeave(); }}>
        <div class="bp-title">
          <span>{TITLE[at.kind](COUNTRIES[at.id].zh)}</span>
          <button type="button" onClick={onClose}>✕</button>
        </div>
        {note && <div class="bp-note-top">{note}</div>}
        {groups.map((g) => (
          <div key={g.era} class="bp-group">
            <div class="bp-era">{ERA_ZH[g.era]}{g.era === now ? '（当前）' : g.era > now ? '（未来）' : ''}</div>
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
