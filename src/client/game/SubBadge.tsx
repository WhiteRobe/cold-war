// 西欧 / 东欧徽记和战场国星章：地图方框和卡牌文字里共用，保持一致。
import { COUNTRY_LIST } from '../../data';
import { controller } from '../../engine/scoring';
import type { GameView } from '../../engine/view';

/** 战场国稳定度星章 */
export function STAR_PTS(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.55 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** 西欧 / 东欧标记：框左侧星章、右侧镰刀锤子 */
export function SubBadge({ x, y, kind }: { x: number; y: number; kind: 'w' | 'e' }) {
  return (
    <g class={`sub-badge ${kind}`} transform={`translate(${x},${y})`}>
      <circle r="6" />
      {kind === 'w' ? (
        <polygon points={STAR_PTS(0, 0.3, 4.2)} class="sb-glyph" />
      ) : (
        <>
          <path d="M-2.4,-3 A3.6,3.6 0 1 0 3,1.4 L1.9,0.9 A2.4,2.4 0 1 1 -1.5,-2.1Z" class="sb-glyph" />
          <line x1="-2.6" y1="2.8" x2="1.4" y2="-1.2" class="sb-line" />
          <line x1="0.2" y1="-2.4" x2="2.6" y2="0" class="sb-line" />
        </>
      )}
    </g>
  );
}

/** 卡牌文字里跟在「西欧」「东欧」后面的小徽记 */
export function SubIcon({ kind }: { kind: 'w' | 'e' }) {
  return (
    <svg class="sub-icon" viewBox="-6.6 -6.6 13.2 13.2" width="1em" height="1em" aria-hidden="true">
      <SubBadge x={0} y={0} kind={kind} />
    </svg>
  );
}

/** 卡牌说明排版：国家名加下划线（已被控制的用控制方颜色），「美国」「苏联」加粗红蓝，「西欧」「东欧」后接徽记 */
const NAMES = [...COUNTRY_LIST].sort((a, b) => b.zh.length - a.zh.length);
const BY_ZH = new Map(COUNTRY_LIST.map((c) => [c.zh, c.id]));
const TOKEN = new RegExp(`(${[...NAMES.map((c) => c.zh), '美国', '苏联', '西欧', '东欧'].map((n) => n.replace(/[/]/g, '\\/')).join('|')})`);

export function richCardText(text: string, view: GameView | null) {
  return text.split(TOKEN).map((part, i) => {
    if (part === '西欧' || part === '东欧') return <span key={i} class="sub-word">{part}<SubIcon kind={part === '西欧' ? 'w' : 'e'} /></span>;
    if (part === '美国') return <b key={i} class="ct-side us">美国</b>;
    if (part === '苏联') return <b key={i} class="ct-side ussr">苏联</b>;
    const id = BY_ZH.get(part);
    if (id) {
      const ctl = view ? controller(view as never, id) : null;
      return <span key={i} class={`ct-country${ctl ? ` ctl-${ctl.toLowerCase()}` : ''}`} title={ctl ? `${part}：${ctl === 'US' ? '美国' : '苏联'}控制` : part}>{part}</span>;
    }
    return part;
  });
}

/** 把文字里的「西欧」「东欧」后面接上对应徽记 */