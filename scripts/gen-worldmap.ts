// 生成地图底图：把 Natural Earth 1:110m 国界（公有领域）用薄板样条变形到棋盘布局上，
// 让每个游戏国家的真实国土落在它的方框下面（欧洲放大，与实体棋盘一致）。
// 用法：npx tsx scripts/gen-worldmap.ts <ne_110m_admin_0_countries.geojson>
import { readFileSync, writeFileSync } from 'node:fs';
import { COUNTRIES, COUNTRY_LIST } from '../src/data';

const SRC = process.argv[2];
if (!SRC) throw new Error('需要 geojson 路径');
const S = 1.5;
const W = 1500, H = 975;

type Pt = [number, number];
type Ring = Pt[];

/** 游戏国家 → Natural Earth 国家名 */
const GAME: Record<string, string[]> = {
  canada: ['Canada'], uk: ['United Kingdom'], norway: ['Norway'], sweden: ['Sweden'], denmark: ['Denmark'], finland: ['Finland'],
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
const USA = ['United States of America'];
const USSR = ['Russia', 'Ukraine', 'Belarus', 'Lithuania', 'Latvia', 'Estonia', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan', 'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan'];
const SKIP = new Set(['Antarctica', 'French Southern and Antarctic Lands', 'Fiji', 'Vanuatu', 'New Caledonia', 'Solomon Islands']);

/** 手工锚点：真实经纬度 → 棋盘坐标（DeepStruggle 1000×650 坐标系），用来约束没有游戏国家的区域 */
const ANCHORS: [Pt, Pt][] = [
  [[10.0, 51.0], [0, 0]], // 占位：西德、东德单独给
];

interface Feature { properties: { ADMIN: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } }
const geo = JSON.parse(readFileSync(SRC, 'utf8')) as { features: Feature[] };

function polys(f: Feature): Ring[] {
  const g = f.geometry;
  const list = g.type === 'Polygon' ? [g.coordinates as number[][][]] : (g.coordinates as number[][][][]);
  return list.map((p) => p[0].map(([x, y]) => [x, y] as Pt));
}

function area(r: Ring) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function centroid(rings: Ring[]): Pt {
  let cx = 0, cy = 0, A = 0;
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
      const k = x1 * y2 - x2 * y1;
      cx += (x1 + x2) * k;
      cy += (y1 + y2) * k;
      A += k;
    }
  }
  A /= 2;
  return [cx / (6 * A), cy / (6 * A)];
}

const byName = new Map(geo.features.map((f) => [f.properties.ADMIN, f]));
for (const names of [...Object.values(GAME), USA, USSR]) for (const n of names) if (!byName.has(n)) throw new Error(`找不到 ${n}`);

// ---------- 控制点 ----------
const ctrl: [Pt, Pt][] = [];
const board = (id: string): Pt => [COUNTRIES[id].pos[0] * S, COUNTRIES[id].pos[1] * S];
const mainland = (names: string[]) => {
  // 每个国家只取最大的那块，避免海外领地把重心拉走
  return names.map((n) => polys(byName.get(n)!).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0]);
};
const SPECIAL: Record<string, Pt> = {
  westGermany: [8.5, 50.8], eastGermany: [12.6, 52.0], uk: [-1.8, 52.8], norway: [9.5, 61.0], canada: [-80, 50], indonesia: [113, -1.5],
  malaysia: [102, 4], philippines: [122, 12], japan: [138, 36], chile: [-71, -33], france: [2.5, 46.8], italy: [12.5, 42.8],
  gulfStates: [52, 24.5], spainPortugal: [-4.5, 40.2], denmark: [9.3, 56], greece: [22, 39.5], seAfricanStates: [36, -12],
};
for (const c of COUNTRY_LIST) {
  const real = SPECIAL[c.id] ?? centroid(mainland(GAME[c.id]));
  ctrl.push([real, board(c.id)]);
}
ctrl.push([[-98, 39], [85 * S, 230 * S]]);
ctrl.push([[42, 56], [635 * S, 112 * S]]);
// 额外锚点（DeepStruggle 坐标 ×1.5）
const extra: [Pt, Pt][] = [
  [[-150, 63], [20, 40]], // 阿拉斯加
  [[-100, 65], [150, 70]], // 加拿大北部
  [[-42, 72], [330, 40]], // 格陵兰
  [[-19, 65], [440, 70]], // 冰岛
  [[-120, 38], [40, 260]], // 美国西海岸
  [[-75, 40], [180, 250]], // 美国东海岸
  [[-115, 30], [60, 330]], // 墨西哥西北
  [[60, 66], [880, 70]], // 乌拉尔北
  [[90, 64], [1090, 120]], // 西伯利亚
  [[135, 62], [1330, 150]], // 远东
  [[160, 64], [1440, 120]], // 堪察加
  [[68, 43], [960, 300]], // 中亚
  [[104, 34], [1225, 410]], // 中国中部
  [[88, 33], [1120, 430]], // 青藏
  [[117, 38], [1300, 360]], // 华北
  [[120, 30], [1300, 440]], // 华东
  [[103, 47], [1215, 300]], // 蒙古
  [[127, 46], [1330, 260]], // 东北
  [[-58, 4], [470, 900]], // 圭亚那（占位，后面修正）
];
ctrl.push(...extra.filter(([, b]) => b[0] !== 470));

