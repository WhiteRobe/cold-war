// 地图特效：放影响力插旗、取得控制的冲击波、按「现在计分」实时着色的阵营雾气。
import { useEffect, useRef, useState } from 'preact/hooks';
import { COUNTRY_LIST, REGIONS, countriesIn, type RegionId, type Side } from '../../data';
import { controller, scoreRegion, scoreSEA } from '../../engine/scoring';
import type { GameView } from '../../engine/view';
import { sfx } from '../audio';

type Pos = (id: string) => [number, number];

export interface Fx {
  key: number;
  id: string;
  side: Side;
  kind: 'add' | 'ctl' | 'lost';
  n: number;
}

let fxSeq = 0;

/** 比较前后局面，产生临时特效并播放音效 */
export function useMapFx(view: GameView) {
  const prev = useRef<GameView | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [regionCtl, setRegionCtl] = useState<{ key: number; region: RegionId; side: Side } | null>(null);

  useEffect(() => {
    const p = prev.current;
    prev.current = view;
    if (!p) return;
    const out: Fx[] = [];
    let gain = false, lose = false;
    for (const c of COUNTRY_LIST) {
      const a = p.inf[c.id], b = view.inf[c.id];
      if (a[0] === b[0] && a[1] === b[1]) continue;
      const before = controller(p as never, c.id), after = controller(view as never, c.id);
      if (after && after !== before) {
        out.push({ key: ++fxSeq, id: c.id, side: after, kind: 'ctl', n: 0 });
        if (view.me && after !== view.me) lose = true;
        else gain = true;
      } else if (before && !after) {
        out.push({ key: ++fxSeq, id: c.id, side: before, kind: 'lost', n: 0 });
      }
      for (const [i, side] of [[0, 'US'], [1, 'USSR']] as const) {
        if (b[i] > a[i] && !(after && after !== before && after === side)) out.push({ key: ++fxSeq, id: c.id, side, kind: 'add', n: b[i] - a[i] });
      }
    }
    // 整洲达到「控制」：全局动画
    const levels = (v: GameView) => REGIONS.map((r) => {
      const sc = scoreRegion(v as never, r, { formosan: v.flags.formosan });
      return (sc.US.level === 'control' ? 'US' : sc.USSR.level === 'control' ? 'USSR' : null) as Side | null;
    });
    const before = levels(p), after = levels(view);
    const ri = after.findIndex((s, i) => s && s !== before[i]);
    if (ri >= 0) {
      const rc = { key: ++fxSeq, region: REGIONS[ri], side: after[ri]! };
      setRegionCtl(rc);
      setTimeout(() => sfx('regionControl'), 350);
      setTimeout(() => setRegionCtl((cur) => (cur === rc ? null : cur)), 3400);
    }
    if (gain) sfx('controlGain');
    else if (lose) sfx('controlLose');
    // 区域计分：新的计分结果冒出雾气
    const nf = new Set<string>();
    for (const [r, v] of Object.entries(view.lastScore ?? {})) {
      if (p.lastScore?.[r]?.at !== v.at && v.side) nf.add(r);
    }
    if (nf.size) {
      setTimeout(() => sfx('fog'), 300);
      setFresh(nf);
      setTimeout(() => setFresh(new Set()), 4000);
    }
    if (!out.length) return;
    // 一次变化太多（如回放跳转）就只显示控制变化
    const shown = out.length > 24 ? out.filter((f) => f.kind !== 'add') : out;
    setFx((cur) => [...cur, ...shown]);
    const keys = new Set(shown.map((f) => f.key));
    setTimeout(() => setFx((cur) => cur.filter((f) => !keys.has(f.key))), 1900);
  }, [view]);

  return { fx, fresh, regionCtl };
}

const FILL: Record<Side, string> = { US: '#2f5d8a', USSR: '#b23a2e' };
const LIGHT: Record<Side, string> = { US: '#7fb0e0', USSR: '#f08a7c' };

