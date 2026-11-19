// 生成计分卡插画里的大陆：Natural Earth 1:110m 国界（公有领域）按真实经纬度投影到 240×150 卡面，
// 本区域国家三角剖分成 low poly 分面，周边国家画成浅色衬底，并在战场国位置放据点。
// 用法：npx tsx scripts/gen-continents.ts <ne_110m_admin_0_countries.geojson>
import { readFileSync, writeFileSync } from 'node:fs';
import { COUNTRY_LIST } from '../src/data';

const SRC = process.argv[2];
if (!SRC) throw new Error('需要 geojson 路径');

type Pt = [number, number];
interface Feature { properties: { ADMIN: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } }
const geo = JSON.parse(readFileSync(SRC, 'utf8')) as { features: Feature[] };

/** 游戏国家 → Natural Earth 国家名（与 gen-worldmap 一致） */
const GAME: Record<string, string[]> = {
  uk: ['United Kingdom'], norway: ['Norway'], sweden: ['Sweden'], denmark: ['Denmark'], finland: ['Finland'],
  benelux: ['Belgium', 'Netherlands', 'Luxembourg'], westGermany: ['Germany'], eastGermany: [], france: ['France'],
  spainPortugal: ['Spain', 'Portugal'], italy: ['Italy'], greece: ['Greece'], turkey: ['Turkey'], austria: ['Austria'],
  poland: ['Poland'], czechoslovakia: ['Czechia', 'Slovakia'], hungary: ['Hungary'], romania: ['Romania'], bulgaria: ['Bulgaria'],
  yugoslavia: ['Republic of Serbia', 'Croatia', 'Slovenia', 'Bosnia and Herzegovina', 'Montenegro', 'North Macedonia', 'Kosovo'],
  lebanon: ['Lebanon'], syria: ['Syria'], israel: ['Israel', 'Palestine'], iraq: ['Iraq'], iran: ['Iran'], jordan: ['Jordan'],
  gulfStates: ['Kuwait', 'Qatar', 'United Arab Emirates', 'Oman'], saudiArabia: ['Saudi Arabia'], egypt: ['Egypt'], libya: ['Libya'],
  afghanistan: ['Afghanistan'], pakistan: ['Pakistan'], india: ['India'], burma: ['Myanmar'], laosCambodia: ['Laos', 'Cambodia'],
  thailand: ['Thailand'], vietnam: ['Vietnam'], malaysia: ['Malaysia'], indonesia: ['Indonesia', 'East Timor'], philippines: ['Philippines'],
  australia: ['Australia'], taiwan: ['Taiwan'], northKorea: ['North Korea'], southKorea: ['South Korea'], japan: ['Japan'],
  morocco: ['Morocco', 'Western Sahara'], algeria: ['Algeria'], tunisia: ['Tunisia'],
  westAfricanStates: ['Senegal', 'Gambia', 'Guinea', 'Guinea-Bissau', 'Sierra Leone', 'Liberia', 'Mauritania', 'Burkina Faso', 'Ghana', 'Togo', 'Benin'],
  saharanStates: ['Mali', 'Niger', 'Chad'], sudan: ['Sudan', 'South Sudan'], ivoryCoast: ['Ivory Coast'], nigeria: ['Nigeria'],
  ethiopia: ['Ethiopia', 'Eritrea'], somalia: ['Somalia', 'Somaliland', 'Djibouti'], cameroon: ['Cameroon'],
  zaire: ['Democratic Republic of the Congo'], kenya: ['Kenya'], angola: ['Angola'], zimbabwe: ['Zimbabwe'],
  seAfricanStates: ['Mozambique', 'United Republic of Tanzania', 'Malawi'], botswana: ['Botswana'], southAfrica: ['South Africa'],
  mexico: ['Mexico'], guatemala: ['Guatemala'], elSalvador: ['El Salvador'], honduras: ['Honduras'], costaRica: ['Costa Rica'],
  nicaragua: ['Nicaragua'], panama: ['Panama'], cuba: ['Cuba'], haiti: ['Haiti'], dominicanRep: ['Dominican Republic'],
  colombia: ['Colombia'], ecuador: ['Ecuador'], peru: ['Peru'], venezuela: ['Venezuela'], bolivia: ['Bolivia'], brazil: ['Brazil'],
  paraguay: ['Paraguay'], chile: ['Chile'], argentina: ['Argentina'], uruguay: ['Uruguay'],
};

