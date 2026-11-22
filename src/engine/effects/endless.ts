import { COUNTRIES, koreaKeep } from '../../data';
import { OIL_COUNTRIES, openRegions, orbitalStrike } from '../endless';
import { SIDE_ZH, opp, type Side } from '../types';
import { cardName, countryName } from '../util';
import type { Game, Gen } from '../game';
import { randomDiscard } from './early';
import type { Effect } from '.';

const inR = (c: string, r: string) => COUNTRIES[c].region === r || COUNTRIES[c].sub.includes(r as never);

/** 太空竞赛前进一格；已到空间站时改为轨道打击 */
function* spaceStep(g: Game, me: Side): Gen {
  if (g.s.space[me] >= 8) yield* orbitalStrike(g, me);
  else {
    g.advanceSpace(me, 1);
    yield* g.spaceSwap(me);
  }
}

/** 免费政变（不计军事行动、不降 DEFCON） */
function* freeCoup(g: Game, me: Side, card: number, ops: number, ok: (c: string) => boolean, what: string): Gen {
  const ids = g.countries((c) => ok(c) && g.canTarget(me, c, 'coup', { free: true }));
  if (!ids.length) return g.log(`${cardName(card)}：没有可以政变的${what}`);
  const c = yield* g.askCountry(me, 'coupTarget', `${cardName(card)}：选择政变目标（${ops} 点行动点）`, ids, { card });
  yield* g.coup(me, c, ops, { free: true, card, orbital: true });
}

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
  // ---- 苏联 ----
  115: { *run(g, me) { yield* g.placeInfluence(me, 115, 4, (c) => g.inReg(c, 'easternEurope'), { maxPer: 2 }); } },
  116: { *run(g, me) { yield* g.placeInfluence(me, 116, 3, (c) => g.inReg(c, 'africa'), { maxPer: 1 }); } },
  117: {
    *run(g, me) {
      yield* g.placeInfluence(me, 117, 3, (c) => g.inReg(c, 'centralAmerica'), { maxPer: 1 });
      if (g.controls(me, 'cuba')) yield* g.placeInfluence(me, 117, 1, (c) => g.inReg(c, 'centralAmerica'), { prompt: '古巴模式：苏联控制古巴，再在中美洲放 1 点' });
    },
  },
  118: {
    *run(g, me) {
      const n = Math.min(4, OIL_COUNTRIES.filter((c) => g.controls(me, c)).length);
      if (!n) return g.log('能源武器：苏联没有控制石油国');
      yield* g.placeInfluence(me, 118, n, (c) => g.inReg(c, 'europe'));
    },
  },
  119: { *run(g, me) { yield* spaceStep(g, me); } },
  120: { *run(g, me) { yield* g.opsPlay(me, 4, { card: 120, modes: ['influence'], filter: (c) => g.inReg(c, 'asia'), raw: true }); } },
  121: { *run(g, me) { yield* freeCoup(g, me, 121, 3, (c) => COUNTRIES[c].adj.includes(me === 'USSR' ? 'ussr' : 'usa'), '与本土相邻的国家'); } },
  122: { *run(g, me) { yield* g.removeInfluence(me, opp(me), 122, 3, (c) => g.inReg(c, 'southAmerica'), { maxPer: 2 }); } },
  123: {
    *run(g, me) {
      const them = opp(me);
      g.revealHand(them, '克格勃渗透');
      const ids = g.countries((c) => !COUNTRIES[c].bg && g.controls(them, c));
      if (!ids.length) return g.log(`克格勃渗透：${SIDE_ZH[them]}没有控制非战场国`);
      const c = yield* g.askCountry(me, 'removeEvent', `克格勃渗透：选择移除 2 点${SIDE_ZH[them]}影响力的国家`, ids, { card: 123 });
      g.removeInf(c, them, 2);
      g.log(`克格勃渗透：${countryName(c)}${SIDE_ZH[them]}影响力 -2`);
    },
  },
  124: {
    *run(g, me) {
      const korea = g.s.flags.unifyKorea ? koreaKeep(g.s.flags.unifyKorea) : 'northKorea';
      const list = ['mongolia', 'china', korea].filter((c) => g.s.inf[c]);
      for (const c of list) g.addInf(c, me, 1);
      g.log(`西伯利亚大铁路：${list.map(countryName).join('、')}各 +1`);
    },
  },
  125: {
    *run(g, me) {
      g.improveDefcon(1, '和平攻势');
      yield* g.placeInfluence(me, 125, 2, (c) => g.inReg(c, 'westernEurope'), { maxPer: 1 });
    },
  },
  // ---- 美国 ----
  126: { *run(g, me) { yield* g.placeInfluence(me, 126, 5, (c) => g.inReg(c, 'westernEurope'), { maxPer: 2 }); } },
  127: { *run(g, me) { yield* g.placeInfluence(me, 127, 3, (c) => g.inReg(c, 'centralAmerica'), { maxPer: 1 }); } },
  128: { *run(g, me) { yield* g.placeInfluence(me, 128, 3, (c) => g.inReg(c, 'southeastAsia'), { maxPer: 1 }); } },
  129: { *run(g, me) { yield* g.removeInfluence(me, opp(me), 129, 3, (c) => g.inReg(c, 'easternEurope'), { maxPer: 1 }); } },
  130: { *run(g, me) { yield* spaceStep(g, me); } },
  131: { *run(g, me) { yield* g.placeInfluence(me, 131, 3, (c) => g.inReg(c, 'middleEast'), { maxPer: 1 }); } },
  132: { *run(g, me) { yield* g.placeInfluence(me, 132, 3, (c) => g.inReg(c, 'africa'), { maxPer: 1 }); } },
  133: { *run(g, me) { yield* freeCoup(g, me, 133, 3, (c) => !COUNTRIES[c].bg, '非战场国'); } },
  134: {
    *run(g, me) {
      const home = me === 'US' ? 'ussr' : 'usa';
      yield* g.placeInfluence(me, 134, 2, (c) => COUNTRIES[c].adj.includes(home), { perCountry: 2 });
    },
  },
  135: { *run(g, me) { yield* g.removeInfluence(me, opp(me), 135, 4, (c) => OIL_COUNTRIES.includes(c), { maxPer: 1 }); } },
  136: { *run(g, me) { yield* g.opsPlay(me, 4, { card: 136, modes: ['coup', 'realign'], filter: (c) => g.inReg(c, 'asia'), raw: true }); } },
  // ---- 双方 ----
  137: {
    *run(g, me) {
      // 不会把 DEFCON 降到 1
      if (g.s.defcon > 2) g.degradeDefcon(1, '核威慑升级');
      else g.log('核威慑升级：DEFCON 已是 2，不再降低');
      yield* g.opsPlay(me, 3, { card: 137, modes: ['influence'], raw: true });
    },
  },
  138: { *run(g, me) { yield* g.removeInfluence(me, opp(me), 138, 2, (c) => g.inReg(c, 'africa') || g.inReg(c, 'southAmerica')); } },
  139: { *run(g, me) { yield* g.placeInfluence(me, 139, 2, (c) => g.inReg(c, 'europe'), { maxPer: 1 }); } },
  140: {
    *run(g, me) {
      if (g.s.china.holder !== me) {
        g.s.china = { holder: me, faceUp: false };
        g.log(`安理会决议：联合国牌转到${SIDE_ZH[me]}手中（背面朝上）`);
        return;
      }
      yield* g.placeInfluence(me, 140, 2, (c) => ['uk', 'france', 'china'].includes(c));
    },
  },
  141: { *run(g, me) { yield* g.opsPlay(me, 3, { card: 141, modes: ['realign'], free: true, raw: true }); } },
  142: {
    can: (g, me) => proxyTargets(g, me).length > 0,
    *run(g, me) {
      const ids = proxyTargets(g, me);
      const c = yield* g.askCountry(me, 'coupTarget', '代理人战争：选择被入侵的国家', ids, { card: 142 });
      yield* g.war(me, 142, c, { need: 4, vp: 2, milops: 2 });
    },
  },
  143: {
    *run(g, me) {
      const them = opp(me);
      const c = randomDiscard(g, them);
      if (c === undefined) return g.log(`经济危机：${SIDE_ZH[them]}没有手牌`);
      g.discardCard(c);
      g.log(`经济危机：${SIDE_ZH[them]}随机弃掉 ${cardName(c)}`, { move: { cards: [c], from: them, to: 'discard', why: '经济危机：随机弃牌' } });
    },
  },
  144: { *run(g, me) { yield* g.placeInfluence(me, 144, 3, (c) => OIL_COUNTRIES.includes(c), { maxPer: 1 }); } },
  145: { *run(g) { g.improveDefcon(2, '缓和峰会'); } },
  147: {
    can: (g) => !!g.s.flags.unifyGermany,
    *run(g) {
      g.s.flags.euFounded = true;
      g.log('欧盟成立：此后行动轮中打出的牌不能在欧洲政变、调整阵营');
    },
  },
  149: {
    *run(g, me) {
      const them = opp(me);
      const ids = g.countries((c) => ['asia', 'middleEast', 'europe'].includes(COUNTRIES[c].region) && !(g.s.flags.euFounded && COUNTRIES[c].region === 'europe'));
      const c = yield* g.askCountry(me, 'coupTarget', 'Z 世代：选择政变成功的国家（亚洲、中东、欧洲）', ids, { card: 149 });
      const n = g.inf(c, them);
      g.setInf(c, them, 0);
      g.addInf(c, me, n + 1);
      g.log(`Z 世代：${countryName(c)}政变成功，${SIDE_ZH[them]}的 ${n} 点影响力换成${SIDE_ZH[me]}，再 +1（${SIDE_ZH[me]} +${n + 1}）`, { side: me });
    },
  },
  148: { *run(g, me) { yield* g.placeInfluence(me, 148, 2, (c) => g.inf(c, me) > 0, { maxPer: 1 }); } },
  146: {
    *run(g, me) {
      const c = g.draw();
      if (c === undefined) return g.log('情报交换：牌库没有牌了');
      g.addToHand(me, c);
      g.log(`情报交换：${SIDE_ZH[me]}抽 1 张牌`);
      g.log(`情报交换：${SIDE_ZH[me]}抽到 ${cardName(c)}（只有你看得到）`, { side: me, to: me });
    },
  },
};

/** 代理人战争的目标：没被任何一方控制的洲里、有对手影响力的战场国 */
function proxyTargets(g: Game, me: Side): string[] {
  const open = openRegions(g.s);
  return g.countries((c) => COUNTRIES[c].bg && open.includes(COUNTRIES[c].region) && g.inf(c, opp(me)) > 0);
}
