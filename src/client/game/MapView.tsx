import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { COUNTRIES, COUNTRY_LIST, REGIONS, REGION_ZH, countriesIn, type RegionId, type Side } from '../../data';
import type { SubRegionId } from '../../data/types';
import { controller, scoreRegion, scoreSEA } from '../../engine/scoring';
import type { GameView } from '../../engine/view';
import { WORLD } from './worldmap.gen';
import { remapX, remapY } from '../../data/layout';
import { Flag, FogLayer, FxLayer, Tank, useMapFx } from './MapFx';
import { countryMarks, type CardKind } from './countryCards';
import { STAR_PTS, SubBadge } from './SubBadge';
import { SpaceArsenal } from './SpaceArsenal';

export const MAP_W = 1880;
export const MAP_H = 1090;
const S = 1.5;
const BW = 58;
const BH = 40;

/** 地图上的简称（最多 4 个字） */
const SHORT: Record<string, string> = {
  benelux: '比荷卢', spainPortugal: '西葡', czechoslovakia: '捷克', saudiArabia: '沙特', laosCambodia: '老柬',
  indonesia: '印尼', westAfricanStates: '西非', saharanStates: '撒哈拉',
  seAfricanStates: '东南非', dominicanRep: '多米尼加', gulfStates: '海湾国家',
};

/** 原始坐标里挤在一起的方框，南北拉开一点，让中间的连线露出来（1500 宽坐标系） */
const NUDGE: Record<string, [number, number]> = {
  guatemala: [0, -4],
  elSalvador: [0, 5],
  honduras: [0, 5],
  nicaragua: [0, 5],
  costaRica: [0, 14],
  panama: [0, 14],
};

export const pos = (id: string): [number, number] => {
  if (id === 'usa') return [remapX(85) * S, 230 * S];
  if (id === 'ussr') return [remapX(635) * S, remapY(635, 112) * S];
  const p = COUNTRIES[id].pos;
  const [dx, dy] = NUDGE[id] ?? [0, 0];
  return [remapX(p[0] + dx) * S, remapY(p[0] + dx, p[1] + dy) * S];
};

/** 1500 宽坐标系下的横坐标按同样规则重排（区域标签等手摆位置用） */
const rx = (x: number) => remapX(x / S) * S;
/** 同上，纵坐标按所在列拉伸（x 传重排前的值） */
const ry = (x: number, y: number) => remapY(x / S, y / S) * S;

/** 区域标识色与图标：方框边缘色条 + 挂件 */
export const REGION_COLOR: Record<RegionId, string> = {
  europe: '#6d7490', asia: '#c9962a', middleEast: '#5f8f3a', africa: '#b24d93', centralAmerica: '#2f9c95', southAmerica: '#7072c4',
};


/** 方框名称条：按区域着色（比标识色深一些，保证白字清楚） */
function bandFill(c: { region: RegionId; sub: string[] }) {
  if (c.sub.includes('southeastAsia')) return 'url(#bandSEA)';
  return BAND_COLOR[c.region];
}

const BAND_COLOR: Record<RegionId, string> = {
  europe: '#5b6177', asia: '#9a6f16', middleEast: '#4a7429', africa: '#8b3a72', centralAmerica: '#22796f', southAmerica: '#55569f',
};

const GLYPH: Record<string, string> = {
  europe: 'M-4,4L-4,-2L-3,-2L-3,-4.5L-1,-4.5L-1,-2L1,-2L1,-4.5L3,-4.5L3,-2L4,-2L4,4Z',
  asia: 'M-5.5,-0.5L0,-5L5.5,-0.5L3,-0.5L3,4L1,4L1,1.5L-1,1.5L-1,4L-3,4L-3,-0.5Z',
  southeastAsia: 'M-0.6,4L0,-1.5L0.6,4ZM0,-1.5L-5,-0.5L-3,-3L0,-2.2L-2,-4.8L0.5,-2.6L3,-4.5L1.2,-2L5,-1.2Z',
  middleEast: 'M2.5,-4.2A4.6,4.6,0,1,0,2.5,4.2A3.6,3.6,0,1,1,2.5,-4.2Z',
  africa: 'M-5.5,-1.5L-2.5,-4L2.5,-4L5.5,-1.5L2,-0.5L-2,-0.5ZM-0.7,-0.5L0.7,-0.5L0.7,4.2L-0.7,4.2Z',
  centralAmerica: 'M-5,4L-5,2L-3.3,2L-3.3,0L-1.6,0L-1.6,-2L-0.8,-2L-0.8,-4L0.8,-4L0.8,-2L1.6,-2L1.6,0L3.3,0L3.3,2L5,2L5,4Z',
  southAmerica: 'M-5.5,4L-1.8,-3.5L0.3,0L2,-2L5.5,4Z',
};

export function RegionGlyph({ region, x, y, r = 7, sub }: { region: RegionId; x: number; y: number; r?: number; sub?: boolean }) {
  return (
    <g class="region-glyph" transform={`translate(${x},${y})`}>
      <circle r={r} fill={REGION_COLOR[region]} stroke="#1f1a10" stroke-width="1" />
      <path d={GLYPH[sub ? 'southeastAsia' : region]} fill="#fff8e6" transform={`scale(${r / 7})`} />
    </g>
  );
}

/** DEFCON 锁住的区域（双方都不能政变 / 调整） */
export function defconLocked(defcon: number, region: RegionId): boolean {
  return (defcon <= 4 && region === 'europe') || (defcon <= 3 && region === 'asia') || (defcon <= 2 && region === 'middleEast');
}

/** 我方不能对这个国家政变 / 调整的原因（与引擎 canTarget 一致，不看对方影响力） */
function coupLock(view: GameView, id: string): string | null {
  const c = COUNTRIES[id];
  if (defconLocked(view.defcon, c.region)) return `DEFCON ${view.defcon}：${REGION_ZH[c.region]}禁止政变和调整阵营`;
  if (view.me !== 'USSR') return null;
  const f = view.flags;
  if (f.usJapan && id === 'japan') return '美日共同防卫协定：苏联不能对日本政变或调整';
  if (f.nato && c.region === 'europe' && controller(view as never, id) === 'US' && !(id === 'france' && f.deGaulle) && !(id === 'westGermany' && f.willyBrandt)) return '北约：苏联不能对美国控制的欧洲国家政变或调整';
  if (f.reformer && c.region === 'europe') return '改革者：苏联不能在欧洲政变';
  return null;
}

/** 两色按比例混合（t 为 b 的占比） */
function mix(a: string, b: string, t: number) {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(p(a, i) * (1 - t) + p(b, i) * t).toString(16).padStart(2, '0')).join('');
}
const PAPER = '#ece3cc';
/** 底图配色：与国家方框的区域色同色相的浅色调，每个国家在三个相邻色阶里取一个，做出分面感 */
const tints = (c: string, t = 0.6, paper = PAPER) => [mix(c, paper, t), mix(c, paper, t + 0.03), mix(c, paper, t - 0.03)];
// 欧洲的区域色是石板灰，和暖纸色一混就发灰、跟中国撞色；改跟冷蓝纸色混，读出蓝灰调
const COOL_PAPER = '#d6e0f2';
const LAND: Record<string, string[]> = {
  europe: tints(BAND_COLOR.europe, 0.55, COOL_PAPER),
  asia: tints(BAND_COLOR.asia),
  middleEast: tints(BAND_COLOR.middleEast),
  africa: tints(BAND_COLOR.africa),
  centralAmerica: tints(BAND_COLOR.centralAmerica),
  southAmerica: tints(BAND_COLOR.southAmerica),
  // 不属于游戏国家的地区：归到最近的区域，用更浅一档
  ...Object.fromEntries(Object.entries(BAND_COLOR).map(([k, c]) => [`${k}-x`, tints(c, 0.72, k === 'europe' ? COOL_PAPER : PAPER)])),
  usa: ['#6f8fb2'],
  ussr: ['#b8786c'],
  china: ['#8c806b'],
  other: ['#c9c0ab', '#c2b9a3', '#cfc6b2'],
};

