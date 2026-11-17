import { CARDS, COUNTRIES } from '../../data';
import type { Game, Gen } from '../game';
import { cardName, countryName } from '../util';
import { SIDE_ZH, opp, type Side } from '../types';
import type { Effect } from '.';

/** 对手按要求弃一张行动点 ≥ n 的牌，否则执行 penalty。返回是否弃了牌。 */
export function* discardOrElse(g: Game, victim: Side, card: number, n: number, prompt: string, elseLabel: string): Gen<boolean> {
  const cards = g.s.hands[victim].filter((c) => !CARDS[c].scoring && g.effOps(victim, c) >= n);
  if (!cards.length) return false;
  const c = yield* g.askCard(victim, 'discard', prompt, cards, { card, pass: elseLabel, auto: false });
  if (c === 'pass') return false;
  g.removeFromHand(victim, c);
  g.discardCard(c);
  g.log(`${SIDE_ZH[victim]}弃掉 ${cardName(c)}`, { side: victim });
  return true;
}

/** 随机弃一张手牌（Five Year Plan、Terrorism） */
export function randomDiscard(g: Game, victim: Side): number | undefined {
  const h = g.s.hands[victim];
  if (!h.length) return undefined;
  const c = h[Math.floor(g.random() * h.length)];
  g.removeFromHand(victim, c);
  return c;
}

