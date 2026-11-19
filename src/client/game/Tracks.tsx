import { CARDS, REGION_ZH } from '../../data';
import { SPACE } from '../../engine/space';
import type { Flags, Side } from '../../engine/types';
import type { GameView } from '../../engine/view';
import { leadText, projectFinal } from './projection';

const PHASE_ZH = { setup: '开局布置', headline: '头条阶段', action: '行动轮', turnEnd: '回合结束', over: '对局结束' };

export function Tracks({ view, names, onPile }: { view: GameView; names: Record<Side, string>; onPile: (p: 'discard' | 'removed' | 'deck') => void }) {
  const era = view.turn <= 3 ? '早期' : view.turn <= 7 ? '中期' : '后期';
  return (
    <div class="tracks" data-tour="tracks">
      <div class="trk trk-turn has-pop">
        {view.me && <MeBadge me={view.me} />}
        <div class="trk-label">回合</div>
        <div class="trk-big">
          {view.turn}
          <small>/10</small>
        </div>
        <div class="trk-sub">
          冷战{era} · {PHASE_ZH[view.phase]}
          {view.phase === 'action' && ` ${view.ar}`}
        </div>
        <div class="trk-pop">
          <div class="pop-title">三个时期</div>
          <table class="pop-table">
            <thead><tr><th>时期</th><th>回合</th><th>手牌补到</th><th>每回合行动轮</th><th>牌库变化</th></tr></thead>
            <tbody>
              <tr class={view.turn <= 3 ? 'here' : ''}><td>冷战早期</td><td>1–3</td><td>8 张</td><td>6 轮</td><td>只有早期牌</td></tr>
              <tr class={view.turn >= 4 && view.turn <= 7 ? 'here' : ''}><td>冷战中期</td><td>4–7</td><td>9 张</td><td>7 轮</td><td>洗入中期牌</td></tr>
              <tr class={view.turn >= 8 ? 'here' : ''}><td>冷战后期</td><td>8–10</td><td>9 张</td><td>7 轮</td><td>洗入后期牌</td></tr>
            </tbody>
          </table>
          <div class="pop-note">
            每回合：DEFCON +1 → 补牌 → 头条 → 行动轮（苏联先）→ 查军事行动 → 手里留着计分卡直接判负 → 中国牌翻正。
            太空竞赛到第 8 格或打出北海油田，可多 1 轮。第 10 回合后终局计分。
          </div>
        </div>
      </div>
      <Defcon d={view.defcon} />
      <Vp vp={view.vp} view={view} />
      <div class="trk trk-mil has-pop" data-tour="milops">
        <div class="trk-label">军事行动（需 {view.defcon}）</div>
        <MilRow side="US" n={view.milops.US} need={view.defcon} />
        <MilRow side="USSR" n={view.milops.USSR} need={view.defcon} />
        <MilPop view={view} />
      </div>
      <div class="trk trk-space has-pop" data-tour="space">
        <div class="trk-label">太空竞赛</div>
        <SpaceRow side="US" n={view.space.US} />
        <SpaceRow side="USSR" n={view.space.USSR} />
        <SpacePop view={view} />
      </div>
      <div class="trk trk-cards">
        <div data-tour="china" class={`china has-pop ${view.china.holder.toLowerCase()}${view.china.faceUp ? '' : ' down'}`}>
          中国牌 · {view.china.holder === 'US' ? '美' : '苏'}
          {view.china.faceUp ? '' : '（背面）'}
          <div class="trk-pop china-pop">
            <div class="pop-title">中国牌（#6）</div>
            <div class="pop-note">
              现在在<b>{view.china.holder === 'US' ? '美国' : '苏联'}</b>手中，{view.china.faceUp ? '正面朝上，可以打出' : '背面朝上，本回合不能打出，回合结束翻回正面'}。
            </div>
            <ul class="pop-list">
              <li>4 行动点，全用在亚洲再 +1。</li>
              <li>打完翻面交给对手，本回合对手不能用。</li>
              <li>不能当头条，不占手牌，不会被弃；能拿去太空竞赛。</li>
              <li>终局时谁拿着谁 +1 VP。</li>
            </ul>
          </div>
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

/** 回合框右上角：你扮演的阵营 */
function MeBadge({ me }: { me: Side }) {
  return (
    <span class={`me-badge ${me.toLowerCase()}`} data-tip={me === 'US' ? '你扮演美国' : '你扮演苏联'}>
      <svg viewBox="-12 -12 24 24">
        {me === 'US' ? (
          <polygon points="0,-10 2.4,-3.3 9.5,-3.1 3.9,1.3 5.9,8.1 0,4.1 -5.9,8.1 -3.9,1.3 -9.5,-3.1 -2.4,-3.3" fill="#fff" />
        ) : (
          <g fill="#f5d76e">
            <path d="M-6.5,-5.5 A8.4,8.4 0 1 0 7.2,4.2 L5.3,3.1 A6.2,6.2 0 1 1 -4.2,-4.6Z" />
            <line x1="-6.8" y1="7.4" x2="3.2" y2="-2.6" stroke="#f5d76e" stroke-width="2.6" stroke-linecap="round" />
            <line x1="-0.4" y1="-6.2" x2="5.8" y2="0" stroke="#f5d76e" stroke-width="3" stroke-linecap="round" />
          </g>
        )}
      </svg>
    </span>
  );
}

function MilPop({ view }: { view: GameView }) {
  const need = view.defcon;
  const short = (s: 'US' | 'USSR') => Math.max(0, need - view.milops[s]);
  const su = short('US'), ss = short('USSR');
  const net = ss - su;
  return (
    <div class="trk-pop mil-pop">
      <div class="pop-title">军事行动</div>
      <ul class="pop-list">
        <li>回合结束时要攒够 <b>DEFCON 值</b>（现在 {need}）点，差几点对手就 +几 VP。</li>
        <li>怎么攒：用牌政变（按行动点算）、战争类事件、奇爱博士。</li>
        <li>不算：调整阵营、事件送的免费政变。</li>
        <li>每回合清零。</li>
      </ul>
      <div class="pop-note">
        美 {view.milops.US}/{need}{su ? `，差 ${su}` : ' ✓'}；苏 {view.milops.USSR}/{need}{ss ? `，差 ${ss}` : ' ✓'}。
        现在结算：{net > 0 ? `美国 +${net} VP` : net < 0 ? `苏联 +${-net} VP` : '谁都不扣'}。
      </div>
    </div>
  );
}

function Defcon({ d }: { d: number }) {
  const rows: [number, string][] = [
    [5, '没有限制'],
    [4, '欧洲禁止政变和调整阵营'],
    [3, '再加亚洲'],
    [2, '再加中东'],
    [1, '核战争：谁的行动轮谁输'],
  ];
  return (
    <div class="trk trk-defcon has-pop" data-tour="defcon">
      <div class="trk-pop defcon-pop">
        <div class="pop-title">DEFCON（核战争警戒等级）</div>
        <table class="pop-table">
          <tbody>
            {rows.map(([n, t]) => (
              <tr key={n} class={n === d ? 'here' : ''}><td><span class={`defcon-cell on d${n}`}>{n}</span></td><td>{t}</td></tr>
            ))}
          </tbody>
        </table>
        <ul class="pop-list">
          <li>每回合开始 +1。</li>
          <li>在战场国政变，不管成败 −1。</li>
          <li>有些事件会升降它。</li>
          <li>掉到 1 时<b>正在行动的一方</b>输，哪怕是对手的事件害的。</li>
        </ul>
      </div>
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

const LV_ZH = { none: '无', presence: '存在', domination: '支配', control: '控制' };

function Vp({ vp, view }: { vp: number; view: GameView }) {
  const pct = ((Math.max(-20, Math.min(20, vp)) + 20) / 40) * 100;
  const pj = projectFinal(view);
  const proj = pj.autoWin ? `${pj.autoWin === 'US' ? '美国' : '苏联'}控制欧洲 → 直接获胜` : leadText(pj.total);
  return (
    <div class="trk trk-vp has-pop" data-tour="vp">
      <div class="trk-label">胜利点</div>
      <div class="vp-bar">
        <div class="vp-ussr">苏 20</div>
        <div class="vp-track">
          <div class="vp-mid" />
          <div class={`vp-marker ${vp > 0 ? 'us' : vp < 0 ? 'ussr' : ''}`} style={{ left: `${pct}%` }}>{Math.abs(vp)}</div>
        </div>
        <div class="vp-us">美 20</div>
      </div>
      <div class="trk-sub">
        {vp === 0 ? '平' : vp > 0 ? `美国领先 ${vp}` : `苏联领先 ${-vp}`}
        <span class={`vp-proj ${pj.autoWin ? pj.autoWin.toLowerCase() : pj.total > 0 ? 'us' : pj.total < 0 ? 'ussr' : ''}`}> · 若现在终局：{proj}</span>
      </div>
      <div class="trk-pop">
        <div class="pop-title">若现在进行终局计分</div>
        <table class="pop-table">
          <thead><tr><th>项目</th><th class="us">美国</th><th class="ussr">苏联</th><th>净得</th></tr></thead>
          <tbody>
            <tr><td>当前胜利点</td><td colSpan={2} class="dim">（已含之前所有得分）</td><td>{leadShort(vp)}</td></tr>
            {pj.regions.map((r) => (
              <tr key={r.region}>
                <td>{REGION_ZH[r.region]}</td>
                <td>{LV_ZH[r.US.level]} {r.points.US}</td>
                <td>{LV_ZH[r.USSR.level]} {r.points.USSR}</td>
                <td>{r.autoWin ? '获胜' : leadShort(r.net)}</td>
              </tr>
            ))}
            <tr><td>中国牌</td><td colSpan={2} class="dim">持有者 +1（{view.china.holder === 'US' ? '美国' : '苏联'}）</td><td>{leadShort(pj.china)}</td></tr>
            <tr class="total"><td>合计</td><td colSpan={2} /><td>{pj.autoWin ? '欧洲控制获胜' : leadShort(pj.total)}</td></tr>
          </tbody>
        </table>
        <div class="pop-note">东南亚并入亚洲算。终局时控制欧洲直接获胜。</div>
      </div>
    </div>
  );
}

const leadShort = (n: number) => (n > 0 ? `美 +${n}` : n < 0 ? `苏 +${-n}` : '0');

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

function SpacePop({ view }: { view: GameView }) {
  const perkOwner = (box: number) => (view.space.US >= box && view.space.USSR < box ? '美国' : view.space.USSR >= box && view.space.US < box ? '苏联' : null);
  return (
    <div class="trk-pop space-pop">
      <div class="pop-title">太空竞赛规则</div>
      <div class="pop-note">
        弃一张行动点够的牌掷骰，点数够小就前进一格。每回合 1 次。牌上事件不发动，适合甩掉对手的坏牌。
        <br />
        先到拿高分，后到拿低分；特权归独自领先的一方。
      </div>
      <table class="pop-table">
        <thead><tr><th>格</th><th>名称</th><th>行动点</th><th>掷骰</th><th>VP 先/后</th><th>特权</th><th>位置</th></tr></thead>
        <tbody>
          {SPACE.slice(1).map((b, i) => {
            const n = i + 1;
            const here = [view.space.US === n ? '美' : '', view.space.USSR === n ? '苏' : ''].filter(Boolean).join(' ');
            const owner = b.perk ? perkOwner(n) : null;
            return (
              <tr key={n} class={here ? 'here' : ''}>
                <td>{n}</td>
                <td>{b.name}</td>
                <td>≥{b.ops}</td>
                <td>≤{b.roll}（{Math.round((b.roll / 6) * 100)}%）</td>
                <td>{b.vp[0]} / {b.vp[1]}</td>
                <td>{b.perk ? `${b.perk}${owner ? `（${owner}持有）` : ''}` : '—'}</td>
                <td>{here}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div class="pop-note">
        本回合已用：美 {view.spaceAttempts.US} 次，苏 {view.spaceAttempts.USSR} 次。
      </div>
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

export function Effects({ view, onPeek }: { view: GameView; onPeek: (id: number | null, el?: HTMLElement, now?: boolean) => void }) {
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
        <button
          type="button"
          key={c.text}
          class={`chip ${c.cls}`}
          onPointerEnter={(e) => onPeek(c.card, e.currentTarget as HTMLElement)}
          onPointerLeave={() => onPeek(null)}
          onClick={(e) => onPeek(c.card, e.currentTarget as HTMLElement, true)}
        >
          {c.text}
        </button>
      ))}
    </div>
  );
}