const CHINA_PATHS = WORLD.filter((w) => w.kind === 'china').map((w) => w.d);

function shade(id: string, kind: string) {
  const list = LAND[kind] ?? LAND.other;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

interface Props {
  view: GameView;
  selectable: Set<string>;
  onPick: (id: string) => void;
  /** 最近有变化的国家（高亮一下） */
  flash: Set<string>;
  onRegion?: (r: RegionId) => void;
  /** 正在掷骰的目标国（脉冲高亮） */
  focus?: string;
  /** 点了国家右下角的闪电：列出点名该国的卡 */
  onBolt?: (id: string, x: number, y: number, now?: boolean, kind?: CardKind) => void;
  onBoltLeave?: () => void;
}

export function MapView({ view, selectable, onPick, flash, onRegion, focus, onBolt, onBoltLeave }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const { fx, fresh, regionCtl } = useMapFx(view);
  const [zoom, setZoom] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; zx: number; zy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const bg = useMemo(
    () => (
      <g class="map-bg">
        {WORLD.map((w, i) => (
          <path key={i} d={w.d} fill={shade(w.id, w.kind)} class={`land k-${w.kind}`} />
        ))}
        <text class="land-label" x={rx(1225)} y="400">中 国</text>
      </g>
    ),
    [],
  );

  // 中国牌在谁手里，中国本土就染上谁的光晕（背面朝上暂不能用时淡一些）
  const chinaGlow = (
    <g class={`china-glow china-${view.china.holder.toLowerCase()}${view.china.faceUp ? '' : ' facedown'}`}>
      <title>中国牌在{view.china.holder === 'US' ? '美国' : '苏联'}手中{view.china.faceUp ? '' : '（背面朝上，本回合不能用）'}</title>
      {CHINA_PATHS.map((d, i) => <path key={i} d={d} />)}
    </g>
  );

  const edges = useMemo(() => {
    const out: { a: string; b: string; inter: boolean }[] = [];
    for (const c of COUNTRY_LIST) {
      for (const a of c.adj) {
        if (a === 'usa' || a === 'ussr') {
          out.push({ a: c.id, b: a, inter: true });
          continue;
        }
        if (a < c.id) continue;
        out.push({ a: c.id, b: a, inter: COUNTRIES[a].region !== c.region });
      }
    }
    return out;
  }, []);

  /** 把连线裁到两个方框之外；间隙太小的连线另画一个“锁扣”标记，保证看得见 */
  const clipped = useMemo(
    () =>
      edges
        .filter(({ b }) => b !== 'usa' && b !== 'ussr')
        .map(({ a, b, inter }) => {
          const [x1, y1] = pos(a), [x2, y2] = pos(b);
          const dx = x2 - x1, dy = y2 - y1;
          const t = Math.min(dx ? BW / 2 / Math.abs(dx) : Infinity, dy ? BH / 2 / Math.abs(dy) : Infinity);
          const sx = x1 + dx * t, sy = y1 + dy * t, ex = x2 - dx * t, ey = y2 - dy * t;
          const gap = Math.hypot(ex - sx, ey - sy) * (t < 0.5 ? 1 : -1);
          return { a, b, inter, sx, sy, ex, ey, gap, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
        }),
    [edges],
  );

  const lines = useMemo(
    () =>
      edges.map(({ a, b, inter }) => {
        let [x1, y1] = pos(a);
        let [x2, y2] = pos(b);
        // 日本与美国：从日本向右画出地图边缘
        if (a === 'japan' && b === 'usa') {
          x2 = MAP_W - 4;
          y2 = y1;
        }
        const sp = b === 'usa' || b === 'ussr';
        return (
          <line
            key={a + b}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            class={`edge${inter ? ' inter' : ''}${sp ? ` sp-${b}` : ''}`}
          />
        );
      }).concat(
        // 另一半：美国向左通到地图左边缘（太平洋两岸相连）
        edges.some(({ a, b }) => a === 'japan' && b === 'usa')
          ? [<line key="usa-wrap" x1={pos('usa')[0]} y1={pos('usa')[1]} x2={4} y2={pos('usa')[1]} class="edge inter sp-usa" />]
          : [],
      ),
    [edges],
  );

  // 平移 / 缩放过程中直接改 SVG 的 viewBox（每帧一次），手势结束后再写回状态，
  // 避免每次指针移动都重绘整张地图造成闪烁
  const live = useRef(zoom);
  const raf = useRef(0);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panning = useRef(false);
  useEffect(() => {
    live.current = zoom;
  }, [zoom]);
  const apply = (z: { x: number; y: number; k: number }) => {
    live.current = z;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const v = live.current;
      svgRef.current?.setAttribute('viewBox', `${v.x} ${v.y} ${MAP_W / v.k} ${MAP_H / v.k}`);
    });
  };
  const startGesture = () => {
    if (panning.current) return;
    panning.current = true;
    wrapRef.current?.classList.add('panning');
    setHover(null);
  };
  const endGesture = (delay = 0) => {
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      panning.current = false;
      wrapRef.current?.classList.remove('panning');
      setZoom({ ...live.current });
    }, delay);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * MAP_W;
    const my = ((e.clientY - r.top) / r.height) * MAP_H;
    const z = live.current;
    const k = Math.min(4, Math.max(1, z.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    // 保持鼠标下的点不动
    const wx = z.x + mx / z.k, wy = z.y + my / z.k;
    startGesture();
    apply(clampZoom({ k, x: wx - mx / k, y: wy - my / k }));
    endGesture(180);
  };

  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; k: number } | null>(null);
  const onDown = (e: PointerEvent) => {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), k: live.current.k };
      if (drag.current) drag.current.moved = true;
      startGesture();
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, zx: live.current.x, zy: live.current.y, moved: false };
  };
  const onMove = (e: PointerEvent) => {
    if (pts.current.has(e.pointerId)) pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      const r = svgRef.current!.getBoundingClientRect();
      const mx = (((a.x + b.x) / 2 - r.left) / r.width) * MAP_W;
      const my = (((a.y + b.y) / 2 - r.top) / r.height) * MAP_H;
      const k = Math.min(4, Math.max(1, (pinch.current.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist));
      const z = live.current;
      const wx = z.x + mx / z.k, wy = z.y + my / z.k;
      apply(clampZoom({ k, x: wx - mx / k, y: wy - my / k }));
      return;
    }
    const d = drag.current;
    if (!d || live.current.k === 1) return;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) <= 4) return;
      d.moved = true;
      startGesture();
      try { svgRef.current?.setPointerCapture(e.pointerId); } catch { /* 忽略 */ }
    }
    const r = svgRef.current!.getBoundingClientRect();
    const k = live.current.k;
    const dx = ((e.clientX - d.x) / r.width) * MAP_W / k;
    const dy = ((e.clientY - d.y) / r.height) * MAP_H / k;
    apply(clampZoom({ k, x: d.zx - dx, y: d.zy - dy }));
  };
  const onUp = (e: PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
    if (panning.current && pts.current.size === 0) endGesture();
    setTimeout(() => (drag.current = null), 0);
  };
  const onHover = (id: string | null) => {
    if (!panning.current) setHover(id);
  };

  const vb = `${zoom.x} ${zoom.y} ${MAP_W / zoom.k} ${MAP_H / zoom.k}`;

  return (
    <div class="map-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        class="map"
        viewBox={vb}
        onWheel={onWheel}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <defs>
          <pattern id="bandSEA" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#9a6f16" />
            <rect width="3.5" height="8" fill="#6e4f0d" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={MAP_W} height={MAP_H} class="ocean" />
        <MapGrid />
        {bg}
        {chinaGlow}
        <FogLayer view={view} fresh={fresh} pos={pos} />
        <PactOverlay view={view} />
        <g class="edges">{lines}</g>
        <SpyLinks view={view} />
        {REGIONS.map((r) => (
          <RegionLabel key={r} region={r} view={view} onClick={() => onRegion?.(r)} />
        ))}
        <Superpower id="usa" />
        <Superpower id="ussr" />
        <SpaceArsenal view={view} />
        <text x={MAP_W - 8} y={pos('japan')[1] + 38} class="edge-label" text-anchor="end">→ 美国</text>
        <text x={8} y={pos('usa')[1] - 10} class="edge-label">日本 ←</text>
        {COUNTRY_LIST.map((c) => (
          <CountryBox
            key={c.id}
            id={c.id}
            view={view}
            selectable={selectable.has(c.id)}
            dimmed={selectable.size > 0 && !selectable.has(c.id)}
            adjHl={!!hover && COUNTRIES[hover].adj.includes(c.id)}
            flash={flash.has(c.id)}
            onPick={() => !drag.current?.moved && selectable.has(c.id) && onPick(c.id)}
            onHover={onHover}
            marks={countryMarks(view, c.id)}
            onBolt={(x, y, now, kind) => onBolt?.(c.id, x, y, now, kind)}
            onBoltLeave={() => onBoltLeave?.()}
          />
        ))}
        <WarLinks view={view} />
        <g class="links">
          {clipped.filter((e) => e.gap < 14).map((e) => (
            <g key={e.a + e.b} class={`link${hover && (e.a === hover || e.b === hover) ? ' hl' : ''}`} transform={`translate(${e.mx},${e.my})`}>
              <rect x="-6" y="-3" width="12" height="6" rx="3" />
              <line x1="-3" y1="0" x2="3" y2="0" />
            </g>
          ))}
        </g>
        {hover && (
          <g class="hover-edges">
            {clipped.filter((e) => (e.a === hover || e.b === hover) && e.gap >= 14).map((e) => (
              <line key={e.a + e.b} x1={e.sx} y1={e.sy} x2={e.ex} y2={e.ey} />
            ))}
            {COUNTRIES[hover].adj.filter((x) => x === 'usa' || x === 'ussr').map((x) => {
              const [x1, y1] = pos(hover);
              let [x2, y2] = pos(x);
              if (hover === 'japan') { x2 = MAP_W - 4; y2 = y1; }
              return <line key={x} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
        )}
        {focus && COUNTRIES[focus] && (
          <g class="roll-focus" key={focus}>
            <circle cx={pos(focus)[0]} cy={pos(focus)[1]} r="34" />
            <circle cx={pos(focus)[0]} cy={pos(focus)[1]} r="34" class="r2" />
          </g>
        )}
        <FxLayer fx={fx} pos={pos} />
        {regionCtl && (
          <g class={`rc-wave rc-${regionCtl.side.toLowerCase()}`} key={regionCtl.key}>
            {countriesIn(regionCtl.region).map((c, i) => (
              <circle key={c.id} cx={pos(c.id)[0]} cy={pos(c.id)[1]} r="20" style={{ animationDelay: `${0.15 + (i % 7) * 0.08}s` }} />
            ))}
          </g>
        )}
      </svg>
      {regionCtl && <RegionCtlBanner key={regionCtl.key} region={regionCtl.region} side={regionCtl.side} />}
      <WinAlerts view={view} />
      <div class="map-zoom">
        <button type="button" onClick={() => setZoom(clampZoom({ ...live.current, k: Math.min(4, live.current.k * 1.3) }))}>＋</button>
        <button type="button" onClick={() => setZoom({ x: 0, y: 0, k: 1 })}>⟲</button>
        <button type="button" onClick={() => setZoom(clampZoom({ ...live.current, k: Math.max(1, live.current.k / 1.3) }))}>－</button>
      </div>
      {hover && <CountryTip id={hover} view={view} />}
    </div>
  );
}

function clampZoom(z: { x: number; y: number; k: number }) {
  const w = MAP_W / z.k, h = MAP_H / z.k;
  return { k: z.k, x: Math.max(0, Math.min(MAP_W - w, z.x)), y: Math.max(0, Math.min(MAP_H - h, z.y)) };
}

function MapGrid() {
  const ls = [];
  for (let x = 75; x < MAP_W; x += 75) ls.push(<line key={'x' + x} x1={x} y1={0} x2={x} y2={MAP_H} />);
  for (let y = 75; y < MAP_H; y += 75) ls.push(<line key={'y' + y} x1={0} y1={y} x2={MAP_W} y2={y} />);
  return <g class="map-grid">{ls}</g>;
}

function Superpower({ id }: { id: 'usa' | 'ussr' }) {
  const [x, y] = pos(id);
  const hex = `${x - 64},${y - 26} ${x + 64},${y - 26} ${x + 74},${y} ${x + 64},${y + 26} ${x - 64},${y + 26} ${x - 74},${y}`;
  if (id === 'usa') {
    // 与苏联同款：纯色六边形 + 左侧徽记 + 顶上国会大厦穹顶
    const ring = Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      return <polygon key={k} points={STAR_PTS(Math.cos(a) * 8.2, Math.sin(a) * 8.2, 2)} fill="#f5d76e" />;
    });
    return (
      <g class="superpower sp-usa">
        {/* 国会大厦穹顶 */}
        <polygon points={`${x - 22},${y - 26} ${x - 22},${y - 32} ${x + 22},${y - 32} ${x + 22},${y - 26}`} fill="#d9d2bf" stroke="#7d7564" stroke-width="1" />
        <polygon points={`${x - 13},${y - 32} ${x - 13},${y - 38} ${x + 13},${y - 38} ${x + 13},${y - 32}`} fill="#e9e3d2" stroke="#7d7564" stroke-width="1" />
        <polygon points={`${x - 12},${y - 38} ${x - 9},${y - 46} ${x - 4},${y - 50} ${x + 4},${y - 50} ${x + 9},${y - 46} ${x + 12},${y - 38}`} fill="#f1ecdf" stroke="#7d7564" stroke-width="1" />
        <polygon points={`${x - 2},${y - 50} ${x - 1.5},${y - 56} ${x + 1.5},${y - 56} ${x + 2},${y - 50}`} fill="#d9d2bf" />
        <polygon points={STAR_PTS(x, y - 61, 5.5)} fill="#f5d76e" stroke="#7d6418" stroke-width="0.8" />
        <polygon points={hex} fill="#24447a" />
        <polygon points={`${x - 74},${y} ${x - 64},${y - 26} ${x + 64},${y - 26} ${x + 74},${y}`} fill="#2d5291" />
        {/* 底部一道红白细条呼应星条旗 */}
        <polygon points={`${x - 69},${y + 14} ${x + 69},${y + 14} ${x + 67},${y + 18} ${x - 67},${y + 18}`} fill="#b8231c" opacity="0.85" />
        <polygon points={`${x - 67},${y + 18} ${x + 67},${y + 18} ${x + 66},${y + 20} ${x - 66},${y + 20}`} fill="#efe6d0" opacity="0.7" />
        <polygon points={hex} class="sp-frame" />
        <g transform={`translate(${x - 46},${y - 1})`} class="sp-emblem">
          {ring}
          <polygon points={STAR_PTS(0, 0, 4.6)} fill="#f5d76e" />
        </g>
        <text x={x + 14} y={y + 7.5}>美 国</text>
      </g>
    );
  }
  return (
    <g class="superpower sp-ussr">
      {/* 克里姆林宫塔楼与红星 */}
      <polygon points={`${x - 9},${y - 26} ${x - 9},${y - 40} ${x - 5},${y - 44} ${x},${y - 58} ${x + 5},${y - 44} ${x + 9},${y - 40} ${x + 9},${y - 26}`} fill="#8f2c23" stroke="#5c1a14" stroke-width="1.2" />
      <polygon points={`${x - 4},${y - 26} ${x - 4},${y - 34} ${x + 4},${y - 34} ${x + 4},${y - 26}`} fill="#f5d76e" opacity="0.7" />
      <polygon points={STAR_PTS(x, y - 63, 6.5)} fill="#ff3b30" stroke="#f5d76e" stroke-width="1.2" />
      <polygon points={hex} fill="#b8231c" />
      <polygon points={`${x - 74},${y} ${x - 64},${y - 26} ${x + 64},${y - 26} ${x + 74},${y}`} fill="#c9302a" />
      <polygon points={hex} class="sp-frame" />
      {/* 镰刀锤子与金星 */}
      <g transform={`translate(${x - 46},${y + 1}) scale(1.6)`} class="sp-emblem">
        <polygon points={STAR_PTS(0, -10, 3.4)} fill="none" stroke="#f5d76e" stroke-width="0.9" />
        <path d="M-4.6,-4.4 A6.4,6.4 0 1 0 5.4,2.6 L3.8,1.8 A4.6,4.6 0 1 1 -2.8,-3.2Z" fill="#f5d76e" />
        <line x1="-5" y1="5.6" x2="2.6" y2="-2" stroke="#f5d76e" stroke-width="2" stroke-linecap="round" />
        <line x1="0.2" y1="-4.4" x2="4.8" y2="0.2" stroke="#f5d76e" stroke-width="2.2" stroke-linecap="round" />
      </g>
      <text x={x + 14} y={y + 7.5}>苏 联</text>
    </g>
  );
}

