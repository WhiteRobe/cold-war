import { COUNTRY_LIST } from '../src/data';
import { Game, GameOver, type Gen } from '../src/engine/game';
import { DEFAULT_OPTIONS, type Choice, type Decision, type Side } from '../src/engine/types';

/** 新建一局并清空棋盘，方便单测摆局面 */
export function blank(seed = 1): Game {
  const g = new Game({ seed, options: DEFAULT_OPTIONS });
  for (const c of COUNTRY_LIST) g.s.inf[c.id] = [0, 0];
  g.s.hands = { US: [], USSR: [] };
  g.s.phase = 'action';
  g.s.turn = 4;
  g.s.ar = 1;
  g.s.phasing = 'US';
  return g;
}

export function set(g: Game, c: string, us: number, ussr: number) {
  g.s.inf[c] = [us, ussr];
}

/** 固定掷骰结果（按顺序循环） */
export function dice(g: Game, ...rolls: number[]) {
  let i = 0;
  g.roll = () => rolls[i++ % rolls.length];
}

export type Answer = Choice | ((d: Decision) => Choice);

export interface DriveResult<T> {
  value?: T;
  over?: GameOver;
  asked: Decision[];
}

/** 驱动一个引擎生成器，按顺序回答选择 */
export function drive<T>(gen: Gen<T>, answers: Answer[] = []): DriveResult<T> {
  const asked: Decision[] = [];
  let input: Choice[] | undefined;
  let k = 0;
  try {
    for (;;) {
      const r = gen.next(input as Choice[]);
      if (r.done) return { value: r.value, asked };
      const ds = r.value;
      asked.push(...ds);
      input = ds.map((d) => {
        const a = answers[k++];
        if (a === undefined) throw new Error(`没有为选择准备答案：${d.prompt}（选项：${d.options.map((o) => o.v).join(',')}）`);
        const v = typeof a === 'function' ? a(d) : a;
        if (!d.options.some((o) => o.v === v)) throw new Error(`答案 ${v} 不在选项中：${d.prompt}（${d.options.map((o) => o.v).join(',')}）`);
        return v;
      });
    }
  } catch (e) {
    if (e instanceof GameOver) return { over: e, asked };
    throw e;
  }
}

export const opts = (d: Decision) => d.options.map((o) => o.v);
export const side = (s: Side) => s;
