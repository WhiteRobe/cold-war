import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { cloudCountries, keyProgress } from '../../engine/endless';
import type { JSX } from 'preact';
import { CARDS, COUNTRIES, COUNTRY_LIST, REGIONS, REGION_ZH, countriesIn, endlessWorld, getWorldVersion, type RegionId, type Side } from '../../data';
import type { SubRegionId } from '../../data/types';
import { controller, scoreRegion, scoreSEA } from '../../engine/scoring';
import type { GameView } from '../../engine/view';
import { WORLD } from './worldmap.gen';
import { remapX, remapY } from '../../data/layout';
import { Flag, FogLayer, FxLayer, Tank, useMapFx } from './MapFx';
import { countryMarks, type CardKind } from './countryCards';
import { STAR_PTS, SubBadge } from './SubBadge';
import { SpaceArsenal } from './SpaceArsenal';
import { MarkGlyph } from './MarkGlyph';
import { maxARs } from '../../ai/eval';

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
  // 巴拿马下移后和哥伦比亚几乎同高，连线成了横线：哥伦比亚往东南挪
  colombia: [12, 16],
  // 朝鲜、韩国方框挨得太紧：朝鲜往上挪
  northKorea: [0, -10],
  // 巴拉圭、乌拉圭上下拉开（巴拉圭上面挨着玻利维亚，只挪乌拉圭）
  uruguay: [10, 16],
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
  /** 记录区点国家定位时的序号（每次点击重新播放闪烁） */
  focusKey?: number;
  /** 点了国家右下角的闪电：列出点名该国的卡 */
  onBolt?: (id: string, x: number, y: number, now?: boolean, kind?: CardKind) => void;
  onBoltLeave?: () => void;
}