/** 石油输出国组织（#61）计分的产油国 */
/** 穆斯林革命（#56）可选的国家 */
const LV_ZH = { none: '—', presence: '存在', domination: '支配', control: '控制' };
const SCORING_CARD: Record<string, number> = { asia: 1, europe: 2, middleEast: 3, centralAmerica: 37, southeastAsia: 38, africa: 79, southAmerica: 81 };

/** 本回合已经计过分（计分卡进了弃牌堆，本回合摸不回来）；东南亚计分卡打出后直接移出游戏 */
function scoredNote(view: GameView, region: string): string | null {
  const card = SCORING_CARD[region];
  const name = region === 'southeastAsia' ? '东南亚' : REGION_ZH[region as RegionId];
  if (region === 'southeastAsia' && view.removed.includes(card)) return '东南亚计分已打出并移出游戏，之后不会再单独计分（终局时并入亚洲）';
  const p = (view.plays ?? []).find((x) => x.card === card && x.turn === view.turn);
  if (!p) return null;
  return `${name}本回合已计分（${p.side === 'US' ? '美国' : '苏联'}打出），计分卡在弃牌堆，本回合不会再计分`;
}

function ScoredMark({ x, y, note }: { x: number; y: number; note: string }) {
  return (
    <g class="scored-mark" transform={`translate(${x},${y})`}>
      <title>{note}</title>
      <circle r="8" />
      <path d="M-4,0 l2.8,3 l5.2,-6" />
    </g>
  );
}