export const EARLY: Record<number, Effect> = {
  // Duck and Cover
  4: {
    *run(g) {
      g.degradeDefcon(1, '卧倒掩护');
      g.vp('US', 5 - g.s.defcon, '卧倒掩护');
    },
  },
  // Five Year Plan
  5: {
    *run(g) {
      const c = randomDiscard(g, 'USSR');
      if (c === undefined) return g.log('苏联没有手牌');
      g.log(`五年计划：苏联随机弃掉 ${cardName(c)}`);
      if (CARDS[c].side === 'US') {
        const fired = yield* g.fireEvent(c, 'US', {});
        g.relocate(c, fired, 'US');
      } else g.discardCard(c);
    },
  },
  // Socialist Governments
  7: {
    can: (g) => !g.s.flags.ironLady,
    *run(g, me) {
      yield* g.removeInfluence(me, 'US', 7, 3, (c) => g.inReg(c, 'westernEurope'), { maxPer: 2 });
    },
  },
  // Fidel
  8: {
    *run(g) {
      g.setInf('cuba', 'US', 0);
      g.addForControl('cuba', 'USSR');
      g.log('卡斯特罗：苏联控制古巴');
    },
  },
  // Vietnam Revolts
  9: {
    *run(g) {
      g.addInf('vietnam', 'USSR', 2);
      g.s.flags.vietnamRevolts = true;
      g.log('越南 +2 苏联影响力；本回合苏联行动点全部用于东南亚时 +1');
    },
  },
  // Blockade
  10: {
    *run(g) {
      const ok = yield* discardOrElse(g, 'US', 10, 3, '封锁：弃掉一张行动点 ≥3 的牌，否则失去西德全部影响力', '不弃（失去西德影响力）');
      if (!ok) {
        g.setInf('westGermany', 'US', 0);
        g.log('封锁：移除西德全部美国影响力');
      }
    },
  },
  // Korean War
  11: {
    *run(g, me) {
      yield* g.war(me, 11, 'southKorea', { need: 4, vp: 2, milops: 2 });
    },
  },
  // Romanian Abdication
  12: {
    *run(g) {
      g.setInf('romania', 'US', 0);
      g.addForControl('romania', 'USSR');
      g.log('罗马尼亚国王退位：苏联控制罗马尼亚');
    },
  },
  // Arab-Israeli War
  13: {
    can: (g) => !g.s.flags.campDavid,
    *run(g, me) {
      yield* g.war(me, 13, 'israel', { need: 4, vp: 2, milops: 2, selfMinus: true });
    },
  },
  // Comecon
  14: {
    *run(g, me) {
      const picked = yield* g.pickCountries(me, 14, 4, (c) => g.inReg(c, 'easternEurope') && !g.controls('US', c), '经济互助委员会：选择未被美国控制的东欧国家 +1');
      for (const c of picked) g.addInf(c, me, 1);
      g.log(`经济互助委员会：${picked.map(countryName).join('、')} 各 +1`);
    },
  },
  // Nasser
  15: {
    *run(g) {
      g.addInf('egypt', 'USSR', 2);
      const n = Math.ceil(g.inf('egypt', 'US') / 2);
      g.removeInf('egypt', 'US', n);
      g.log(`纳赛尔：埃及苏联 +2，美国 -${n}`);
    },
  },
  // Warsaw Pact Formed
  16: {
    *run(g, me) {
      const v = yield* g.askOption(me, '华沙条约组织成立：选择效果', [
        ['remove', '移除东欧 4 国的全部美国影响力'],
        ['add', '在东欧增加 5 点苏联影响力（每国最多 2 点）'],
      ], { card: 16 });
      if (v === 'remove') {
        const picked = yield* g.pickCountries(me, 16, 4, (c) => g.inReg(c, 'easternEurope') && g.inf(c, 'US') > 0, '华沙条约：移除该国全部美国影响力', { tag: 'removeEvent' });
        for (const c of picked) g.setInf(c, 'US', 0);
        if (picked.length) g.log(`华沙条约：${picked.map(countryName).join('、')} 美国影响力清零`);
      } else {
        yield* g.placeInfluence(me, 16, 5, (c) => g.inReg(c, 'easternEurope'), { maxPer: 2 });
      }
      g.s.flags.warsawPact = true;
    },
  },
  // De Gaulle Leads France
  17: {
    *run(g) {
      g.removeInf('france', 'US', 2);
      g.addInf('france', 'USSR', 1);
      g.s.flags.deGaulle = true;
      g.log('戴高乐：法国美国 -2、苏联 +1，北约不再保护法国');
    },
  },
  // Captured Nazi Scientist
  18: {
    *run(g, me) {
      g.advanceSpace(me, 1);
    },
  },
  // Truman Doctrine
  19: {
    *run(g, me) {
      const ids = g.countries((c) => g.inReg(c, 'europe') && g.controller(c) === null && g.inf(c, 'USSR') > 0);
      if (!ids.length) return g.log('杜鲁门主义：没有符合条件的国家');
      const c = yield* g.askCountry(me, 'removeEvent', '杜鲁门主义：移除一个未受控欧洲国家的全部苏联影响力', ids, { card: 19 });
      g.setInf(c, 'USSR', 0);
      g.log(`杜鲁门主义：${countryName(c)}苏联影响力清零`);
    },
  },
  // Olympic Games
  20: {
    *run(g, me) {
      const them = opp(me);
      const v = yield* g.askOption(them, `${SIDE_ZH[me]}主办奥运会：参加还是抵制？`, [
        ['go', '参加（双方掷骰，主办方 +2，高者得 2 VP）'],
        ['boycott', '抵制（DEFCON -1，主办方获得 4 点行动点）'],
      ], { card: 20, auto: false });
      if (v === 'go') {
        for (;;) {
          const a = g.roll() + 2, b = g.roll();
          g.log(`奥运会：${SIDE_ZH[me]} ${a - 2}+2，${SIDE_ZH[them]} ${b}`, { kind: 'roll' });
          if (a === b) continue;
          g.vp(a > b ? me : them, 2, '奥运会');
          break;
        }
      } else {
        g.log(`${SIDE_ZH[them]}抵制奥运会`);
        g.degradeDefcon(1, '抵制奥运会');
        yield* g.opsPlay(me, 4, { card: 20 });
      }
    },
  },
  // NATO
  21: {
    can: (g) => !!(g.s.flags.warsawPact || g.s.flags.marshall),
    *run(g) {
      g.s.flags.nato = true;
      g.log('北约成立：苏联不能对美国控制的欧洲国家政变或调整');
    },
  },
  // Independent Reds
  22: {
    *run(g, me) {
      const ids = ['yugoslavia', 'romania', 'bulgaria', 'hungary', 'czechoslovakia'].filter((c) => g.inf(c, 'USSR') > g.inf(c, 'US'));
      if (!ids.length) return g.log('独立的红色：没有需要追平的国家');
      const c = yield* g.askCountry(me, 'placeEvent', '独立的红色：选择一国，美国影响力追平苏联', ids, { card: 22 });
      const n = g.inf(c, 'USSR') - g.inf(c, 'US');
      g.addInf(c, 'US', n);
      g.log(`独立的红色：${countryName(c)} 美国 +${n}`);
    },
  },
  // Marshall Plan
  23: {
    *run(g, me) {
      const picked = yield* g.pickCountries(me, 23, 7, (c) => g.inReg(c, 'westernEurope') && !g.controls('USSR', c), '马歇尔计划：选择未被苏联控制的西欧国家 +1');
      for (const c of picked) g.addInf(c, me, 1);
      g.log(`马歇尔计划：${picked.map(countryName).join('、')} 各 +1`);
      g.s.flags.marshall = true;
    },
  },
  // Indo-Pakistani War
  24: {
    *run(g, me) {
      const t = yield* g.askOption(me, '印巴战争：选择被入侵的国家', [['pakistan', '印度入侵巴基斯坦'], ['india', '巴基斯坦入侵印度']], { card: 24 });
      yield* g.war(me, 24, t, { need: 4, vp: 2, milops: 2 });
    },
  },
  // Containment
  25: {
    *run(g) {
      g.s.flags.containment = true;
      g.log('遏制政策：本回合美国每张牌行动点 +1（最多 4）');
    },
  },
  // CIA Created
  26: {
    *run(g) {
      g.revealHand('USSR', '中情局成立');
      yield* g.opsPlay('US', 1, { card: 26 });
    },
  },
  // US/Japan Mutual Defense Pact
  27: {
    *run(g) {
      g.addForControl('japan', 'US');
      g.s.flags.usJapan = true;
      g.log('美日共同防卫协定：美国控制日本，苏联不能对日本政变或调整');
    },
  },
  // Suez Crisis
  28: {
    *run(g, me) {
      yield* g.removeInfluence(me, 'US', 28, 4, (c) => c === 'france' || c === 'uk' || c === 'israel', { maxPer: 2 });
    },
  },
  // East European Unrest
  29: {
    *run(g, me) {
      const n = g.s.turn >= 8 ? 2 : 1;
      const picked = yield* g.pickCountries(me, 29, 3, (c) => g.inReg(c, 'easternEurope') && g.inf(c, 'USSR') > 0, `东欧动乱：选择东欧国家移除 ${n} 点苏联影响力`, { tag: 'removeEvent' });
      for (const c of picked) g.removeInf(c, 'USSR', n);
      if (picked.length) g.log(`东欧动乱：${picked.map(countryName).join('、')} 苏联 -${n}`);
    },
  },
  // Decolonization
  30: {
    *run(g, me) {
      const picked = yield* g.pickCountries(me, 30, 4, (c) => g.inReg(c, 'africa') || g.inReg(c, 'southeastAsia'), '去殖民地化：选择非洲或东南亚国家 +1');
      for (const c of picked) g.addInf(c, me, 1);
      g.log(`去殖民地化：${picked.map(countryName).join('、')} 各 +1`);
    },
  },
  // Red Scare/Purge
  31: {
    *run(g, me) {
      const f = g.s.flags;
      f.redScare = [...(f.redScare ?? []), opp(me)];
      g.log(`${me === 'US' ? '红色恐慌' : '大清洗'}：本回合${SIDE_ZH[opp(me)]}每张牌行动点 -1`);
    },
  },
  // UN Intervention
  32: {
    can: (g, _me, player) => g.s.hands[player].some((c) => CARDS[c].side === opp(player) && !CARDS[c].scoring),
    *run(g, me) {
      const cards = g.s.hands[me].filter((c) => CARDS[c].side === opp(me) && !CARDS[c].scoring);
      const c = (yield* g.askCard(me, 'pickCard', '联合国干预：选择一张对手事件牌，取消其事件并使用其行动点', cards, { card: 32 })) as number;
      g.removeFromHand(me, c);
      g.log(`联合国干预：取消 ${cardName(c)} 的事件`, { side: me });
      if (me === 'US') g.s.flags.unThisAR = true;
      if (g.s.flags.u2) g.vp('USSR', 1, 'U-2 事件');
      const prev = g.s.playing;
      g.s.playing = { card: c, side: me };
      yield* g.opsPlay(me, CARDS[c].ops, { card: c });
      g.s.playing = prev;
      g.discardCard(c);
    },
  },
  // De-Stalinization
  33: {
    *run(g, me) {
      let n = 0;
      const from: Record<string, number> = {};
      while (n < 4) {
        const ids = g.countries((c) => g.inf(c, me) > 0);
        if (!ids.length) break;
        const c = yield* g.askCountry(me, 'removeEvent', `去斯大林化：选择要撤出影响力的国家（已撤 ${n}/4）`, ids, { card: 33, done: true });
        if (c === 'done') break;
        g.removeInf(c, me, 1);
        from[c] = (from[c] ?? 0) + 1;
        n++;
      }
      if (n) g.log(`去斯大林化：撤出 ${Object.entries(from).map(([c, k]) => `${countryName(c)} -${k}`).join('，')}`);
      yield* g.placeInfluence(me, 33, n, (c) => !g.controls('US', c), { maxPer: 2, prompt: '去斯大林化：放到未被美国控制的国家' });
    },
  },
  // Nuclear Test Ban
  34: {
    *run(g, me) {
      g.vp(me, g.s.defcon - 2, '禁止核试验');
      g.improveDefcon(2, '禁止核试验');
    },
  },
  // Formosan Resolution
  35: {
    *run(g) {
      g.s.flags.formosan = true;
      g.log('台湾决议：美国控制台湾时，亚洲计分视其为战场国');
    },
  },
  // Defectors
  103: {
    *run(g, me) {
      if (me === 'US' && g.s.phase === 'headline' && g.s.headline.USSR !== undefined && !g.headlineCancel.has('USSR')) {
        g.headlineCancel.add('USSR');
        g.log('叛逃者：取消苏联头条');
      }
    },
  },
  // The Cambridge Five
  104: {
    can: (g) => g.s.turn <= 7,
    *run(g, me) {
      const scoring = g.s.hands.US.filter((c) => CARDS[c].scoring);
      if (!scoring.length) return g.log('剑桥五杰：美国手中没有计分卡');
      for (const c of scoring) if (!g.s.known.US.includes(c)) g.s.known.US.push(c);
      g.log(`剑桥五杰：美国公开计分卡 ${scoring.map(cardName).join('、')}`);
      const regionOf: Record<number, string> = { 1: 'asia', 2: 'europe', 3: 'middleEast', 37: 'centralAmerica', 38: 'southeastAsia', 79: 'africa', 81: 'southAmerica' };
      const regions = [...new Set(scoring.map((c) => regionOf[c]))];
      const ids = g.countries((c) => regions.some((r) => g.inReg(c, r as never)));
      const c = yield* g.askCountry(me, 'placeEvent', '剑桥五杰：在被公开计分卡的区域内 +1 苏联影响力', [...ids], { card: 104, done: true });
      if (c !== 'done') {
        g.addInf(c, me, 1);
        g.log(`剑桥五杰：${countryName(c)} +1`);
      }
    },
  },
  // Special Relationship
  105: {
    effect: (g) => g.controls('US', 'uk'),
    *run(g, me) {
      if (g.s.flags.nato) {
        const c = yield* g.askCountry(me, 'placeEvent', '特殊关系：在一个西欧国家 +2 美国影响力', g.regionCountries('westernEurope'), { card: 105 });
        g.addInf(c, me, 2);
        g.log(`特殊关系：${countryName(c)} +2`);
        g.vp('US', 2, '特殊关系');
      } else {
        const c = yield* g.askCountry(me, 'placeEvent', '特殊关系：在一个与英国相邻的国家 +1 美国影响力', COUNTRIES.uk.adj.filter((a) => a !== 'usa' && a !== 'ussr'), { card: 105 });
        g.addInf(c, me, 1);
        g.log(`特殊关系：${countryName(c)} +1`);
      }
    },
  },
  // NORAD
  106: {
    *run(g) {
      g.s.flags.norad = true;
      g.log('北美防空司令部：DEFCON 降到 2 的行动轮结束时，美国可在一国 +1');
    },
  },
};
