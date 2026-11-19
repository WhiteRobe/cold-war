import { useState } from 'preact/hooks';
import { CARD_LIST, type Era } from '../../data';
import { CardFace, MiniCard } from '../game/CardFace';
import { go } from '../store';

const ERA_ZH: Record<Era, string> = { early: '冷战早期', mid: '冷战中期', late: '冷战后期' };
const SIDE_ORDER = { US: 0, USSR: 1, NEUTRAL: 2 } as const;
type SortKey = 'side' | 'ops' | 'id';
const SORT_ZH: Record<SortKey, string> = { side: '按阵营', ops: '按点数', id: '按编号' };

export function Cards() {
  const [era, setEra] = useState<Era | 'all'>('all');
  const [side, setSide] = useState<'all' | 'US' | 'USSR' | 'NEUTRAL'>('all');
  const [q, setQ] = useState('');
  const [zoom, setZoom] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>('side');
  // 阵营：美 → 苏 → 中立，同阵营按点数从小到大（计分卡 0 点排在中立最前）；点数：先点数再阵营
  const bySide = (a: (typeof CARD_LIST)[number], b: (typeof CARD_LIST)[number]) => SIDE_ORDER[a.side] - SIDE_ORDER[b.side];
  const byOps = (a: (typeof CARD_LIST)[number], b: (typeof CARD_LIST)[number]) => a.ops - b.ops;
  const list = CARD_LIST.filter((c) => (era === 'all' || c.era === era) && (side === 'all' || c.side === side) && (!q || c.zh.includes(q) || c.name.toLowerCase().includes(q.toLowerCase()) || String(c.id) === q)).sort(
    (a, b) => (sort === 'side' ? bySide(a, b) || byOps(a, b) : sort === 'ops' ? byOps(a, b) || bySide(a, b) : 0) || a.id - b.id,
  );
  const at = zoom === null ? -1 : list.findIndex((c) => c.id === zoom);
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
        <div class="seg">
          {(['side', 'ops', 'id'] as const).map((k) => (
            <button type="button" key={k} class={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{SORT_ZH[k]}</button>
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
              <button type="button" class="btn" disabled={at <= 0} onClick={() => setZoom(list[at - 1].id)}>上一张</button>
              <button type="button" class="btn" onClick={() => setZoom(null)}>关闭</button>
              <button type="button" class="btn" disabled={at < 0 || at >= list.length - 1} onClick={() => setZoom(list[at + 1].id)}>下一张</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