const EUROPE_WIN = '欧洲控制即胜：打出「欧洲计分」或第 10 回合终局计分时，若一方控制欧洲（占全部战场国，且控制的国家数多于对手），这一方直接获胜，不再比胜利点。';

/** 整洲达到控制：地图中央横幅 + 阵营色闪光 */
function RegionCtlBanner({ region, side }: { region: RegionId; side: Side }) {
  return (
    <div class={`rc-banner-wrap rc-${side.toLowerCase()}`}>
      <div class="rc-flash" />
      <div class="rc-banner">
        <div class="rc-title">{side === 'US' ? '美国' : '苏联'}控制{REGION_ZH[region]}</div>
        <div class="rc-sub">{region === 'europe' ? '打出欧洲计分或终局计分时直接获胜' : '该洲计分按「控制」级结算'}</div>
      </div>
    </div>
  );
}

/** 地图右上角：当前存在的直接获胜 / 直接判负威胁 */
function WinAlerts({ view }: { view: GameView }) {
  if (view.phase === 'over' || view.phase === 'setup') return null;
  const items: { key: string; cls: string; text: string; tip: string }[] = [];
  const eu = scoreRegion(view as never, 'europe').autoWin;
  if (eu) items.push({ key: 'eu', cls: eu.toLowerCase(), text: `${eu === 'US' ? '美国' : '苏联'}控制欧洲：打出欧洲计分即获胜`, tip: EUROPE_WIN });
  const a = Math.abs(view.vp);
  if (a >= 15) {
    const sd = view.vp > 0 ? '美国' : '苏联';
    items.push({ key: 'vp', cls: view.vp > 0 ? 'us' : 'ussr', text: `${sd} ${a} VP：再得 ${20 - a} 分直接获胜`, tip: '任何时候胜利点达到 20，这一方立即获胜。' });
  }
  if (view.defcon === 2) items.push({ key: 'dc', cls: 'warn', text: 'DEFCON 2：再降一级，行动方直接输', tip: '在战场国政变或某些事件会让 DEFCON 降到 1，引发核战争；输的是当时正在行动的一方，哪怕是对手的事件。' });
  if (!items.length) return null;
  return (
    <div class="win-alerts">
      {items.map((it) => (
        <div key={it.key} class={`wa-item wa-${it.cls}`} title={it.tip}>
          <span class="wa-icon">!</span>
          {it.text}
        </div>
      ))}
    </div>
  );
}

