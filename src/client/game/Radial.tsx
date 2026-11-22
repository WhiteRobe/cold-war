// 出牌菜单：点手牌后在牌的正上方弹出一列选项（事件 / 行动点 / 太空竞赛 → 放置 / 政变 / 调整），
// 鼠标只在手牌附近移动就能把一张牌打完。也支持数字键 1–4 选择、Esc 取消。
import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { CARDS, CHINA_CARD, type Side } from '../../data';
import { SPACE } from '../../engine/space';
import type { Choice, Decision } from '../../engine/types';
import type { GameView } from '../../engine/view';
import { effectiveOps } from './preview';

export interface RadialAnchor { card: number; x: number; top: number }

interface Petal { key: string; label: string; sub?: string; icon: Icon; cls?: string; run: () => void }
type Icon = 'event' | 'ops' | 'space' | 'influence' | 'coup' | 'realign' | 'back' | 'headline' | 'score' | 'first' | 'skip';

/** 实时决策里这些 tag 由出牌菜单接管显示 */
export const RADIAL_LIVE_TAGS = new Set(['mode', 'opsMode', 'order']);

function canSpace(v: GameView, me: Side, card: number) {
  if (card !== CHINA_CARD && CARDS[card].scoring) return null;
  const them: Side = me === 'US' ? 'USSR' : 'US';
  const next = v.space[me] + 1;
  if (next > 8) return null;
  const limit = v.space[me] >= 2 && v.space[them] < 2 ? 2 : 1;
  if (v.spaceAttempts[me] >= limit) return null;
  if (effectiveOps(v, me, card).ops < SPACE[next].ops) return null;
  return SPACE[next];
}