/** 卡面取景（经度、纬度范围） */
const VIEW: Record<string, [number, number, number, number]> = {
  europe: [-12, 35, 44, 71],
  asia: [58, -24, 150, 47],
  middleEast: [8, 12, 64, 41],
  africa: [-20, -36, 54, 38],
  centralAmerica: [-118, 5, -60, 33],
  southAmerica: [-84, -56, -32, 13],
  southeastAsia: [90, -11, 128, 24],
};
const W = 240, H = 150, M = 10;

const byName = new Map(geo.features.map((f) => [f.properties.ADMIN, f]));
const regionOf = new Map<string, string>();
for (const c of COUNTRY_LIST) for (const n of GAME[c.id] ?? []) regionOf.set(n, c.id);

function rings(f: Feature): Pt[][] {
  const g = f.geometry;
  const list = g.type === 'Polygon' ? [g.coordinates as number[][][]] : (g.coordinates as number[][][][]);
  return list.map((p) => p[0].map(([x, y]) => [x, y] as Pt));
}

function area(r: Pt[]) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function simplify(r: Pt[], tol: number): Pt[] {
  if (r.length < 4) return r;
  const keep = new Array(r.length).fill(false);
  keep[0] = keep[r.length - 1] = true;
  const st: [number, number][] = [[0, r.length - 1]];
  while (st.length) {
    const [s, e] = st.pop()!;
    let best = -1, bd = 0;
    const [x1, y1] = r[s], [x2, y2] = r[e];
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs((x2 - x1) * (y1 - r[i][1]) - (x1 - r[i][0]) * (y2 - y1)) / L;
      if (d > bd) { bd = d; best = i; }
    }
    if (bd > tol && best > 0) { keep[best] = true; st.push([s, best], [best, e]); }
  }
  return r.filter((_, i) => keep[i]);
}

function simplifyRing(r: Pt[], tol: number): Pt[] {
  let far = 0, fd = -1;
  for (let i = 1; i < r.length; i++) {
    const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const a = simplify(r.slice(0, far + 1), tol);
  const b = simplify([...r.slice(far), r[0]], tol);
  const out = [...a.slice(0, -1), ...b.slice(0, -1)];
  return out.filter((p, i) => i === 0 || p[0] !== out[i - 1][0] || p[1] !== out[i - 1][1]);
}

/** 耳切三角剖分（简单多边形） */
function triangulate(r: Pt[]): Pt[][] {
  const pts = area(r) < 0 ? [...r].reverse() : [...r];
  const idx = pts.map((_, i) => i);
  const tris: Pt[][] = [];
  const cross = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p: Pt, a: Pt, b: Pt, c: Pt) => cross(a, b, p) > 0 && cross(b, c, p) > 0 && cross(c, a, p) > 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 5000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const a = pts[idx[(i + idx.length - 1) % idx.length]], b = pts[idx[i]], c = pts[idx[(i + 1) % idx.length]];
      const cr = cross(a, b, c);
      if (Math.abs(cr) < 1e-9) {
        // 共线点直接去掉，否则会卡住
        idx.splice(i, 1);
        cut = true;
        break;
      }
      if (cr < 0) continue;
      if (idx.some((j) => { const p = pts[j]; return p !== a && p !== b && p !== c && inside(p, a, b, c); })) continue;
      tris.push([a, b, c]);
      idx.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) tris.push(idx.map((i) => pts[i]));
  else if (idx.length > 3) {
    // 自交等异常：剩下的扇形补齐
    for (let i = 1; i < idx.length - 1; i++) tris.push([pts[idx[0]], pts[idx[i]], pts[idx[i + 1]]]);
  }
  return tris;
}