function RegionLabel({ region, view, onClick }: { region: RegionId; view: GameView; onClick: () => void }) {
  const anchor: Record<RegionId, [number, number]> = {
    // 标签放在各洲附近的空白处，避开国家方框
    europe: [rx(405), ry(405, 215) + 105],
    asia: [rx(1110) - 20, 865],
    middleEast: [rx(985), ry(985, 660) - 80],
    africa: [rx(560) + 50, ry(560, 870) - 120],
    centralAmerica: [rx(40), 640],
    southAmerica: [rx(120), 880],
  };
  const [x, y] = anchor[region];
  const shuttle = !!view.flags.shuttle && (region === 'asia' || region === 'middleEast');
  const sc = scoreRegion(view as never, region, { formosan: view.flags.formosan, shuttle });
  const vpText = (net: number, win?: Side) =>
    win ? `${win === 'US' ? '美' : '苏'}直接获胜` : net > 0 ? `美 +${net} VP` : net < 0 ? `苏 +${-net} VP` : '打平 0 VP';
  const sea = region === 'asia' ? scoreSEA(view as never) : null;
  return (
    <g class="region-label" onClick={onClick}>
      <RegionGlyph region={region} x={x - 16} y={y - 8} r={11} />
      {defconLocked(view.defcon, region) && (
        <g class="ban-icon" transform={`translate(${x - 6},${y - 18})`}>
          <title>DEFCON {view.defcon}：{REGION_ZH[region]}禁止政变和调整阵营</title>
          <circle r="6.5" />
          <line x1="-4.2" y1="-4.2" x2="4.2" y2="4.2" />
        </g>
      )}
      <text x={x} y={y} class="rl-name">{REGION_ZH[region]}</text>
      {scoredNote(view, region) && <ScoredMark x={x + REGION_ZH[region].length * 27.6 + 8} y={y - 8} note={scoredNote(view, region)!} />}
      <text x={x} y={y + 18} class="rl-score">
        <tspan class="us">美 {LV_ZH[sc.US.level]} {sc.points.US}</tspan>
        <tspan dx="10" class="ussr">苏 {LV_ZH[sc.USSR.level]} {sc.points.USSR}</tspan>
      </text>
      <text x={x} y={y + 35} class={`rl-vp ${sc.autoWin ? sc.autoWin.toLowerCase() : sc.net > 0 ? 'us' : sc.net < 0 ? 'ussr' : 'even'}`}>
        {sc.autoWin && <title>{EUROPE_WIN}</title>}
        现在计分：{vpText(sc.net, sc.autoWin)}
      </text>
      {region === 'europe' && (
        <g class="sub-legend">
          <SubBadge x={x + 6} y={y + 50} kind="w" />
          <text x={x + 16} y={y + 54}>西欧</text>
          <SubBadge x={x + 58} y={y + 50} kind="e" />
          <text x={x + 68} y={y + 54}>东欧</text>
        </g>
      )}
      {sea && (
        <g class="sub-legend">
          <rect x={x} y={y + 62} width="12" height="9" rx="2" fill={BAND_COLOR.asia} />
          <text x={x + 16} y={y + 71}>亚洲</text>
          <rect x={x + 52} y={y + 62} width="12" height="9" rx="2" fill="url(#bandSEA)" />
          <text x={x + 68} y={y + 71}>东南亚（单独计分，泰国 2 分）</text>
        </g>
      )}
      {sea && (
        <>{scoredNote(view, 'southeastAsia') && <ScoredMark x={x - 12} y={y + 47} note={scoredNote(view, 'southeastAsia')!} />}</>
      )}
      {sea && (
        <text x={x} y={y + 52} class={`rl-vp ${sea.net > 0 ? 'us' : sea.net < 0 ? 'ussr' : 'even'}${view.removed.includes(SCORING_CARD.southeastAsia) ? ' done' : ''}`}>
          东南亚计分：{vpText(sea.net)}
        </text>
      )}
    </g>
  );
}

function CountryBox({ id, view, selectable, dimmed, flash, adjHl, onPick, onHover, marks, onBolt, onBoltLeave }: { id: string; view: GameView; selectable: boolean; dimmed: boolean; flash: boolean; adjHl: boolean; onPick: () => void; onHover: (id: string | null) => void; marks: ReturnType<typeof countryMarks>; onBolt: (x: number, y: number, now?: boolean, kind?: CardKind) => void; onBoltLeave: () => void }) {
  const c = COUNTRIES[id];
  const [x, y] = pos(id);
  const [us, ussr] = view.inf[id];
  const ctl = controller(view as never, id);
  const left = x - BW / 2, top = y - BH / 2;
  const name = SHORT[id] ?? c.zh;
  const lock = coupLock(view, id);
  // 台湾决议生效：台湾按战场国显示，但星和边框用虚线（只在美国控制时、只对计分算战场国）
  const formosan = id === 'taiwan' && !!view.flags.formosan;
  const bg = c.bg || formosan;
  return (
    <g
      class={`country${bg ? ' bg' : ''}${formosan ? ' formosan' : ''}${adjHl ? ' adj-hl' : ''}${selectable ? ' selectable' : ''}${dimmed ? ' dimmed' : ''}${flash ? ' flash' : ''}${ctl ? ` ctl-${ctl.toLowerCase()}` : ''}`}
      onClick={onPick}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      <rect class="c-box" x={left} y={top} width={BW} height={BH} rx="3" />
      <rect class="c-band" x={left} y={top} width={BW} height="17" rx="3" fill={bandFill(c)} />
      <text class="c-name" x={left + (BW - 13) / 2} y={top + (name.length >= 5 ? 12.8 : 13.5)} style={name.length >= 5 ? { fontSize: '9.6px' } : undefined} textLength={name.length >= 4 ? BW - 16 : undefined} lengthAdjust="spacingAndGlyphs">{name}</text>
      {bg ? (
        <>
          <polygon class="c-bg-star" points={STAR_PTS(left + BW - 7, top + 6, 11)}>{formosan && <title>台湾决议生效：美国控制台湾时，亚洲计分把台湾算作战场国</title>}</polygon>
          <text class="c-stab-t bg" x={left + BW - 7} y={top + 10.5}>{c.stability}</text>
        </>
      ) : (
        <>
          <rect class="c-stab" x={left + BW - 13} y={top + 2} width="11.5" height="13" rx="2" />
          <text class="c-stab-t" x={left + BW - 7.25} y={top + 12.8}>{c.stability}</text>
        </>
      )}
      {ctl && <Flag x={left + 3} y={top + 1} side={ctl} h={bg ? 20 : 16} />}
      {ctl && bg && <Tank x={left + 21} y={top - 1} side={ctl} s={0.55} />}
      <Inf x={left + 2} y={top + 19.5} n={us} side="US" ctl={ctl === 'US'} />
      <Inf x={left + BW - 26} y={top + 19.5} n={ussr} side="USSR" ctl={ctl === 'USSR'} />
      {/* 西欧 / 东欧徽记：在名字色条之下、下沿标记之上，画在影响力格子之后，不被遮挡 */}
      {c.sub.includes('westernEurope') && <SubBadge x={left} y={top + 24} kind="w" />}
      {c.sub.includes('easternEurope') && <SubBadge x={left + BW} y={top + 24} kind="e" />}
      {lock && (
        <g class="ban-icon" transform={`translate(${left},${top})`}>
          <title>{lock}</title>
          <circle r="6" />
          <line x1="-3.9" y1="-3.9" x2="3.9" y2="3.9" />
        </g>
      )}
      {/* 点名该国的卡：左下角从左往右、右下角从右往左（闪电永远最右）；还没到时期的半透明；悬停展开卡列表 */}
      {[...marks.left.map((k, i) => [k, left + 1 + i * 15] as const), ...marks.right.map((k, i) => [k, left + BW - 1 - i * 16] as const)].map(([k, mx]) => (
        <g
          key={k}
          class={`c-mark c-${k}${marks.future.has(k) ? ' future' : ''}`}
          transform={`translate(${mx},${top + BH + 1})`}
          onPointerEnter={(e) => {
            const r = (e.currentTarget as SVGGElement).getBoundingClientRect();
            onBolt(r.right, r.top + r.height / 2, false, k);
          }}
          onPointerLeave={onBoltLeave}
          onClick={(e) => {
            e.stopPropagation();
            onBolt(e.clientX, e.clientY, true, k);
          }}
        >
          <MarkGlyph k={k} />
        </g>
      ))}
    </g>
  );
}

