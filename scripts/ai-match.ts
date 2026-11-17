// AI 对打：npx tsx scripts/ai-match.ts <美方档位> <苏方档位> [局数=10] [起始种子=1]
import { chooseAI, type AiLevel } from '../src/ai';
import { Game } from '../src/engine/game';
import { DEFAULT_OPTIONS, type Side } from '../src/engine/types';
import { viewFor } from '../src/engine/view';

export interface MatchResult {
  winner: Side | null;
  reason: string;
  steps: number;
  ms: Record<Side, number>;
  decisions: Record<Side, number>;
  turn: number;
  vp: number;
}

export function playMatch(levels: Record<Side, AiLevel>, seed: number): MatchResult {
  const g = new Game({ seed, options: DEFAULT_OPTIONS });
  let r = (seed * 2654435761) >>> 0;
  const rand = () => {
    r = (r + 0x6d2b79f5) >>> 0;
    let t = r;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ms = { US: 0, USSR: 0 };
  const decisions = { US: 0, USSR: 0 };
  let steps = 0;
  while (!g.over) {
    const d = g.waiting.find((_, j) => g.answers[j] === undefined);
    if (!d) throw new Error(`seed ${seed}: 没有待决选择`);
    const view = viewFor(g, d.side, g.s.log.length);
    const t0 = performance.now();
    const v = chooseAI(view, view.decision!, levels[d.side], rand);
    ms[d.side] += performance.now() - t0;
    decisions[d.side]++;
    const err = g.submit(d.side, v);
    if (err) throw new Error(`seed ${seed}: AI 返回非法选项 ${v}：${err}（${d.prompt}）`);
    if (++steps > 20000) throw new Error(`seed ${seed}: 步数过多`);
  }
  return { winner: g.s.winner ?? null, reason: g.s.winReason ?? '', steps, ms, decisions, turn: g.s.turn, vp: g.s.vp };
}

if (process.argv[1]?.endsWith('ai-match.ts')) {
  const us = Number(process.argv[2] ?? 2) as AiLevel;
  const ussr = Number(process.argv[3] ?? 2) as AiLevel;
  const n = Number(process.argv[4] ?? 10);
  const seed0 = Number(process.argv[5] ?? 1);
  const wins = { US: 0, USSR: 0, draw: 0 };
  const reasons: Record<string, number> = {};
  const ms = { US: 0, USSR: 0 };
  const dec = { US: 0, USSR: 0 };
  let turns = 0;
  for (let i = 0; i < n; i++) {
    const m = playMatch({ US: us, USSR: ussr }, seed0 + i);
    if (m.winner) wins[m.winner]++;
    else wins.draw++;
    const key = `${m.winner ?? '平'}:${m.reason.replace(/\d+/g, 'N')}`;
    reasons[key] = (reasons[key] ?? 0) + 1;
    ms.US += m.ms.US; ms.USSR += m.ms.USSR; dec.US += m.decisions.US; dec.USSR += m.decisions.USSR;
    turns += m.turn;
  }
  console.log(`美(${us}) vs 苏(${ussr})，${n} 局：美胜 ${wins.US}，苏胜 ${wins.USSR}，平 ${wins.draw}，平均结束回合 ${(turns / n).toFixed(1)}`);
  console.log(`平均耗时/步：美 ${(ms.US / dec.US).toFixed(2)} ms，苏 ${(ms.USSR / dec.USSR).toFixed(2)} ms`);
  console.log(reasons);
}