export function MapView({ view, selectable, onPick, flash, onRegion, focus, focusKey, onBolt, onBoltLeave }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const { fx, fresh, regionCtl } = useMapFx(view);
  const [zoom, setZoom] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; zx: number; zy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 世界版本：不死不休把中国、蒙古变成亚洲国家、增加新邻接，地图缓存跟着重算
  const wv = getWorldVersion();
  const ew = endlessWorld();
  const bg = useMemo(
    () => (
      <g class="map-bg">
        {WORLD.map((w, i) => {
          const kind = ew && (w.id === 'China' || w.id === 'Mongolia') ? 'asia' : w.kind;
          return <path key={i} d={w.d} fill={shade(w.id, kind)} class={`land k-${kind}`} />;
        })}
        {!ew && <text class="land-label" x={rx(1225)} y="400">中 国</text>}
      </g>
    ),
    [wv],
  );

  // 中国牌在谁手里，中国本土就染上谁的光晕（背面朝上暂不能用时淡一些）
  const chinaGlow = ew ? null : (
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
  }, [wv]);

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
        // 亚太国家（日本，不死不休里还有澳大利亚、菲律宾）与美国：向右画出地图边缘
        if (b === 'usa' && COUNTRIES[a].region === 'asia') {
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
  // 记录区点国家定位：国家在放大后的视野外时，把视野移过去
  useEffect(() => {
    if (!focusKey || !focus || !COUNTRIES[focus]) return;
    const z = live.current;
    if (z.k <= 1) return;
    const [x, y] = pos(focus);
    const w = MAP_W / z.k, h = MAP_H / z.k;
    if (x > z.x + 40 && x < z.x + w - 40 && y > z.y + 30 && y < z.y + h - 30) return;
    setZoom(clampZoom({ x: x - w / 2, y: y - h / 2, k: z.k }));
  }, [focusKey]);
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
        <SpaceArsenal view={view} home={{ US: pos('usa'), USSR: pos('ussr') }} />
        <OilReserve view={view} />
        {view.flags.northSeaOil && <NorthSeaRig x={688} y={150} eight={!!view.flags.northSeaOil8} />}
        {view.flags.norad && <NoradRadar x={250} y={176} />}
        {view.flags.usJapan && <Carrier x={1812} y={490} />}
        {view.flags.deGaulle && <FrenchFlag x={676} y={396} />}
        {view.flags.nuclearSubs && <NuclearSub x={505} y={440} />}
        {view.flags.marshall && <AidShip x={452} y={262} natoOpen={natoOpen(view)} />}
        {view.flags.evilEmpire && <Speaker x={196} y={212} />}
        {eventHappened(view, 84) && <Craters x={880} y={522} />}
        {eventHappened(view, 70) && <OasFlag x={482} y={702} />}
        {view.flags.reformer && <Reformer x={1258} y={252} />}
        {view.flags.bearTrap && <WreckedTank x={1244} y={398} />}
        {view.flags.iranContra && <Reporter x={300} y={296} />}
        {view.flags.brezhnev && <TankColumn x={1384} y={262} />}
        {eventHappened(view, 15) && <EgyptFlag x={976} y={533} />}
        {eventHappened(view, 83) && <RoyalNavy x={440} y={950} />}
        {eventHappened(view, 76) && <UssuriStandoff x={1612} y={246} />}
        {view.flags.awacs && <Awacs x={1224} y={598} />}
        {eventHappened(view, 58) && <BrokenPagoda x={1466} y={352} />}
        {eventHappened(view, 99) && <MissileTruck x={985} y={256} />}
        {view.flags.cmc && <SovietSub x={378} y={452} side={view.flags.cmc} />}
        {view.flags.cmc && <MissileSilo x={1126} y={378} side={view.flags.cmc} />}
        {eventHappened(view, 90) && <KremlinWalls x={1092} y={226} />}
        {eventHappened(view, 26) && <TrenchSpy x={238} y={352} />}
        {view.flags.aldrichAmes && <IntelSeller x={1170} y={292} />}
        {eventHappened(view, 71) && <PingPong x={1664} y={348} />}
        {eventHappened(view, 8) && <CubaFlag x={254} y={461} />}
        {view.flags.quagmire && <QuagmireHeli x={1620} y={512} />}
        {view.flags.formosan && <AAGun x={1662} y={474} />}
        {eventHappened(view, 82) && <BlackCrescent x={1238} y={466} />}
        {eventHappened(view, 33) && <FallenStatue x={1330} y={302} />}
        {eventHappened(view, 65) && <PeaceDove x={1027} y={556} />}
        {eventHappened(view, 9) && <VietnamFire x={1588} y={548} active={!!view.flags.vietnamRevolts} />}
        {view.flags.containment && <Carrier x={1690} y={612} tip={decorTip('1946 年凯南提出“遏制”构想：在苏联试图扩张的每一处坚定地加以阻挡，美国舰队由此常驻亚太。', '本回合美国打出的每张牌行动点 +1（最多 4）')} />}
        {view.flags.chernobyl && (
          <g transform="translate(1078,300)" class="cb-ukr">
            <title>切尔诺贝利：本回合苏联不能用行动点在{REGION_ZH[view.flags.chernobyl]}放置影响力</title>
            <Radiation r={11} />
          </g>
        )}
        {view.flags.flowerPower && <AntiWarProtest x={262} y={318} />}
        <text x={MAP_W - 8} y={pos('japan')[1] + 38} class="edge-label" text-anchor="end">→ 美国</text>
        {ew && ['philippines', 'australia'].map((c) => <text key={c} x={MAP_W - 8} y={pos(c)[1] - 6} class="edge-label" text-anchor="end">→ 美国</text>)}
        <text x={8} y={pos('usa')[1] - 10} class="edge-label">{ew ? '日本 · 菲律宾 · 澳大利亚 ←' : '日本 ←'}</text>
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
        {ew && <EndlessClouds view={view} />}
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
        {focus && COUNTRIES[focus] && COUNTRY_LIST.some((c) => c.id === focus) && (
          <g class={`roll-focus${focusKey ? ' locate' : ''}`} key={`${focus}-${focusKey ?? ''}`}>
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

/** 某方本回合还剩几个行动轮（苏联每轮先行动；头条阶段算整回合） */
function arsLeftOf(v: GameView, side: Side): number {
  const max = maxARs(v, side);
  if (v.phase === 'headline') return max;
  const acted = side === 'USSR' ? v.phasing === 'US' : false;
  return Math.max(0, max - v.ar + (acted ? 0 : 1));
}

/** 地图右上角：当前存在的直接获胜 / 直接判负威胁 */
function WinAlerts({ view }: { view: GameView }) {
  if (view.phase === 'over' || view.phase === 'setup') return null;
  const items: { key: string; cls: string; text: string; tip: string }[] = [];
  const endless = !!view.options.endless;
  if (endless) {
    // 不死不休：只看关键国（全部战场国 + 对手本土邻国）
    for (const side of ['US', 'USSR'] as Side[]) {
      const p = keyProgress(view as never, side);
      if (p.missing.length > 3) continue;
      const name = side === 'US' ? '美国' : '苏联';
      items.push({ key: `g-${side}`, cls: side.toLowerCase(), text: `${name}关键国 ${p.have}/${p.total}：再控制${p.missing.map((c) => COUNTRIES[c].zh).join('、')}即获胜`, tip: '不死不休：一方控制全部战场国和对手本土的全部邻国时立即获胜。' });
    }
  }
  const eu = endless ? undefined : scoreRegion(view as never, 'europe').autoWin;
  if (eu) items.push({ key: 'eu', cls: eu.toLowerCase(), text: `${eu === 'US' ? '美国' : '苏联'}控制欧洲：打出欧洲计分即获胜`, tip: EUROPE_WIN });
  const a = Math.abs(view.vp);
  if (a >= 15 && !endless) {
    const sd = view.vp > 0 ? '美国' : '苏联';
    items.push({ key: 'vp', cls: view.vp > 0 ? 'us' : 'ussr', text: `${sd} ${a} VP：再得 ${20 - a} 分直接获胜`, tip: '任何时候胜利点达到 20，这一方立即获胜。' });
  }
  // 计分卡打不完：剩余行动轮比手里（已知）的计分卡少，回合末持牌判负
  if (!endless && (view.phase === 'action' || view.phase === 'headline')) {
    for (const side of ['US', 'USSR'] as const) {
      const sc = view.hands[side].filter((c) => CARDS[c]?.scoring).length;
      if (!sc) continue;
      const left = arsLeftOf(view, side);
      if (sc <= left) continue;
      const mine = side === view.me;
      const name = side === 'US' ? '美国' : '苏联';
      items.push({
        key: `sc-${side}`,
        cls: mine ? 'warn' : side === 'US' ? 'ussr' : 'us',
        text: mine ? `你手里 ${sc} 张计分卡、只剩 ${left} 个行动轮：回合末必然判负` : `${name}握着 ${sc} 张计分卡、只剩 ${left} 个行动轮：回合末判负`,
        tip: `回合结束时手里还有计分卡的一方直接输。每个行动轮最多打出一张计分卡，${name}已经来不及全部打完${mine ? '' : '（只统计已经公开的手牌）'}。`,
      });
    }
  }
  // “我们将埋葬你们”：美国下一个行动轮必须以事件打出联合国干预，否则苏联 +3 VP
  if (view.flags.wwby) {
    const mine = view.me === 'US';
    items.push({
      key: 'wwby',
      cls: mine ? 'warn' : 'ussr',
      text: mine ? '“我们将埋葬你们”：你下个行动轮须以事件打出「联合国干预」，否则苏联 +3 VP' : '“我们将埋葬你们”：美国下个行动轮不以事件打出「联合国干预」，苏联就 +3 VP',
      tip: '苏联打出“我们将埋葬你们”后，美国必须在接下来的第一个行动轮把「联合国干预」（#32）作为事件打出，否则苏联获得 3 点胜利点数。',
    });
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
    win && view.options.endless ? `${win === 'US' ? '美' : '苏'} +10 VP` : win ? `${win === 'US' ? '美' : '苏'}直接获胜` : net > 0 ? `美 +${net} VP` : net < 0 ? `苏 +${-net} VP` : '打平 0 VP';
  const sea = region === 'asia' ? scoreSEA(view as never) : null;
  // 不死不休（第 11 回合起）没有计分：只显示存在 / 支配 / 控制
  const ewOn = !!view.flags.endlessWorld;
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
      {view.flags.chernobyl === region && (
        <g transform={`translate(${x + REGION_ZH[region].length * 27.6 + (scoredNote(view, region) ? 28 : 10)},${y - 8})`} class="cb-label">
          <title>切尔诺贝利：美国指定了{REGION_ZH[region]}，本回合苏联不能用行动点在这里放置影响力（政变、调整阵营不受影响）</title>
          <Radiation r={8} />
        </g>
      )}
      {view.flags.endlessWorld && <EndlessTroops x={x + TROOP_AT[region][0]} y={y + TROOP_AT[region][1]} sc={sc} />}
      {view.flags.endlessWorld && <EndlessEmblems x={x + REGION_ZH[region].length * 27.6 + (scoredNote(view, region) ? 28 : 10) + (view.flags.chernobyl === region ? 22 : 0)} y={y - 8} region={region} sc={sc} />}
      <text x={x} y={y + 18} class="rl-score">
        <tspan class="us">美 {LV_ZH[sc.US.level]}{ewOn ? '' : ` ${sc.points.US}`}</tspan>
        <tspan dx="10" class="ussr">苏 {LV_ZH[sc.USSR.level]}{ewOn ? '' : ` ${sc.points.USSR}`}</tspan>
      </text>
      {!ewOn && <text x={x} y={y + 35} class={`rl-vp ${sc.autoWin ? sc.autoWin.toLowerCase() : sc.net > 0 ? 'us' : sc.net < 0 ? 'ussr' : 'even'}`}>
        {sc.autoWin && <title>{EUROPE_WIN}</title>}
        现在计分：{vpText(sc.net, sc.autoWin)}
      </text>}
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
      {sea && !ewOn && (
        <text x={x} y={y + 52} class={`rl-vp ${sea.net > 0 ? 'us' : sea.net < 0 ? 'ussr' : 'even'}${view.removed.includes(SCORING_CARD.southeastAsia) ? ' done' : ''}`}>
          东南亚计分：{vpText(sea.net)}
        </text>
      )}
    </g>
  );
}

/** 不死不休：洲名后的阵营徽章（悬停说明区域红利 / 区域压制） */
function EndlessEmblems({ x, y, region, sc }: { x: number; y: number; region: RegionId; sc: ReturnType<typeof scoreRegion> }) {
  const out = (['US', 'USSR'] as Side[]).filter((s) => sc[s].level === 'domination' || sc[s].level === 'control');
  return (
    <>
      {out.map((side, i) => {
        const ctl = sc[side].level === 'control';
        const who = side === 'US' ? '美国' : '苏联';
        return (
          <g key={side} class={`ew-emblem ${side.toLowerCase()}${ctl ? ' ctl' : ''}`} transform={`translate(${x + 6 + i * 30},${y})`}>
            <title>
              {who}{ctl ? '控制' : '支配'}{REGION_ZH[region]}：每个行动轮前 +{ctl ? 2 : 1} 点免费影响力（全图任意）
              {ctl ? `；每回合开始，${REGION_ZH[region]}里每个有${side === 'US' ? '苏联' : '美国'}影响力的国家各 -1` : ''}
            </title>
            <circle r="13" />
            <polygon points={starPts(0, 0, 8.5)} />
          </g>
        );
      })}
    </>
  );
}

function starPts(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** 士兵 / 坦克放在洲名下方（避开计分说明和图例） */
const TROOP_AT: Record<RegionId, [number, number]> = {
  europe: [30, 86], africa: [40, 74], asia: [40, 100], middleEast: [40, 76], centralAmerica: [40, 78], southAmerica: [40, 78],
};

/** 不死不休：支配的洲站着士兵，控制的洲开进坦克（画在洲名旁的空白处，纯装饰，不响应鼠标） */
function EndlessTroops({ x, y, sc }: { x: number; y: number; sc: ReturnType<typeof scoreRegion> }) {
  const sides = (['US', 'USSR'] as Side[]).filter((s) => sc[s].level === 'domination' || sc[s].level === 'control');
  return (
    <g class="ew-troops">
      {sides.map((side, k) => (
        <g key={side} class={`ew-troop ${side.toLowerCase()}`} transform={`translate(${x + k * 52},${y}) scale(1.5)`}>
          {sc[side].level === 'control' ? (
            <g>
              <rect x="-14" y="-2" width="28" height="7" rx="3" class="tr-track" />
              <rect x="-11" y="-9" width="22" height="8" rx="1.5" class="tr-body" />
              <rect x="-5" y="-14" width="11" height="6" rx="1.5" class="tr-body" />
              <rect x="5" y="-12.5" width="14" height="2.4" class="tr-gun" />
            </g>
          ) : (
            [-8, 0, 8].map((dx) => (
              <g key={dx} transform={`translate(${dx},0)`}>
                <rect x="-2.6" y="-10" width="5.2" height="10" rx="1" class="tr-body" />
                <circle cx="0" cy="-12.5" r="2.6" class="tr-head" />
                <path d="M-3.6,-13.6 h7.2 l-1,-2.4 h-5.2z" class="tr-helm" />
                <line x1="3" y1="-4" x2="6" y2="-17" class="tr-gun-l" />
              </g>
            ))
          )}
        </g>
      ))}
    </g>
  );
}

/** 不死不休：乌云——一方控制的、与对手本土相邻的国家，在对手本回合第一张行动点牌打出前笼罩着乌云 */
function EndlessClouds({ view }: { view: GameView }) {
  const spent = view.flags.firstOps ?? [];
  const out: JSX.Element[] = [];
  for (const owner of ['US', 'USSR'] as Side[]) {
    const victim: Side = owner === 'US' ? 'USSR' : 'US';
    if (spent.includes(victim)) continue;
    const list = cloudCountries(view as never, owner);
    for (const c of list) {
      const [x, y] = pos(c);
      out.push(
        <g key={c} class={`ew-cloud ${owner.toLowerCase()}`} transform={`translate(${x + BW * 0.5 - 6},${y - BH * 0.5 - 8})`}>
          <title>
            乌云压境：{owner === 'US' ? '美国' : '苏联'}控制着{victim === 'US' ? '美国' : '苏联'}的本土邻国{COUNTRIES[c].zh}。
            {victim === 'US' ? '美国' : '苏联'}本回合第一张用行动点打出的牌，每个这样的国家 -1 行动点（共 {list.length} 个）；扣不下的差额由{owner === 'US' ? '美国' : '苏联'}放置影响力。打出后乌云散去。
          </title>
          <path d="M-9,4 a6,6 0 0 1 3,-10 a8,8 0 0 1 14,-1 a6,6 0 0 1 4,11 z" />
          <path d="M-1,5 l-3,6 l4,-2 l-2,6" class="bolt" />
        </g>,
      );
    }
  }
  return <g class="ew-clouds">{out}</g>;
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
      {view.me === 'USSR' && view.flags.chernobyl === c.region && (
        <g transform={`translate(${left + (lock ? 14 : 0)},${top})`} class="cb-box">
          <title>切尔诺贝利：本回合你不能用行动点在{REGION_ZH[c.region]}放置影响力</title>
          <Radiation r={6} />
        </g>
      )}
      {lock && (
        <g class="ban-icon" transform={`translate(${left},${top})`}>
          <title>{lock}</title>
          <circle r="6" />
          <line x1="-3.9" y1="-3.9" x2="3.9" y2="3.9" />
        </g>
      )}
      {/* 点名该国的卡：左下角从左往右、右下角从右往左（闪电永远最右）；还没到时期的半透明；悬停展开卡列表 */}
      {markSlots(marks, left).map(([k, mx]) => (
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

/** 方框下沿标记的横坐标：统一间距 15；左右两组放得下就分居两角，放不下（超过 4 个）就整排居中，
 *  顺序仍是左组在前、闪电在最右，保证不重叠、间距一致 */
const MARK_GAP = 15;
function markSlots(marks: { left: CardKind[]; right: CardKind[] }, left: number): [CardKind, number][] {
  const n = marks.left.length + marks.right.length;
  if (n <= 4) {
    return [
      ...marks.left.map((k, i) => [k, left + 1 + i * MARK_GAP] as [CardKind, number]),
      ...marks.right.map((k, i) => [k, left + BW - 1 - i * MARK_GAP] as [CardKind, number]),
    ];
  }
  const row = [...marks.left, ...[...marks.right].reverse()];
  const x0 = left + BW / 2 - ((n - 1) * MARK_GAP) / 2;
  return row.map((k, i) => [k, x0 + i * MARK_GAP]);
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
      // 亚太国家连美国的线向右画出地图边缘
      if (home === 'usa' && c.region === 'asia') {
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
    const [x, y] = pos(id);
    const slot = markSlots(countryMarks(view, id), x - BW / 2).find(([k]) => k === 'war');
    return slot ? [slot[1], y - BH / 2 + BH + 1] : null;
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
  const natoOpen = natoOpenFn(view);
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
        <title>{decorTip('1949 年北大西洋公约签订，对任一成员国的攻击视为对全体的攻击。', '苏联不能对美国控制的欧洲国家发动政变或调整阵营')}</title>
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
        <title>{decorTip('1955 年苏联与东欧七国签订华沙条约，组成与北约对峙的军事同盟。', natoOpen ? '「北大西洋公约组织」可以作为事件打出了' : null)}</title>
        <circle r="80" class="pk-ring" />
        <circle r="70" class="pk-ring thin" />
        <polygon points={star} class="pk-star" />
      </g>,
    );
  }
  return <g class="pact-overlay">{out}</g>;
}

/** 苏联控制的产油国：西伯利亚太空装备下方摆一排油桶，一国一桶（「石油输出国组织」按这个数给苏联加分） */
const OPEC_IDS = ['egypt', 'iran', 'libya', 'saudiArabia', 'iraq', 'gulfStates', 'venezuela'];
function OilReserve({ view }: { view: GameView }) {
  if (view.flags.northSeaOil) return null;
  const held = OPEC_IDS.filter((id) => controller(view as never, id) === 'USSR');
  if (!held.length) return null;
  const names = held.map((id) => COUNTRIES[id].zh).join('、');
  return (
    <g class="oil-reserve">
      <title>苏联控制的产油国（{held.length}）：{names}。打出「石油输出国组织」时苏联 +{held.length} VP</title>
      {held.map((id, i) => (
        <g key={id} transform={`translate(${1326 + i * 20},${186})`} class="oil-barrel">
          <rect x="-6" y="-8" width="12" height="16" rx="2" class="ob-body" />
          <ellipse cx="0" cy="-8" rx="6" ry="1.8" class="ob-top" />
          <path d="M-6,-3 L6,-3 M-6,3 L6,3" class="ob-band" />
          <path d="M0,-2 C1.3,-0.3 1.8,0.6 1.8,1.2 A1.8,1.8 0 0 1 -1.8,1.2 C-1.8,0.6 -1.3,-0.3 0,-2Z" class="ob-drop" />
        </g>
      ))}
    </g>
  );
}

/** 北海油田发动后：英国与丹麦之间的北海上立起一座海上采油平台 */
function NorthSeaRig({ x, y, eight }: { x: number; y: number; eight: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="ns-rig">
        <title>{decorTip('1970 年代英国、挪威在北海开发出大型海上油田，西欧对中东石油的依赖随之下降。', `「石油输出国组织」不能再作为事件打出${eight ? '；本回合美国可以进行 8 个行动轮' : ''}`)}</title>
        <path d="M-22,14 q4,-3 8,0 t8,0 t8,0 t8,0 t8,0 M-18,19 q4,-3 8,0 t8,0 t8,0 t8,0" class="ns-wave" />
        <path d="M-12,-2 L-15,15 M12,-2 L15,15 M-5,-2 L-6,15 M5,-2 L6,15 M-14,8 L14,8" class="ns-leg" />
        <polygon points="-16,-6 16,-6 15,-1 -15,-1" class="ns-deck" />
        <polygon points="-14,-11 -3,-11 -3,-6 -14,-6" class="ns-hut" />
        <path d="M2,-6 L6,-28 L10,-6 M3,-12 L9,-12 M4,-18 L8,-18 M3,-12 L8,-18 M9,-12 L4,-18" class="ns-derrick" />
        <path d="M15,-4 L26,-14" class="ns-boom" />
        <path d="M26,-14 C24,-18 27,-21 26,-25 C29,-22 31,-18 28,-14Z" class="ns-flame" />
      </g>
    </g>
  );
}

/** 北美防空司令部生效：加拿大国土上立起一座旋转的雷达站 */
function NoradRadar({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="nr-radar">
        <title>{decorTip('1958 年美加联合成立北美防空司令部，共同监视北美上空的轰炸机与导弹。', '每个行动轮结束时，若美国控制加拿大且这一轮 DEFCON 变为 2，美国在一个已有美国影响力的国家 +1 影响力（「泥潭」会取消）')}</title>
        <path d="M-4,10 L-1,-4 L1,-4 L4,10 M-3,5 L3,5" class="nr-tower" />
        <rect x="-9" y="10" width="18" height="4" rx="1" class="nr-base" />
        <g class="nr-dish">
          <path d="M-11,-12 Q0,-1 11,-12 L9,-14 Q0,-5 -9,-14Z" class="nr-bowl" />
          <path d="M0,-6 L0,-15" class="nr-feed" />
          <circle cx="0" cy="-15.5" r="1.4" class="nr-tip" />
        </g>
        <path d="M14,-20 A16,16 0 0 1 18,-8 M18,-24 A22,22 0 0 1 24,-6" class="nr-wave" />
      </g>
    </g>
  );
}

/** 美日共同防卫协定生效：日本外海停着一艘美国航空母舰 */
function Carrier({ x, y, tip }: { x: number; y: number; tip?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="cv-ship">
        <title>{tip ?? decorTip('1951 年美日签订安全条约，美军留驻日本，日本成为美国在亚洲最重要的盟友。', '苏联不能对日本政变或调整阵营')}</title>
        <path d="M-28,8 q4,-3 8,0 t8,0 t8,0 t8,0 t8,0 t8,0 t8,0" class="cv-wave" />
        <polygon points="-26,2 24,2 28,-2 -28,-2" class="cv-hull" />
        <polygon points="-28,-2 28,-2 26,-5 -24,-5" class="cv-deck" />
        <path d="M-20,-3.5 L18,-3.5" class="cv-line" />
        <polygon points="10,-5 17,-5 17,-11 12,-11 12,-14 14,-14 14,-11" class="cv-island" />
        <polygon points="-15,-6.2 -9,-6.2 -12,-8.6" class="cv-plane" />
        <polygon points="-3,-6.2 3,-6.2 0,-8.6" class="cv-plane" />
        <polygon points="-27,-2 -21,-2 -21,-1 -27,-1" class="cv-flag" />
      </g>
    </g>
  );
}

/** 戴高乐领导法国生效：法国国土上插一面三色旗 */
function FrenchFlag({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="fr-flag">
        <title>{decorTip('1966 年戴高乐让法国退出北约一体化军事指挥，坚持独立自主的国防。', '北约不再保护法国')}</title>
        <ellipse cx="0" cy="0" rx="5" ry="1.6" class="fr-base" />
        <rect x="-0.8" y="-30" width="1.6" height="30" class="fr-pole" />
        <circle cx="0" cy="-30.6" r="1.4" class="fr-knob" />
        <g class="fr-cloth">
          <path d="M0.8,-29 Q4,-30.4 7,-29 L7,-17 Q4,-18.4 0.8,-17Z" fill="#1f4a9a" />
          <path d="M7,-29 Q10,-27.6 13.4,-29 L13.4,-17 Q10,-15.6 7,-17Z" fill="#f6f4ee" />
          <path d="M13.4,-29 Q16.6,-30.4 19.8,-29 L19.8,-17 Q16.6,-18.4 13.4,-17Z" fill="#d8262e" />
        </g>
      </g>
    </g>
  );
}

/** 花之力生效：美国国土上一群反战游行的人举着标语牌 */
function AntiWarProtest({ x, y }: { x: number; y: number }) {
  const people = [
    { dx: -18, sign: 'peace', c: '#c9a06a' },
    { dx: -7, sign: 'NO WAR', c: '#7a9a5a' },
    { dx: 5, sign: 'heart', c: '#b5703a' },
    { dx: 16, sign: 'PEACE', c: '#8a6aa8' },
  ];
  return (
    <g transform={`translate(${x},${y}) scale(1.4)`}>
      <g class="aw-crowd">
        <title>{decorTip('1960 年代后期美国反战与反主流文化运动兴起，“把花插在枪口上”成为标志。', '美国每打出一张战争牌（太空竞赛除外），苏联 +2 VP')}</title>
        {people.map((p, i) => (
          <g key={i} transform={`translate(${p.dx},${(i % 2) * 2})`} class="aw-person" style={{ animationDelay: `${-i * 0.35}s` }}>
            <path d="M0,-8 L0,-20" class="aw-stick" />
            <rect x="-6" y="-29" width="12" height="9" rx="1" class="aw-sign" />
            {p.sign === 'peace' ? (
              <g transform="translate(0,-24.5)"><circle r="3.2" class="aw-mark" /><path d="M0,-3.2 L0,3.2 M0,0.4 L-2.3,2.3 M0,0.4 L2.3,2.3" class="aw-mark" /></g>
            ) : p.sign === 'heart' ? (
              <path d="M0,-21.8 C-4,-24 -3.4,-27.6 0,-25.8 C3.4,-27.6 4,-24 0,-21.8Z" class="aw-heart" />
            ) : (
              <text x="0" y="-22.6" class="aw-text">{p.sign}</text>
            )}
            <circle cx="0" cy="-5" r="2.6" class="aw-head" />
            <path d="M-3.4,6 L-2.8,-2 Q0,-3.4 2.8,-2 L3.4,6Z" fill={p.c} />
            <path d="M1.8,-1.6 L0.6,-12" class="aw-arm" />
          </g>
        ))}
        <path d="M-26,7 L26,7" class="aw-ground" />
      </g>
    </g>
  );
}

/** 核辐射标志：黄底黑色三叶 */
function Radiation({ r }: { r: number }) {
  const blade = (deg: number) => {
    const a1 = ((deg - 30) * Math.PI) / 180, a2 = ((deg + 30) * Math.PI) / 180;
    const ri = r * 0.28, ro = r * 0.86;
    return `M${ri * Math.cos(a1)},${ri * Math.sin(a1)} L${ro * Math.cos(a1)},${ro * Math.sin(a1)} A${ro},${ro} 0 0 1 ${ro * Math.cos(a2)},${ro * Math.sin(a2)} L${ri * Math.cos(a2)},${ri * Math.sin(a2)} A${ri},${ri} 0 0 0 ${ri * Math.cos(a1)},${ri * Math.sin(a1)}Z`;
  };
  return (
    <g class="radiation">
      <circle r={r} class="rd-bg" />
      {[-90, 30, 150].map((d) => <path key={d} d={blade(d)} class="rd-blade" />)}
      <circle r={r * 0.17} class="rd-blade" />
    </g>
  );
}

/** 核潜艇生效：大西洋上浮着一艘核潜艇（指挥塔、尾舵，水线以下半透明） */
function NuclearSub({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="ns-sub">
        <title>{decorTip('1960 年美国首艘弹道导弹核潜艇出航，深藏海底的报复力量成为核威慑最可靠的一环。', '本回合美国在战场国政变不会降低 DEFCON')}</title>
        <path d="M-34,6 L34,6" class="sb-water" />
        <path d="M-30,6 C-30,-2 -22,-5 -12,-5 L22,-5 C30,-5 34,0 34,6Z" class="sb-hull" />
        <path d="M-30,6 C-28,12 -18,13 -10,13 L22,13 C30,13 34,10 34,6Z" class="sb-hull under" />
        <polygon points="-2,-5 2,-14 12,-14 13,-5" class="sb-sail" />
        <path d="M0,-10 L-5,-10 M7,-14 L7,-19" class="sb-mast" />
        <polygon points="-30,0 -38,-6 -38,8 -30,4" class="sb-rudder" />
        <circle cx="16" cy="-1" r="1.2" class="sb-port" />
        <circle cx="22" cy="-1" r="1.2" class="sb-port" />
        <path d="M-40,8 q4,-3 8,0 t8,0 M36,8 q4,-3 8,0 t8,0" class="sb-wave" />
      </g>
    </g>
  );
}

/** 马歇尔计划生效：北大西洋上一艘满载援助物资驶向欧洲的货船 */
function AidShip({ x, y, natoOpen }: { x: number; y: number; natoOpen: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="ms-ship">
        <title>{decorTip('1948 年起美国向西欧提供约 130 亿美元援助，帮助战后重建。', natoOpen ? '「北大西洋公约组织」可以作为事件打出了' : null)}</title>
        <path d="M-30,8 q4,-3 8,0 t8,0 t8,0 t8,0 t8,0 t8,0 t8,0" class="cv-wave" />
        <polygon points="-26,4 24,4 30,-3 -28,-3" class="ms-hull" />
        <polygon points="-28,-3 30,-3 29,-1 -27,-1" class="ms-stripe" />
        <rect x="-20" y="-10" width="8" height="7" class="ms-box a" />
        <rect x="-11" y="-10" width="8" height="7" class="ms-box b" />
        <rect x="-16" y="-16" width="8" height="6" class="ms-box b" />
        <rect x="-2" y="-10" width="8" height="7" class="ms-box a" />
        <polygon points="12,-3 22,-3 22,-11 14,-11" class="ms-bridge" />
        <rect x="16" y="-17" width="3" height="6" class="ms-funnel" />
        <circle cx="17.5" cy="-20" r="2" class="ms-smoke" />
        <circle cx="15" cy="-23.5" r="2.6" class="ms-smoke" />
      </g>
    </g>
  );
}

/** “邪恶帝国”生效：加拿大西边一位美国领导人站在讲台后演讲（通用剪影） */
function Speaker({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="sp-speech">
        <title>{decorTip('1983 年里根在演讲中把苏联称为“邪恶帝国”，美国对苏政策重回强硬。', '「花之力」被取消且不能再作为事件打出')}</title>
        <ellipse cx="0" cy="12" rx="14" ry="2.4" class="sp-shadow" />
        {/* 演讲者：头、发型、西装、抬起的手 */}
        <circle cx="0" cy="-14" r="4.2" class="sp-face" />
        <path d="M-4.2,-15.4 Q-3.6,-19.6 0.6,-19.4 Q4.4,-19 4.3,-15 Q2,-17.4 -1,-16.8Z" class="sp-hair" />
        <path d="M-7,2 L-6,-7 Q0,-10.4 6,-7 L7,2Z" class="sp-suit" />
        <path d="M-1.2,-9.6 L0,-6.4 L1.2,-9.6Z" class="sp-tie" />
        <path d="M5,-6.6 L9.4,-13.4" class="sp-arm" />
        <circle cx="9.8" cy="-14.2" r="1.6" class="sp-face" />
        {/* 讲台与话筒 */}
        <polygon points="-9,12 9,12 7,-1 -7,-1" class="sp-podium" />
        <polygon points={STAR_PTS(0, 5.4, 3.2)} class="sp-star" />
        <path d="M3,-1 L5,-6" class="sp-mic" />
        <circle cx="5.2" cy="-6.6" r="1" class="sp-mic-head" />
        {/* 声波 */}
        <path d="M13,-16 A6,6 0 0 1 13,-8 M16,-19 A10,10 0 0 1 16,-5" class="sp-wave" />
      </g>
    </g>
  );
}

/** 里根轰炸利比亚之后：利比亚北部留下两个焦黑的弹坑 */
function Craters({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
     <g class="crater-wrap">
      <title>{decorTip('1986 年美国空袭利比亚的黎波里和班加西，回应西柏林舞厅爆炸案。')}</title>
      {[[-12, 2, 1], [10, -3, 0.8]].map(([dx, dy, k], i) => (
        <g key={i} transform={`translate(${dx},${dy}) scale(${k})`}>
          <ellipse rx="11" ry="5" class="cr-rim" />
          <ellipse rx="8" ry="3.4" class="cr-hole" />
          {[0, 50, 110, 170, 230, 290].map((d) => (
            <circle key={d} cx={13 * Math.cos((d * Math.PI) / 180)} cy={6 * Math.sin((d * Math.PI) / 180)} r="1.1" class="cr-debris" />
          ))}
          <path d="M1,-3 C-2,-8 3,-10 0,-15" class="cr-smoke" />
        </g>
      ))}
     </g>
    </g>
  );
}

/** 美洲国家组织成立之后：巴西境内插一面简化的组织旗（自绘，不照搬官方徽章） */
function OasFlag({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="oas-flag">
        <title>{decorTip('1948 年美洲国家组织在波哥大成立，冷战中常被用来协调西半球的反共立场。')}</title>
        <ellipse cx="0" cy="0" rx="5" ry="1.6" class="fr-base" />
        <rect x="-0.8" y="-30" width="1.6" height="30" class="fr-pole" />
        <circle cx="0" cy="-30.6" r="1.4" class="fr-knob" />
        <g class="fr-cloth">
          <path d="M0.8,-29 Q10,-31 20,-29 L20,-16 Q10,-18 0.8,-16Z" class="oas-cloth" />
          <circle cx="10.4" cy="-22.6" r="5" class="oas-disc" />
          <circle cx="10.4" cy="-22.6" r="5" class="oas-ring" />
          <text x="10.4" y="-21.4" class="oas-text">OAS</text>
        </g>
      </g>
    </g>
  );
}

/** 改革者生效：苏联境内一位苏联领导人站在挂红旗的讲台后（通用剪影） */
function Reformer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="sp-speech rf-speech">
        <title>{decorTip('1985 年戈尔巴乔夫出任苏共总书记，推行改革与“新思维”，主张与西方缓和。', '苏联不能再在欧洲发动政变；「公开性」打出时苏联还可用它的行动点调整阵营或放置影响力')}</title>
        <ellipse cx="0" cy="12" rx="14" ry="2.4" class="sp-shadow" />
        <circle cx="0" cy="-14" r="4.4" class="sp-face" />
        <path d="M-4.4,-13 Q-4.6,-15.6 -3.6,-16.4 M4.4,-13 Q4.6,-15.6 3.6,-16.4" class="rf-hair" />
        <path d="M-7,2 L-6,-7 Q0,-10.4 6,-7 L7,2Z" class="sp-suit" />
        <path d="M-1.2,-9.6 L0,-6.4 L1.2,-9.6Z" class="rf-tie" />
        <path d="M-5,-6.6 L-9.4,-12" class="sp-arm" />
        <circle cx="-9.8" cy="-12.8" r="1.6" class="sp-face" />
        <polygon points="-9,12 9,12 7,-1 -7,-1" class="rf-podium" />
        <polygon points={STAR_PTS(0, 5.4, 3.2)} class="rf-star" />
        <path d="M-3,-1 L-5,-6" class="sp-mic" />
        <circle cx="-5.2" cy="-6.6" r="1" class="sp-mic-head" />
        <path d="M-13,-16 A6,6 0 0 0 -13,-8 M-16,-19 A10,10 0 0 0 -16,-5" class="sp-wave" />
      </g>
    </g>
  );
}

/** 熊陷阱生效：阿富汗山地里一辆被击毁、冒着黑烟的坦克 */
function WreckedTank({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="wt-tank">
        <title>{decorTip('1979 年苏联出兵阿富汗，陷入近十年的山地游击战，被称为“苏联的越南”。', '苏联每个行动轮须弃一张 2 点以上的牌并掷 1–4 才能脱身（仍可打出计分卡）')}</title>
        <ellipse cx="0" cy="6" rx="15" ry="2.6" class="sp-shadow" />
        <polygon points="-13,5 -15,1 15,1 13,5" class="wt-track" />
        <polygon points="-12,1 -10,-4 10,-4 12,1" class="wt-body" />
        <polygon points="-5,-4 -3,-8 5,-8 6,-4" class="wt-body" />
        <path d="M4,-6.6 L13,-4" class="wt-gun" />
        <circle cx="-1" cy="-6" r="1.6" class="wt-fire" />
        <circle cx="-2" cy="-12" r="3.4" class="wt-smoke a" />
        <circle cx="1" cy="-18" r="4.4" class="wt-smoke b" />
        <circle cx="-1" cy="-25" r="5.2" class="wt-smoke c" />
      </g>
    </g>
  );
}

/** 伊朗门生效：美国境内一名举着相机拍照的记者（相机闪光） */
function Reporter({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="rp-man">
        <title>{decorTip('1980 年代中期美国秘密向伊朗售武，所得款项转给尼加拉瓜反政府武装，丑闻曝光后举国哗然。', '本回合美国调整阵营掷骰 -1')}</title>
        <ellipse cx="0" cy="13" rx="9" ry="2" class="sp-shadow" />
        <path d="M-3,13 L-2,4 M3,13 L2,4" class="rp-leg" />
        <path d="M-5,5 L-4.4,-6 Q0,-8.6 4.4,-6 L5,5Z" class="rp-coat" />
        <circle cx="0" cy="-10.6" r="3.6" class="sp-face" />
        <path d="M-4.6,-12 L4.6,-12 L3.4,-15.4 L-3.4,-15.4Z M-6,-11.6 L6,-11.6" class="rp-hat" />
        <text x="-2.4" y="-12.6" class="rp-press">PRESS</text>
        <path d="M4,-4 L8,-9" class="rp-arm" />
        <rect x="6.6" y="-13.6" width="7" height="5" rx="1" class="rp-cam" />
        <circle cx="10.1" cy="-11.1" r="1.6" class="rp-lens" />
        <path d="M14.6,-12.4 L19,-15 M14.8,-10.6 L20,-10.6 M14.6,-8.8 L19,-6.4" class="rp-flash" />
      </g>
    </g>
  );
}

/** 勃列日涅夫主义生效：中国北边的苏联国土上一列坦克集结 */
function TankColumn({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="tc-column">
        <title>{decorTip('1968 年出兵捷克后，勃列日涅夫宣称社会主义国家主权有限、苏联有权干预。', '本回合苏联每次使用行动点都 +1')}</title>
        {[[-26, 4], [0, 0], [26, 4]].map(([dx, dy], i) => (
          <g key={i} transform={`translate(${dx},${dy})`} class="tc-tank" style={{ animationDelay: `${-i * 0.3}s` }}>
            <ellipse cx="0" cy="6" rx="13" ry="2.2" class="sp-shadow" />
            <polygon points="-11,5 -13,1 13,1 11,5" class="wt-track" />
            <polygon points="-10,1 -8,-4 8,-4 10,1" class="tc-body" />
            <polygon points="-4,-4 -2,-8 4,-8 5,-4" class="tc-body" />
            <path d="M4,-6.4 L14,-7.4" class="wt-gun" />
            <polygon points={STAR_PTS(-5, -1.4, 1.6)} class="tc-star" />
          </g>
        ))}
      </g>
    </g>
  );
}

/** 地图装饰的悬停说明：一句历史背景；效果还在持续时再加一行当前效果 */
function decorTip(story: string, effect?: string | null) {
  return effect ? `${story}\n⏳ 生效中：${effect}` : story;
}

/** 北约还没打出：马歇尔计划 / 华约“允许打出北约”的效果仍有意义 */
function natoOpenFn(v: GameView) {
  return !v.inPlay.includes(21) && !v.removed.includes(21) && !v.flags.nato;
}
const natoOpen = natoOpenFn;

/** 纳赛尔之后：埃及境内的红白黑三色旗（中间简化的金色徽记） */
function EgyptFlag({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="fr-flag">
        <title>{decorTip('1952 年埃及自由军官发动政变，纳赛尔掌权后推动阿拉伯民族主义，并接受苏联援助。')}</title>
        <ellipse cx="0" cy="0" rx="5" ry="1.6" class="fr-base" />
        <rect x="-0.8" y="-30" width="1.6" height="30" class="fr-pole" />
        <circle cx="0" cy="-30.6" r="1.4" class="fr-knob" />
        <g class="fr-cloth">
          <path d="M0.8,-29 Q10,-31 19.8,-29 L19.8,-25 Q10,-27 0.8,-25Z" fill="#ce1126" />
          <path d="M0.8,-25 Q10,-27 19.8,-25 L19.8,-21 Q10,-23 0.8,-21Z" fill="#f8f8f4" />
          <path d="M0.8,-21 Q10,-23 19.8,-21 L19.8,-17 Q10,-19 0.8,-17Z" fill="#1b1b1b" />
          <path d="M10.3,-25.6 L12,-23.4 L10.3,-21.8 L8.6,-23.4Z" fill="#c09a2e" />
        </g>
      </g>
    </g>
  );
}

/** 某张卡的事件是否发生过：带星卡发动后移出游戏；其他卡看日志里有没有“事件：#编号” */
function eventHappened(v: GameView, id: number): boolean {
  if (CARDS[id].starred) return v.removed.includes(id);
  return v.log.some((e) => e.t.startsWith(`事件：#${id} `));
}

/** 铁娘子之后：阿根廷外海一艘英国军舰（马岛战争） */
function RoyalNavy({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="rn-ship">
        <title>{decorTip('1982 年撒切尔夫人派舰队南下，夺回被阿根廷占领的马尔维纳斯群岛（福克兰群岛）。')}</title>
        <path d="M-30,8 q4,-3 8,0 t8,0 t8,0 t8,0 t8,0 t8,0 t8,0" class="cv-wave" />
        <polygon points="-28,2 22,2 30,-4 -26,-4" class="rn-hull" />
        <polygon points="-24,-4 -18,-4 -18,-8 -24,-8" class="rn-turret" />
        <path d="M-18,-6.4 L-11,-7.4" class="rn-gun" />
        <polygon points="8,-4 16,-4 16,-8 8,-8" class="rn-turret" />
        <path d="M16,-6.4 L23,-7.4" class="rn-gun" />
        <polygon points="-8,-4 4,-4 3,-11 -6,-11" class="rn-bridge" />
        <path d="M-2,-11 L-2,-20" class="rn-mast" />
        {/* 桅顶的英国国旗（简化米字） */}
        <g transform="translate(-1.4,-20)">
          <rect width="9" height="6" fill="#1f3d7a" />
          <path d="M0,0 L9,6 M9,0 L0,6" stroke="#fff" stroke-width="1.4" />
          <path d="M0,0 L9,6 M9,0 L0,6" stroke="#c8102e" stroke-width="0.6" />
          <path d="M4.5,0 L4.5,6 M0,3 L9,3" stroke="#fff" stroke-width="2" />
          <path d="M4.5,0 L4.5,6 M0,3 L9,3" stroke="#c8102e" stroke-width="1.1" />
        </g>
      </g>
    </g>
  );
}

/** 乌苏里江冲突之后：中苏边境一条江，两岸苏联、中国坦克对峙 */
function UssuriStandoff({ x, y }: { x: number; y: number }) {
  const tank = (dx: number, flip: boolean, cls: string, starFill: string) => (
    <g transform={`translate(${dx},0) scale(${flip ? -1 : 1},1)`} class={cls}>
      <ellipse cx="0" cy="6" rx="12" ry="2.2" class="sp-shadow" />
      <polygon points="-11,5 -13,1 13,1 11,5" class="wt-track" />
      <polygon points="-10,1 -8,-4 8,-4 10,1" class="us-body" />
      <polygon points="-4,-4 -2,-8 4,-8 5,-4" class="us-body" />
      <path d="M4,-6.4 L13,-6.8" class="wt-gun" />
      <polygon points={STAR_PTS(-5, -1.4, 1.6)} fill={starFill} />
    </g>
  );
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="us-standoff">
        <title>{decorTip('1969 年中苏两国在乌苏里江珍宝岛爆发武装冲突，两国关系跌入谷底，也为中美接近埋下伏笔。')}</title>
        <path d="M-4,-14 C2,-6 -6,2 2,12" class="us-river" />
        {tank(-18, false, 'us-ussr', '#f5d76e')}
        {tank(18, true, 'us-china', '#f5d76e')}
        <polygon points={STAR_PTS(0, -12, 3.4)} class="sb-spark" />
      </g>
    </g>
  );
}

/** 向沙特出售预警机之后：沙特东边空中一架背着雷达圆盘的预警机 */
function Awacs({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="awx-plane">
        <title>{decorTip('1981 年里根政府不顾以色列方面反对，向沙特出售预警机，巩固美国在海湾的影响力。', '「穆斯林革命」不能再作为事件打出')}</title>
        <path d="M-22,-2 L18,-2 Q24,-2 24,0 Q24,2 18,2 L-22,2 L-24,0Z" class="awx-body" />
        <polygon points="-2,-2 -8,-14 -4,-14 6,-2" class="awx-wing" />
        <polygon points="-2,2 -8,14 -4,14 6,2" class="awx-wing" />
        <polygon points="-20,-2 -24,-7 -21,-7 -16,-2" class="awx-wing" />
        <polygon points="-20,2 -24,7 -21,7 -16,2" class="awx-wing" />
        <g class="awx-dome-g"><ellipse cx="-6" cy="0" rx="7" ry="3" class="awx-dome" /><path d="M-13,0 L1,0" class="awx-dome-line" /></g>
        <circle cx="-6" cy="0" r="12" class="awx-ping" />
      </g>
    </g>
  );
}

/** 文化大革命之后：中国境内一座残破的宝塔（上层倾斜缺损、塔基瓦砾） */
function BrokenPagoda({ x, y }: { x: number; y: number }) {
  const eave = (w: number, yy: number) => `M${-w},${yy} Q${-w - 3},${yy - 3} ${-w - 4},${yy - 4} L${w + 4},${yy - 4} Q${w + 3},${yy - 3} ${w},${yy}Z`;
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="pg-wrap">
        <title>{decorTip('1966 年起中国经历了十年政治动荡，大量文物古迹在运动中遭到破坏，对外关系也一度紧张。')}</title>
        <ellipse cx="0" cy="14" rx="18" ry="3" class="sp-shadow" />
        {/* 底两层完好 */}
        <rect x="-8" y="2" width="16" height="12" class="pg-wall" />
        <path d={eave(10, 2)} class="pg-roof" />
        <rect x="-6.4" y="-9" width="12.8" height="7" class="pg-wall" />
        <path d={eave(8, -9)} class="pg-roof" />
        {/* 上层倾斜缺角 */}
        <g transform="rotate(9 0 -13)">
          <polygon points="-5,-13 5,-13 5,-18 1,-19 -5,-17" class="pg-wall" />
          <path d="M-7,-18 L-8,-21 L3,-21 L1,-18Z" class="pg-roof" />
        </g>
        <path d="M-2,4 L1,8 L-1,11 M3,-7 L1,-4" class="pg-crack" />
        <rect x="-2" y="8" width="4" height="6" class="pg-door" />
        {/* 塔基瓦砾 */}
        <polygon points="9,14 12,10 15,12 17,14" class="pg-rubble" />
        <polygon points="-16,14 -13,11 -11,14" class="pg-rubble" />
        <polygon points="11,6 14,4 15,7" class="pg-rubble" />
        <path d="M4,-22 C2,-27 6,-29 4,-34" class="cr-smoke" />
      </g>
    </g>
  );
}

/** 部署潘兴 II 型导弹之后：东欧一带出现导弹发射车（起竖的导弹 + 多轴卡车） */
function MissileTruck({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="mt-truck">
        <title>{decorTip('1979 年北约决定在西欧部署潘兴 II 型与巡航导弹，回应苏联的中程导弹，1983 年起部署，欧洲各地爆发大规模反核抗议。')}</title>
        <ellipse cx="0" cy="7" rx="22" ry="2.4" class="sp-shadow" />
        <rect x="-20" y="-1" width="30" height="5" rx="1" class="mt-bed" />
        <polygon points="10,4 10,-7 17,-7 20,-2 20,4" class="mt-cab" />
        <rect x="13" y="-5.6" width="4" height="3" class="mt-window" />
        {[-16, -10, -4, 14].map((wx) => <circle key={wx} cx={wx} cy="5" r="2.4" class="mt-wheel" />)}
        <g transform="rotate(-32 -14 -1)">
          <rect x="-14" y="-3.2" width="26" height="2" class="mt-rail" />
          <path d="M-12,-3.4 L8,-3.4 C11,-3.4 13,-4.6 14,-5.6 C13,-6.6 11,-7.8 8,-7.8 L-12,-7.8Z" class="mt-missile" />
          <polygon points="-12,-7.8 -15,-9.4 -15,-1.8 -12,-3.4" class="mt-fin" />
        </g>
      </g>
    </g>
  );
}

const CMC_EFFECT = (side: Side) => `${side === 'US' ? '美国' : '苏联'}本回合发动任何政变都会引发核战争并直接输掉；可以从古巴（苏联）或西德、土耳其（美国）移除 2 点影响力来解除`;

/** 古巴导弹危机生效：古巴旁边浮出一艘苏联核潜艇 */
function SovietSub({ x, y, side }: { x: number; y: number; side: Side }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="ns-sub sv-sub">
        <title>{decorTip('1962 年苏联在古巴秘密部署核导弹，苏联潜艇也在加勒比海与美国舰队周旋，世界距核战争只有一步之遥。', CMC_EFFECT(side))}</title>
        <path d="M-30,6 L30,6" class="sb-water" />
        <path d="M-26,6 C-26,-1 -19,-4 -10,-4 L19,-4 C26,-4 30,0 30,6Z" class="sb-hull" />
        <polygon points="-3,-4 1,-12 10,-12 11,-4" class="sb-sail" />
        <polygon points={STAR_PTS(5.6, -8, 2.2)} class="sv-star" />
        <polygon points="-26,0 -33,-5 -33,7 -26,4" class="sb-rudder" />
        <path d="M-36,8 q4,-3 8,0 t8,0 M32,8 q4,-3 8,0 t8,0" class="sb-wave" />
      </g>
    </g>
  );
}

/** 古巴导弹危机生效：土耳其旁边一座打开的导弹发射井 */
function MissileSilo({ x, y, side }: { x: number; y: number; side: Side }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="ms-silo">
        <title>{decorTip('美国部署在土耳其的“朱庇特”导弹直指苏联，危机最终以苏联撤出古巴导弹、美国私下撤出土耳其导弹收场。', CMC_EFFECT(side))}</title>
        <ellipse cx="0" cy="4" rx="12" ry="4" class="si-pad" />
        <ellipse cx="0" cy="3" rx="6" ry="2.2" class="si-hole" />
        <path d="M-6,3 L-9,-3" class="si-lid" />
        <path d="M-2.4,3 L-2.4,-10 Q0,-15 2.4,-10 L2.4,3Z" class="si-missile" />
        <path d="M-2.4,-6 L2.4,-6" class="si-band" />
      </g>
    </g>
  );
}

/** 公开性之后：苏联境内一段红墙与几座带红星尖顶的塔楼（简化自绘） */
function KremlinWalls({ x, y }: { x: number; y: number }) {
  const tower = (tx: number, h: number) => (
    <g key={tx}>
      <rect x={tx - 3} y={-h} width="6" height={h} class="kr-tower" />
      <polygon points={`${tx - 3.6},${-h} ${tx},${-h - 9} ${tx + 3.6},${-h}`} class="kr-spire" />
      <polygon points={STAR_PTS(tx, -h - 11, 1.8)} class="kr-star" />
    </g>
  );
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="kr-wrap">
        <title>{decorTip('戈尔巴乔夫推行“公开性”，放宽新闻审查、允许公开讨论历史与社会问题，积压多年的不满随之浮出水面。')}</title>
        <ellipse cx="0" cy="2" rx="26" ry="3" class="sp-shadow" />
        <rect x="-22" y="-8" width="44" height="9" class="kr-wall" />
        {[-20, -14, -8, -2, 4, 10, 16].map((mx) => <rect key={mx} x={mx} y="-10.4" width="3" height="2.4" class="kr-wall" />)}
        {tower(-22, 16)}
        {tower(0, 24)}
        {tower(22, 16)}
        <path d="M-6,1 L-6,-4 Q0,-8 6,-4 L6,1" class="kr-gate" />
      </g>
    </g>
  );
}

