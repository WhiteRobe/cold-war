import { CARDS, REGION_ZH } from '../../data';
import { SPACE } from '../../engine/space';
import type { Flags, Side } from '../../engine/types';
import type { GameView } from '../../engine/view';

const PHASE_ZH = { setup: '开局布置', headline: '头条阶段', action: '行动轮', turnEnd: '回合结束', over: '对局结束' };

export function Tracks({ view, names, onPile }: { view: GameView; names: Record<Side, string>; onPile: (p: 'discard' | 'removed' | 'deck') => void }) {
  const era = view.turn <= 3 ? '早期' : view.turn <= 7 ? '中期' : '后期';
  return (
    <div class="tracks" data-tour="tracks">
      <div class="trk trk-turn">
        <div class="trk-label">回合</div>
        <div class="trk-big">
          {view.turn}
          <small>/10</small>
        </div>
        <div class="trk-sub">
          冷战{era} · {PHASE_ZH[view.phase]}
          {view.phase === 'action' && ` ${view.ar}`}
        </div>
      </div>
      <Defcon d={view.defcon} />
      <Vp vp={view.vp} />
      <div class="trk trk-mil" data-tour="milops">
        <div class="trk-label">军事行动（需 {view.defcon}）</div>
        <MilRow side="US" n={view.milops.US} need={view.defcon} />
        <MilRow side="USSR" n={view.milops.USSR} need={view.defcon} />
      </div>
      <div class="trk trk-space" data-tour="space">
        <div class="trk-label">太空竞赛</div>
        <SpaceRow side="US" n={view.space.US} />
        <SpaceRow side="USSR" n={view.space.USSR} />
      </div>
      <div class="trk trk-cards">
        <div data-tour="china" class={`china ${view.china.holder.toLowerCase()}${view.china.faceUp ? '' : ' down'}`} title="中国牌：打出后背面朝上交给对手">
          中国牌 · {view.china.holder === 'US' ? '美' : '苏'}
          {view.china.faceUp ? '' : '（背面）'}
        </div>
        <div class="piles">
          <button type="button" onClick={() => onPile('deck')}>牌库 {view.deckCount}</button>
          <button type="button" onClick={() => onPile('discard')}>弃牌 {view.discard.length}</button>
          <button type="button" onClick={() => onPile('removed')}>移出 {view.removed.length}</button>
        </div>
        <div class="hand-counts">
          <span class="us">{names.US} 手牌 {view.handCounts.US}</span>
          <span class="ussr">{names.USSR} 手牌 {view.handCounts.USSR}</span>
        </div>
      </div>
    </div>
  );
}

function Defcon({ d }: { d: number }) {
  return (
    <div class="trk trk-defcon" data-tour="defcon">
      <div class="trk-label">DEFCON</div>
      <div class="defcon-row">
        {[5, 4, 3, 2, 1].map((n) => (
          <div key={n} class={`defcon-cell d${n}${n === d ? ' on' : ''}`}>{n}</div>
        ))}
      </div>
      <div class="trk-sub">{d === 5 ? '无限制' : d === 4 ? '欧洲禁政变/调整' : d === 3 ? '欧亚禁政变/调整' : '欧亚中东禁政变/调整'}</div>
    </div>
  );
}

function Vp({ vp }: { vp: number }) {
  const pct = ((Math.max(-20, Math.min(20, vp)) + 20) / 40) * 100;
  return (
    <div class="trk trk-vp" data-tour="vp">
      <div class="trk-label">胜利点</div>
      <div class="vp-bar">
        <div class="vp-ussr">苏 20</div>
        <div class="vp-track">
          <div class="vp-mid" />
          <div class={`vp-marker ${vp > 0 ? 'us' : vp < 0 ? 'ussr' : ''}`} style={{ left: `${pct}%` }}>{Math.abs(vp)}</div>
        </div>
        <div class="vp-us">美 20</div>
      </div>
      <div class="trk-sub">{vp === 0 ? '平' : vp > 0 ? `美国领先 ${vp}` : `苏联领先 ${-vp}`}</div>
    </div>
  );
}

function MilRow({ side, n, need }: { side: Side; n: number; need: number }) {
  return (
    <div class={`mil-row ${side.toLowerCase()}`}>
      <span class="mil-side">{side === 'US' ? '美' : '苏'}</span>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} class={`mil-cell${i <= n ? ' on' : ''}${i === need ? ' need' : ''}`} />
      ))}
      <span class="mil-n">{n}</span>
    </div>
  );
}