/** 小旗子：美国蓝底白星，苏联红底金星 */
export function Flag({ x, y, side, h = 22 }: { x: number; y: number; side: Side; h?: number }) {
  const w = h * 0.8;
  const fh = h * 0.5;
  return (
    <g class="flag">
      <line x1={x} y1={y} x2={x} y2={y - h} stroke="#3a352e" stroke-width="1.6" />
      <polygon points={`${x},${y - h} ${x + w},${y - h + fh * 0.15} ${x + w * 0.9},${y - h + fh * 0.55} ${x + w},${y - h + fh} ${x},${y - h + fh}`} fill={FILL[side]} stroke="#1f1a10" stroke-width="0.8" />
      <polygon points={star(x + w * 0.38, y - h + fh * 0.5, fh * 0.28)} fill={side === 'US' ? '#fff' : '#f5d76e'} />
    </g>
  );
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** low poly 小坦克 */
export function Tank({ x, y, side, s = 1 }: { x: number; y: number; side: Side; s?: number }) {
  const c = FILL[side];
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} class="tank">
      <polygon points="-11,0 11,0 13,-4 -13,-4" fill="#3a352e" />
      <polygon points="-10,-4 10,-4 8,-9 -8,-9" fill={c} />
      <polygon points="-4,-9 5,-9 4,-13 -3,-13" fill={c} stroke="#1f1a10" stroke-width="0.5" />
      <line x1="4" y1="-11" x2="15" y2="-12" stroke="#3a352e" stroke-width="1.8" />
    </g>
  );
}

/** 士兵剪影 */
function Soldier({ x, y, side }: { x: number; y: number; side: Side }) {
  const c = FILL[side];
  return (
    <g transform={`translate(${x},${y})`} class="soldier">
      <polygon points="-3,-14 3,-14 4,-11 -4,-11" fill={c} />
      <polygon points="-2,-11 2,-11 2,-9 -2,-9" fill="#d8b98f" />
      <polygon points="-4,-9 4,-9 3,-3 -3,-3" fill={c} />
      <polygon points="-3,-3 -1,-3 -1,0 -3,0" fill="#3a352e" />
      <polygon points="1,-3 3,-3 3,0 1,0" fill="#3a352e" />
      <line x1="4" y1="-8" x2="7" y2="-15" stroke="#3a352e" stroke-width="1.2" />
    </g>
  );
}

export function FxLayer({ fx, pos }: { fx: Fx[]; pos: Pos }) {
  return (
    <g class="fx-layer">
      {fx.map((f) => {
        const [x, y] = pos(f.id);
        if (f.kind === 'ctl') {
          return (
            <g key={f.key} class={`fx-ctl fx-${f.side.toLowerCase()}`}>
              <circle cx={x} cy={y} r="18" class="fx-ring" stroke={LIGHT[f.side]} />
              <circle cx={x} cy={y} r="18" class="fx-ring r2" stroke={FILL[f.side]} />
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i * Math.PI) / 4;
                return <line key={i} class="fx-ray" x1={x + 22 * Math.cos(a)} y1={y + 22 * Math.sin(a)} x2={x + 40 * Math.cos(a)} y2={y + 40 * Math.sin(a)} stroke={LIGHT[f.side]} />;
              })}
              <g class="fx-plant" style={{ transformOrigin: `${x - 22}px ${y - 18}px` }}>
                <Flag x={x - 22} y={y - 18} side={f.side} h={34} />
              </g>
              <text x={x} y={y - 30} class="fx-text" fill={LIGHT[f.side]}>控制！</text>
            </g>
          );
        }
        if (f.kind === 'lost') {
          return (
            <g key={f.key} class="fx-lost">
              <circle cx={x} cy={y} r="26" class="fx-ring lost" stroke={FILL[f.side]} />
            </g>
          );
        }
        return (
          <g key={f.key} class={`fx-add fx-${f.side.toLowerCase()}`}>
            <g class="fx-drop" style={{ transformOrigin: `${x + 18}px ${y - 16}px` }}>
              <Flag x={x + 18} y={y - 16} side={f.side} h={20} />
            </g>
            <g class="fx-march">
              {f.n >= 2 ? <Tank x={x - 14} y={y - 20} side={f.side} s={0.9} /> : <Soldier x={x - 12} y={y - 20} side={f.side} />}
            </g>
            <text x={x + 4} y={y - 26} class="fx-plus" fill={LIGHT[f.side]}>+{f.n}</text>
          </g>
        );
      })}
    </g>
  );
}

