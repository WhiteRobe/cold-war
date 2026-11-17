// 随机对局冒烟：npx tsx scripts/sim.ts [局数] [起始种子]
import { Game } from '../src/engine/game';
import { DEFAULT_OPTIONS } from '../src/engine/types';
import { checkInvariants } from '../test/invariants';
import { CARDS, COUNTRIES } from '../src/data';
import type { Decision, Option } from '../src/engine/types';

/** 带基本安全意识的随机选择：优先打计分卡、不主动引发 DEFCON 1 */
function pick(g: Game, d: Decision, rand: (k: number) => number): Option {
  let opts = d.options;
  const s = g.s;
  if (d.tag === 'play' || d.tag === 'headline') {
    const sc = opts.filter((o) => typeof o.v === 'number' && CARDS[o.v].scoring);
    if (sc.length) return sc[0];
  }
  if (d.tag === 'mode' && s.defcon === 2) opts = opts.filter((o) => o.v !== 'event') .length ? opts.filter((o) => o.v !== 'event') : opts;
  if (d.tag === 'opsMode' && (s.defcon <= 2 || s.flags.cmc === d.side)) opts = opts.filter((o) => o.v !== 'coup').length ? opts.filter((o) => o.v !== 'coup') : opts;
  if (d.tag === 'coupTarget' && s.defcon === 2) opts = opts.filter((o) => typeof o.v === 'string' && (o.v === 'done' || !COUNTRIES[o.v]?.bg)).length ? opts.filter((o) => o.v === 'done' || !COUNTRIES[o.v as string]?.bg) : opts;
  opts = opts.filter((o) => o.v !== '1' && o.v !== 'down').length ? opts.filter((o) => o.v !== '1' && o.v !== 'down') : opts;
  return opts[rand(opts.length)];
}

const n = Number(process.argv[2] ?? 20);
const seed0 = Number(process.argv[3] ?? 1);
const reasons: Record<string, number> = {};
let steps = 0;
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const seed = seed0 + i;
  const g = new Game({ seed, options: DEFAULT_OPTIONS });
  let rng = seed * 7919;
  const rand = (k: number) => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) % k);
  let guard = 0;
  while (!g.over) {
    const d = g.waiting.find((_, j) => g.answers[j] === undefined);
    if (!d) throw new Error(`seed ${seed}: 没有待决选择但对局未结束`);
    const o = pick(g, d, rand);
    const err = g.submit(d.side, o.v);
    if (err) throw new Error(`seed ${seed}: ${err}`);
    try { checkInvariants(g.s); } catch (e) { console.log('seed', seed, String(e)); console.log(g.s.log.slice(-25).map((l) => `${l.turn}.${l.ar} ${l.t}`).join('\n')); throw e; }
    if (++guard > 20000) throw new Error(`seed ${seed}: 步数过多`);
  }
  steps += guard;
  const r = `${g.s.winner ?? '平'}:${g.s.winReason?.replace(/\d+/g, 'N')}`;
  reasons[r] = (reasons[r] ?? 0) + 1;
}
console.log(`${n} 局，平均 ${Math.round(steps / n)} 步，${Date.now() - t0} ms`);
console.log(reasons);
