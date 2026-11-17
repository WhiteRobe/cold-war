import { useMemo, useRef, useState } from 'preact/hooks';
import { COUNTRIES, COUNTRY_LIST, REGIONS, REGION_ZH, countriesIn, type RegionId, type Side } from '../../data';
import { controller, scoreRegion } from '../../engine/scoring';
import type { GameView } from '../../engine/view';

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

const REGION_FILL: Record<RegionId, [string, string]> = {
  europe: ['#8d9bb0', '#7f8ea5'],
  asia: ['#b9a27a', '#ad966d'],
  middleEast: ['#c4ab7b', '#b89f70'],
  africa: ['#a99572', '#9d8966'],
  centralAmerica: ['#93a48a', '#86987d'],
  southAmerica: ['#9fae84', '#93a278'],
};

function hull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** 区域底色：凸包 + 从中心扇形分面，做出 low poly 的效果 */
function regionShapes(ids: string[], pad: number, fill: [string, string]) {
  const pts: [number, number][] = [];
  for (const id of ids) {
    const [x, y] = pos(id);
    pts.push([x - BW / 2 - pad, y - BH / 2 - pad], [x + BW / 2 + pad, y - BH / 2 - pad], [x - BW / 2 - pad, y + BH / 2 + pad], [x + BW / 2 + pad, y + BH / 2 + pad]);
  }
  const h = hull(pts);
  const cx = h.reduce((s, p) => s + p[0], 0) / h.length;
  const cy = h.reduce((s, p) => s + p[1], 0) / h.length;
  return h.map((p, i) => {
    const q = h[(i + 1) % h.length];
    return <polygon key={i} points={`${cx},${cy} ${p[0]},${p[1]} ${q[0]},${q[1]}`} fill={fill[i % 2]} stroke={fill[i % 2]} stroke-width="1" />;
  });
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
  const [zoom, setZoom] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; zx: number; zy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const bg = useMemo(
    () => (
      <g class="map-bg">
        {REGIONS.map((r) => (
          <g key={r}>{regionShapes(countriesIn(r).map((c) => c.id), 14, REGION_FILL[r])}</g>
        ))}
        <g opacity="0.35">{regionShapes(countriesIn('southeastAsia').map((c) => c.id), 6, ['#d8c39a', '#ceb98f'])}</g>
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

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * MAP_W;
    const my = ((e.clientY - r.top) / r.height) * MAP_H;
    setZoom((z) => {
      const k = Math.min(4, Math.max(1, z.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      // 保持鼠标下的点不动
      const wx = z.x + mx / z.k, wy = z.y + my / z.k;
      return clampZoom({ k, x: wx - mx / k, y: wy - my / k });
    });
  };

  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; k: number } | null>(null);
  const onDown = (e: PointerEvent) => {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), k: zoom.k };
      if (drag.current) drag.current.moved = true;
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, zx: zoom.x, zy: zoom.y, moved: false };
  };
  const onMove = (e: PointerEvent) => {
    if (pts.current.has(e.pointerId)) pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      const r = svgRef.current!.getBoundingClientRect();
      const mx = (((a.x + b.x) / 2 - r.left) / r.width) * MAP_W;
      const my = (((a.y + b.y) / 2 - r.top) / r.height) * MAP_H;
      const k = Math.min(4, Math.max(1, (pinch.current.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist));
      setZoom((z) => {
        const wx = z.x + mx / z.k, wy = z.y + my / z.k;
        return clampZoom({ k, x: wx - mx / k, y: wy - my / k });
      });
      return;
    }
    const d = drag.current;
    if (!d || zoom.k === 1) return;
    const r = svgRef.current!.getBoundingClientRect();
    const dx = ((e.clientX - d.x) / r.width) * MAP_W / zoom.k;
    const dy = ((e.clientY - d.y) / r.height) * MAP_H / zoom.k;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
    setZoom(clampZoom({ k: zoom.k, x: d.zx - dx, y: d.zy - dy }));
  };
  const onUp = (e: PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
    setTimeout(() => (drag.current = null), 0);
  };

  const vb = `${zoom.x} ${zoom.y} ${MAP_W / zoom.k} ${MAP_H / zoom.k}`;

  return (
    <div class="map-wrap">
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
        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#cdbf9f" />
        <MapGrid />
        {bg}
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
            flash={flash.has(c.id)}
            onPick={() => !drag.current?.moved && selectable.has(c.id) && onPick(c.id)}
            onHover={setHover}
          />
        ))}
      </svg>
      <div class="map-zoom">
        <button type="button" onClick={() => setZoom((z) => clampZoom({ ...z, k: Math.min(4, z.k * 1.3) }))}>＋</button>
        <button type="button" onClick={() => setZoom({ x: 0, y: 0, k: 1 })}>⟲</button>
        <button type="button" onClick={() => setZoom((z) => clampZoom({ ...z, k: Math.max(1, z.k / 1.3) }))}>－</button>
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
  const ids = countriesIn(region).map((c) => c.id);
  const xs = ids.map((i) => pos(i)[0]);
  const ys = ids.map((i) => pos(i)[1]);
  const anchor: Record<RegionId, [number, number]> = {
    europe: [(Math.min(...xs) + Math.max(...xs)) / 2 - 120, Math.min(...ys) - 40],
    asia: [Math.max(...xs) - 60, Math.min(...ys) - 40],
    middleEast: [Math.min(...xs) + 10, Math.max(...ys) + 44],
    africa: [Math.min(...xs) - 10, Math.max(...ys) + 44],
    centralAmerica: [Math.min(...xs) + 10, Math.min(...ys) - 36],
    southAmerica: [Math.min(...xs) - 10, Math.max(...ys) + 44],
  };
  const [x, y] = anchor[region];
  const sc = scoreRegion(view as never, region, { formosan: view.flags.formosan });
  return (
    <g class="region-label" onClick={onClick}>
      <text x={x} y={y} class="rl-name">{REGION_ZH[region]}</text>
      <text x={x} y={y + 18} class="rl-score">
        <tspan class="us">美 {LV_ZH[sc.US.level]} {sc.points.US}</tspan>
        <tspan dx="10" class="ussr">苏 {LV_ZH[sc.USSR.level]} {sc.points.USSR}</tspan>
      </text>
    </g>
  );
}