/** 越南起义之后：越南旁的丛林冒烟起火 */
function VietnamFire({ x, y, active }: { x: number; y: number; active: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(1.4)`}>
      <g class="vf-wrap">
        <title>{decorTip('二战后胡志明宣布越南独立，与重返的法国殖民者打了八年战争，1954 年奠边府一役法军惨败。', active ? '本回合苏联把一张牌的行动点全部用在东南亚时，这张牌行动点 +1' : null)}</title>
        {[[-8, 2, 0.9], [6, 0, 1.1], [-1, 6, 0.8]].map(([dx, dy, k], i) => (
          <g key={i} transform={`translate(${dx},${dy}) scale(${k})`}>
            <circle cx="0" cy="-14" r="5" class="wt-smoke a" style={{ animationDelay: `${-i * 0.8}s` }} />
            <circle cx="2" cy="-21" r="6" class="wt-smoke b" style={{ animationDelay: `${-i * 0.8 - 1}s` }} />
            <path d="M0,4 C-4,4 -5,0 -3,-3 C-2.6,-1.6 -1.6,-1.2 -1.2,-1.6 C-2,-4.4 -0.4,-6.8 1.4,-7.6 C1,-5.6 2.2,-4.6 3.2,-3.4 C4.6,-1.6 4.2,4 0,4Z" class="vf-flame" />
            <path d="M0,3.6 C-1.8,3.6 -2,1.8 -1.2,0.8 C-0.8,1.4 0,1.4 0.2,0.8 C0.4,0 1,-0.2 1.4,0.4 C2,1.6 1.6,3.6 0,3.6Z" class="vf-core" />
          </g>
        ))}
      </g>
    </g>
  );
}

/** 中情局成立之后：美国国土上一个风衣、礼帽、墨镜的间谍（通用剪影） */
function TrenchSpy({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(1.3)`}>
      <g class="ts-spy">
        <title>{decorTip('1947 年美国成立中央情报局，统筹海外情报与秘密行动，此后深度介入冷战各地的局势。')}</title>
        <ellipse cx="0" cy="12" rx="8" ry="1.8" class="sp-shadow" />
        <path d="M-2.4,12 L-2,6 M2.4,12 L2,6" class="ts-leg" />
        {/* 风衣：竖领、腰带、下摆 */}
        <path d="M-5.6,7 L-4.6,-5 L-1.6,-7 L0,-4.6 L1.6,-7 L4.6,-5 L5.6,7Z" class="ts-coat" />
        <path d="M-1.6,-7 L0,-4.6 L1.6,-7 L0.8,-8.4 L-0.8,-8.4Z" class="ts-collar" />
        <path d="M-5,1 L5,1" class="ts-belt" />
        <path d="M0,-4.6 L0,7" class="ts-seam" />
        {/* 头、墨镜、礼帽 */}
        <circle cx="0" cy="-10.6" r="2.8" class="sp-face" />
        <path d="M-2.2,-11.2 L-0.3,-11.2 M0.3,-11.2 L2.2,-11.2" class="ts-glass" />
        <path d="M-5,-12.6 L5,-12.6 L3.4,-13.4 L2.8,-16.2 L-2.8,-16.2 L-3.4,-13.4Z" class="ts-hat" />
        {/* 公文包 */}
        <path d="M5.2,0 L6,4" class="ts-arm" />
        <rect x="4.4" y="4" width="5" height="3.6" rx="0.6" class="ts-case" />
      </g>
    </g>
  );
}

