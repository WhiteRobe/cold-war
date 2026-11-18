import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { COUNTRIES, COUNTRY_LIST, REGIONS, REGION_ZH, type RegionId, type Side } from '../../data';
import { controller, scoreRegion, scoreSEA } from '../../engine/scoring';
import type { GameView } from '../../engine/view';
import { WORLD } from './worldmap.gen';
import { Flag, FogLayer, FxLayer, Tank, useMapFx } from './MapFx';

export const MAP_W = 1500;
export const MAP_H = 975;
const S = 1.5;
const BW = 58;
const BH = 40;

/** 地图上的简称（最多 4 个字） */
const SHORT: Record<string, string> = {
  benelux: '比荷卢', spainPortugal: '西葡', czechoslovakia: '捷克', saudiArabia: '沙特', laosCambodia: '老柬',
  indonesia: '印尼', algeria: '阿尔及利', westAfricanStates: '西非', saharanStates: '撒哈拉', ethiopia: '埃塞',
  seAfricanStates: '东南非', dominicanRep: '多米尼加', costaRica: '哥斯达', gulfStates: '海湾国家',
};

export const pos = (id: string): [number, number] => {
  if (id === 'usa') return [85 * S, 230 * S];
  if (id === 'ussr') return [635 * S, 112 * S];
  const p = COUNTRIES[id].pos;
  return [p[0] * S, p[1] * S];
};

/** 区域标识色与图标：方框边缘色条 + 挂件 */
export const REGION_COLOR: Record<RegionId, string> = {
  europe: '#6d7490', asia: '#c9962a', middleEast: '#c0622d', africa: '#5f8f3a', centralAmerica: '#2f9c95', southAmerica: '#8a6bbf',
};

/** 战场国稳定度星章 */
function STAR_PTS(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.55 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** 方框名称条：按区域着色（比标识色深一些，保证白字清楚） */
const BAND_COLOR: Record<RegionId, string> = {
  europe: '#5b6177', asia: '#9a6f16', middleEast: '#a04d1f', africa: '#4a7429', centralAmerica: '#22796f', southAmerica: '#6a4f99',
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

/** 底图配色：按游戏区域着色，每个国家在两三个相邻色阶里取一个，做出分面感 */
const LAND: Record<string, string[]> = {
  europe: ['#a3afc0', '#98a5b8', '#aeb9c8'],
  asia: ['#cdb488', '#c4aa7c', '#d4bc92'],
  middleEast: ['#dbc290', '#d2b884', '#e0c99a'],
  africa: ['#c0a577', '#b69b6d', '#c8ae82'],
  centralAmerica: ['#a9b89a', '#9faf90', '#b2c0a3'],
  southAmerica: ['#b4c093', '#aab788', '#bcc89d'],
  usa: ['#6f8fb2'],
  ussr: ['#b8786c'],
  china: ['#9b968b'],
  other: ['#c9c0ab', '#c2b9a3', '#cfc6b2'],
};

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
}

export function MapView({ view, selectable, onPick, flash, onRegion }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const { fx, fresh } = useMapFx(view);
  const [zoom, setZoom] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; zx: number; zy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const bg = useMemo(
    () => (
      <g class="map-bg">
        {WORLD.map((w, i) => (
          <path key={i} d={w.d} fill={shade(w.id, w.kind)} class={`land k-${w.kind}`} />
        ))}
        <text class="land-label" x="1225" y="400">中 国</text>
      </g>
    ),
    [],
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
      }),
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
        <rect x="0" y="0" width={MAP_W} height={MAP_H} class="ocean" />
        <MapGrid />
        {bg}
        <FogLayer view={view} fresh={fresh} pos={pos} />
        <g class="edges">{lines}</g>
        {REGIONS.map((r) => (
          <RegionLabel key={r} region={r} view={view} onClick={() => onRegion?.(r)} />
        ))}
        <Superpower id="usa" />
        <Superpower id="ussr" />
        <text x={MAP_W - 8} y={pos('japan')[1] - 6} class="edge-label" text-anchor="end">→ 美国</text>
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
          />
        ))}
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
        <FxLayer fx={fx} pos={pos} />
      </svg>
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
  return (
    <g class={`superpower sp-${id}`}>
      <polygon points={`${x - 52},${y - 22} ${x + 52},${y - 22} ${x + 60},${y} ${x + 52},${y + 22} ${x - 52},${y + 22} ${x - 60},${y}`} />
      <text x={x} y={y + 7}>{id === 'usa' ? '美 国' : '苏 联'}</text>
    </g>
  );
}

