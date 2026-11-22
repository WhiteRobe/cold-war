import { COUNTRIES } from '../../data';
import { openRegions } from '../endless';
import { opp } from '../types';
import type { Effect } from '.';

export const ENDLESS: Record<number, Effect> = {
  // 日美贸易摩擦：解锁日本
  111: {
    *run(g) {
      g.s.flags.usJapan = false;
      const where = g.purgeCard(27);
      g.removeInf('japan', 'US', 1);
      g.log(`日美贸易摩擦：美日共同防卫协定取消${where ? `（#27 从${where}移出游戏）` : ''}，苏联可以对日本政变或调整；日本美国影响力 -1`);
    },
  },
  // 中苏友好条约
  112: {
    *run(g) {
      const n = 2 + (g.controls('USSR', 'mongolia') ? 1 : 0);
      g.addInf('china', 'USSR', n);
      g.log(`中苏友好条约：中国苏联 +${n}`);
    },
  },
  // 太平洋同盟
  113: {
    *run(g) {
      for (const c of ['japan', 'australia', 'philippines']) g.addInf(c, 'US', 1);
      g.log('太平洋同盟：日本、澳大利亚、菲律宾美国各 +1');
    },
  },
  // 联合国维和行动
  114: {
    *run(g, me) {
      const open = openRegions(g.s);
      yield* g.removeInfluence(me, opp(me), 114, 3, (c) => open.includes(COUNTRIES[c].region), { maxPer: 1 });
    },
  },
};
