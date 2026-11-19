// 终局预估：假如现在就进行终局计分，当前 VP + 本回合军事行动扣分 + 各区域得分 + 中国牌。
import { REGIONS, type RegionId, type Side } from '../../data';
import { scoreRegion, type RegionScore } from '../../engine/scoring';
import type { GameView } from '../../engine/view';

export interface Projection {
  regions: RegionScore[];
  china: number;
  /** 本回合军事行动不足的扣分（回合结束先结算，再终局计分；正数美方得分） */
  milops: number;
  /** 计入终局计分后的 VP（正数美方） */
  total: number;
  /** 终局计分时控制欧洲直接获胜 */
  autoWin?: Side;
}

export function projectFinal(v: GameView): Projection {
  const regions = REGIONS.map((r: RegionId) => scoreRegion(v as never, r, { formosan: v.flags.formosan }));
  const china = v.china.holder === 'US' ? 1 : -1;
  const short = (side: Side) => Math.max(0, v.defcon - v.milops[side]);
  const milops = short('USSR') - short('US');
  const total = v.vp + milops + regions.reduce((s, r) => s + r.net, 0) + china;
  const autoWin = regions.find((r) => r.autoWin)?.autoWin;
  return { regions, china, milops, total, autoWin };
}

export const leadText = (vp: number) => (vp > 0 ? `美国领先 ${vp}` : vp < 0 ? `苏联领先 ${-vp}` : '双方打平');