// ---------- 薄板样条 ----------
function tps(points: [Pt, Pt][], lambda: number) {
  const n = points.length;
  const U = (r2: number) => (r2 === 0 ? 0 : r2 * Math.log(r2));
  const N = n + 3;
  const solve = (vals: number[]) => {
    const A: number[][] = Array.from({ length: N }, () => new Array(N + 1).fill(0));
    for (let i = 0; i < n; i++) {
      const [xi, yi] = points[i][0];
      for (let j = 0; j < n; j++) {
        const [xj, yj] = points[j][0];
        A[i][j] = U((xi - xj) ** 2 + (yi - yj) ** 2) + (i === j ? lambda : 0);
      }
      A[i][n] = 1; A[i][n + 1] = xi; A[i][n + 2] = yi;
      A[n][i] = 1; A[n + 1][i] = xi; A[n + 2][i] = yi;
      A[i][N] = vals[i];
    }
    // 高斯消元
    for (let c = 0; c < N; c++) {
      let p = c;
      for (let r = c + 1; r < N; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      const d = A[c][c];
      if (Math.abs(d) < 1e-12) continue;
      for (let k = c; k <= N; k++) A[c][k] /= d;
      for (let r = 0; r < N; r++) {
        if (r === c) continue;
        const f = A[r][c];
        if (!f) continue;
        for (let k = c; k <= N; k++) A[r][k] -= f * A[c][k];
      }
    }
    return A.map((row) => row[N]);
  };
  const wx = solve(points.map((p) => p[1][0]));
  const wy = solve(points.map((p) => p[1][1]));
  return ([x, y]: Pt): Pt => {
    let fx = wx[n] + wx[n + 1] * x + wx[n + 2] * y;
    let fy = wy[n] + wy[n + 1] * x + wy[n + 2] * y;
    for (let i = 0; i < n; i++) {
      const [xi, yi] = points[i][0];
      const u = U((x - xi) ** 2 + (y - yi) ** 2);
      fx += wx[i] * u;
      fy += wy[i] * u;
    }
    return [fx, fy];
  };
}

const LAMBDA = Number(process.env.LAMBDA ?? 2000);
const warp = tps(ctrl, LAMBDA);

// ---------- 几何处理 ----------
function densify(r: Ring, step = 0.8): Ring {
  const out: Ring = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(d / step));
    for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  return out;
}

/** 闭合环：从离起点最远的点切成两段分别化简 */
function simplifyRing(r: Ring, tol: number): Ring {
  if (r.length < 4) return r;
  let far = 0, fd = -1;
  for (let i = 1; i < r.length; i++) {
    const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const a = simplify(r.slice(0, far + 1), tol);
  const b = simplify([...r.slice(far), r[0]], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function simplify(r: Ring, tol: number): Ring {
  if (r.length < 3) return r;
  const keep = new Array(r.length).fill(false);
  keep[0] = keep[r.length - 1] = true;
  const stack: [number, number][] = [[0, r.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let best = -1, bd = 0;
    const [x1, y1] = r[s], [x2, y2] = r[e];
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs((x2 - x1) * (y1 - r[i][1]) - (x1 - r[i][0]) * (y2 - y1)) / L;
      if (d > bd) { bd = d; best = i; }
    }
    if (bd > tol && best > 0) {
      keep[best] = true;
      stack.push([s, best], [best, e]);
    }
  }
  return r.filter((_, i) => keep[i]);
}

/** 用经纬度矩形裁剪（Sutherland–Hodgman，矩形是凸的） */
function clipRect(r: Ring, x0: number, y0: number, x1: number, y1: number): Ring {
  const edges: [(p: Pt) => boolean, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let out = r;
  for (const [inside, cut] of edges) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length];
      if (inside(b)) {
        if (!inside(a)) out.push(cut(a, b));
        out.push(b);
      } else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
}

const TOL = Number(process.env.TOL ?? 1.6);
function toPath(rings: Ring[]): string {
  const parts: string[] = [];
  for (const r of rings) {
    const w = simplifyRing(densify(r).map(warp), TOL).map(([x, y]) => [Math.round(x), Math.round(y)] as Pt);
    const dedup = w.filter((p, i) => i === 0 || p[0] !== w[i - 1][0] || p[1] !== w[i - 1][1]);
    if (dedup.length < 3) continue;
    if (Math.abs(area(dedup)) < 4) continue;
    parts.push('M' + dedup.map((p) => p.join(',')).join('L') + 'Z');
  }
  return parts.join('');
}

interface Shape { id: string; kind: string; d: string }
const shapes: Shape[] = [];
const gameOf = new Map<string, string>();
for (const [id, names] of Object.entries(GAME)) for (const n of names) gameOf.set(n, id);

for (const f of geo.features) {
  const n = f.properties.ADMIN;
  if (SKIP.has(n)) continue;
  const rings = polys(f);
  let kind = 'other';
  let id = n;
  if (USA.includes(n)) kind = 'usa';
  else if (USSR.includes(n)) kind = 'ussr';
  else if (n === 'China') kind = 'china';
  else if (gameOf.has(n)) {
    id = gameOf.get(n)!;
    kind = COUNTRIES[id].region;
  }
  const d = toPath(rings);
  if (d) shapes.push({ id, kind, d });
  if (n === 'Germany') {
    const east = rings.map((r) => clipRect(r, 10.75, 50.3, 20, 56)).filter((r) => r.length >= 3);
    shapes.push({ id: 'eastGermany', kind: 'europe', d: toPath(east) });
  }
}

const out = `// 由 scripts/gen-worldmap.ts 生成，请勿手改。底图数据：Natural Earth 1:110m（公有领域），按棋盘布局变形。\nexport interface MapShape { id: string; kind: string; d: string }\nexport const WORLD: MapShape[] = ${JSON.stringify(shapes)};\n`;
writeFileSync('src/client/game/worldmap.gen.ts', out);
console.log(`写出 ${shapes.length} 个形状，${(out.length / 1024).toFixed(0)} KB，控制点 ${ctrl.length}，λ=${LAMBDA}`);
void W; void H; void ANCHORS;