function Inf({ x, y, n, side, ctl }: { x: number; y: number; n: number; side: Side; ctl: boolean }) {
  const cls = `inf inf-${side.toLowerCase()}${ctl ? ' ctl' : ''}${n === 0 ? ' zero' : ''}`;
  return (
    <g class={cls}>
      <rect x={x} y={y} width="24" height="18.5" rx="2" />
      {n > 0 && <text x={x + 12} y={y + 14.5}>{n}</text>}
    </g>
  );
}

/** 政变 / 调整的成功率提示 */
function odds(id: string, view: GameView): string | null {
  const d = view.decision;
  const me = view.me;
  if (!d || !me || !d.options.some((o) => o.v === id)) return null;
  const c = COUNTRIES[id];
  const them: Side = me === 'US' ? 'USSR' : 'US';
  if (d.tag === 'coupTarget') {
    const m = d.prompt.match(/（(\d+) 点/);
    if (!m) return null;
    let ops = Number(m[1]);
    if (view.flags.salt) ops -= 1;
    if (view.flags.lads && (c.region === 'centralAmerica' || c.region === 'southAmerica')) ops += view.flags.lads === me ? 1 : -1;
    const need = 2 * c.stability;
    let win = 0, removed = 0;
    for (let r = 1; r <= 6; r++) {
      const diff = r + ops - need;
      if (diff > 0) {
        win++;
        removed += Math.min(diff, view.inf[id][me === 'US' ? 1 : 0]);
      }
    }
    return `政变成功率 ${Math.round((win / 6) * 100)}%，平均移除 ${(removed / 6).toFixed(1)} 点${c.bg ? '（战场国：DEFCON −1）' : ''}`;
  }
  if (d.tag === 'realignTarget') {
    const mods = (side: Side) => {
      const home = side === 'US' ? 'usa' : 'ussr';
      let k = c.adj.filter((a) => a !== 'usa' && a !== 'ussr' && controller(view as never, a) === side).length;
      if (c.adj.includes(home)) k++;
      const i = side === 'US' ? 0 : 1;
      if (view.inf[id][i] > view.inf[id][1 - i]) k++;
      if (side === 'US' && view.flags.iranContra) k--;
      return k;
    };
    const ma = mods(me), mb = mods(them);
    let win = 0, rem = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
      const x = a + ma - (b + mb);
      if (x > 0) {
        win++;
        rem += Math.min(x, view.inf[id][me === 'US' ? 1 : 0]);
      }
    }
    return `调整：己方 ${ma >= 0 ? '+' : ''}${ma}，对手 ${mb >= 0 ? '+' : ''}${mb}；获胜 ${Math.round((win / 36) * 100)}%，平均移除 ${(rem / 36).toFixed(1)} 点`;
  }
  return null;
}

/** 放影响力时：为什么这里能放 */
function placeReason(id: string, view: GameView): string | null {
  const d = view.decision;
  const me = view.me;
  if (!d || !me || d.tag !== 'placeOps' || !d.options.some((o) => o.v === id)) return null;
  const i = me === 'US' ? 0 : 1;
  const c = COUNTRIES[id];
  const why: string[] = [];
  if (view.inf[id][i] > 0) why.push('这里已有你的影响力');
  const nb = c.adj.filter((a) => a !== 'usa' && a !== 'ussr' && view.inf[a][i] > 0).map((a) => COUNTRIES[a].zh);
  if (nb.length) why.push(`相邻 ${nb.join('、')}（有你的影响力）`);
  if (c.adj.includes(me === 'US' ? 'usa' : 'ussr')) why.push('与你的本土相邻');
  const cost = controller(view as never, id) === (me === 'US' ? 'USSR' : 'US') ? 2 : 1;
  return `可以放：${why.join('；') || '相邻国家在本轮开始时有你的影响力'}。每点 ${cost} 行动点`;
}

function CountryTip({ id, view }: { id: string; view: GameView }) {
  const c = COUNTRIES[id];
  const hint = odds(id, view) ?? placeReason(id, view);
  const [us, ussr] = view.inf[id];
  const ctl = controller(view as never, id);
  const adj = c.adj.map((a) => (a === 'usa' ? '美国' : a === 'ussr' ? '苏联' : COUNTRIES[a].zh));
  return (
    <div class="country-tip">
      <div class="ct-name">
        {c.zh} <small>{c.name}</small>
      </div>
      <div>
        {REGION_ZH[c.region]}
        {c.sub.map((s) => ` · ${REGION_ZH[s]}`)} · 稳定度 {c.stability}
        {c.bg && <b class="ct-bg"> · 战场国</b>}
        {id === 'taiwan' && !c.bg && view.flags.formosan && <b class="ct-bg"> · 战场国（台湾决议：美国控制时计分算战场国）</b>}
      </div>
      <div>
        影响力：<span class="us">美 {us}</span> / <span class="ussr">苏 {ussr}</span>
        {ctl ? `（${ctl === 'US' ? '美国' : '苏联'}控制）` : '（未受控）'}
      </div>
      <div class="ct-adj">邻接：{adj.join('、')}</div>
      {hint && <div class="ct-odds">{hint}</div>}
    </div>
  );
}

