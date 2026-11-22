// 西欧 / 东欧徽记和战场国星章：地图方框和卡牌文字里共用，保持一致。
import type { JSX } from 'preact';
import { CARDS, COUNTRY_LIST, byWorld } from '../../data';
import { EFFECTS } from '../../engine/effects';
import { refPeek } from './cardCtx';
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
// 国家名的匹配表依赖国家表（不死不休会加入中国、蒙古），世界变化时重算
const WORDS = byWorld(() => {
  const names = [...COUNTRY_LIST].sort((a, b) => b.zh.length - a.zh.length);
  return {
    byZh: new Map(COUNTRY_LIST.map((c) => [c.zh, c.id])),
    token: new RegExp(`(${[...names.map((c) => c.zh), '美国', '苏联', '西欧', '东欧'].map((n) => n.replace(/[/]/g, '\\/')).join('|')})`),
  };
});

/** 卡牌说明里的《卡名》（#编号）：阵营色下划线，悬停弹出那张卡；对局中标出它是否已经发生 */
function CardRef({ id, label, view }: { id: number; label: string; view: GameView | null }) {
  const def = CARDS[id];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const st = view ? (view.inPlay.includes(id) ? '已发生' : view.removed.includes(id) ? '已移出' : '') : '';
  return (
    <span
      class={`ct-card side-${def.side.toLowerCase()}`}
      onPointerEnter={(e) => {
        const { clientX: x, clientY: y } = e;
        clearTimeout(timer);
        timer = setTimeout(() => (refPeek.value = { id, x, y }), 300);
      }}
      onPointerLeave={() => {
        clearTimeout(timer);
        refPeek.value = null;
      }}
    >
      {label}
      {st && <small class={`ct-st ${st === '已发生' ? 'on' : 'off'}`}>{st}</small>}
    </span>
  );
}

/** 这张卡现在能否作为事件发动（只对有前提 / 会被阻止的卡给出结论） */
export function eventReady(view: GameView | null, id: number): boolean | null {
  const eff = EFFECTS[id];
  if (!view || !view.me || !eff?.can || CARDS[id].scoring) return null;
  const def = CARDS[id];
  const exec = def.side === 'NEUTRAL' ? view.me : def.side;
  try {
    return !!eff.can({ s: view } as never, exec, view.me);
  } catch {
    return null;
  }
}

/** 说明里讲“前提 / 被阻止”的句子 */
const GATE = /(才能将此牌作为事件打出|不能再使用此事件|阻止或取消此事件|阻止此事件|取消此事件)/;
const REF = /(《[^》]+》（#\d+）)/;

function inline(text: string, view: GameView | null, key: string) {
  return text.split(REF).flatMap((seg, si) => {
    const m = seg.match(/^《([^》]+)》（#(\d+)）$/);
    if (m) return [<CardRef key={`${key}r${si}`} id={Number(m[2])} label={`《${m[1]}》`} view={view} />];
    return seg.split(WORDS().token).map((part, i) => {
      const k = `${key}-${si}-${i}`;
      if (part === '西欧' || part === '东欧') return <span key={k} class="sub-word">{part}<SubIcon kind={part === '西欧' ? 'w' : 'e'} /></span>;
      if (part === '美国') return <b key={k} class="ct-side us">美国</b>;
      if (part === '苏联') return <b key={k} class="ct-side ussr">苏联</b>;
      const cid = WORDS().byZh.get(part);
      if (cid) {
        const ctl = view ? controller(view as never, cid) : null;
        return <span key={k} class={`ct-country${ctl ? ` ctl-${ctl.toLowerCase()}` : ''}`} title={ctl ? `${part}：${ctl === 'US' ? '美国' : '苏联'}控制` : part}>{part}</span>;
      }
      return part;
    });
  });
}

/** 卡牌说明排版：计分卡首句单独一行；国家名下划线（被控制按控制方着色）；「美国」「苏联」加粗红蓝；
 *  「西欧」「东欧」后接徽记；《卡名》可悬停查看；对局中标出这张卡现在能否作为事件发动 */
export function richCardText(text: string, view: GameView | null, id?: number) {
  const out: JSX.Element[] = [];
  let rest = text;
  const head = rest.match(/^(存在：[^。]+。)/);
  if (head) {
    out.push(<div key="rule" class="ct-rule">{head[1]}</div>);
    rest = rest.slice(head[1].length);
  }
  const ready = id !== undefined ? eventReady(view, id) : null;
  // 按句号切句，讲前提 / 阻止的句子在“现在还不能发动”时划掉
  const sentences = rest.split(/(?<=。)/).filter(Boolean);
  sentences.forEach((sen, i) => {
    const gated = GATE.test(sen) && ready === false;
    out.push(<span key={`s${i}`} class={gated ? 'ct-gated' : undefined}>{inline(sen, view, `s${i}`)}</span>);
  });
  if (ready !== null) {
    out.push(<div key="ready" class={`ct-ready ${ready ? 'ok' : 'no'}`}>{ready ? '✓ 现在可以作为事件发动' : '✗ 现在还不能作为事件发动'}</div>);
  }
  return out;
}

/** 把文字里的「西欧」「东欧」后面接上对应徽记 */