/** 每个区域此刻打出计分卡谁领先、领先多少；领先越多雾越浓。
 *  双方在区域里都控制了国家时不再整片铺色，只在各自控制的国家周围起雾，红蓝交错；
 *  但领先方已经支配或控制该区域时，仍然整片铺领先方的颜色；控制时雾最浓、范围更大并缓慢脉动。 */
interface FogEntry { key: string; region: string; side: Side; k: number; ids: string[]; r: number; strong?: boolean }
function liveFog(view: GameView): FogEntry[] {
  const out: FogEntry[] = [];
  const sea = new Set(countriesIn('southeastAsia').map((c) => c.id));
  const radius = (r: string) => (r === 'europe' || r === 'southeastAsia' ? 70 : 95);
  /** whole：领先方已支配 / 控制整个区域，不管对手控制了几国都整片铺色 */
  const push = (region: string, ids: string[], side: Side | null, k: number, whole = false, strong = false) => {
    if (!ids.length) return;
    const ctl = { US: [] as string[], USSR: [] as string[] };
    for (const id of ids) {
      const w = controller(view as never, id);
      if (w) ctl[w].push(id);
    }
    if (ctl.US.length && ctl.USSR.length && !(whole && side)) {
      // 交错：领先方用原浓度（不低于 0.5），落后方 / 平手固定 0.45；半径收小，避免两色糊成紫
      for (const sd of ['US', 'USSR'] as const) {
        out.push({ key: `${region}-${sd}`, region, side: sd, k: sd === side ? Math.max(0.5, k) : 0.45, ids: ctl[sd], r: radius(region) * 0.72 });
      }
    } else if (side) out.push({ key: region, region, side, k: strong ? 1 : k, ids, r: radius(region) * (strong ? 1.2 : 1), strong });
  };
  for (const r of REGIONS) {
    const shuttle = !!view.flags.shuttle && (r === 'asia' || r === 'middleEast');
    const sc = scoreRegion(view as never, r, { formosan: view.flags.formosan, shuttle });
    const side = sc.autoWin ?? (sc.net > 0 ? 'US' : sc.net < 0 ? 'USSR' : null);
    const ids = countriesIn(r as never).map((c) => c.id);
    // 亚洲的雾不盖到东南亚（东南亚单独计分）
    const strong = !!side && sc[side].level === 'control';
    const whole = !!sc.autoWin || strong || (!!side && sc[side].level === 'domination');
    push(r, r === 'asia' ? ids.filter((id) => !sea.has(id)) : ids, side, sc.autoWin ? 1 : Math.min(1, 0.22 + Math.abs(sc.net) * 0.12), whole, strong);
  }
  const s = scoreSEA(view as never);
  push('southeastAsia', [...sea], s.net > 0 ? 'US' : s.net < 0 ? 'USSR' : null, Math.min(1, 0.22 + Math.abs(s.net) * 0.16));
  return out;
}

export function FogLayer({ view, fresh, pos }: { view: GameView; fresh: Set<string>; pos: Pos }) {
  const entries = liveFog(view);
  return (
    <g class="fog-layer">
      <defs>
        <radialGradient id="fogUS">
          <stop offset="0" stop-color="#3d73a8" stop-opacity="0.8" />
          <stop offset="0.55" stop-color="#3d73a8" stop-opacity="0.4" />
          <stop offset="1" stop-color="#3d73a8" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="fogUSSR">
          <stop offset="0" stop-color="#c9503f" stop-opacity="0.8" />
          <stop offset="0.55" stop-color="#c9503f" stop-opacity="0.4" />
          <stop offset="1" stop-color="#c9503f" stop-opacity="0" />
        </radialGradient>
      </defs>
      {entries.map(({ key, region: r, side, k, ids, r: rad, strong }) => (
        <g key={key} opacity={k.toFixed(2)} class={`fog-wrap${strong ? ' strong' : ''}`}>
          <g class={`fog fog-${side.toLowerCase()}${fresh.has(r) ? ' fresh' : ''}`}>
            {ids.map((id, i) => {
              const [x, y] = pos(id);
              return (
                <circle
                  key={id}
                  cx={x}
                  cy={y}
                  r={rad}
                  fill={`url(#fog${side})`}
                  class="fog-puff"
                  style={{ animationDelay: `${-((i * 1.7) % 9)}s`, animationDuration: `${8 + (i % 5)}s` }}
                />
              );
            })}
          </g>
        </g>
      ))}
    </g>
  );
}