/** 艾姆斯间谍案生效：苏联境内一个敞开风衣、兜售机密文件的间谍 */
function IntelSeller({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(1.3)`}>
      <g class="ts-spy is-seller">
        <title>{decorTip('中情局官员艾姆斯从 1985 年起向苏联出卖情报，导致多名为美国工作的特工暴露，直到 1994 年才落网。', '本回合余下时间，美国的手牌对苏联公开')}</title>
        <ellipse cx="0" cy="12" rx="10" ry="1.8" class="sp-shadow" />
        <path d="M-2.4,12 L-2,6 M2.4,12 L2,6" class="ts-leg" />
        {/* 敞开的风衣，里面挂满文件 */}
        <path d="M-5.6,7 L-4.6,-5 L-1.6,-7 L-2.4,7Z" class="ts-coat" />
        <path d="M5.6,7 L4.6,-5 L1.6,-7 L2.4,7Z" class="ts-coat" />
        <path d="M-2.4,7 L-1.6,-7 L1.6,-7 L2.4,7Z" class="is-inner" />
        <rect x="-1.6" y="-4" width="3.2" height="3" class="is-doc" />
        <rect x="-1.6" y="0" width="3.2" height="3" class="is-doc" />
        <path d="M-1,-3 L1,-3 M-1,1 L1,1" class="is-line" />
        <circle cx="0" cy="-10.6" r="2.8" class="sp-face" />
        <path d="M-2.2,-11.2 L-0.3,-11.2 M0.3,-11.2 L2.2,-11.2" class="ts-glass" />
        <path d="M-5,-12.6 L5,-12.6 L3.4,-13.4 L2.8,-16.2 L-2.8,-16.2 L-3.4,-13.4Z" class="ts-hat" />
        {/* 脚边一袋钱 */}
        <path d="M8,11 C5.4,11 5,7.4 7,6 L6.4,4.6 L9.6,4.6 L9,6 C11,7.4 10.6,11 8,11Z" class="is-bag" />
        <text x="8" y="9.6" class="is-dollar">$</text>
      </g>
    </g>
  );
}

/** 尼克松打出中国牌之后：中国境内的乒乓球拍与小球（乒乓外交） */
function PingPong({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="pp-wrap">
        <title>{decorTip('1971 年美国乒乓球队应邀访华，“小球转动大球”，打开了中美交往的大门；次年尼克松访华，中美关系走向正常化。')}</title>
        <ellipse cx="0" cy="12" rx="12" ry="2" class="sp-shadow" />
        <g transform="rotate(-30)">
          <rect x="-1.4" y="2" width="2.8" height="9" rx="1" class="pp-handle" />
          <circle cx="0" cy="-4" r="7.4" class="pp-paddle" />
          <circle cx="0" cy="-4" r="7.4" class="pp-rim" />
        </g>
        <circle cx="10" cy="-12" r="2.4" class="pp-ball" />
      </g>
    </g>
  );
}

/** 卡斯特罗之后：古巴岛上飘扬的古巴国旗 */
function CubaFlag({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="fr-flag">
        <title>{decorTip('1959 年卡斯特罗率游击队推翻巴蒂斯塔政权，随后倒向苏联，古巴成为西半球第一个共产党执政的国家。')}</title>
        <ellipse cx="0" cy="0" rx="5" ry="1.6" class="fr-base" />
        <rect x="-0.8" y="-30" width="1.6" height="30" class="fr-pole" />
        <circle cx="0" cy="-30.6" r="1.4" class="fr-knob" />
        <g class="fr-cloth">
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M0.8,${-29 + i * 2.4} Q10,${-31 + i * 2.4} 19.8,${-29 + i * 2.4} L19.8,${-26.6 + i * 2.4} Q10,${-28.6 + i * 2.4} 0.8,${-26.6 + i * 2.4}Z`} fill={i % 2 ? '#f8f8f4' : '#1f3d8a'} />
          ))}
          <path d="M0.8,-29 L9,-23 L0.8,-17Z" fill="#cf142b" />
          <polygon points={STAR_PTS(3.6, -23, 2)} fill="#fff" />
        </g>
      </g>
    </g>
  );
}

