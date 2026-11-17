import { useState } from 'preact/hooks';
import { CARD_LIST, type Era } from '../../data';
import { CardFace, MiniCard } from '../game/CardFace';
import { go } from '../store';

const ERA_ZH: Record<Era, string> = { early: '冷战早期', mid: '冷战中期', late: '冷战后期' };

export function Cards() {
  const [era, setEra] = useState<Era | 'all'>('all');
  const [side, setSide] = useState<'all' | 'US' | 'USSR' | 'NEUTRAL'>('all');
  const [q, setQ] = useState('');
  const [zoom, setZoom] = useState<number | null>(null);
  const list = CARD_LIST.filter((c) => (era === 'all' || c.era === era) && (side === 'all' || c.side === side) && (!q || c.zh.includes(q) || c.name.toLowerCase().includes(q.toLowerCase()) || String(c.id) === q));
  return (
    <div class="page">
      <header class="page-top">
        <button type="button" class="icon-btn" onClick={() => go('/')}>←</button>
        <h1>卡牌图鉴</h1>
      </header>
      <div class="filters">
        <div class="seg">
          {(['all', 'early', 'mid', 'late'] as const).map((e) => (
            <button type="button" key={e} class={era === e ? 'on' : ''} onClick={() => setEra(e)}>{e === 'all' ? '全部' : ERA_ZH[e]}</button>
          ))}
        </div>
        <div class="seg">
          {(['all', 'US', 'USSR', 'NEUTRAL'] as const).map((s) => (
            <button type="button" key={s} class={side === s ? 'on' : ''} onClick={() => setSide(s)}>{s === 'all' ? '全部' : s === 'US' ? '美国' : s === 'USSR' ? '苏联' : '中立'}</button>
          ))}
        </div>
        <input class="input" placeholder="搜索卡名或编号" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      </div>
      <div class="gallery">
        {list.map((c) => <MiniCard key={c.id} id={c.id} onClick={() => setZoom(c.id)} />)}
      </div>
      {zoom !== null && (
        <div class="modal" onClick={() => setZoom(null)}>
          <div class="modal-card" onClick={(e) => e.stopPropagation()}>
            <CardFace id={zoom} />
            <div class="row">
              <button type="button" class="btn" disabled={zoom <= 1} onClick={() => setZoom(zoom - 1)}>上一张</button>
              <button type="button" class="btn" onClick={() => setZoom(null)}>关闭</button>
              <button type="button" class="btn" disabled={zoom >= 110} onClick={() => setZoom(zoom + 1)}>下一张</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