const LV_ZH = { none: '—', presence: '存在', domination: '支配', control: '控制' };

function RegionLabel({ region, view, onClick }: { region: RegionId; view: GameView; onClick: () => void }) {
  const anchor: Record<RegionId, [number, number]> = {
    europe: [405, 215],
    asia: [1110, 760],
    middleEast: [985, 660],
    africa: [560, 870],
    centralAmerica: [40, 640],
    southAmerica: [120, 880],
  };
  const [x, y] = anchor[region];
  const shuttle = !!view.flags.shuttle && (region === 'asia' || region === 'middleEast');
  const sc = scoreRegion(view as never, region, { formosan: view.flags.formosan, shuttle });
  const vpText = (net: number, win?: Side) =>
    win ? `${win === 'US' ? '美' : '苏'}控制欧洲即胜` : net > 0 ? `美 +${net} VP` : net < 0 ? `苏 +${-net} VP` : '打平 0 VP';
  const sea = region === 'asia' ? scoreSEA(view as never) : null;
  return (
    <g class="region-label" onClick={onClick}>
      <RegionGlyph region={region} x={x - 16} y={y - 8} r={11} />
      <text x={x} y={y} class="rl-name">{REGION_ZH[region]}</text>
      <text x={x} y={y + 18} class="rl-score">
        <tspan class="us">美 {LV_ZH[sc.US.level]} {sc.points.US}</tspan>
        <tspan dx="10" class="ussr">苏 {LV_ZH[sc.USSR.level]} {sc.points.USSR}</tspan>
      </text>
      <text x={x} y={y + 35} class={`rl-vp ${sc.autoWin ? sc.autoWin.toLowerCase() : sc.net > 0 ? 'us' : sc.net < 0 ? 'ussr' : 'even'}`}>
        现在计分：{vpText(sc.net, sc.autoWin)}
      </text>
      {sea && (
        <text x={x} y={y + 52} class={`rl-vp ${sea.net > 0 ? 'us' : sea.net < 0 ? 'ussr' : 'even'}`}>
          东南亚计分：{vpText(sea.net)}
        </text>
      )}
    </g>
  );
}

function CountryBox({ id, view, selectable, dimmed, flash, adjHl, onPick, onHover }: { id: string; view: GameView; selectable: boolean; dimmed: boolean; flash: boolean; adjHl: boolean; onPick: () => void; onHover: (id: string | null) => void }) {
  const c = COUNTRIES[id];
  const [x, y] = pos(id);
  const [us, ussr] = view.inf[id];
  const ctl = controller(view as never, id);
  const left = x - BW / 2, top = y - BH / 2;
  const name = SHORT[id] ?? c.zh;
  return (
    <g
      class={`country${c.bg ? ' bg' : ''}${adjHl ? ' adj-hl' : ''}${selectable ? ' selectable' : ''}${dimmed ? ' dimmed' : ''}${flash ? ' flash' : ''}${ctl ? ` ctl-${ctl.toLowerCase()}` : ''}`}
      onClick={onPick}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      <rect class="c-box" x={left} y={top} width={BW} height={BH} rx="3" />
      <rect class="c-band" x={left} y={top} width={BW} height="17" rx="3" fill={BAND_COLOR[c.region]} />
      <text class="c-name" x={left + (BW - 13) / 2} y={top + 13.5} textLength={name.length >= 4 ? BW - 16 : undefined} lengthAdjust="spacingAndGlyphs">{name}</text>
      {c.bg ? (
        <>
          <polygon class="c-bg-star" points={STAR_PTS(left + BW - 7, top + 6, 11)} />
          <text class="c-stab-t bg" x={left + BW - 7} y={top + 10.5}>{c.stability}</text>
        </>
      ) : (
        <>
          <rect class="c-stab" x={left + BW - 13} y={top + 2} width="11.5" height="13" rx="2" />
          <text class="c-stab-t" x={left + BW - 7.25} y={top + 12.8}>{c.stability}</text>
        </>
      )}
      {ctl && <Flag x={left + 3} y={top + 1} side={ctl} h={c.bg ? 20 : 16} />}
      {ctl && c.bg && <Tank x={left + 21} y={top - 1} side={ctl} s={0.55} />}
      <Inf x={left + 2} y={top + 19.5} n={us} side="US" ctl={ctl === 'US'} />
      <Inf x={left + BW - 26} y={top + 19.5} n={ussr} side="USSR" ctl={ctl === 'USSR'} />
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