/** 卡面矩形裁剪 */
function clip(r: Pt[]): Pt[] {
  const x0 = -2, y0 = -2, x1 = W + 2, y1 = H + 2;
  const edges: [(p: Pt) => boolean, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let out = r;
  for (const [ins, cut] of edges) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length];
      if (ins(b)) { if (!ins(a)) out.push(cut(a, b)); out.push(b); } else if (ins(a)) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
}

const rnd = (x: number, y: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

interface Gen { tris: number[][]; ctx: number[][]; pins: [number, number, 'us' | 'su'][] }
const OUT: Record<string, Gen> = {};

for (const [key, [lo0, la0, lo1, la1]] of Object.entries(VIEW)) {
  const k = Math.cos((((la0 + la1) / 2) * Math.PI) / 180);
  const sw = (lo1 - lo0) * k, sh = la1 - la0;
  const sc = Math.min((W - 2 * M) / sw, (H - 2 * M) / sh);
  const ox = W / 2 - (((lo0 + lo1) / 2) * k) * sc, oy = H / 2 + ((la0 + la1) / 2) * sc;
  const P = ([lo, la]: Pt): Pt => [lo * k * sc + ox, -la * sc + oy];
  const inRegion = (n: string) => {
    const id = regionOf.get(n);
    if (!id) return false;
    const c = COUNTRY_LIST.find((x) => x.id === id)!;
    return key === 'southeastAsia' ? c.sub.includes('southeastAsia') : c.region === key;
  };
  const gen: Gen = { tris: [], ctx: [], pins: [] };
  for (const f of geo.features) {
    const n = f.properties.ADMIN;
    if (n === 'Antarctica') continue;
    const mine = inRegion(n);
    for (const r of rings(f)) {
      const pr = clip(simplifyRing(r.map(P), mine ? 2.2 : 2.6));
      if (pr.length < 3 || Math.abs(area(pr)) < 6) continue;
      const rr = pr.map(([x, y]) => [Math.round(x * 2) / 2, Math.round(y * 2) / 2] as Pt);
      if (mine) {
        for (const t of triangulate(rr)) {
          const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
          // 色阶：随机 + 自左上向右下的光照
          const shade = Math.min(2, Math.max(0, Math.floor(rnd(cx, cy) * 2.2 + (cx + cy) / 260)));
          gen.tris.push([...t.flat(), shade]);
        }
      } else {
        gen.ctx.push(rr.flat());
      }
    }
  }
  // 据点：本区域战场国（东南亚取全部国家），蓝红交替
  const bgs = COUNTRY_LIST.filter((c) => (key === 'southeastAsia' ? c.sub.includes('southeastAsia') : c.region === key && c.bg));
  bgs.forEach((c, i) => {
    const names = GAME[c.id];
    if (!names?.length) return;
    const f = byName.get(names[0]);
    if (!f) return;
    const big = rings(f).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0];
    let cx = 0, cy = 0;
    for (const p of big) { const q = P(p); cx += q[0]; cy += q[1]; }
    cx /= big.length; cy /= big.length;
    if (cx < 8 || cx > W - 8 || cy < 18 || cy > H - 4) return;
    gen.pins.push([Math.round(cx), Math.round(cy), i % 2 ? 'su' : 'us']);
  });
  gen.pins = gen.pins.slice(0, 6);
  OUT[key] = gen;
}

const body = JSON.stringify(OUT);
writeFileSync(
  'src/art/kit/continents.gen.ts',
  `// 由 scripts/gen-continents.ts 生成，请勿手改。底图数据：Natural Earth 1:110m（公有领域）。\n` +
    `/** tris: [x1,y1,x2,y2,x3,y3,色阶]；ctx: 周边国家轮廓；pins: 据点 */\n` +
    `export const CONTINENT_GEN: Record<string, { tris: number[][]; ctx: number[][]; pins: [number, number, 'us' | 'su'][] }> = ${body};\n`,
);
console.log(Object.entries(OUT).map(([k, g]) => `${k}: ${g.tris.length} 面 / ${g.ctx.length} 衬底 / ${g.pins.length} 据点`).join('\n'), `\n${(body.length / 1024).toFixed(0)} KB`);