/** 泥潭生效：越南丛林上空一架美军直升机（美国深陷越战） */
function QuagmireHeli({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="qh-wrap">
        <title>{decorTip('美国在越南从派遣顾问一路升级到五十多万大军，伤亡、开支和国内反战浪潮让历届政府进退两难，“泥潭”成了这场战争最常见的比喻。', '美国每个行动轮须弃一张 2 点以上的牌并掷 1–4 才能脱身（仍可打出计分卡）')}</title>
        {/* 丛林 */}
        {[-12, -4, 5, 13].map((tx, i) => (
          <polygon key={tx} points={`${tx - 5},10 ${tx},${i % 2 ? -1 : 1} ${tx + 5},10`} class="qh-tree" />
        ))}
        {/* 直升机 */}
        <g class="qh-heli">
          <path d="M-14,-14 L14,-14" class="qh-rotor" />
          <path d="M0,-14 L0,-11" class="qh-mast" />
          <path d="M-7,-11 L5,-11 C9,-11 10,-8 10,-6 C10,-4 8,-3 5,-3 L-6,-3 C-8,-3 -9,-5 -9,-7 C-9,-9 -8,-11 -7,-11Z" class="qh-body" />
          <path d="M-9,-7 L-20,-8 L-21,-11 L-19,-11 L-17,-8.6" class="qh-tail" />
          <path d="M4,-9.6 C6,-9.6 7.6,-8.6 7.8,-7 L4,-7Z" class="qh-glass" />
          <path d="M-6,-1 L6,-1 M-4,-3 L-4,-1 M3,-3 L3,-1" class="qh-skid" />
        </g>
      </g>
    </g>
  );
}

