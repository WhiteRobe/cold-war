// 卡牌“打出前预估”：根据当前局面算好修正、成功率和结果，显示在卡牌详情下方。
import { CARDS, COUNTRIES, COUNTRY_LIST, REGIONS, type RegionId, type Side } from '../../data';
import { controller, scoreRegion, scoreSEA } from '../../engine/scoring';
import type { GameView } from '../../engine/view';

export interface Preview {
  lines: string[];
  /** 对“我”有利 / 不利 */
  tone?: 'good' | 'bad';
}

const ZH: Record<Side, string> = { US: '美国', USSR: '苏联' };
const opp = (s: Side): Side => (s === 'US' ? 'USSR' : 'US');
const pct = (x: number) => `${Math.round(x * 100)}%`;
const ctl = (v: GameView, c: string) => (v.inf[c] ? controller(v as never, c) : null);
const LV = { none: '无', presence: '存在', domination: '支配', control: '控制' };

const SCORING_REGION: Record<number, RegionId | 'sea'> = { 1: 'asia', 2: 'europe', 3: 'middleEast', 37: 'centralAmerica', 38: 'sea', 79: 'africa', 81: 'southAmerica' };

/** 行动点修正（不含地区加成） */
/** 联合国牌（不死不休）：4 + 持有方控制的英国、法国、中国数 */
export function unOpsView(v: GameView, side: Side): { ops: number; held: string[] } {
  const held = ['uk', 'france', 'china'].filter((c) => ctl(v, c) === side);
  return { ops: 4 + held.length, held };
}

export function effectiveOps(v: GameView, side: Side, card: number): { ops: number; notes: string[] } {
  const un = card === 6 && !!v.flags.endlessWorld;
  const notes: string[] = [];
  if (un) {
    const u = unOpsView(v, side);
    let ops = u.ops;
    notes.push(u.held.length ? `控制${u.held.map((c) => COUNTRIES[c].zh).join('、')} +${u.held.length}` : '英、法、中都没控制，不加点');
    if (side === 'US' ? v.flags.containment : v.flags.brezhnev) {
      ops += 1;
      notes.push(`${side === 'US' ? '遏制政策' : '勃列日涅夫主义'} +1`);
    }
    if (v.flags.redScare?.includes(side)) {
      ops = Math.max(1, ops - 1);
      notes.push(`${side === 'US' ? '红色恐慌' : '大清洗'} −1`);
    }
    notes.push('没有亚洲加成，不能用于太空竞赛');
    return { ops, notes };
  }
  const base = CARDS[card].ops;
  const plus = side === 'US' ? v.flags.containment : v.flags.brezhnev;
  const minus = v.flags.redScare?.includes(side);
  let ops = base;
  if (plus) {
    ops = Math.min(base + 1, Math.max(4, base));
    notes.push(`${side === 'US' ? '遏制政策' : '勃列日涅夫主义'} +1${base >= 4 ? '（已到上限 4）' : ''}`);
  }
  if (minus) {
    ops = Math.max(1, ops - 1);
    notes.push(`${side === 'US' ? '红色恐慌' : '大清洗'} −1`);
  }
  if (card === 6) notes.push('全部用在亚洲再 +1');
  if (side === 'USSR' && v.flags.vietnamRevolts) notes.push('全部用在东南亚再 +1（越南起义）');
  return { ops, notes };
}

/** 战争：进攻方 attacker 打 target，需要 ≥ need */
function warOdds(v: GameView, attacker: Side, target: string, need: number, selfMinus = false) {
  const enemy = opp(attacker);
  const home = enemy === 'US' ? 'usa' : 'ussr';
  const c = COUNTRIES[target];
  let mod = c.adj.filter((a) => a === home || (a !== 'usa' && a !== 'ussr' && ctl(v, a) === enemy)).length;
  if (selfMinus && ctl(v, target) === enemy) mod++;
  let ok = 0;
  for (let r = 1; r <= 6; r++) if (r - mod >= need) ok++;
  return { mod, p: ok / 6 };
}

/** 双方各掷一骰加修正：a 胜 / 平的概率 */
function duel(ma: number, mb: number) {
  let win = 0, tie = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
    if (a + ma > b + mb) win++;
    else if (a + ma === b + mb) tie++;
  }
  return { win: win / 36, tie: tie / 36 };
}

