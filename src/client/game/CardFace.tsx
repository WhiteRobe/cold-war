import { CARDS, CHINA_CARD } from '../../data';
import { cardArt } from '../../art';
import { richCardText } from './SubBadge';
import { cardView } from './cardCtx';
import { cardKind } from './countryCards';
import { MarkGlyph } from './MarkGlyph';

const SIDE_CLASS = { US: 'us', USSR: 'ussr', NEUTRAL: 'neutral' } as const;
const ERA_ZH = { early: '冷战早期', mid: '冷战中期', late: '冷战后期' } as const;
const SIDE_ZH = { US: '美国事件', USSR: '苏联事件', NEUTRAL: '双方事件' } as const;

const artCache = new Map<number, string>();
function art(id: number) {
  let a = artCache.get(id);
  if (a === undefined) {
    try {
      a = cardArt(id);
    } catch {
      a = '';
    }
    artCache.set(id, a);
  }
  return a;
}

export function CardArt({ id }: { id: number }) {
  return <svg class="card-art" viewBox="0 0 240 150" preserveAspectRatio="xMidYMid slice" dangerouslySetInnerHTML={{ __html: art(id) }} />;
}

/** 完整卡面 */
export function CardFace({ id, faceDown }: { id: number; faceDown?: boolean }) {
  const c = CARDS[id];
  return (
    <div class={`card-face side-${SIDE_CLASS[c.side]}${c.scoring ? ' scoring' : ''}`}>
      <div class="cf-head">
        {c.scoring ? <div class="cf-ops scoring-badge">计分</div> : <div class="cf-ops">{c.ops}</div>}
        <div class="cf-title">
          <div class="cf-zh">
            {c.zh}
            {/* 和地图国家方框上同款的标记（闪电除外），方便对照 */}
            {cardKind(id) !== 'bolt' && (
              <svg class="cf-mark" viewBox="-8 -8 16 16" aria-hidden="true">
                <g class={`c-mark c-${cardKind(id)}`}><MarkGlyph k={cardKind(id)} /></g>
              </svg>
            )}
          </div>
          <div class="cf-en">{c.name}</div>
        </div>
        <div class="cf-no">#{id}</div>
      </div>
      <div class="cf-art-wrap">
        <CardArt id={id} />
        {faceDown && <div class="cf-facedown">背面朝上 · 本回合不可用</div>}
      </div>
      <div class="cf-tags">
        <span>{SIDE_ZH[c.side]}</span>
        {c.starred && <span class="tag-star">★ 事件后移出</span>}
        {c.ongoing && <span class="tag-ongoing">持续</span>}
        {c.war && <span class="tag-war">战争</span>}
        {id === CHINA_CARD && <span>不计入手牌</span>}
      </div>
      <div class="cf-text">{richCardText(c.text, cardView.value, id)}</div>
      <div class="cf-foot">
        <span>{ERA_ZH[c.era]}</span>
        {c.optional && <span>可选卡</span>}
      </div>
    </div>
  );
}

/** 手牌 / 列表里的小卡 */
export function MiniCard({ id, onClick, active, dim, faceDown, title }: { id: number; onClick?: () => void; active?: boolean; dim?: boolean; faceDown?: boolean; title?: string }) {
  const c = CARDS[id];
  return (
    <button
      type="button"
      class={`mini-card side-${SIDE_CLASS[c.side]}${active ? ' active' : ''}${dim ? ' dim' : ''}${faceDown ? ' facedown' : ''}${c.scoring ? ' scoring' : ''}`}
      onClick={onClick}
      title={title ?? `${c.zh}：${c.text}`}
    >
      <div class="mc-head">
        <span class="mc-ops">{c.scoring ? '计' : c.ops}</span>
        <span class="mc-name">{c.zh}</span>
      </div>
      <div class="mc-art">
        <CardArt id={id} />
      </div>
      <div class="mc-foot">
        <span>#{id}</span>
        {c.starred && <span>★</span>}
      </div>
    </button>
  );
}
