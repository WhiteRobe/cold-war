import { CARDS, COUNTRIES, REGIONS } from '../../data';
import { scoreRegion } from '../scoring';
import { cardName, countryName } from '../util';
import { SIDE_ZH, opp, type Side } from '../types';
import type { Effect } from '.';

const caSa = (r: string) => r === 'centralAmerica' || r === 'southAmerica';

export const MID: Record<number, Effect> = {
  // Brush War
  36: {
    *run(g, me) {
      const ids = g.countries((c) => COUNTRIES[c].stability <= 2 && !(me === 'USSR' && g.natoProtects(c)));
      const t = yield* g.askCountry(me, 'coupTarget', '局部战争：选择稳定度 ≤2 的目标国', ids, { card: 36 });
      yield* g.war(me, 36, t, { need: 3, vp: 1, milops: 3 });
    },
  },
  // Arms Race
  39: {
    *run(g, me) {
      const m = g.s.milops;
      if (m[me] > m[opp(me)]) g.vp(me, m[me] >= g.s.defcon ? 3 : 1, '军备竞赛');
      else g.log('军备竞赛：军事行动未领先，无效果');
    },
  },
  // Cuban Missile Crisis
  40: {
    *run(g, me) {
      g.setDefcon(2, '古巴导弹危机');
      g.s.flags.cmc = opp(me);
      g.log(`古巴导弹危机：本回合${SIDE_ZH[opp(me)]}发动任何政变都将引发核战争`);
    },
  },
  // Nuclear Subs
  41: {
    *run(g) {
      g.s.flags.nuclearSubs = true;
      g.log('核潜艇：本回合美国用行动点在战场国政变不降低 DEFCON');
    },
  },
  // Quagmire
  42: {
    *run(g) {
      g.s.flags.quagmire = true;
      if (g.s.flags.norad) {
        g.s.flags.norad = false;
        g.cancelInPlay(106);
        g.log('泥潭取消了北美防空司令部');
      }
      g.log('泥潭：美国每个行动轮须弃一张 ≥2 行动点的牌并掷 1–4 脱困');
    },
  },
  // SALT Negotiations
  43: {
    *run(g, me) {
      g.improveDefcon(2, '战略武器限制谈判');
      g.s.flags.salt = true;
      const cards = g.s.discard.filter((c) => !CARDS[c].scoring);
      if (!cards.length) return;
      const c = yield* g.askCard(me, 'pickCard', '战略武器限制谈判：可以从弃牌堆拿 1 张非计分牌加入手牌', cards, { card: 43, pass: '不拿', auto: false });
      if (c === 'pass') return;
      g.s.discard.splice(g.s.discard.indexOf(c), 1);
      g.addToHand(me, c, true);
      g.log(`${SIDE_ZH[me]}从弃牌堆拿回 ${cardName(c)}`, { side: me });
    },
  },
  // Bear Trap
  44: {
    *run(g) {
      g.s.flags.bearTrap = true;
      g.log('熊陷阱：苏联每个行动轮须弃一张 ≥2 行动点的牌并掷 1–4 脱困');
    },
  },
  // Summit
  45: {
    *run(g, me) {
      const count = (side: Side) => REGIONS.filter((r) => {
        const lv = scoreRegion(g.s, r)[side].level;
        return lv === 'domination' || lv === 'control';
      }).length;
      const mu = count('US'), ms = count('USSR');
      const a = g.roll(), b = g.roll();
      g.log(`首脑峰会：美国 ${a}+${mu}，苏联 ${b}+${ms}`, { kind: 'roll' });
      if (a + mu === b + ms) return g.log('首脑峰会：平局');
      const w: Side = a + mu > b + ms ? 'US' : 'USSR';
      g.vp(w, 2, '首脑峰会');
      const opts: [string, string][] = [['none', 'DEFCON 不变']];
      if (g.s.defcon < 5) opts.push(['up', 'DEFCON +1（缓和）']);
      opts.push(['down', 'DEFCON -1（恶化）']);
      const v = yield* g.askOption(w, '首脑峰会：可以调整 DEFCON 1 级', opts, { card: 45 });
      if (v === 'up') g.improveDefcon(1, '首脑峰会');
      if (v === 'down') g.degradeDefcon(1, '首脑峰会');
    },
  },
  // How I Learned to Stop Worrying
  46: {
    *run(g, me) {
      const v = yield* g.askOption(me, '奇爱博士：把 DEFCON 设为任意等级', [5, 4, 3, 2, 1].map((n) => [String(n), `DEFCON ${n}${n === 1 ? '（核战争，你会输）' : ''}`] as [string, string]), { card: 46 });
      g.setDefcon(Number(v), '奇爱博士');
      g.addMilops(me, 5);
      g.log(`${SIDE_ZH[me]}军事行动 +5`, { side: me });
    },
  },
  // Junta
  47: {
    *run(g, me) {
      const ids = g.countries((c) => caSa(COUNTRIES[c].region));
      const c = yield* g.askCountry(me, 'placeEvent', '军政府：在中美洲或南美洲的一国 +2 影响力', ids, { card: 47 });
      g.addInf(c, me, 2);
      g.log(`军政府：${countryName(c)} +2`);
      yield* g.opsPlay(me, 2, { card: 47, modes: ['coup', 'realign'], filter: (x) => caSa(COUNTRIES[x].region), free: true, optional: true });
    },
  },
  // Kitchen Debates
  48: {
    effect: (g) => {
      const n = (side: Side) => g.countries((c) => COUNTRIES[c].bg && g.controls(side, c)).length;
      return n('US') > n('USSR');
    },
    *run(g) {
      g.vp('US', 2, '厨房辩论');
    },
  },
  // Missile Envy
  49: {
    *run(g, me) {
      const them = opp(me);
      const hand = g.s.hands[them];
      if (!hand.length) return g.log('导弹嫉妒：对手没有手牌');
      const top = Math.max(...hand.map((c) => CARDS[c].ops));
      const cands = hand.filter((c) => CARDS[c].ops === top);
      const c = (yield* g.askCard(them, 'pickCard', '导弹嫉妒：选择交出的最高行动点牌', cands, { card: 49 })) as number;
      g.removeFromHand(them, c);
      g.addToHand(them, 49, true);
      g.markMoved(49);
      if (g.s.headline[me] === 49) delete g.s.headline[me];
      g.s.flags.missileEnvy = them;
      g.log(`导弹嫉妒：${SIDE_ZH[me]}换走 ${cardName(c)}`);
      const def = CARDS[c];
      const prev = g.s.playing;
      g.s.playing = { card: c, side: me };
      if (def.side === me || def.side === 'NEUTRAL') {
        const fired = yield* g.fireEvent(c, me, {});
        g.relocate(c, fired, me);
      } else {
        yield* g.opsPlay(me, def.ops, { card: c });
        g.discardCard(c);
      }
      g.s.playing = prev;
    },
  },
  // We Will Bury You
  50: {
    *run(g) {
      g.degradeDefcon(1, '“我们将埋葬你们”');
      g.s.flags.wwby = true;
      g.log('“我们将埋葬你们”：除非美国下个行动轮以事件打出联合国干预，否则苏联 +3 VP');
    },
  },
  // Brezhnev Doctrine
  51: {
    *run(g) {
      g.s.flags.brezhnev = true;
      g.log('勃列日涅夫主义：本回合苏联每张牌行动点 +1（最多 4）');
    },
  },
  // Portuguese Empire Crumbles
  52: {
    *run(g) {
      g.addInf('angola', 'USSR', 2);
      g.addInf('seAfricanStates', 'USSR', 2);
      g.log('葡萄牙帝国崩溃：安哥拉、东南非洲诸国各 +2');
    },
  },
  // South African Unrest
  53: {
    *run(g, me) {
      const v = yield* g.askOption(me, '南非动荡：选择效果', [['two', '南非 +2'], ['split', '南非 +1，并在一个邻国 +2']], { card: 53 });
      if (v === 'two') {
        g.addInf('southAfrica', me, 2);
        g.log('南非动荡：南非 +2');
      } else {
        g.addInf('southAfrica', me, 1);
        const c = yield* g.askCountry(me, 'placeEvent', '南非动荡：选择南非的一个邻国 +2', COUNTRIES.southAfrica.adj.filter((a) => COUNTRIES[a]), { card: 53 });
        g.addInf(c, me, 2);
        g.log(`南非动荡：南非 +1，${countryName(c)} +2`);
      }
    },
  },
  // Allende
  54: {
    *run(g) {
      g.addInf('chile', 'USSR', 2);
      g.log('阿连德：智利 +2');
    },
  },
  // Willy Brandt
  55: {
    can: (g) => !g.s.flags.tearDownWall,
    *run(g) {
      g.vp('USSR', 1, '维利·勃兰特');
      g.addInf('westGermany', 'USSR', 1);
      g.s.flags.willyBrandt = true;
      g.log('维利·勃兰特：西德 +1，北约不再保护西德');
    },
  },
  // Muslim Revolution
  56: {
    can: (g) => !g.s.flags.awacs,
    *run(g, me) {
      const list = ['sudan', 'iran', 'iraq', 'egypt', 'libya', 'saudiArabia', 'syria', 'jordan'];
      const picked = yield* g.pickCountries(me, 56, 2, (c) => list.includes(c) && g.inf(c, 'US') > 0, '穆斯林革命：移除该国全部美国影响力', { tag: 'removeEvent' });
      for (const c of picked) g.setInf(c, 'US', 0);
      if (picked.length) g.log(`穆斯林革命：${picked.map(countryName).join('、')} 美国影响力清零`);
    },
  },
  // ABM Treaty
  57: {
    *run(g, me) {
      g.improveDefcon(1, '反弹道导弹条约');
      yield* g.opsPlay(me, 4, { card: 57 });
    },
  },
  // Cultural Revolution
  58: {
    *run(g) {
      if (g.s.china.holder === 'US') {
        g.s.china = { holder: 'USSR', faceUp: true };
        g.log('文化大革命：美国把中国牌交给苏联（正面朝上）');
      } else g.vp('USSR', 1, '文化大革命');
    },
  },
  // Flower Power
  59: {
    can: (g) => !g.s.flags.evilEmpire,
    *run(g) {
      g.s.flags.flowerPower = true;
      g.log('花之力：此后美国每打出一张战争牌，苏联 +2 VP');
    },
  },
  // U2 Incident
  60: {
    *run(g) {
      g.vp('USSR', 1, 'U-2 事件');
      g.s.flags.u2 = true;
    },
  },
  // OPEC
  61: {
    can: (g) => !g.s.flags.northSeaOil,
    *run(g) {
      const n = ['egypt', 'iran', 'libya', 'saudiArabia', 'iraq', 'gulfStates', 'venezuela'].filter((c) => g.controls('USSR', c)).length;
      if (n) g.vp('USSR', n, '石油输出国组织');
      else g.log('石油输出国组织：苏联没有控制相关国家');
    },
  },
  // Lone Gunman
  62: {
    *run(g) {
      g.revealHand('US', '孤胆枪手');
      yield* g.opsPlay('USSR', 1, { card: 62 });
    },
  },
  // Colonial Rear Guards
  63: {
    *run(g, me) {
      const picked = yield* g.pickCountries(me, 63, 4, (c) => g.inReg(c, 'africa') || g.inReg(c, 'southeastAsia'), '殖民地后卫：选择非洲或东南亚国家 +1');
      for (const c of picked) g.addInf(c, me, 1);
      g.log(`殖民地后卫：${picked.map(countryName).join('、')} 各 +1`);
    },
  },
  // Panama Canal Returned
  64: {
    *run(g) {
      for (const c of ['panama', 'costaRica', 'venezuela']) g.addInf(c, 'US', 1);
      g.log('归还巴拿马运河：巴拿马、哥斯达黎加、委内瑞拉各 +1');
    },
  },
  // Camp David Accords
  65: {
    *run(g) {
      g.vp('US', 1, '戴维营协议');
      for (const c of ['israel', 'jordan', 'egypt']) g.addInf(c, 'US', 1);
      g.s.flags.campDavid = true;
      g.log('戴维营协议：以色列、约旦、埃及各 +1');
    },
  },
  // Puppet Governments
  66: {
    *run(g, me) {
      const picked = yield* g.pickCountries(me, 66, 3, (c) => g.inf(c, 'US') === 0 && g.inf(c, 'USSR') === 0, '傀儡政府：选择双方都没有影响力的国家 +1', { optional: true });
      for (const c of picked) g.addInf(c, me, 1);
      if (picked.length) g.log(`傀儡政府：${picked.map(countryName).join('、')} 各 +1`);
    },
  },
  // Grain Sales to Soviets
  67: {
    *run(g) {
      const hand = g.s.hands.USSR;
      if (hand.length) {
        const c = hand[Math.floor(g.random() * hand.length)];
        g.log(`向苏联出售谷物：美国抽到 ${cardName(c)}`, { to: 'US' });
        g.log('向苏联出售谷物：美国从你手中随机抽走一张牌', { to: 'USSR' });
        const v = yield* g.askOption('US', `向苏联出售谷物：抽到 ${cardName(c)}，打出还是还回？`, [['play', `打出 ${CARDS[c].zh}`], ['return', '还给苏联，并使用本牌 2 点行动点']], { card: 67, auto: false });
        g.removeFromHand('USSR', c);
        if (v === 'play') {
          g.log(`美国打出从苏联抽来的 ${cardName(c)}`);
          g.addToHand('US', c);
          yield* g.playCard('US', c, { nested: true });
          return;
        }
        g.addToHand('USSR', c, true);
        g.log(`美国把 ${cardName(c)} 还给苏联`);
      }
      yield* g.opsPlay('US', 2, { card: 67 });
    },
  },
  // John Paul II Elected Pope
  68: {
    *run(g) {
      g.removeInf('poland', 'USSR', 2);
      g.addInf('poland', 'US', 1);
      g.s.flags.johnPaul = true;
      g.log('约翰·保罗二世：波兰苏联 -2、美国 +1');
    },
  },
  // Latin American Death Squads
  69: {
    *run(g, me) {
      g.s.flags.lads = me;
      g.log(`拉美敢死队：本回合${SIDE_ZH[me]}在中南美洲政变 +1，对手 -1`);
    },
  },
  // OAS Founded
  70: {
    *run(g, me) {
      yield* g.placeInfluence(me, 70, 2, (c) => caSa(COUNTRIES[c].region));
    },
  },
  // Nixon Plays the China Card
  71: {
    *run(g) {
      if (g.s.china.holder === 'USSR') {
        g.s.china = { holder: 'US', faceUp: false };
        g.log('尼克松打出中国牌：中国牌交给美国（背面朝上）');
      } else g.vp('US', 2, '尼克松打出中国牌');
    },
  },
  // Sadat Expels Soviets
  72: {
    *run(g) {
      g.setInf('egypt', 'USSR', 0);
      g.addInf('egypt', 'US', 1);
      g.log('萨达特驱逐苏联：埃及苏联清零，美国 +1');
    },
  },
  // Shuttle Diplomacy
  73: {
    *run(g) {
      g.s.flags.shuttle = true;
      g.log('穿梭外交：下一次中东或亚洲计分时苏联少算一个战场国');
    },
  },
  // The Voice of America
  74: {
    *run(g, me) {
      yield* g.removeInfluence(me, 'USSR', 74, 4, (c) => COUNTRIES[c].region !== 'europe', { maxPer: 2 });
    },
  },
  // Liberation Theology
  75: {
    *run(g, me) {
      yield* g.placeInfluence(me, 75, 3, (c) => COUNTRIES[c].region === 'centralAmerica', { maxPer: 2 });
    },
  },
  // Ussuri River Skirmish
  76: {
    *run(g, me) {
      if (g.s.china.holder === 'USSR') {
        g.s.china = { holder: 'US', faceUp: true };
        g.log('乌苏里江冲突：中国牌交给美国（正面朝上）');
      } else yield* g.placeInfluence(me, 76, 4, (c) => COUNTRIES[c].region === 'asia', { maxPer: 2 });
    },
  },
  // Ask Not What Your Country Can Do For You
  77: {
    *run(g) {
      const out: number[] = [];
      for (;;) {
        const cards = g.s.hands.US.filter((c) => !out.includes(c));
        if (!cards.length) break;
        const c = yield* g.askCard('US', 'discard', `“不要问你的国家能为你做什么”：选择要弃掉的牌（已选 ${out.length} 张）`, cards, { card: 77, pass: '选好了', auto: false });
        if (c === 'pass') break;
        out.push(c);
      }
      for (const c of out) {
        g.removeFromHand('US', c);
        g.discardCard(c);
      }
      let drawn = 0;
      for (let i = 0; i < out.length; i++) {
        const c = g.draw();
        if (c === undefined) break;
        g.addToHand('US', c);
        drawn++;
      }
      g.log(`美国弃掉 ${out.length} 张牌，重新抽 ${drawn} 张`);
    },
  },
  // Alliance for Progress
  78: {
    *run(g) {
      const n = g.countries((c) => COUNTRIES[c].bg && caSa(COUNTRIES[c].region) && g.controls('US', c)).length;
      if (n) g.vp('US', n, '美洲进步同盟');
      else g.log('美洲进步同盟：美国没有控制中南美洲战场国');
    },
  },
  // One Small Step
  80: {
    can: (g, me) => g.s.space[me] < g.s.space[opp(me)],
    *run(g, me) {
      g.advanceSpace(me, 2);
    },
  },
  // Che
  107: {
    *run(g, me) {
      const ok = (c: string) => !COUNTRIES[c].bg && ['centralAmerica', 'southAmerica', 'africa'].includes(COUNTRIES[c].region) && g.canTarget(me, c, 'coup');
      const ops = g.opsBudget(me, 3, 107, 'other');
      const first = g.countries(ok);
      if (!first.length) return g.log('切·格瓦拉：没有合法的政变目标');
      const a = yield* g.askCountry(me, 'coupTarget', `切·格瓦拉：选择非战场国发动政变（${ops} 点）`, first, { card: 107, done: true });
      if (a === 'done') return;
      const removed = yield* g.coup(me, a, ops, { card: 107 });
      if (!removed) return;
      const second = g.countries((c) => ok(c) && c !== a);
      if (!second.length) return;
      const b = yield* g.askCountry(me, 'coupTarget', '切·格瓦拉：可以对另一个非战场国再发动一次政变', second, { card: 107, done: true });
      if (b !== 'done') yield* g.coup(me, b, ops, { card: 107 });
    },
  },
  // Our Man in Tehran
  108: {
    effect: (g) => g.countries((c) => COUNTRIES[c].region === 'middleEast' && g.controls('US', c)).length > 0,
    *run(g) {
      const drawn: number[] = [];
      for (let i = 0; i < 5; i++) {
        const c = g.draw();
        if (c === undefined) break;
        drawn.push(c);
      }
      g.log(`我们的人在德黑兰：美国查看牌库顶 ${drawn.length} 张：${drawn.map(cardName).join('、')}`, { to: 'US' });
      const out: number[] = [];
      for (;;) {
        const rest = drawn.filter((c) => !out.includes(c));
        if (!rest.length) break;
        const c = yield* g.askCard('US', 'discard', `我们的人在德黑兰：选择要弃掉的牌（已选 ${out.length} 张）`, rest, { card: 108, pass: '选好了', auto: false });
        if (c === 'pass') break;
        out.push(c);
      }
      for (const c of out) g.discardCard(c);
      if (out.length) g.log(`我们的人在德黑兰：美国弃掉 ${out.map(cardName).join('、')}`);
      g.s.deck.push(...drawn.filter((c) => !out.includes(c)));
      for (let i = g.s.deck.length - 1; i > 0; i--) {
        const j = Math.floor(g.random() * (i + 1));
        [g.s.deck[i], g.s.deck[j]] = [g.s.deck[j], g.s.deck[i]];
      }
    },
  },
};