/** 国家方框下沿的标记图形（局部坐标，半径 7 的圆章） */
function MarkGlyph({ k }: { k: CardKind }) {
  switch (k) {
    case 'bolt':
      return (<><circle r="7" /><polygon points="1,-6 -3.5,1 0,1 -1,6 3.5,-1 0,-1" /></>);
    case 'war':
      return (
        <>
          <circle r="7" />
          <g class="war-guns">
            {[-40, 40].map((r) => (
              <g key={r} transform={`rotate(${r})`}>
                <rect x="-0.55" y="-5.8" width="1.1" height="6.4" rx="0.3" />
                <path d="M-0.9,0.2 L0.9,0.2 L1.5,4.2 L1.8,5.6 L-1.3,5.6 L-1,3.6Z" class="wg-stock" />
              </g>
            ))}
          </g>
        </>
      );
    case 'score':
      return (<><circle r="7" /><path class="cr-body" d="M-4.6,3 L-5,-2.6 L-2.4,-0.4 L0,-4.2 L2.4,-0.4 L5,-2.6 L4.6,3Z" /></>);
    case 'missile':
      return (
        <>
          <circle r="7" />
          <g transform="rotate(45)">
            <path class="ms-body" d="M0,-5.6 C1.3,-4.4 1.5,-2.8 1.5,-1.6 L1.5,3 L-1.5,3 L-1.5,-1.6 C-1.5,-2.8 -1.3,-4.4 0,-5.6Z" />
            <path class="ms-fin" d="M-1.5,1 L-3.2,4.4 L-1.5,3.6Z M1.5,1 L3.2,4.4 L1.5,3.6Z" />
            <path class="ms-flame" d="M-1,3.2 L0,5.8 L1,3.2Z" />
          </g>
        </>
      );
    case 'reds':
      // 黑红旗：左侧黑色竖条配白星，右侧红底中间一道黄带
      return (
        <>
          <clipPath id="mk-clip"><circle r="7" /></clipPath>
          <g clip-path="url(#mk-clip)">
            <rect x="-7" y="-7" width="14" height="14" fill="#d42a1e" />
            <rect x="-7" y="-1.8" width="14" height="3.6" fill="#f2c230" />
            <rect x="-7" y="-7" width="5" height="14" fill="#111" />
            <polygon points="1.2,0 -2.4,-1.3 -3.2,0 -2.4,1.3" fill="#fff" />
          </g>
          <circle r="7" class="mk-rim" />
        </>
      );
    case 'tent':
      return (
        <>
          <circle r="7" />
          <path class="tn-body" d="M-5.4,4.2 L0,-4.8 L5.4,4.2Z" />
          <path class="tn-door" d="M-1.4,4.2 L0,0.6 L1.4,4.2Z" />
          <path class="tn-pole" d="M0,-4.8 L0,-6.2" />
        </>
      );
    case 'wall':
      return (
        <>
          <circle r="7" />
          <g class="wl-bricks">
            <rect x="-5" y="-3.6" width="4.6" height="2.2" /><rect x="0.4" y="-3.6" width="4.6" height="2.2" />
            <rect x="-5" y="-1.1" width="2.2" height="2.2" /><rect x="-2.4" y="-1.1" width="4.8" height="2.2" /><rect x="2.8" y="-1.1" width="2.2" height="2.2" />
            <rect x="-5" y="1.4" width="4.6" height="2.2" /><rect x="0.4" y="1.4" width="4.6" height="2.2" />
          </g>
        </>
      );
    case 'oil':
      return (<><circle r="7" /><path d="M0,-4.6 C2.6,-1.2 3.6,0.6 3.6,1.9 A3.6,3.6 0 0 1 -3.6,1.9 C-3.6,0.6 -2.6,-1.2 0,-4.6Z" /></>);
    case 'muslim':
      return (<><circle r="7" /><path d="M1.8,-4.6 A4.8,4.8 0 1 0 1.8,4.6 A3.8,3.8 0 1 1 1.8,-4.6Z" /></>);
    case 'canal':
      return (<><circle r="7" /><path class="cn-wave" d="M-4.6,-2.2 q1.15,-1.4 2.3,0 t2.3,0 t2.3,0 t2.3,0 M-4.6,1 q1.15,-1.4 2.3,0 t2.3,0 t2.3,0 t2.3,0 M-4.6,4.2 q1.15,-1.4 2.3,0 t2.3,0 t2.3,0 t2.3,0" /></>);
    case 'portugal':
      // 葡萄牙国旗配色：左绿右红，交界处一个金色圆环
      return (
        <>
          <clipPath id="mk-clip-pt"><circle r="7" /></clipPath>
          <g clip-path="url(#mk-clip-pt)">
            <rect x="-7" y="-7" width="14" height="14" fill="#d42a1e" />
            <rect x="-7" y="-7" width="5.6" height="14" fill="#1f7a3a" />
          </g>
          <circle cx="-1.4" cy="0" r="2.3" class="pt-ring" />
          <circle r="7" class="mk-rim" />
        </>
      );
    case 'kal':
      // 下坠的客机：白底蓝描边，机头朝左下，后面拖两道下落线
      return (
        <>
          <circle r="7" />
          <path class="kl-trail" d="M2.6,-5.8 L4.6,-3.4 M0.6,-6.2 L2.2,-4.4" />
          <g transform="rotate(-135)">
            <path class="kl-plane" d="M0,-5.2 C0.7,-5.2 0.9,-4.4 0.9,-3.6 L0.9,-1 L5,1.6 L5,2.6 L0.9,1.4 L0.7,3.6 L2.2,4.6 L2.2,5.3 L0,4.8 L-2.2,5.3 L-2.2,4.6 L-0.7,3.6 L-0.9,1.4 L-5,2.6 L-5,1.6 L-0.9,-1 L-0.9,-3.6 C-0.9,-4.4 -0.7,-5.2 0,-5.2Z" />
          </g>
        </>
      );
    case 'leader':
      // 人物：白底黄框，红色头肩剪影
      return (
        <>
          <circle r="7" />
          <circle cx="0" cy="-1.6" r="2.4" class="ld-fig" />
          <path class="ld-fig" d="M-4.6,5.2 C-4.4,2.2 -2.4,1 0,1 C2.4,1 4.4,2.2 4.6,5.2Z" />
        </>
      );
    case 'shake':
      // 英美特殊关系：两只手相握，一蓝袖一红袖
      return (
        <>
          <circle r="7" />
          <path class="sh-cuff-a" d="M-6,-1.2 L-3.6,-2.6 L-2.4,-0.4 L-4.8,1Z" />
          <path class="sh-cuff-b" d="M6,-1.2 L3.6,-2.6 L2.4,-0.4 L4.8,1Z" />
          <path class="sh-hand" d="M-3.2,-1.6 L-0.6,-3 L1.8,-2.2 L3.2,-1.4 L2.6,0.2 L1.4,1.8 L-0.6,2.6 L-2.2,1.6 L-3,0.2Z" />
          <path class="sh-line" d="M-0.6,-0.8 L1.6,-1.6 M-0.8,0.6 L1.4,-0.2 M-0.6,1.8 L0.9,1.2" />
        </>
      );
    case 'suez':
      // 苏伊士运河危机：暗红底，两岸之间的河道里一艘货轮
      return (
        <>
          <circle r="7" />
          <path class="sz-bank" d="M-7,-2.2 L-2.2,-2.2 L-1.4,-7 M7,-2.2 L2.2,-2.2 L1.4,-7" />
          <path class="sz-water" d="M-5.6,3.6 q1.4,-1 2.8,0 t2.8,0 t2.8,0 t2.8,0" />
          <path class="sz-hull" d="M-4.4,0.2 L4.6,0.2 L3.4,2.6 L-3.4,2.6Z" />
          <rect class="sz-deck" x="-2.8" y="-2.2" width="3.6" height="2.4" />
          <rect class="sz-stack" x="1.4" y="-3.4" width="1.3" height="3.6" />
        </>
      );
    case 'radar':
      // 北美防空司令部：深绿底雷达屏，扫描扇区 + 两个光点
      return (
        <>
          <circle r="7" />
          <circle r="4.6" class="rd-ring" />
          <circle r="2.3" class="rd-ring" />
          <path class="rd-sweep" d="M0,0 L0,-6 A6,6 0 0 1 5.2,-3Z" />
          <circle cx="2.4" cy="2.2" r="0.8" class="rd-dot" />
          <circle cx="-3" cy="-1.4" r="0.7" class="rd-dot" />
        </>
      );
    case 'lady':
      // 铁娘子：蓝框，蓬松短发的女性侧影 + 珍珠项链
      return (
        <>
          <circle r="7" />
          <path class="ly-hair" d="M-3.6,-0.6 C-4.4,-4.4 -1.8,-6.4 0.8,-6 C3.4,-5.6 4.4,-3.4 3.8,-0.8 C3.4,0.6 2.6,1 2.2,0.6 L2.2,-1.6 C1.2,-2.6 -1.4,-2.8 -2.2,-1.4 L-2.4,0.8 C-3,0.8 -3.4,0.2 -3.6,-0.6Z" />
          <path class="ly-face" d="M-2.2,-1.4 C-1.4,-2.8 1.2,-2.6 2.2,-1.6 L2.2,0.6 C1.8,1.8 1,2.4 0,2.4 C-1,2.4 -1.8,1.8 -2.2,0.8Z" />
          <path class="ly-suit" d="M-4.8,5.8 C-4.6,3.6 -2.8,2.6 -1,2.4 L0,3.4 L1,2.4 C2.8,2.6 4.6,3.6 4.8,5.8Z" />
          <path class="ly-pearl" d="M-1.2,2.9 Q0,3.9 1.2,2.9" />
        </>
      );
    case 'pope':
      // 教皇：低多边形主教冠 + 脸 + 披肩，蓝框
      return (
        <>
          <circle r="7" />
          <polygon class="pp-mitre" points="0,-6.2 2.6,-3.6 2.2,-1.4 -2.2,-1.4 -2.6,-3.6" />
          <polygon class="pp-mitre-dark" points="0,-6.2 2.6,-3.6 0,-2.6" />
          <path class="pp-cross" d="M0,-5 L0,-2.6 M-0.9,-4 L0.9,-4" />
          <polygon class="pp-face" points="-1.9,-1.4 1.9,-1.4 1.5,1 0,1.8 -1.5,1" />
          <polygon class="pp-robe" points="-4.8,5.6 -3.6,2.2 0,1.6 3.6,2.2 4.8,5.6" />
          <polygon class="pp-robe-dark" points="0,1.6 3.6,2.2 4.8,5.6 0,5.6" />
        </>
      );
  }
}

