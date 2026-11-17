import { CARDS, COUNTRIES, REGIONS, REGION_ZH } from '../../data';
import { GameOver, cardName, countryName } from '../util';
import { SIDE_ZH, opp } from '../types';
import { discardOrElse, randomDiscard } from './early';
import type { Effect } from '.';

export const LATE: Record<number, Effect> = {
  // Iranian Hostage Crisis
  82: {
    *run(g) {
      g.setInf('iran', 'US', 0);
      g.addInf('iran', 'USSR', 2);
      g.s.flags.iranianHostage = true;
      g.log('伊朗人质危机：伊朗美国清零，苏联 +2');
    },
  },
  // The Iron Lady
  83: {
    *run(g) {
      g.addInf('argentina', 'USSR', 1);
      g.setInf('uk', 'USSR', 0);
      g.vp('US', 1, '铁娘子');
      g.s.flags.ironLady = true;
      g.log('铁娘子：阿根廷苏联 +1，英国苏联清零');
    },
  },
  // Reagan Bombs Libya
  84: {
    *run(g) {
      const n = Math.floor(g.inf('libya', 'USSR') / 2);
      if (n) g.vp('US', n, '里根轰炸利比亚');
      else g.log('里根轰炸利比亚：利比亚苏联影响力不足 2');
    },
  },
  // Star Wars
  85: {
    can: (g) => g.s.space.US > g.s.space.USSR,
    *run(g, me) {
      const cards = g.s.discard.filter((c) => !CARDS[c].scoring);
      if (!cards.length) return g.log('星球大战：弃牌堆没有非计分牌');
      const c = (yield* g.askCard(me, 'pickCard', '星球大战：从弃牌堆选一张非计分牌立即作为事件打出', cards, { card: 85 })) as number;
      g.s.discard.splice(g.s.discard.indexOf(c), 1);
      g.log(`星球大战：美国从弃牌堆打出 ${cardName(c)}`);
      const prev = g.s.playing;
      g.s.playing = { card: c, side: me };
      const fired = yield* g.fireEvent(c, me, {});
      g.relocate(c, fired, me);
      g.s.playing = prev;
    },
  },
  // North Sea Oil
  86: {
    *run(g) {
      g.s.flags.northSeaOil = true;
      g.s.flags.northSeaOil8 = true;
      g.log('北海油田：本回合美国可进行 8 个行动轮；石油输出国组织不能再作为事件打出');
    },
  },
  // The Reformer
  87: {
    *run(g, me) {
      const n = g.s.vp < 0 ? 6 : 4;
      yield* g.placeInfluence(me, 87, n, (c) => COUNTRIES[c].region === 'europe', { maxPer: 2 });
      g.s.flags.reformer = true;
      g.log('改革者：苏联此后不能在欧洲发动政变');
    },
  },
  // Marine Barracks Bombing
  88: {
    *run(g, me) {
      g.setInf('lebanon', 'US', 0);
      g.log('海军陆战队军营爆炸：黎巴嫩美国清零');
      yield* g.removeInfluence(me, 'US', 88, 2, (c) => COUNTRIES[c].region === 'middleEast');
    },
  },
  // Soviets Shoot Down KAL-007
  89: {
    *run(g) {
      g.degradeDefcon(1, '大韩航空 007');
      g.vp('US', 2, '大韩航空 007');
      if (g.controls('US', 'southKorea')) yield* g.opsPlay('US', 4, { card: 89, modes: ['influence', 'realign'] });
    },
  },
  // Glasnost
  90: {
    *run(g) {
      g.improveDefcon(1, '公开性');
      g.vp('USSR', 2, '公开性');
      if (g.s.flags.reformer) yield* g.opsPlay('USSR', 4, { card: 90, modes: ['influence', 'realign'] });
    },
  },
  // Ortega Elected in Nicaragua
  91: {
    *run(g, me) {
      g.setInf('nicaragua', 'US', 0);
      g.log('奥尔特加当选：尼加拉瓜美国清零');
      const adj = COUNTRIES.nicaragua.adj;
      yield* g.opsPlay(me, 2, { card: 91, modes: ['coup'], filter: (c) => adj.includes(c), free: true, optional: true });
    },
  },
  // Terrorism
  92: {
    *run(g, me) {
      const victim = opp(me);
      const n = victim === 'US' && g.s.flags.iranianHostage ? 2 : 1;
      const out: number[] = [];
      for (let i = 0; i < n; i++) {
        const c = randomDiscard(g, victim);
        if (c === undefined) break;
        g.discardCard(c);
        out.push(c);
      }
      g.log(out.length ? `恐怖主义：${SIDE_ZH[victim]}随机弃掉 ${out.map(cardName).join('、')}` : `恐怖主义：${SIDE_ZH[victim]}没有手牌`);
    },
  },
  // Iran-Contra Scandal
  93: {
    *run(g) {
      g.s.flags.iranContra = true;
      g.log('伊朗门：本回合美国调整掷骰 -1');
    },
  },
  // Chernobyl
  94: {
    *run(g, me) {
      const r = yield* g.askOption(me, '切尔诺贝利：指定一个区域，本回合苏联不能用行动点在此放影响力', REGIONS.map((x) => [x, REGION_ZH[x]] as [string, string]), { card: 94 });
      g.s.flags.chernobyl = r as never;
      g.log(`切尔诺贝利：本回合苏联不能用行动点在${REGION_ZH[r as keyof typeof REGION_ZH]}放影响力`);
    },
  },
  // Latin American Debt Crisis
  95: {
    *run(g, me) {
      const ok = yield* discardOrElse(g, 'US', 95, 3, '拉美债务危机：弃掉一张行动点 ≥3 的牌，否则苏联在南美 2 国影响力翻倍', '不弃');
      if (ok) return;
      const picked = yield* g.pickCountries(me, 95, 2, (c) => COUNTRIES[c].region === 'southAmerica' && g.inf(c, 'USSR') > 0, '拉美债务危机：选择南美国家，苏联影响力翻倍');
      for (const c of picked) g.addInf(c, 'USSR', g.inf(c, 'USSR'));
      if (picked.length) g.log(`拉美债务危机：${picked.map(countryName).join('、')} 苏联影响力翻倍`);
    },
  },
  // Tear Down this Wall
  96: {
    *run(g, me) {
      g.addInf('eastGermany', 'US', 3);
      g.s.flags.tearDownWall = true;
      if (g.s.flags.willyBrandt) {
        g.s.flags.willyBrandt = false;
        g.cancelInPlay(55);
      }
      g.log('推倒这堵墙：东德 +3，维利·勃兰特失效');
      yield* g.opsPlay(me, 3, { card: 96, modes: ['coup', 'realign'], filter: (c) => COUNTRIES[c].region === 'europe', free: true, optional: true });
    },
  },
  // An Evil Empire
  97: {
    *run(g) {
      g.vp('US', 1, '“邪恶帝国”');
      g.s.flags.evilEmpire = true;
      if (g.s.flags.flowerPower) {
        g.s.flags.flowerPower = false;
        g.cancelInPlay(59);
        g.log('“邪恶帝国”：花之力失效');
      }
    },
  },
  // Aldrich Ames Remix
  98: {
    *run(g, me) {
      g.s.flags.aldrichAmes = true;
      g.revealHand('US', '艾姆斯间谍案');
      const cards = [...g.s.hands.US];
      if (!cards.length) return;
      const c = (yield* g.askCard(me, 'discard', '艾姆斯间谍案：从美国手牌中选一张弃掉', cards, { card: 98 })) as number;
      g.removeFromHand('US', c);
      g.discardCard(c);
      g.log(`艾姆斯间谍案：苏联弃掉美国的 ${cardName(c)}`);
    },
  },
  // Pershing II Deployed
  99: {
    *run(g, me) {
      g.vp('USSR', 1, '潘兴 II');
      const picked = yield* g.pickCountries(me, 99, 3, (c) => g.inReg(c, 'westernEurope') && g.inf(c, 'US') > 0, '部署潘兴 II：选择西欧国家移除 1 点美国影响力', { tag: 'removeEvent' });
      for (const c of picked) g.removeInf(c, 'US', 1);
      if (picked.length) g.log(`部署潘兴 II：${picked.map(countryName).join('、')} 美国 -1`);
    },
  },
  // Wargames
  100: {
    can: (g) => g.s.defcon === 2,
    *run(g, me) {
      const v = yield* g.askOption(me, '战争游戏：给对手 6 VP 并立即结束对局？', [['end', `结束对局（当前 VP ${g.s.vp}，结束后 ${g.s.vp + (me === 'US' ? -6 : 6)}）`], ['no', '不结束']], { card: 100, auto: false });
      if (v !== 'end') return;
      g.s.vp += me === 'US' ? -6 : 6;
      g.log(`战争游戏：${SIDE_ZH[opp(me)]} +6 VP，对局结束`, { kind: 'score' });
      const vp = g.s.vp;
      if (vp > 0) throw new GameOver('US', `战争游戏（${vp} VP）`);
      if (vp < 0) throw new GameOver('USSR', `战争游戏（${-vp} VP）`);
      throw new GameOver(null, '战争游戏（0 VP）');
    },
  },
  // Solidarity
  101: {
    can: (g) => !!g.s.flags.johnPaul,
    *run(g) {
      g.addInf('poland', 'US', 3);
      g.log('团结工会：波兰 +3');
    },
  },
  // Iran-Iraq War
  102: {
    *run(g, me) {
      const t = yield* g.askOption(me, '两伊战争：选择被入侵的国家', [['iraq', '伊朗入侵伊拉克'], ['iran', '伊拉克入侵伊朗']], { card: 102 });
      yield* g.war(me, 102, t, { need: 4, vp: 2, milops: 2 });
    },
  },
  // Yuri and Samantha
  109: {
    *run(g) {
      g.s.flags.yuri = true;
      g.log('尤里和萨曼莎：本回合美国每次政变苏联 +1 VP');
    },
  },
  // AWACS Sale to Saudis
  110: {
    *run(g) {
      g.addInf('saudiArabia', 'US', 2);
      g.s.flags.awacs = true;
      g.log('向沙特出售预警机：沙特 +2，穆斯林革命不能再作为事件打出');
    },
  },
};