export function Radial({ view, anchor, d, onCommit, onLive, onCancel, detail }: {
  view: GameView;
  anchor: RadialAnchor;
  d?: Decision;
  /** 预选路径：先选牌，再自动回答后续的打法 / 行动方式 */
  onCommit: (path: Choice[]) => void;
  onLive: (v: Choice) => void;
  onCancel: () => void;
  /** 牌面详情，展开在轮盘旁边 */
  detail?: JSX.Element;
}) {
  const me = view.me!;
  const card = anchor.card;
  const def = CARDS[card];
  const [stage, setStage] = useState<'root' | 'ops'>('root');
  const live = !!d && RADIAL_LIVE_TAGS.has(d.tag) && d.kind === 'option';
  const ops = effectiveOps(view, me, card).ops;
  // 花之力生效：美国打战争牌（事件或行动点）苏联 +2 VP，太空竞赛除外
  const flower = me === 'US' && !!def.war && !!view.flags.flowerPower && !(d?.tag === 'headline');

  let petals: Petal[] = [];
  let title = def.zh;
  if (live) {
    title = d!.tag === 'order' ? '先执行哪一项？' : d!.tag === 'opsMode' ? `行动点 ${d!.ops?.total ?? ops}：做什么？` : '选择打法';
    const ICON: Record<string, Icon> = { event: 'event', ops: 'ops', space: 'space', influence: 'influence', coup: 'coup', realign: 'realign', eventFirst: 'event', opsFirst: 'first', skip: 'skip' };
    petals = d!.options.map((o) => ({ key: String(o.v), label: o.label ?? String(o.v), icon: ICON[String(o.v)] ?? 'ops', run: () => onLive(o.v) }));
  } else if (d?.tag === 'headline') {
    petals = [{ key: 'h', label: '作为头条', sub: def.scoring ? '计分' : '事件发动', icon: 'headline', cls: 'gold', run: () => onCommit([card]) }];
  } else if (def.scoring && card !== CHINA_CARD) {
    petals = [{ key: 's', label: '打出计分', sub: '立即结算该区域', icon: 'score', cls: 'gold', run: () => onCommit([card]) }];
  } else if (stage === 'root') {
    const fp = flower ? '花之力：苏联 +2 VP' : '';
    const own = def.side === me || def.side === 'NEUTRAL';
    const sp = canSpace(view, me, card);
    if (own && card !== CHINA_CARD) petals.push({ key: 'event', label: '事件', sub: fp || '发动牌上事件', icon: 'event', cls: fp ? 'warn' : 'gold', run: () => onCommit([card, 'event']) });
    petals.push({
      key: 'ops',
      label: `行动点 ${ops}`,
      sub: fp || (def.side !== 'NEUTRAL' && !own ? '对手事件也会发动' : card === CHINA_CARD ? '全用在亚洲 +1' : '放置 / 政变 / 调整'),
      icon: 'ops',
      cls: fp || (def.side !== 'NEUTRAL' && !own) ? 'warn' : '',
      run: () => setStage('ops'),
    });
    if (sp) petals.push({ key: 'space', label: '太空竞赛', sub: `掷 ≤${sp.roll} 成功${fp ? '，不触发花之力' : ''}`, icon: 'space', cls: 'violet', run: () => onCommit([card, 'space']) });
  } else {
    title = `行动点 ${ops}：做什么？`;
    petals = [
      { key: 'influence', label: '放置影响力', icon: 'influence', run: () => onCommit([card, 'ops', 'influence']) },
      { key: 'coup', label: '政变', icon: 'coup', cls: 'red', run: () => onCommit([card, 'ops', 'coup']) },
      { key: 'realign', label: '调整阵营', icon: 'realign', run: () => onCommit([card, 'ops', 'realign']) },
      { key: 'back', label: '返回', icon: 'back', cls: 'ghost', run: () => setStage('root') },
    ];
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (stage === 'ops') setStage('root');
        else if (!live) onCancel();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= petals.length) {
        e.preventDefault();
        petals[n - 1].run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // 纵向菜单：从选中的牌正上方往上叠，和牌左对齐；靠右边缘时右对齐
  const MW = 200;
  const left = Math.max(8, Math.min(window.innerWidth - MW - 8, anchor.x - MW / 2));
  const bottom = window.innerHeight - anchor.top + 10;
  // 详情放在菜单右侧，右边放不下就放左侧
  const DW = 290;
  const dx = left + MW + 12 + DW <= window.innerWidth - 8 ? left + MW + 12 : Math.max(8, left - 12 - DW);
  return (
    <>
      {!live && <div class="radial-backdrop" onClick={onCancel} />}
      {detail && <div class="radial-detail" style={{ left: `${dx}px`, bottom: `${bottom - 4}px` }}>{detail}</div>}
      <div class={`radial-menu${live ? ' live' : ''}`} style={{ left: `${left}px`, bottom: `${bottom}px`, width: `${MW}px` }} key={`${stage}-${live ? d!.tag : 'p'}`}>
        <div class="rm-title">{title}</div>
        {flower && !live && <div class="rm-warn">花之力生效中：用这张战争牌打事件或行动点，苏联 +2 VP；拿去太空竞赛不算</div>}
        {petals.map((p, i) => (
          <button type="button" key={p.key} class={`petal ${p.cls ?? ''}`} style={{ animationDelay: `${i * 0.035}s` }} onClick={(e) => { e.stopPropagation(); p.run(); }}>
            <PetalIcon k={p.icon} />
            <span class="pt-text">
              <span class="pt-label">{boldLabel(p.label)}</span>
              {p.sub && <span class="pt-sub">{p.sub}</span>}
            </span>
            <kbd>{i + 1}</kbd>
          </button>
        ))}
        {!live && <button type="button" class="rm-cancel" onClick={onCancel}>取消<kbd>Esc</kbd></button>}
        <span class="rm-arrow" style={{ left: `${Math.max(14, Math.min(MW - 14, anchor.x - left))}px` }} />
      </div>
    </>
  );
}

function PetalIcon({ k }: { k: Icon }) {
  const p: Record<Icon, JSX.Element> = {
    event: <polygon points="13,2 4,14 11,14 9,22 20,9 13,9 15,2" />,
    headline: <path d="M3,6h14v12H5a2,2 0 0 1-2-2zM17,9h4v8a1,1 0 0 1-2,0V9M6,9h8M6,12h8M6,15h5" fill="none" stroke="currentColor" stroke-width="1.8" />,
    score: <polygon points="12,2 14.6,8.6 21.5,9 16.2,13.4 18,20.2 12,16.4 6,20.2 7.8,13.4 2.5,9 9.4,8.6" />,
    ops: <g><rect x="3" y="12" width="7" height="7" /><rect x="14" y="12" width="7" height="7" /><rect x="8.5" y="4" width="7" height="7" /></g>,
    space: <path d="M12,2c4,3 5,8 4,13h-8c-1-5 0-10 4-13zM8,15l-3,4h4zM16,15l3,4h-4zM10,17h4l-2,5z" />,
    influence: <path d="M5,2v20M5,3h13l-3,4 3,4H5" fill="none" stroke="currentColor" stroke-width="2.2" />,
    coup: <path d="M2,16h20l-2,4H4zM6,11h10l2,5H5zM12,12h9v2h-9z" />,
    realign: <path d="M4,8h14l-3-3M20,16H6l3,3" fill="none" stroke="currentColor" stroke-width="2.2" />,
    back: <path d="M10,5L3,12l7,7M3,12h18" fill="none" stroke="currentColor" stroke-width="2.2" />,
    first: <path d="M5,4l12,8-12,8z" />,
    skip: <path d="M5,5l14,14M19,5L5,19" fill="none" stroke="currentColor" stroke-width="2.4" />,
  };
  return <svg class="pt-icon" viewBox="0 0 24 24" fill="currentColor">{p[k]}</svg>;
}

/** 选项文字里用 **…** 标出的部分加粗（如“入侵**巴基斯坦**”） */
export function boldLabel(s: string) {
  if (!s.includes('**')) return s;
  return s.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}