/** 台湾决议生效：中国东南沿海一门对着海峡的高射炮 */
function AAGun({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="aa-wrap">
        <title>{decorTip('1950 年代台海两度爆发炮击危机，美国国会通过台湾决议，授权总统在必要时动用武力保卫台湾及澎湖。', '美国控制台湾时，亚洲计分把台湾算作战场国')}</title>
        <ellipse cx="0" cy="5" rx="10" ry="2.4" class="sp-shadow" />
        <polygon points="-8,5 -6,0 6,0 8,5" class="aa-base" />
        <rect x="-3" y="-4" width="6" height="4" class="aa-mount" />
        <path d="M0,-2 L10,-13 M1.6,-1 L11.6,-12" class="aa-barrel" />
        <circle cx="13" cy="-17" r="2.2" class="aa-burst" />
        <circle cx="18" cy="-21" r="1.6" class="aa-burst b" />
      </g>
    </g>
  );
}

/** 伊朗人质危机之后：伊朗国土上的黑色新月 */
function BlackCrescent({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <g class="bc-wrap">
        <title>{decorTip('1979 年伊朗学生占领美国驻德黑兰大使馆，五十多名美国人被扣押 444 天，营救失败让卡特政府颜面尽失。')}</title>
        <circle r="10" class="bc-glow" />
        <path d="M3,-8.6 A9,9 0 1 0 3,8.6 A7,7 0 1 1 3,-8.6Z" class="bc-moon" />
      </g>
    </g>
  );
}