function CountryBox({ id, view, selectable, dimmed, flash, onPick, onHover }: { id: string; view: GameView; selectable: boolean; dimmed: boolean; flash: boolean; onPick: () => void; onHover: (id: string | null) => void }) {
  const c = COUNTRIES[id];
  const [x, y] = pos(id);
  const [us, ussr] = view.inf[id];
  const ctl = controller(view as never, id);
  const left = x - BW / 2, top = y - BH / 2;
  const name = SHORT[id] ?? c.zh;
  return (
    <g
      class={`country${c.bg ? ' bg' : ''}${selectable ? ' selectable' : ''}${dimmed ? ' dimmed' : ''}${flash ? ' flash' : ''}${ctl ? ` ctl-${ctl.toLowerCase()}` : ''}`}
      onClick={onPick}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
    >
      <rect class="c-box" x={left} y={top} width={BW} height={BH} rx="3" />
      <rect class="c-band" x={left} y={top} width={BW} height="17" rx="3" />
      <text class="c-name" x={left + (BW - 13) / 2} y={top + 13.5} textLength={name.length >= 4 ? BW - 16 : undefined} lengthAdjust="spacingAndGlyphs">{name}</text>
      <rect class="c-stab" x={left + BW - 13} y={top + 2} width="11.5" height="13" rx="2" />
      <text class="c-stab-t" x={left + BW - 7.25} y={top + 12.8}>{c.stability}</text>
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

function CountryTip({ id, view }: { id: string; view: GameView }) {
  const c = COUNTRIES[id];
  const hint = odds(id, view);
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
