// 从 docs/ref 下的两份开源数据（MIT）生成 src/data/*.gen.ts，并做交叉校验。
// 用法：npm run gen:data
import { readFileSync, writeFileSync } from 'node:fs';

const ref = (p: string) => JSON.parse(readFileSync(`docs/ref/${p}`, 'utf8'));

interface TjCountry { name: string; stability: number; battleground: boolean; region: string; sub_regions?: string[]; adjacent: string[] }
interface DsCountry { id: number; name: string; stability: number; battleground: boolean; region: string; subregions: string[]; superpower_adjacent: string | null; neighbours: string[]; pos: [number, number] }
interface TjCard { id: number; name: string; ops: number; phase: string; side: string; optional: boolean; removed_after_event: boolean; ongoing: boolean; scoring: boolean; text: string }

const tj: TjCountry[] = ref('data/standard_map.json');
const ds: DsCountry[] = ref('deepstruggle/map.json').countries;
const zh = ref('deepstruggle/zh-CN/game.json');
const tjCards: TjCard[] = ref('data/cards.json').cards;
const start = ref('data/standard_start.json');

const alias: Record<string, string> = { 'United Kingdom': 'UK', 'Dominican Rep': 'Dominican Republic' };
const tjName = (n: string) => alias[n] ?? n;

function key(name: string): string {
  const special: Record<string, string> = { UK: 'uk', 'Dominican Republic': 'dominicanRep', 'SE African States': 'seAfricanStates', USA: 'usa', USSR: 'ussr' };
  if (special[name]) return special[name];
  const parts = name.split(/[^A-Za-z]+/).filter(Boolean);
  return parts.map((p, i) => (i === 0 ? p.toLowerCase() : p[0].toUpperCase() + p.slice(1).toLowerCase())).join('');
}

const errors: string[] = [];
const regionKey: Record<string, string> = { Europe: 'europe', Asia: 'asia', 'Middle East': 'middleEast', Africa: 'africa', 'Central America': 'centralAmerica', 'South America': 'southAmerica' };

const countries = ds.map((d) => {
  const t = tj.find((c) => c.name === tjName(d.name));
  if (!t) { errors.push(`缺少国家 ${d.name}`); return null!; }
  if (t.stability !== d.stability) errors.push(`${d.name} 稳定度不一致`);
  if (t.battleground !== d.battleground) errors.push(`${d.name} 战场国不一致`);
  const tAdj = t.adjacent.filter((a) => a !== 'USA' && a !== 'USSR').sort();
  const dAdj = d.neighbours.map(tjName).sort();
  if (tAdj.join() !== dAdj.join()) errors.push(`${d.name} 邻接不一致：${tAdj} vs ${dAdj}`);
  const tSp = t.adjacent.find((a) => a === 'USA' || a === 'USSR') ?? null;
  if (tSp !== d.superpower_adjacent) errors.push(`${d.name} 超级大国邻接不一致`);
  const sub: string[] = [];
  for (const s of d.subregions) {
    if (s === 'Western Europe') sub.push('westernEurope');
    else if (s === 'Eastern Europe') sub.push('easternEurope');
    else if (s === 'Southeast Asia') sub.push('southeastAsia');
  }
  const inf = start.influence[tjName(d.name)] ?? [0, 0];
  return {
    id: key(tjName(d.name)),
    name: tjName(d.name),
    zh: zh.countries[String(d.id)] as string,
    region: regionKey[d.region],
    sub,
    stability: d.stability,
    bg: d.battleground,
    adj: [...dAdj.map(key), ...(tSp ? [tSp.toLowerCase()] : [])],
    pos: d.pos,
    start: inf as [number, number],
  };
});

// 邻接对称性
const byId = new Map(countries.map((c) => [c.id, c]));
for (const c of countries) for (const a of c.adj) {
  if (a === 'usa' || a === 'ussr') continue;
  if (!byId.get(a)?.adj.includes(c.id)) errors.push(`邻接不对称 ${c.id}-${a}`);
}

// ---------- 卡牌 ----------
// 中文名、中文文本与“战争”标记取自调研报告附表 B（已在 DeepStruggle zh-CN 基础上校订）。
const md = readFileSync('docs/research-rules.md', 'utf8');
const tableB = md.slice(md.indexOf('### 附表 B'), md.indexOf('### 附表 C'));
const rows = new Map<number, { zh: string; flags: string; text: string }>();
for (const line of tableB.split('\n')) {
  const m = line.match(/^\| (\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]*) \| ([^|]*) \| (.+) \|$/);
  if (!m) continue;
  rows.set(Number(m[1]), { zh: m[3].trim().replace(/（.*?）/g, ''), flags: m[8], text: m[9].trim() });
}
const sideMap: Record<string, string> = { Us: 'US', US: 'US', Ussr: 'USSR', USSR: 'USSR', Both: 'NEUTRAL', Neutral: 'NEUTRAL' };
const eraMap: Record<string, string> = { Early: 'early', Mid: 'mid', Late: 'late' };
const cards = tjCards.map((c) => {
  const r = rows.get(c.id);
  if (!r) errors.push(`附表 B 缺少卡牌 #${c.id}`);
  if (!sideMap[c.side]) errors.push(`#${c.id} 未知阵营 ${c.side}`);
  const dsName = zh.cards[String(c.id)]?.name;
  if (!dsName) errors.push(`DeepStruggle 缺少 #${c.id} 中文名`);
  return {
    id: c.id,
    name: c.name,
    zh: r?.zh ?? dsName,
    side: sideMap[c.side],
    ops: c.ops,
    era: eraMap[c.phase],
    starred: c.removed_after_event,
    // #27 美日共同防卫协定在 tomjefferys 中漏标持续
    ongoing: c.ongoing || c.id === 27,
    scoring: c.scoring,
    war: !!r?.flags.includes('战争'),
    optional: c.optional,
    text: (r?.text ?? '').replace(/核危机等级/g, 'DEFCON'),
    textEn: c.text,
  };
});
if (cards.length !== 110) errors.push(`卡牌数 ${cards.length}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const header = '// 由 scripts/gen-data.ts 生成，请勿手改。数据来源：tomjefferys/twilight-struggle-rs、mihaild/DeepStruggle（MIT）。\n';
writeFileSync('src/data/countries.gen.ts', header + `import type { CountryDef } from './types';\n\nexport const COUNTRY_LIST: CountryDef[] = ${JSON.stringify(countries, null, 1)};\n`);
writeFileSync('src/data/cards.gen.ts', header + `import type { CardDef } from './types';\n\nexport const CARD_LIST: CardDef[] = ${JSON.stringify(cards, null, 1)};\n`);
console.log(`生成完成：${countries.length} 国，${cards.length} 张卡`);