/** 去斯大林化之后：苏联境内一座被推倒的领袖雕像（空基座 + 横倒的人像，通用造型） */
function FallenStatue({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(1.2)`}>
      <g class="fs-wrap">
        <title>{decorTip('1956 年赫鲁晓夫在苏共二十大作“秘密报告”，揭露斯大林的个人崇拜与大清洗，各地的领袖雕像随后陆续被拆除。')}</title>
        <ellipse cx="2" cy="8" rx="20" ry="2.6" class="sp-shadow" />
        {/* 空基座 */}
        <polygon points="-16,8 -16,-4 -6,-4 -6,8" class="fs-base" />
        <rect x="-17" y="-6" width="12" height="2.4" class="fs-cap" />
        {/* 横倒在地的人像：大衣、躯干、头 */}
        <g transform="translate(2,4) rotate(-6)">
          <path d="M-4,0 L14,-1.6 L15,3.4 L-4,4Z" class="fs-body" />
          <path d="M14,-1.6 L18,-0.8 L18,2.6 L15,3.4Z" class="fs-body d" />
          <circle cx="21" cy="0.6" r="2.8" class="fs-body" />
          <path d="M2,-1 L8,-6 L10,-5 L5,0" class="fs-body d" />
          <path d="M6,0.4 L8,2.6 M11,-0.6 L12.6,2" class="fs-crack" />
        </g>
        <polygon points="-4,8 -2,6 0,8" class="pg-rubble" />
        <polygon points="18,8 20,6.4 21,8" class="pg-rubble" />
      </g>
    </g>
  );
}

/** 戴维营协议之后：埃及方框右边一只衔橄榄枝的和平鸽 */
function PeaceDove({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(1.6)`}>
      <g class="pd-dove">
        <title>{decorTip('1978 年卡特邀请埃及总统萨达特与以色列总理贝京在戴维营密谈十三天，次年两国签订和约，埃及转向美国。', '「阿拉伯—以色列战争」不能再作为事件打出')}</title>
        <path class="pd-wing back" d="M1,-1 Q6,-10 11,-11 Q8,-5 5,-1Z" />
        <path class="pd-body" d="M-9,1 Q-2,-3 5,-1 Q9,-4 11,-3 L13,-3 L11,-1.4 Q10,3 4,3 L-3,3 Q-7,3 -9,1Z" />
        <path class="pd-wing" d="M-1,-1 Q-6,-10 -12,-10 Q-8,-4 -4,0Z" />
        <circle cx="9.6" cy="-2.6" r="0.5" class="pd-eye" />
        <path d="M13,-2.6 L16,-1 M14.6,-1.8 L15.4,-3.4 M15.6,-1.4 L17,-2.2" class="pd-branch" />
      </g>
    </g>
  );
}