function regionsDomCtl(v: GameView, side: Side) {
  return REGIONS.filter((r) => {
    const lv = scoreRegion(v as never, r)[side].level;
    return lv === 'domination' || lv === 'control';
  }).length;
}

function bgCount(v: GameView, side: Side) {
  return COUNTRY_LIST.filter((c) => c.bg && ctl(v, c.id) === side).length;
}

export function cardPreview(v: GameView, card: number): Preview | null {
  const me = v.me;
  const def = CARDS[card];
  if (!me) return null;
  const lines: string[] = [];
  let tone: Preview['tone'];
  const good = (b: boolean) => (tone = b ? 'good' : 'bad');
  /** 事件由谁执行 */
  const exec: Side = def.side === 'NEUTRAL' ? me : (def.side as Side);
  const f = v.flags;

  // ---------- 计分卡 ----------
  const sr = SCORING_REGION[card];
  if (sr) {
    if (sr === 'sea') {
      const sc = scoreSEA(v as never);
      lines.push(`美国 ${sc.points.US} 分，苏联 ${sc.points.USSR} 分`);
      lines.push(sc.net ? `→ ${sc.net > 0 ? '美国' : '苏联'} +${Math.abs(sc.net)} VP` : '→ 双方打平，不加分');
      if (sc.net) good((sc.net > 0) === (me === 'US'));
    } else {
      const shuttle = !!f.shuttle && (sr === 'asia' || sr === 'middleEast');
      const sc = scoreRegion(v as never, sr, { formosan: f.formosan, shuttle });
      lines.push(`美国 ${LV[sc.US.level]} ${sc.points.US} 分，苏联 ${LV[sc.USSR.level]} ${sc.points.USSR} 分`);
      if (sc.autoWin) {
        lines.push(`→ ${ZH[sc.autoWin]}控制欧洲，打出即获胜！`);
        good(sc.autoWin === me);
      } else {
        lines.push(sc.net ? `→ ${sc.net > 0 ? '美国' : '苏联'} +${Math.abs(sc.net)} VP` : '→ 双方打平，不加分');
        if (sc.net) good((sc.net > 0) === (me === 'US'));
      }
      if (sc.shuttleApplied) lines.push('（已计入穿梭外交：苏联少算一个战场国）');
    }
    return { lines, tone };
  }

  // ---------- 行动点 ----------
  if (def.ops > 0) {
    const { ops, notes } = effectiveOps(v, me, card);
    lines.push(`你用它的实际行动点：${ops}${notes.length ? `（${notes.join('；')}）` : ''}`);
  }

  // ---------- 事件能否发动 ----------
  const blocked = (why: string) => lines.push(`⚠ 事件现在不能发动：${why}`);
  switch (card) {
    case 21: if (!f.warsawPact && !f.marshall) blocked('需要先打出马歇尔计划或华沙条约组织成立'); break;
    case 101: if (!f.johnPaul) blocked('需要先打出约翰·保罗二世当选教皇'); break;
    case 7: if (f.ironLady) blocked('铁娘子已生效'); break;
    case 13: if (f.campDavid) blocked('戴维营协议已生效'); break;
    case 55: if (f.tearDownWall) blocked('推倒这堵墙已生效'); break;
    case 59: if (f.evilEmpire) blocked('“邪恶帝国”已生效'); break;
    case 56: if (f.awacs) blocked('向沙特出售预警机已生效'); break;
    case 61: if (f.northSeaOil) blocked('北海油田已生效'); break;
    case 104: if (v.turn >= 8) blocked('冷战后期不能作为事件打出'); break;
    case 85: if (v.space.US <= v.space.USSR) blocked('美国必须在太空竞赛中领先'); break;
    case 80: if (v.space[me] >= v.space[opp(me)]) blocked('你必须在太空竞赛中落后'); break;
    case 100: if (v.defcon !== 2) blocked('DEFCON 必须是 2'); break;
    case 32: if (!v.hands[me].some((c) => CARDS[c].side === opp(me) && !CARDS[c].scoring)) blocked('手里没有对手的事件牌可配合'); break;
  }

  // ---------- 逐卡预估 ----------
  const war = (target: string, need: number, vp: number, selfMinus = false) => {
    const o = warOdds(v, exec, target, need, selfMinus);
    return `${COUNTRIES[target].zh}：修正 −${o.mod}，掷 ≥${need + o.mod} 成功，成功率 ${pct(o.p)}（成功 ${ZH[exec]} +${vp} VP）`;
  };
  switch (card) {
    case 4: {
      const vp = 5 - (v.defcon - 1);
      lines.push(v.defcon === 2 ? '⚠ DEFCON 会降到 1：行动方直接输掉！' : `DEFCON ${v.defcon} → ${v.defcon - 1}，美国 +${vp} VP`);
      break;
    }
    case 11: lines.push(v.inf.southKorea ? `苏联进攻 ${war('southKorea', 4, 2)}` : '朝鲜半岛已被苏联统一，韩国不存在，事件不能发动'); break;
    case 13: lines.push(`苏联进攻 ${war('israel', 4, 2, true)}`); break;
    case 24:
      lines.push(`${ZH[exec]}进攻 ${war('pakistan', 4, 2)}`);
      lines.push(`${ZH[exec]}进攻 ${war('india', 4, 2)}`);
      break;
    case 102:
      lines.push(`${ZH[exec]}进攻 ${war('iraq', 4, 2)}`);
      lines.push(`${ZH[exec]}进攻 ${war('iran', 4, 2)}`);
      break;
    case 36: {
      const targets = COUNTRY_LIST.filter((c) => c.stability <= 2 && !(exec === 'USSR' && f.nato && c.region === 'europe' && ctl(v, c.id) === 'US'))
        .map((c) => ({ c, o: warOdds(v, exec, c.id, 3) }))
        .filter((x) => v.inf[x.c.id][exec === 'US' ? 1 : 0] > 0)
        .sort((a, b) => b.o.p - a.o.p || v.inf[b.c.id][exec === 'US' ? 1 : 0] - v.inf[a.c.id][exec === 'US' ? 1 : 0])
        .slice(0, 3);
      if (!targets.length) lines.push('稳定度 ≤2 的国家里没有对手影响力，打下来也只得 1 VP');
      for (const t of targets) lines.push(`${t.c.zh}：成功率 ${pct(t.o.p)}，可夺取对手 ${v.inf[t.c.id][exec === 'US' ? 1 : 0]} 点影响力`);
      lines.push('成功：+1 VP，军事行动 +3');
      break;
    }
    case 20: {
      const p = duel(2, 0);
      lines.push(`你主办：对手若参加，你获胜 ${pct(p.win / (1 - p.tie))}（平局重掷），胜者 +2 VP`);
      lines.push(v.defcon === 2 ? '⚠ 对手若抵制，DEFCON 降到 1，作为主办方你会输！' : `对手若抵制：DEFCON ${v.defcon} → ${v.defcon - 1}，你获得 4 点行动点`);
      break;
    }
    case 34: lines.push(`${ZH[exec]} +${v.defcon - 2} VP，DEFCON ${v.defcon} → ${Math.min(5, v.defcon + 2)}`); break;
    case 39: {
      const a = v.milops[exec], b = v.milops[opp(exec)];
      if (a <= b) lines.push(`军事行动 ${a} 对 ${b}，没有领先：无效果`);
      else lines.push(`军事行动 ${a} 对 ${b}，领先${a >= v.defcon ? '且已达标' : ''}：${ZH[exec]} +${a >= v.defcon ? 3 : 1} VP`);
      break;
    }
    case 45: {
      const mu = regionsDomCtl(v, 'US'), ms = regionsDomCtl(v, 'USSR');
      const mine = me === 'US' ? mu : ms, theirs = me === 'US' ? ms : mu;
      const p = duel(mine, theirs);
      lines.push(`美国支配/控制 ${mu} 个区域（骰子 +${mu}），苏联 ${ms} 个（骰子 +${ms}）`);
      lines.push(`你获胜 ${pct(p.win)}，平局 ${pct(p.tie)}，对手获胜 ${pct(1 - p.win - p.tie)}；胜者 +2 VP 并可调整 DEFCON`);
      good(p.win > 1 - p.win - p.tie);
      break;
    }
    case 48: {
      const u = bgCount(v, 'US'), s = bgCount(v, 'USSR');
      lines.push(`控制战场国：美国 ${u}，苏联 ${s} → ${u > s ? '美国 +2 VP' : '美国没有领先，无效果'}`);
      break;
    }
    case 61: {
      const n = ['egypt', 'iran', 'libya', 'saudiArabia', 'iraq', 'gulfStates', 'venezuela'].filter((c) => ctl(v, c) === 'USSR').length;
      lines.push(`苏联控制 ${n} 个产油国 → 苏联 +${n} VP`);
      break;
    }
    case 78: {
      const n = COUNTRY_LIST.filter((c) => c.bg && (c.region === 'centralAmerica' || c.region === 'southAmerica') && ctl(v, c.id) === 'US').length;
      lines.push(`美国控制中南美战场国 ${n} 个 → 美国 +${n} VP`);
      break;
    }
    case 84: lines.push(`利比亚苏联影响力 ${v.inf.libya[1]} → 美国 +${Math.floor(v.inf.libya[1] / 2)} VP`); break;
    case 87: lines.push(`苏联${v.vp < 0 ? '领先' : '没有领先'}：在欧洲放 ${v.vp < 0 ? 6 : 4} 点影响力（每国最多 2 点）`); break;
    case 29: lines.push(`现在是冷战${v.turn >= 8 ? '后期：每国移除 2 点' : '早/中期：每国移除 1 点'}苏联影响力（共 3 国）`); break;
    case 50: lines.push(v.defcon === 2 ? '⚠ DEFCON 会降到 1：行动方直接输掉！' : `DEFCON ${v.defcon} → ${v.defcon - 1}；美国下个行动轮不打联合国干预，苏联 +3 VP`); break;
    case 89: lines.push(v.defcon === 2 ? '⚠ DEFCON 会降到 1：行动方直接输掉！' : `DEFCON ${v.defcon} → ${v.defcon - 1}，美国 +2 VP；韩国${ctl(v, 'southKorea') === 'US' ? '由美国控制，还能用 4 点行动点' : '不由美国控制，不给行动点'}`); break;
    case 90: lines.push(`DEFCON +1，苏联 +2 VP；${f.reformer ? '改革者已生效，还能用 4 点行动点' : '改革者未生效，不给行动点'}`); break;
    case 100: if (v.defcon === 2) { const after = v.vp + (me === 'US' ? -6 : 6); lines.push(`给${ZH[opp(me)]} 6 VP 后${after > 0 ? `美国领先 ${after}` : after < 0 ? `苏联领先 ${-after}` : '双方打平'} → ${after > 0 ? '美国获胜' : after < 0 ? '苏联获胜' : '平局'}`); if (after) good((after > 0) === (me === 'US')); } break;
    case 58: lines.push(v.china.holder === 'US' ? '中国牌在美国手里 → 交给苏联（正面朝上）' : '苏联已持有中国牌 → 苏联 +1 VP'); break;
    case 71: lines.push(v.china.holder === 'USSR' ? '中国牌在苏联手里 → 交给美国（背面朝上）' : '美国已持有中国牌 → 美国 +2 VP'); break;
    case 76: lines.push(v.china.holder === 'USSR' ? '中国牌在苏联手里 → 交给美国（正面朝上）' : '美国已持有中国牌 → 美国在亚洲放 4 点影响力'); break;
    case 105: lines.push(ctl(v, 'uk') !== 'US' ? '美国没有控制英国：无效果' : f.nato ? '北约已生效：西欧一国 +2，美国 +2 VP' : '北约未生效：英国邻国 +1'); break;
    case 108: lines.push(COUNTRY_LIST.some((c) => c.region === 'middleEast' && ctl(v, c.id) === 'US') ? '美国控制了中东国家：可以翻看牌库顶 5 张' : '美国没有控制任何中东国家：无效果'); break;
    case 92: lines.push(`${ZH[opp(exec)]}随机弃 ${opp(exec) === 'US' && f.iranianHostage ? 2 : 1} 张牌`); break;
    case 60: lines.push('苏联 +1 VP；本回合之后若打出联合国干预事件，苏联再 +1'); break;
    case 97: lines.push(`美国 +1 VP${f.flowerPower ? '，并取消花之力' : ''}`); break;
    case 83: lines.push('美国 +1 VP；阿根廷苏联 +1，英国苏联影响力清零'); break;
    case 65: lines.push('美国 +1 VP；以色列、约旦、埃及各 +1'); break;
    case 55: if (!f.tearDownWall) lines.push('苏联 +1 VP；西德 +1，北约不再保护西德'); break;
  }

  if (!lines.length) return null;
  return { lines, tone };
}