/** 敌方占着与本土相邻的国家：那条通往本土的连线一半敌色一半己色，中间画个间谍，旁边标 +1 VP（计分时占领方多得 1 分） */
function SpyLinks({ view }: { view: GameView }) {
  const out: JSX.Element[] = [];
  for (const c of COUNTRY_LIST) {
    for (const home of ['usa', 'ussr'] as const) {
      if (!c.adj.includes(home)) continue;
      const enemy: Side = home === 'usa' ? 'USSR' : 'US';
      if (controller(view as never, c.id) !== enemy) continue;
      const [x1, y1] = pos(c.id);
      let [x2, y2] = pos(home);
      // 日本连美国的线向右画出地图边缘
      if (c.id === 'japan' && home === 'usa') {
        x2 = MAP_W - 4;
        y2 = y1;
      }
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const occ = enemy === 'US' ? 'us' : 'ussr';
      const own = home === 'usa' ? 'us' : 'ussr';
      out.push(
        <g key={c.id + home} class="spy-link">
          <title>{COUNTRIES[c.id].zh}与{home === 'usa' ? '美国' : '苏联'}本土相邻，被{enemy === 'US' ? '美国' : '苏联'}控制：{REGION_ZH[c.region]}计分时{enemy === 'US' ? '美国' : '苏联'}额外 +1 VP</title>
          <line x1={x1} y1={y1} x2={mx} y2={my} class={`sl-half sl-${occ}`} />
          <line x1={mx} y1={my} x2={x2} y2={y2} class={`sl-half sl-${own}`} />
          <g transform={`translate(${mx},${my})`} class="sl-spy">
            <circle r="9" />
            {/* 礼帽 + 墨镜 + 竖领风衣的间谍剪影 */}
            <path class="sp-hat" d="M-6,-2.6 L6,-2.6 L4,-3.6 L3.2,-7 L-3.2,-7 L-4,-3.6Z" />
            <path class="sp-face" d="M-3.4,-2.4 L3.4,-2.4 L3,1 L0,2.2 L-3,1Z" />
            <path class="sp-glass" d="M-3,-1.6 L-0.4,-1.6 L-0.6,-0.2 L-2.8,-0.2Z M0.4,-1.6 L3,-1.6 L2.8,-0.2 L0.6,-0.2Z" />
            <path class="sp-coat" d="M-6.4,7.4 L-5,2.4 L-2.6,1.2 L0,3.4 L2.6,1.2 L5,2.4 L6.4,7.4Z" />
          </g>
          <text x={mx + 12} y={my + 4} class={`sl-vp sl-${occ}`}>+1 VP</text>
        </g>,
      );
    }
  }
  return <g class="spy-links">{out}</g>;
}

/** 两国对打的战争卡：两国方框上的步枪标记之间连一条向下弯的虚线（从方框下方绕过去，不压方框、不被方框挡） */
const WAR_PAIRS: [string, string][] = [['pakistan', 'india'], ['iraq', 'iran']];
function WarLinks({ view }: { view: GameView }) {
  const at = (id: string): [number, number] | null => {
    const i = countryMarks(view, id).right.indexOf('war');
    if (i < 0) return null;
    const [x, y] = pos(id);
    return [x - BW / 2 + BW - 1 - i * 16, y - BH / 2 + BH + 1];
  };
  return (
    <g class="war-links">
      {WAR_PAIRS.map(([a, b]) => {
        const p = at(a), q = at(b);
        if (!p || !q) return null;
        const bow = 26 + Math.abs(q[0] - p[0]) * 0.12;
        const cx = (p[0] + q[0]) / 2, cy = Math.max(p[1], q[1]) + bow;
        // 两端从标记圆边出发，不盖住标记
        const trim = (from: [number, number]) => {
          const dx = cx - from[0], dy = cy - from[1], d = Math.hypot(dx, dy) || 1;
          return [from[0] + (dx / d) * 9, from[1] + (dy / d) * 9];
        };
        const [x1, y1] = trim(p), [x2, y2] = trim(q);
        return <path key={a + b} d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} class="war-link" />;
      })}
    </g>
  );
}

/** 北约 / 华约成立后，在西欧 / 东欧的地图背景上铺一个半透明的大徽记 */
function PactOverlay({ view }: { view: GameView }) {
  const center = (sub: SubRegionId): [number, number] => {
    const ps = COUNTRY_LIST.filter((c) => c.sub.includes(sub)).map((c) => pos(c.id));
    return [ps.reduce((a, p) => a + p[0], 0) / ps.length, ps.reduce((a, p) => a + p[1], 0) / ps.length];
  };
  const out: JSX.Element[] = [];
  if (view.flags.nato) {
    // 西欧国家的重心偏德国，往大西洋一侧挪，避开和华约徽记重叠
    const [cx0, cy0] = center('westernEurope');
    const [x, y] = [cx0 - 120, cy0 + 10];
    out.push(
      <g key="nato" class="pact pact-nato" transform={`translate(${x},${y})`}>
        <title>北约已成立：美国控制的西欧国家不能被政变或调整阵营</title>
        <circle r="72" class="pk-ring" />
        {/* 四角罗盘星：四个尖角各分明暗两半 */}
        {[0, 90, 180, 270].map((r) => (
          <g key={r} transform={`rotate(${r})`}>
            <polygon points="0,-104 15,-15 0,0" class="pk-light" />
            <polygon points="0,-104 -15,-15 0,0" class="pk-dark" />
          </g>
        ))}
      </g>,
    );
  }
  if (view.flags.warsawPact) {
    const [cx1, cy1] = center('easternEurope');
    const [x, y] = [cx1 + 40, cy1 + 20];
    const star = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 26 : 62;
      return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    out.push(
      <g key="warsaw" class="pact pact-warsaw" transform={`translate(${x},${y})`}>
        <title>华约已成立</title>
        <circle r="80" class="pk-ring" />
        <circle r="70" class="pk-ring thin" />
        <polygon points={star} class="pk-star" />
      </g>,
    );
  }
  return <g class="pact-overlay">{out}</g>;
}