function SpaceRow({ side, n }: { side: Side; n: number }) {
  return (
    <div class={`space-row ${side.toLowerCase()}`}>
      <span class="mil-side">{side === 'US' ? '美' : '苏'}</span>
      {SPACE.slice(1).map((b, i) => (
        <span key={i} class={`space-cell${i + 1 <= n ? ' on' : ''}${b.perk ? ' perk' : ''}`} title={`${i + 1}. ${b.name}：行动点 ≥${b.ops}，掷 ≤${b.roll}，VP ${b.vp[0]}/${b.vp[1]}${b.perk ? `；特权：${b.perk}` : ''}`} />
      ))}
    </div>
  );
}

const FLAG_ZH: Partial<Record<keyof Flags, [string, number]>> = {
  containment: ['遏制政策：美 +1 行动点', 25],
  brezhnev: ['勃列日涅夫主义：苏 +1 行动点', 51],
  vietnamRevolts: ['越南起义：苏在东南亚 +1', 9],
  nuclearSubs: ['核潜艇', 41],
  salt: ['SALT：政变 -1', 43],
  iranContra: ['伊朗门：美调整 -1', 93],
  yuri: ['尤里和萨曼莎', 109],
  aldrichAmes: ['艾姆斯：美手牌公开', 98],
  northSeaOil8: ['北海油田：美 8 轮', 86],
  u2: ['U-2 事件', 60],
  wwby: ['我们将埋葬你们（待结算）', 50],
  quagmire: ['泥潭：美国被困', 42],
  bearTrap: ['熊陷阱：苏联被困', 44],
  nato: ['北约', 21],
  deGaulle: ['戴高乐：法国不受北约保护', 17],
  usJapan: ['美日防卫协定', 27],
  formosan: ['台湾决议', 35],
  willyBrandt: ['维利·勃兰特：西德不受北约保护', 55],
  flowerPower: ['花之力', 59],
  campDavid: ['戴维营协议', 65],
  johnPaul: ['约翰·保罗二世', 68],
  shuttle: ['穿梭外交', 73],
  iranianHostage: ['伊朗人质危机', 82],
  ironLady: ['铁娘子', 83],
  northSeaOil: ['北海油田', 86],
  reformer: ['改革者：苏不能在欧洲政变', 87],
  tearDownWall: ['推倒这堵墙', 96],
  evilEmpire: ['邪恶帝国', 97],
  norad: ['北美防空司令部', 106],
  awacs: ['向沙特出售预警机', 110],
  marshall: ['马歇尔计划', 23],
  warsawPact: ['华沙条约', 16],
};

export function Effects({ view, onCard }: { view: GameView; onCard: (id: number) => void }) {
  const f = view.flags;
  const chips: { text: string; card: number; cls: string }[] = [];
  for (const [k, v] of Object.entries(FLAG_ZH) as [keyof Flags, [string, number]][]) {
    if (!f[k]) continue;
    chips.push({ text: v[0], card: v[1], cls: CARDS[v[1]].side.toLowerCase() });
  }
  if (f.redScare?.length) for (const s of f.redScare) chips.push({ text: `${s === 'US' ? '红色恐慌：美' : '大清洗：苏'} -1 行动点`, card: 31, cls: s === 'US' ? 'ussr' : 'us' });
  if (f.cmc) chips.push({ text: `古巴导弹危机：${f.cmc === 'US' ? '美' : '苏'}政变即输`, card: 40, cls: 'warn' });
  if (f.lads) chips.push({ text: `拉美敢死队（${f.lads === 'US' ? '美' : '苏'}）`, card: 69, cls: f.lads.toLowerCase() });
  if (f.chernobyl) chips.push({ text: `切尔诺贝利：${REGION_ZH[f.chernobyl]}`, card: 94, cls: 'us' });
  if (f.missileEnvy) chips.push({ text: `导弹嫉妒：${f.missileEnvy === 'US' ? '美' : '苏'}须用行动点打出`, card: 49, cls: 'neutral' });
  if (!chips.length) return null;
  return (
    <div class="effects" data-tour="effects">
      {chips.map((c) => (
        <button type="button" key={c.text} class={`chip ${c.cls}`} onClick={() => onCard(c.card)}>
          {c.text}
        </button>
      ))}
    </div>
  );
}
