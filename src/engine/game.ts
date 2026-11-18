import { CARDS, CARD_LIST, CHINA_CARD, COUNTRIES, COUNTRY_LIST, REGION_ZH, countriesIn, inRegion, type CardDef, type RegionId, type SubRegionId } from '../data';
import { nextRandom, randInt, shuffle } from './rng';
import { controller, controls, scoreRegion, scoreSEA } from './scoring';
import { SPACE } from './space';
import {
  SIDE_ZH, TURN_FLAGS, opp, sideIdx,
  type Choice, type Decision, type DecisionKind, type DecisionTag, type GameSetup, type GameState, type LogEntry, type Option, type Side,
} from './types';
import { EFFECTS } from './effects';
import { GameOver, cardName, countryName } from './util';

export { GameOver, cardName, countryName };

export type Gen<T = void> = Generator<Decision[], T, Choice[]>;


export interface HistoryEntry {
  side: Side;
  v: Choice;
}


/** 行动点使用过程中的“地区加成阶梯”：全部用在东南亚 / 亚洲 / 其他 */
type RegionState = 'none' | 'sea' | 'asia' | 'other';

export interface OpsOpts {
  /** 来源卡（中国牌加成、日志） */
  card?: number;
  /** 允许的用途 */
  modes?: ('influence' | 'coup' | 'realign')[];
  /** 限定可作用的国家 */
  filter?: (c: string) => boolean;
  /** 免费政变：不计军事行动、无视 DEFCON 地区限制 */
  free?: boolean;
  /** 不应用行动点修正（已是最终值） */
  raw?: boolean;
  /** 放影响力的邻接快照 */
  snapshot?: Set<string>;
  /** 可以放弃使用 */
  optional?: boolean;
}

function initialState(setup: GameSetup): GameState {
  const inf: Record<string, [number, number]> = {};
  for (const c of COUNTRY_LIST) inf[c.id] = [c.start[0], c.start[1]];
  return {
    options: setup.options,
    rng: setup.seed | 0,
    rngCount: 0,
    phase: 'setup',
    turn: 1,
    ar: 0,
    phasing: 'USSR',
    defcon: 5,
    vp: 0,
    milops: { US: 0, USSR: 0 },
    space: { US: 0, USSR: 0 },
    spaceAttempts: { US: 0, USSR: 0 },
    inf,
    deck: [],
    discard: [],
    removed: [],
    hands: { US: [], USSR: [] },
    known: { US: [], USSR: [] },
    china: { holder: 'USSR', faceUp: true },
    headline: {},
    inPlay: [],
    flags: {},
    log: [],
  };
}

export class Game {
  s: GameState;
  history: HistoryEntry[] = [];
  waiting: Decision[] = [];
  answers: (Choice | undefined)[] = [];
  /** 本次结算中不需要再安置的牌（Missile Envy 等事件自己挪了位置） */
  private moved = new Set<number>();
  private gen: Gen;

  constructor(public setup: GameSetup) {
    this.s = initialState(setup);
    this.gen = this.main();
    this.resume(undefined);
  }

  static replay(setup: GameSetup, history: HistoryEntry[]): Game {
    const g = new Game(setup);
    for (const h of history) {
      const err = g.submit(h.side, h.v);
      if (err) throw new Error(`回放失败（第 ${g.history.length} 步）：${err}`);
    }
    return g;
  }

  get over() {
    return this.s.phase === 'over';
  }

  /** 某方当前待做的选择 */
  pendingFor(side: Side): Decision | undefined {
    return this.waiting.find((d, i) => d.side === side && this.answers[i] === undefined);
  }

  submit(side: Side, v: Choice): string | null {
    if (this.over) return '对局已结束';
    const i = this.waiting.findIndex((d, j) => d.side === side && this.answers[j] === undefined);
    if (i < 0) return '现在不是你的选择';
    if (!this.waiting[i].options.some((o) => o.v === v)) return '非法选项';
    this.answers[i] = v;
    this.history.push({ side, v });
    if (this.answers.every((a) => a !== undefined)) this.resume(this.answers as Choice[]);
    return null;
  }

  private resume(input: Choice[] | undefined) {
    try {
      const r = this.gen.next(input as Choice[]);
      if (r.done) this.waiting = [];
      else {
        this.waiting = r.value;
        this.answers = new Array(r.value.length).fill(undefined);
      }
    } catch (e) {
      if (!(e instanceof GameOver)) throw e;
      this.waiting = [];
      this.s.phase = 'over';
      this.s.winner = e.winner;
      this.s.winReason = e.reason;
      this.log(e.winner ? `${SIDE_ZH[e.winner]}获胜：${e.reason}` : `平局：${e.reason}`, { kind: 'end' });
    }
  }

  // =====================================================================
  // 基础工具
  // =====================================================================

  log(t: string, extra: Partial<LogEntry> = {}) {
    this.s.log.push({ t, turn: this.s.turn, ar: this.s.ar, ...extra });
  }

  roll(): number {
    return randInt(this.s, 6) + 1;
  }

  random(): number {
    return nextRandom(this.s);
  }

  card(id: number): CardDef {
    return CARDS[id];
  }

  inf(c: string, side: Side): number {
    return this.s.inf[c][sideIdx(side)];
  }

  addInf(c: string, side: Side, n: number) {
    if (n <= 0) return;
    this.s.inf[c][sideIdx(side)] += n;
  }

  removeInf(c: string, side: Side, n: number): number {
    const i = sideIdx(side);
    const r = Math.min(n, this.s.inf[c][i]);
    this.s.inf[c][i] -= r;
    return r;
  }

  setInf(c: string, side: Side, n: number) {
    this.s.inf[c][sideIdx(side)] = Math.max(0, n);
  }

  controller(c: string) {
    return controller(this.s, c);
  }

  controls(side: Side, c: string) {
    return controls(this.s, side, c);
  }

  /** 让该方控制该国所需的最少追加影响力 */
  addForControl(c: string, side: Side) {
    const need = Math.max(COUNTRIES[c].stability + this.inf(c, opp(side)) - this.inf(c, side), 0);
    this.addInf(c, side, need);
    return need;
  }

  /** 加 VP（side 得分）。到达 ±20 时对局立即结束（终局计分除外）。 */
  vp(side: Side, n: number, why?: string) {
    if (n === 0) return;
    this.s.vp += side === 'US' ? n : -n;
    this.log(`${SIDE_ZH[side]} ${n > 0 ? '+' : ''}${n} VP${why ? `（${why}）` : ''}`, { side, kind: 'score' });
    this.checkVp();
  }

  /** 按净值移动 VP（正数美方） */
  vpNet(net: number, why: string) {
    if (net > 0) this.vp('US', net, why);
    else if (net < 0) this.vp('USSR', -net, why);
  }

  private finalScoring = false;
  checkVp() {
    if (this.finalScoring) return;
    if (this.s.vp >= 20) throw new GameOver('US', '胜利点达到 20');
    if (this.s.vp <= -20) throw new GameOver('USSR', '胜利点达到 20');
  }

  setDefcon(v: number, why?: string) {
    const old = this.s.defcon;
    const nv = Math.max(1, Math.min(5, v));
    if (nv === old) return;
    this.s.defcon = nv;
    if (nv === 2) this.s.flags.defconTo2 = true;
    this.log(`DEFCON ${old} → ${nv}${why ? `（${why}）` : ''}`, { kind: 'warn' });
    if (nv === 1) throw new GameOver(opp(this.s.phasing), `${SIDE_ZH[this.s.phasing]}引发了全面核战争（DEFCON 1）`);
  }

  degradeDefcon(n = 1, why?: string) {
    this.setDefcon(this.s.defcon - n, why);
  }

  improveDefcon(n = 1, why?: string) {
    this.setDefcon(this.s.defcon + n, why);
  }

  addMilops(side: Side, n: number) {
    this.s.milops[side] = Math.min(5, this.s.milops[side] + n);
  }

  // ---------- 牌 ----------

  /** 抽一张牌；牌库空时把弃牌堆洗成新牌库 */
  draw(): number | undefined {
    if (this.s.deck.length === 0) this.reshuffle();
    return this.s.deck.pop();
  }

  reshuffle() {
    if (!this.s.discard.length) return;
    this.s.deck = shuffle(this.s, [...this.s.discard, ...this.s.deck]);
    this.s.discard = [];
    this.log('弃牌堆洗入牌库', { kind: 'turn' });
  }

  handSize(side: Side) {
    return this.s.hands[side].length;
  }

  removeFromHand(side: Side, card: number): boolean {
    const h = this.s.hands[side];
    const i = h.indexOf(card);
    if (i < 0) return false;
    h.splice(i, 1);
    this.forget(card);
    return true;
  }

  addToHand(side: Side, card: number, known = false) {
    this.s.hands[side].push(card);
    if (known) this.s.known[side].push(card);
  }

  forget(card: number) {
    for (const k of ['US', 'USSR'] as Side[]) {
      const i = this.s.known[k].indexOf(card);
      if (i >= 0) this.s.known[k].splice(i, 1);
    }
  }

  /** 把某方整手牌标为对手已知 */
  revealHand(side: Side, why: string) {
    for (const c of this.s.hands[side]) if (!this.s.known[side].includes(c)) this.s.known[side].push(c);
    const list = this.s.hands[side].map(cardName).join('、') || '（无）';
    this.log(`${SIDE_ZH[side]}公开手牌（${why}）：${list}`, { to: opp(side) });
    this.log(`${SIDE_ZH[side]}向对手公开了手牌（${why}）`, { to: side });
  }

  discardCard(card: number) {
    this.s.discard.push(card);
  }

  removeCard(card: number) {
    this.s.removed.push(card);
  }

  /** 从持续事件区取消一张牌 */
  cancelInPlay(card: number) {
    const i = this.s.inPlay.indexOf(card);
    if (i >= 0) {
      this.s.inPlay.splice(i, 1);
      if (CARDS[card].starred) this.s.removed.push(card);
      else this.s.discard.push(card);
    }
  }

  markMoved(card: number) {
    this.moved.add(card);
  }

  // ---------- 选择 ----------

  *ask(
    side: Side,
    tag: DecisionTag,
    kind: DecisionKind,
    prompt: string,
    options: Option[],
    extra: { card?: number; ops?: Decision['ops']; auto?: boolean } = {},
  ): Gen<Choice> {
    if (options.length === 0) throw new Error(`没有可选项：${prompt}`);
    if (options.length === 1 && extra.auto !== false) return options[0].v;
    const { auto: _, ...rest } = extra;
    const [v] = yield [{ side, tag, kind, prompt, options, ...rest }];
    return v;
  }

  *askCountry(side: Side, tag: DecisionTag, prompt: string, ids: string[], extra: { card?: number; done?: boolean; ops?: Decision['ops'] } = {}): Gen<string> {
    const opts: Option[] = ids.map((c) => ({ v: c, label: countryName(c) }));
    if (extra.done) opts.push({ v: 'done', label: '结束' });
    return (yield* this.ask(side, tag, 'country', prompt, opts, { card: extra.card, ops: extra.ops })) as string;
  }

  *askOption(side: Side, prompt: string, opts: [string, string][], extra: { card?: number; tag?: DecisionTag; auto?: boolean } = {}): Gen<string> {
    return (yield* this.ask(side, extra.tag ?? 'choice', 'option', prompt, opts.map(([v, label]) => ({ v, label })), extra)) as string;
  }

  *askCard(side: Side, tag: DecisionTag, prompt: string, cards: number[], extra: { card?: number; pass?: string; auto?: boolean } = {}): Gen<number | 'pass'> {
    const opts: Option[] = cards.map((c) => ({ v: c, label: cardName(c) }));
    if (extra.pass) opts.push({ v: 'pass', label: extra.pass });
    return (yield* this.ask(side, tag, 'card', prompt, opts, { card: extra.card, auto: extra.auto })) as number | 'pass';
  }

  // =====================================================================
  // 主流程
  // =====================================================================

  private *main(): Gen {
    yield* this.setupPhase();
    for (let t = 1; t <= 10; t++) yield* this.turn(t);
    this.finalScore();
  }

  private buildDeck(era: 'early' | 'mid' | 'late') {
    return CARD_LIST.filter((c) => c.era === era && c.id !== CHINA_CARD && (this.s.options.optionalCards || !c.optional)).map((c) => c.id);
  }

  private deal(n: number) {
    const need = (side: Side) => this.handSize(side) < n;
    while (need('USSR') || need('US')) {
      let progressed = false;
      for (const side of ['USSR', 'US'] as Side[]) {
        if (!need(side)) continue;
        const c = this.draw();
        if (c === undefined) continue;
        this.addToHand(side, c);
        progressed = true;
      }
      if (!progressed) break;
    }
  }

  private *setupPhase(): Gen {
    const s = this.s;
    s.deck = shuffle(s, this.buildDeck('early'));
    this.deal(8);
    this.log('开局：双方各发 8 张早期牌，中国牌在苏联手中', { kind: 'turn' });
    yield* this.freePlacement('USSR', 6, (c) => inRegion(COUNTRIES[c], 'easternEurope'), '东欧');
    yield* this.freePlacement('US', 7, (c) => inRegion(COUNTRIES[c], 'westernEurope'), '西欧');
    const bonus = s.options.usBonus;
    if (bonus !== 0) {
      const side: Side = bonus > 0 ? 'US' : 'USSR';
      const has = new Set(COUNTRY_LIST.filter((c) => this.inf(c.id, side) > 0).map((c) => c.id));
      // 额外影响力只能放在已有己方影响力的国家，且每国不超过“控制所需 + 2”
      const cap = (c: string) => COUNTRIES[c].stability + this.inf(c, opp(side)) + 2;
      yield* this.freePlacement(side, Math.abs(bonus), (c) => has.has(c) && this.inf(c, side) < cap(c), '已有己方影响力的国家（让分）');
    }
  }

  private *freePlacement(side: Side, n: number, ok: (c: string) => boolean, where: string): Gen {
    for (let i = 0; i < n; i++) {
      const ids = COUNTRY_LIST.map((c) => c.id).filter(ok);
      const c = yield* this.askCountry(side, 'setup', `开局布置：在${where}放置影响力（剩余 ${n - i} 点）`, ids, { ops: { total: n, spent: i } });
      this.addInf(c, side, 1);
    }
    this.log(`${SIDE_ZH[side]}完成开局布置（${where} ${n} 点）`, { side });
  }

  baseARs(): number {
    return this.s.turn <= 3 ? 6 : 7;
  }

  hasPerk(side: Side, box: number) {
    return this.s.space[side] >= box && this.s.space[opp(side)] < box;
  }

  maxARs(side: Side) {
    const extra = this.hasPerk(side, 8) || (side === 'US' && this.s.flags.northSeaOil8);
    return this.baseARs() + (extra ? 1 : 0);
  }

  private *turn(t: number): Gen {
    const s = this.s;
    s.turn = t;
    s.ar = 0;
    this.log(`—— 第 ${t} 回合 ——`, { kind: 'turn' });
    if (t > 1) this.improveDefcon(1, '回合开始');
    if (t > 1) this.deal(t <= 3 ? 8 : 9);
    s.spaceAttempts = { US: 0, USSR: 0 };
    yield* this.headlinePhase();
    s.phase = 'action';
    for (let ar = 1; ar <= 8; ar++) {
      for (const side of ['USSR', 'US'] as Side[]) {
        if (ar > this.maxARs(side)) continue;
        s.ar = ar;
        s.phasing = side;
        yield* this.actionRound(side, ar > this.baseARs());
      }
    }
    yield* this.endTurn();
  }

  // ---------- 头条 ----------

  private headlineOptions(side: Side) {
    return this.s.hands[side].filter((c) => c !== 32);
  }

  private *headlinePhase(): Gen {
    const s = this.s;
    s.phase = 'headline';
    s.headline = {};
    const prompt = '选择头条牌';
    const dec = (side: Side): Decision | null => {
      const cards = this.headlineOptions(side);
      if (!cards.length) return null;
      return { side, tag: 'headline', kind: 'card', prompt, options: cards.map((c) => ({ v: c, label: cardName(c) })) };
    };
    const picks: Partial<Record<Side, number>> = {};
    const late = (['US', 'USSR'] as Side[]).find((sd) => this.hasPerk(sd, 4));
    if (late) {
      const first = dec(opp(late));
      if (first) {
        const [v] = yield [first];
        picks[opp(late)] = v as number;
        this.log(`${SIDE_ZH[opp(late)]}先公开头条：${cardName(v as number)}（载人环绕地球特权）`, { kind: 'headline' });
      }
      const second = dec(late);
      if (second) picks[late] = (yield [second])[0] as number;
    } else {
      const ds = [dec('USSR'), dec('US')].filter((d): d is Decision => !!d);
      if (ds.length) {
        const vs = yield ds;
        ds.forEach((d, i) => (picks[d.side] = vs[i] as number));
      }
    }
    for (const side of ['US', 'USSR'] as Side[]) {
      const c = picks[side];
      if (c === undefined) continue;
      this.removeFromHand(side, c);
      s.headline[side] = c;
    }
    this.log(`头条：美国 ${picks.US ? cardName(picks.US) : '无'}；苏联 ${picks.USSR ? cardName(picks.USSR) : '无'}`, { kind: 'headline' });

    const order = (['US', 'USSR'] as Side[])
      .filter((sd) => picks[sd] !== undefined)
      .sort((a, b) => {
        const oa = CARDS[picks[a]!].ops, ob = CARDS[picks[b]!].ops;
        return ob - oa || (a === 'US' ? -1 : 1);
      });
    const record: NonNullable<GameState['headlines']>[number] = { turn: s.turn, US: picks.US, USSR: picks.USSR };
    for (const sd of ['USSR', 'US'] as Side[]) if (picks[sd] !== undefined) this.recordPlay(sd, picks[sd]!, 'headline');
    s.headlines = [...(s.headlines ?? []), record];
    const cancelled = new Set<Side>();
    if (picks.US === 103 && picks.USSR !== undefined) {
      cancelled.add('USSR');
      this.log(`叛逃者：苏联头条 ${cardName(picks.USSR)} 被取消`, { kind: 'headline' });
    }
    this.headlineCancel = cancelled;
    for (const side of order) {
      const c = picks[side]!;
      if (cancelled.has(side)) {
        record.cancelled = side;
        this.discardCard(c);
        delete s.headline[side];
        continue;
      }
      s.phasing = side;
      s.playing = { card: c, side };
      s.flags.defconTo2 = false;
      const fired = yield* this.fireEvent(c, side, { headline: true });
      this.relocate(c, fired, side);
      delete s.headline[side];
      s.playing = undefined;
    }
    // NORAD 只看行动轮；头条阶段降到 2 不算（DeepStruggle 依 Playdek 日志）
    s.flags.defconTo2 = false;
    this.headlineCancel = new Set();
  }

  headlineCancel = new Set<Side>();

  // ---------- 行动轮 ----------

  private playableCards(side: Side): number[] {
    const cards = [...this.s.hands[side]];
    if (this.s.china.holder === side && this.s.china.faceUp) cards.push(CHINA_CARD);
    return cards;
  }

  private *actionRound(side: Side, optional: boolean): Gen {
    const s = this.s;
    s.flags.defconTo2 = false;
    s.flags.unThisAR = false;
    const wwbyDue = side === 'US' && s.flags.wwby === true;
    if (s.flags.cmc === side && this.canPayCmc(side)) yield* this.offerCmcCancel(side, true);
    const trapped = side === 'US' ? s.flags.quagmire : s.flags.bearTrap;
    if (trapped) {
      yield* this.trapRound(side);
    } else {
      let cards = this.playableCards(side);
      let forced = false;
      if (s.flags.missileEnvy === side && s.hands[side].includes(49)) {
        cards = [49];
        forced = true;
      }
      if (!cards.length) {
        this.log(`${SIDE_ZH[side]}没有可打的牌，跳过行动轮`, { side });
      } else {
        const onlyChina = cards.length === 1 && cards[0] === CHINA_CARD;
        const pass = optional ? '放弃第 8 个行动轮' : onlyChina ? '跳过（只剩中国牌）' : undefined;
        const c = yield* this.askCard(side, 'play', `第 ${s.ar} 行动轮：选择要打出的牌`, cards, { pass, auto: false });
        if (c === 'pass') this.log(`${SIDE_ZH[side]}跳过行动轮`, { side });
        else yield* this.playCard(side, c, { forcedOps: forced });
      }
    }
    if (s.flags.missileEnvy === side && !s.hands[side].includes(49)) s.flags.missileEnvy = undefined;
    if (wwbyDue && s.flags.wwby) {
      s.flags.wwby = false;
      if (!s.flags.unThisAR) this.vp('USSR', 3, '“我们将埋葬你们”');
    }
    yield* this.endOfRound();
  }

  /** 行动轮（或头条）结束时：NORAD */
  private *endOfRound(): Gen {
    const s = this.s;
    if (s.flags.norad && s.flags.defconTo2 && this.controls('US', 'canada')) {
      const ids = COUNTRY_LIST.filter((c) => this.inf(c.id, 'US') > 0).map((c) => c.id);
      if (ids.length) {
        const c = yield* this.askCountry('US', 'placeEvent', 'NORAD：在一个已有美国影响力的国家 +1 影响力', ids, { card: 106 });
        this.addInf(c, 'US', 1);
        this.log(`NORAD：美国在${countryName(c)} +1 影响力`, { side: 'US' });
      }
    }
    s.flags.defconTo2 = false;
  }

  private *trapRound(side: Side): Gen {
    const s = this.s;
    const trapCard = side === 'US' ? 42 : 44;
    const eligible = s.hands[side].filter((c) => !CARDS[c].scoring && this.effOps(side, c) >= 2);
    const scoring = s.hands[side].filter((c) => CARDS[c].scoring);
    const arsLeft = this.maxARs(side) - s.ar + 1;
    const opts = [...eligible];
    if (!eligible.length || scoring.length >= arsLeft) opts.push(...scoring);
    if (!opts.length) {
      this.log(`${SIDE_ZH[side]}深陷${CARDS[trapCard].zh}，没有可弃的牌，跳过行动轮`, { side });
      return;
    }
    const c = (yield* this.askCard(side, 'discard', `${CARDS[trapCard].zh}：弃掉一张行动点 ≥2 的牌并掷骰（1–4 脱困），或打出计分卡`, opts, { card: trapCard, auto: false })) as number;
    if (CARDS[c].scoring) {
      yield* this.playCard(side, c, {});
      return;
    }
    this.removeFromHand(side, c);
    this.discardCard(c);
    const r = this.roll();
    this.log(`${SIDE_ZH[side]}弃掉 ${cardName(c)} 尝试摆脱${CARDS[trapCard].zh}：掷出 ${r}`, {
      side, kind: 'roll', roll: { type: 'trap', side, dice: [r], ok: r <= 4, need: '需要 1–4', result: r <= 4 ? `摆脱${CARDS[trapCard].zh}` : '仍然被困' },
      move: { cards: [c], from: side, to: 'discard', why: `${CARDS[trapCard].zh}：弃牌脱困` },
    });
    if (r <= 4) {
      if (side === 'US') s.flags.quagmire = false;
      else s.flags.bearTrap = false;
      this.cancelInPlay(trapCard);
      this.log(`${SIDE_ZH[side]}摆脱了${CARDS[trapCard].zh}`, { side });
    }
  }

  // ---------- 出牌 ----------

  canSpace(side: Side, card: number): boolean {
    const s = this.s;
    if (card !== CHINA_CARD && CARDS[card].scoring) return false;
    const next = s.space[side] + 1;
    if (next > 8) return false;
    const limit = this.hasPerk(side, 2) ? 2 : 1;
    if (s.spaceAttempts[side] >= limit) return false;
    return this.effOps(side, card) >= SPACE[next].ops;
  }

  private recordPlay(side: Side, card: number, how: 'event' | 'ops' | 'space' | 'headline') {
    const s = this.s;
    s.plays = [...(s.plays ?? []), { turn: s.turn, ar: s.ar, side, card, how, at: s.log.length }];
  }

  /** 打出一张牌（行动轮或嵌套打出，如 Grain Sales） */
  *playCard(side: Side, card: number, o: { forcedOps?: boolean; nested?: boolean }): Gen {
    const s = this.s;
    const prevPlaying = s.playing;
    s.playing = { card, side };
    const snapshot = this.snapshot(side);
    if (card === CHINA_CARD) {
      const opts: [string, string][] = [['ops', '行动点']];
      if (this.canSpace(side, card)) opts.push(['space', '太空竞赛']);
      const mode = yield* this.askOption(side, '中国牌：选择打法', opts, { tag: 'mode', card });
      this.log(`${SIDE_ZH[side]}打出 ${cardName(card)}（${mode === 'space' ? '太空竞赛' : '行动点'}）`, { side, kind: 'card' });
      this.recordPlay(side, card, mode === 'space' ? 'space' : 'ops');
      s.china = { holder: opp(side), faceUp: false };
      if (side === 'US' && s.flags.formosan) {
        s.flags.formosan = false;
        this.cancelInPlay(35);
        this.log('美国打出中国牌，台湾决议失效');
      }
      if (mode === 'space') yield* this.spaceAttempt(side, card);
      else yield* this.opsPlay(side, this.card(card).ops, { card, snapshot });
      s.playing = prevPlaying;
      return;
    }
    this.removeFromHand(side, card);
    const def = CARDS[card];
    if (def.scoring) {
      this.log(`${SIDE_ZH[side]}打出 ${cardName(card)}`, { side, kind: 'card' });
      this.recordPlay(side, card, 'event');
      const fired = yield* this.fireEvent(card, side, {});
      this.relocate(card, fired, side);
      s.playing = prevPlaying;
      return;
    }
    const own = def.side === side || def.side === 'NEUTRAL';
    const oppCard = def.side === opp(side);
    const executor = def.side === 'NEUTRAL' ? side : def.side;
    const canEvent = this.canFire(card, executor, side) && !o.forcedOps;
    const modes: [string, string][] = [];
    if (own && canEvent) modes.push(['event', '事件']);
    modes.push(['ops', `行动点（${this.effOps(side, card)}）`]);
    if (this.canSpace(side, card) && !o.forcedOps) modes.push(['space', '太空竞赛']);
    const mode = yield* this.askOption(side, `${cardName(card)}：选择打法`, modes, { tag: 'mode', card, auto: false });
    this.log(`${SIDE_ZH[side]}打出 ${cardName(card)}（${mode === 'event' ? '事件' : mode === 'space' ? '太空竞赛' : '行动点'}）`, { side, kind: 'card' });
    this.recordPlay(side, card, mode === 'event' ? 'event' : mode === 'space' ? 'space' : 'ops');

    if (side === 'USSR' && card === 103 && s.phase === 'action') this.vp('US', 1, '苏联打出叛逃者');
    if (side === 'US' && def.war && s.flags.flowerPower && mode !== 'space') this.vp('USSR', 2, '花之力');

    let fired = false;
    if (mode === 'event') {
      fired = yield* this.fireEvent(card, side, {});
    } else if (mode === 'space') {
      yield* this.spaceAttempt(side, card);
    } else {
      const oppEvent = oppCard && this.canFire(card, executor, side);
      let first = 'opsFirst';
      if (oppEvent) first = yield* this.askOption(side, `${cardName(card)} 的对手事件将会发动：先执行哪一项？`, [['eventFirst', '先发动事件'], ['opsFirst', '先用行动点']], { tag: 'order', card });
      if (oppEvent && first === 'eventFirst') fired = yield* this.fireEvent(card, side, {});
      yield* this.opsPlay(side, def.ops, { card, snapshot });
      if (oppEvent && first === 'opsFirst') fired = yield* this.fireEvent(card, side, {});
    }
    this.relocate(card, fired, side);
    s.playing = prevPlaying;
  }

  /** 打出后安置这张牌 */
  relocate(card: number, fired: boolean, _by: Side) {
    if (this.moved.delete(card)) return;
    const def = CARDS[card];
    if (fired && def.starred) {
      if (def.ongoing) this.s.inPlay.push(card);
      else this.removeCard(card);
    } else if (fired && card === 73) {
      this.s.inPlay.push(card);
    } else this.discardCard(card);
  }

  canFire(card: number, executor: Side, player: Side): boolean {
    const eff = EFFECTS[card];
    if (!eff) return false;
    return eff.can ? eff.can(this, executor, player) : true;
  }

  /** 发动事件。返回事件是否“发生”（决定带星卡是否移出）。 */
  *fireEvent(card: number, player: Side, o: { headline?: boolean }): Gen<boolean> {
    const def = CARDS[card];
    const executor = def.side === 'NEUTRAL' ? player : def.side;
    if (!this.canFire(card, executor, player)) {
      this.log(`${cardName(card)} 的事件条件不满足，未发动`);
      return false;
    }
    const eff = EFFECTS[card];
    if (eff.effect && !eff.effect(this, executor)) {
      this.log(`${cardName(card)} 的事件没有产生效果`);
      return false;
    }
    this.log(`事件：${cardName(card)}`, { side: executor });
    yield* eff.run(this, executor, { player, headline: !!o.headline });
    return true;
  }

  // =====================================================================
  // 行动点
  // =====================================================================

  /** 行动点修正（不含地区加成） */
  private hasPlus(side: Side) {
    return side === 'US' ? !!this.s.flags.containment : !!this.s.flags.brezhnev;
  }

  private hasMinus(side: Side) {
    return !!this.s.flags.redScare?.includes(side);
  }

  /** 按地区阶梯计算实际行动点 */
  opsBudget(side: Side, base: number, card: number | undefined, rs: RegionState, raw = false): number {
    if (raw) return base;
    const plus = this.hasPlus(side);
    let ops = base + (plus ? 1 : 0) - (this.hasMinus(side) ? 1 : 0);
    let cap = 4;
    if (card === CHINA_CARD && rs !== 'other') {
      ops += 1;
      cap = 5;
    }
    if (plus) ops = Math.min(ops, Math.max(cap, base));
    if (side === 'USSR' && this.s.flags.vietnamRevolts && (rs === 'none' || rs === 'sea')) ops += 1;
    return Math.max(ops, 1);
  }

  /** 不指定地区时的实际行动点（太空竞赛、陷阱弃牌、显示） */
  effOps(side: Side, card: number): number {
    const def = CARDS[card];
    if (def.scoring) return 0;
    return this.opsBudget(side, def.ops, undefined, 'other');
  }

  private static regionOf(c: string): RegionState {
    const d = COUNTRIES[c];
    if (d.sub.includes('southeastAsia')) return 'sea';
    if (d.region === 'asia') return 'asia';
    return 'other';
  }

  private static mergeRegion(a: RegionState, b: RegionState): RegionState {
    const rank = { none: 0, sea: 1, asia: 2, other: 3 };
    return rank[a] >= rank[b] ? a : b;
  }

  snapshot(side: Side): Set<string> {
    return new Set(COUNTRY_LIST.filter((c) => this.inf(c.id, side) > 0).map((c) => c.id));
  }

  /** 用行动点放影响力是否合法（不含费用） */
  canPlaceOps(side: Side, c: string, snap: Set<string>): boolean {
    const d = COUNTRIES[c];
    if (side === 'USSR' && this.s.flags.chernobyl && d.region === this.s.flags.chernobyl) return false;
    const has = (x: string) => snap.has(x) && this.inf(x, side) > 0;
    if (has(c)) return true;
    const home = side === 'US' ? 'usa' : 'ussr';
    return d.adj.some((a) => a === home || (a !== 'usa' && a !== 'ussr' && has(a)));
  }

  placeCost(side: Side, c: string) {
    return this.controls(opp(side), c) ? 2 : 1;
  }

  /** 政变 / 调整的目标是否合法 */
  canTarget(side: Side, c: string, kind: 'coup' | 'realign', o: { free?: boolean } = {}): boolean {
    const s = this.s;
    const d = COUNTRIES[c];
    if (this.inf(c, opp(side)) <= 0) return false;
    if (!o.free) {
      if (s.defcon <= 4 && d.region === 'europe') return false;
      if (s.defcon <= 3 && d.region === 'asia') return false;
      if (s.defcon <= 2 && d.region === 'middleEast') return false;
    }
    if (side === 'USSR') {
      if (this.natoProtects(c)) return false;
      if (s.flags.usJapan && c === 'japan') return false;
      if (kind === 'coup' && s.flags.reformer && d.region === 'europe') return false;
    }
    return true;
  }

  natoProtects(c: string): boolean {
    const f = this.s.flags;
    if (!f.nato || COUNTRIES[c].region !== 'europe' || !this.controls('US', c)) return false;
    if (c === 'france' && f.deGaulle) return false;
    if (c === 'westGermany' && f.willyBrandt) return false;
    return true;
  }

  /** 使用行动点（影响力 / 政变 / 调整） */
  *opsPlay(side: Side, base: number, o: OpsOpts = {}): Gen {
    const allowed = o.modes ?? ['influence', 'coup', 'realign'];
    const filter = o.filter ?? (() => true);
    const snap = o.snapshot ?? this.snapshot(side);
    const ids = COUNTRY_LIST.map((c) => c.id).filter(filter);
    const opts: [string, string][] = [];
    const budget0 = this.opsBudget(side, base, o.card, 'none', o.raw);
    if (allowed.includes('influence') && ids.some((c) => this.canPlaceOps(side, c, snap))) opts.push(['influence', '放置影响力']);
    if (allowed.includes('coup') && ids.some((c) => this.canTarget(side, c, 'coup', o))) opts.push(['coup', '政变']);
    if (allowed.includes('realign') && ids.some((c) => this.canTarget(side, c, 'realign', o))) opts.push(['realign', '调整阵营']);
    if (!opts.length) {
      this.log(`${SIDE_ZH[side]}没有可用行动点的目标，${budget0} 点行动点作废`, { side });
      return;
    }
    if (o.optional) opts.push(['skip', '放弃']);
    const mode = yield* this.askOption(side, `使用 ${budget0} 点行动点`, opts, { tag: 'opsMode', card: o.card, auto: !o.optional });
    if (mode === 'skip') return;
    if (mode === 'influence') yield* this.placeOps(side, base, o, ids, snap);
    else if (mode === 'coup') {
      const targets = ids.filter((c) => this.canTarget(side, c, 'coup', o));
      const c = yield* this.askCountry(side, 'coupTarget', `选择政变目标（${budget0} 点行动点）`, targets, { card: o.card });
      const ops = this.opsBudget(side, base, o.card, Game.regionOf(c), o.raw);
      yield* this.coup(side, c, ops, { free: o.free, card: o.card });
    } else yield* this.realignOps(side, base, o, ids);
  }

  private *placeOps(side: Side, base: number, o: OpsOpts, ids: string[], snap: Set<string>): Gen {
    let rs: RegionState = 'none';
    let spent = 0;
    const placed: Record<string, number> = {};
    for (;;) {
      const total = this.opsBudget(side, base, o.card, rs, o.raw);
      const targets = ids.filter((c) => {
        if (!this.canPlaceOps(side, c, snap)) return false;
        const cost = this.placeCost(side, c);
        return spent + cost <= this.opsBudget(side, base, o.card, Game.mergeRegion(rs, Game.regionOf(c)), o.raw);
      });
      if (!targets.length) break;
      const c = yield* this.askCountry(side, 'placeOps', `放置影响力（已用 ${spent}/${total}）`, targets, { card: o.card, ops: { total, spent } });
      spent += this.placeCost(side, c);
      rs = Game.mergeRegion(rs, Game.regionOf(c));
      this.addInf(c, side, 1);
      placed[c] = (placed[c] ?? 0) + 1;
    }
    const list = Object.entries(placed).map(([c, n]) => `${countryName(c)} +${n}`).join('，');
    this.log(`${SIDE_ZH[side]}放置影响力：${list || '无'}`, { side });
  }

  private *realignOps(side: Side, base: number, o: OpsOpts, ids: string[]): Gen {
    let rs: RegionState = 'none';
    let spent = 0;
    for (;;) {
      const total = this.opsBudget(side, base, o.card, rs, o.raw);
      const targets = ids.filter((c) => this.canTarget(side, c, 'realign', o) && spent + 1 <= this.opsBudget(side, base, o.card, Game.mergeRegion(rs, Game.regionOf(c)), o.raw));
      if (!targets.length) break;
      const c = yield* this.askCountry(side, 'realignTarget', `调整阵营（已用 ${spent}/${total}）`, targets, { card: o.card, done: spent > 0, ops: { total, spent } });
      if (c === 'done') break;
      spent++;
      rs = Game.mergeRegion(rs, Game.regionOf(c));
      this.realign(side, c);
    }
  }

  realignMods(side: Side, c: string): number {
    const d = COUNTRIES[c];
    const home = side === 'US' ? 'usa' : 'ussr';
    let m = d.adj.filter((a) => a !== 'usa' && a !== 'ussr' && this.controls(side, a)).length;
    if (d.adj.includes(home)) m++;
    if (this.inf(c, side) > this.inf(c, opp(side))) m++;
    if (side === 'US' && this.s.flags.iranContra) m--;
    return m;
  }

  realign(side: Side, c: string) {
    const ra = this.roll(), rb = this.roll();
    const ma = this.realignMods(side, c), mb = this.realignMods(opp(side), c);
    const a = ra + ma, b = rb + mb;
    let res = '平局，无效果';
    if (a > b) res = `${countryName(c)} 移除对手 ${this.removeInf(c, opp(side), a - b)} 点影响力`;
    else if (b > a) res = `${countryName(c)} 移除己方 ${this.removeInf(c, side, b - a)} 点影响力`;
    this.log(`${SIDE_ZH[side]}调整${countryName(c)}：${ra}${fmtMod(ma)} 对 ${rb}${fmtMod(mb)} → ${res}`, {
      side, kind: 'roll', roll: { type: 'realign', side, dice: [ra, rb], mods: [ma, mb], target: c, ok: a > b, result: res.replace(`${countryName(c)} `, '') },
    });
  }

  canPayCmc(side: Side) {
    return side === 'USSR' ? this.inf('cuba', 'USSR') >= 2 : this.inf('westGermany', 'US') >= 2 || this.inf('turkey', 'US') >= 2;
  }

  *offerCmcCancel(side: Side, optional: boolean): Gen<boolean> {
    const opts: [string, string][] = [];
    if (side === 'USSR' && this.inf('cuba', 'USSR') >= 2) opts.push(['cuba', '从古巴移除 2 点苏联影响力']);
    if (side === 'US' && this.inf('westGermany', 'US') >= 2) opts.push(['westGermany', '从西德移除 2 点美国影响力']);
    if (side === 'US' && this.inf('turkey', 'US') >= 2) opts.push(['turkey', '从土耳其移除 2 点美国影响力']);
    if (optional) opts.push(['no', '暂不解除']);
    const v = yield* this.askOption(side, optional ? '古巴导弹危机：是否解除？' : '古巴导弹危机期间发动政变：解除危机，否则输掉对局', opts, { card: 40, auto: false });
    if (v === 'no') return false;
    this.removeInf(v, side, 2);
    this.s.flags.cmc = undefined;
    this.log(`${SIDE_ZH[side]}从${countryName(v)}移除 2 点影响力，解除古巴导弹危机`, { side });
    return true;
  }

  /** 政变。ops 为最终行动点。返回移除的对手影响力数。 */
  *coup(side: Side, c: string, ops: number, o: { free?: boolean; card?: number; noMilops?: boolean } = {}): Gen<number> {
    const s = this.s;
    if (s.flags.cmc === side) {
      const ok = this.canPayCmc(side) && (yield* this.offerCmcCancel(side, false));
      if (!ok) throw new GameOver(opp(side), `${SIDE_ZH[side]}在古巴导弹危机期间发动政变，引发全面核战争`);
    }
    const d = COUNTRIES[c];
    if (!o.free && !o.noMilops) this.addMilops(side, ops);
    const r = this.roll();
    let mod = 0;
    if (s.flags.salt) mod -= 1;
    if (s.flags.lads && (d.region === 'centralAmerica' || d.region === 'southAmerica')) mod += s.flags.lads === side ? 1 : -1;
    const total = r + ops + mod;
    const diff = total - 2 * d.stability;
    let removed = 0;
    if (diff > 0) {
      removed = this.removeInf(c, opp(side), diff);
      this.addInf(c, side, diff - removed);
    }
    this.log(
      `${SIDE_ZH[side]}在${countryName(c)}发动政变：${r}+${ops}${mod ? fmtMod(mod) : ''} 对 ${2 * d.stability} → ` +
        (diff > 0 ? `成功，移除 ${removed} 点${removed < diff ? `，增加 ${diff - removed} 点` : ''}` : '失败'),
      {
        side, kind: 'roll',
        roll: {
          type: 'coup', side, dice: [r], mods: [ops + mod], target: c, ok: diff > 0, need: `需要 > ${2 * d.stability}（2×稳定度）`,
          result: diff > 0 ? `移除 ${removed} 点${removed < diff ? `，增加 ${diff - removed} 点` : ''}` : '政变失败',
        },
      },
    );
    if (side === 'US' && s.flags.yuri) this.vp('USSR', 1, '尤里和萨曼莎');
    if (d.bg && !(side === 'US' && s.flags.nuclearSubs && !o.free)) this.degradeDefcon(1, '战场国政变');
    return removed;
  }

  // ---------- 太空竞赛 ----------

  *spaceAttempt(side: Side, card: number): Gen {
    const s = this.s;
    s.spaceAttempts[side]++;
    const next = s.space[side] + 1;
    const box = SPACE[next];
    const r = this.roll();
    const ok = r <= box.roll;
    this.log(`${SIDE_ZH[side]}用 ${cardName(card)} 进行太空竞赛（${box.name}，需 ≤${box.roll}）：掷出 ${r}，${ok ? '成功' : '失败'}`, {
      side, kind: 'roll', roll: { type: 'space', side, dice: [r], ok, need: `${box.name}：需要 ≤${box.roll}`, result: ok ? `推进到「${box.name}」` : '发射失败' },
    });
    if (ok) this.advanceSpace(side, 1);
  }

  advanceSpace(side: Side, n: number) {
    const s = this.s;
    let lastVp = 0;
    let to = s.space[side];
    for (let i = 0; i < n && to < 8; i++) {
      to++;
      const box = SPACE[to];
      lastVp = s.space[opp(side)] >= to ? box.vp[1] : box.vp[0];
    }
    if (to === s.space[side]) return;
    s.space[side] = to;
    this.log(`${SIDE_ZH[side]}太空竞赛推进到「${SPACE[to].name}」`, { side });
    if (lastVp) this.vp(side, lastVp, `太空竞赛：${SPACE[to].name}`);
  }

  // =====================================================================
  // 计分
  // =====================================================================

  scoreRegionCard(region: RegionId) {
    const f = this.s.flags;
    const useShuttle = !!f.shuttle && (region === 'asia' || region === 'middleEast');
    const r = scoreRegion(this.s, region, { shuttle: useShuttle, formosan: f.formosan });
    if (useShuttle) {
      f.shuttle = false;
      this.cancelInPlay(73);
      this.log('穿梭外交生效后弃掉');
    }
    const lv = { none: '无', presence: '存在', domination: '支配', control: '控制' };
    this.log(`${REGION_ZH[region]}计分：美国 ${lv[r.US.level]} ${r.points.US} 分，苏联 ${lv[r.USSR.level]} ${r.points.USSR} 分`, { kind: 'score' });
    this.markScore(region, r.autoWin ?? (r.net > 0 ? 'US' : r.net < 0 ? 'USSR' : null));
    if (r.autoWin) throw new GameOver(r.autoWin, '控制欧洲');
    this.vpNet(r.net, `${REGION_ZH[region]}计分`);
  }

  private markScore(region: string, side: Side | null) {
    this.s.lastScore = { ...this.s.lastScore, [region]: { side, at: this.s.log.length } };
  }

  scoreSEACard() {
    const r = scoreSEA(this.s);
    this.log(`东南亚计分：美国 ${r.points.US} 分，苏联 ${r.points.USSR} 分`, { kind: 'score' });
    this.markScore('southeastAsia', r.net > 0 ? 'US' : r.net < 0 ? 'USSR' : null);
    this.vpNet(r.net, '东南亚计分');
  }

  private finalScore() {
    const s = this.s;
    s.phase = 'turnEnd';
    this.finalScoring = true;
    this.log('—— 终局计分 ——', { kind: 'turn' });
    let net = 0;
    s.finalScore = { regions: [], china: s.china.holder };
    for (const region of ['europe', 'asia', 'middleEast', 'africa', 'centralAmerica', 'southAmerica'] as RegionId[]) {
      const r = scoreRegion(s, region, { formosan: s.flags.formosan });
      s.finalScore.regions.push({ region, US: r.points.US, USSR: r.points.USSR });
      this.markScore(region, r.autoWin ?? (r.net > 0 ? 'US' : r.net < 0 ? 'USSR' : null));
      if (r.autoWin) throw new GameOver(r.autoWin, '终局计分时控制欧洲');
      this.log(`${REGION_ZH[region]}：美国 ${r.points.US}，苏联 ${r.points.USSR}`, { kind: 'score' });
      net += r.net;
    }
    net += s.china.holder === 'US' ? 1 : -1;
    this.log(`中国牌持有者（${SIDE_ZH[s.china.holder]}）+1 VP`, { kind: 'score' });
    s.vp += net;
    if (s.vp > 0) throw new GameOver('US', `终局计分 ${s.vp} VP`);
    if (s.vp < 0) throw new GameOver('USSR', `终局计分 ${-s.vp} VP`);
    throw new GameOver(null, '终局计分 0 VP');
  }

  // ---------- 回合结束 ----------

  private *endTurn(): Gen {
    const s = this.s;
    s.phase = 'turnEnd';
    s.ar = 0;
    // E. 军事行动
    const short = (side: Side) => Math.max(0, s.defcon - s.milops[side]);
    const us = short('US'), ussr = short('USSR');
    if (us || ussr) this.log(`军事行动检查（要求 ${s.defcon}）：美国 ${s.milops.US}，苏联 ${s.milops.USSR}`, { kind: 'score' });
    this.vpNet(ussr - us, '军事行动不足');
    s.milops = { US: 0, USSR: 0 };
    // 登月特权：弃一张保留的牌
    for (const side of ['USSR', 'US'] as Side[]) {
      if (!this.hasPerk(side, 6)) continue;
      const cards = s.hands[side].filter((c) => !CARDS[c].scoring);
      if (!cards.length) continue;
      const c = yield* this.askCard(side, 'discard', '登月特权：可以弃掉一张保留的手牌', cards, { pass: '不弃', auto: false });
      if (c !== 'pass') {
        this.removeFromHand(side, c);
        this.discardCard(c);
        this.log(`${SIDE_ZH[side]}使用登月特权弃掉一张牌`, { side });
      }
    }
    // F. 持有计分卡
    const held = (side: Side) => s.hands[side].some((c) => CARDS[c].scoring);
    const hu = held('US'), hs = held('USSR');
    if (hu && hs) throw new GameOver(null, '双方回合末都持有计分卡');
    if (hu) throw new GameOver('USSR', '美国回合末持有计分卡');
    if (hs) throw new GameOver('US', '苏联回合末持有计分卡');
    // G. 中国牌翻面
    s.china.faceUp = true;
    // 清理本回合效果
    for (const k of TURN_FLAGS) delete s.flags[k];
    // H. 时期
    if (s.turn === 3 || s.turn === 7) {
      const era = s.turn === 3 ? 'mid' : 'late';
      s.deck = shuffle(s, [...s.deck, ...this.buildDeck(era)]);
      this.log(`${era === 'mid' ? '冷战中期' : '冷战后期'}牌加入牌库`, { kind: 'turn' });
    }
  }

  // =====================================================================
  // 事件常用的高层操作
  // =====================================================================

  /**
   * 事件放置影响力：总共 total 点，每国最多 maxPer 点，最多 maxCountries 国。
   * 不受邻接限制。
   */
  *placeInfluence(side: Side, card: number, total: number, ok: (c: string) => boolean, o: { maxPer?: number; perCountry?: number; prompt?: string } = {}): Gen<Record<string, number>> {
    const placed: Record<string, number> = {};
    const per = o.perCountry;
    for (let i = 0; i < total; ) {
      const ids = COUNTRY_LIST.map((c) => c.id).filter((c) => ok(c) && (o.maxPer === undefined || (placed[c] ?? 0) < o.maxPer) && (per === undefined || !placed[c]));
      if (!ids.length) break;
      const c = yield* this.askCountry(side, 'placeEvent', `${o.prompt ?? `${CARDS[card].zh}：放置影响力`}（剩余 ${total - i}）`, ids, { card, ops: { total, spent: i } });
      const n = per ?? 1;
      this.addInf(c, side, n);
      placed[c] = (placed[c] ?? 0) + n;
      i += n;
    }
    const list = Object.entries(placed).map(([c, n]) => `${countryName(c)} +${n}`).join('，');
    if (list) this.log(`${SIDE_ZH[side]}：${list}`, { side });
    return placed;
  }

  /** 事件移除对手影响力 */
  *removeInfluence(side: Side, target: Side, card: number, total: number, ok: (c: string) => boolean, o: { maxPer?: number; prompt?: string } = {}): Gen<Record<string, number>> {
    const removed: Record<string, number> = {};
    for (let i = 0; i < total; i++) {
      const ids = COUNTRY_LIST.map((c) => c.id).filter((c) => ok(c) && this.inf(c, target) > 0 && (o.maxPer === undefined || (removed[c] ?? 0) < o.maxPer));
      if (!ids.length) break;
      const c = yield* this.askCountry(side, 'removeEvent', `${o.prompt ?? `${CARDS[card].zh}：移除${SIDE_ZH[target]}影响力`}（剩余 ${total - i}）`, ids, { card, ops: { total, spent: i } });
      this.removeInf(c, target, 1);
      removed[c] = (removed[c] ?? 0) + 1;
    }
    const list = Object.entries(removed).map(([c, n]) => `${countryName(c)} -${n}`).join('，');
    if (list) this.log(`${SIDE_ZH[target]}影响力：${list}`, { side });
    return removed;
  }

  /** 选若干个不同国家（每国一次） */
  *pickCountries(side: Side, card: number, n: number, ok: (c: string) => boolean, prompt: string, o: { tag?: DecisionTag; optional?: boolean } = {}): Gen<string[]> {
    const picked: string[] = [];
    for (let i = 0; i < n; i++) {
      const ids = COUNTRY_LIST.map((c) => c.id).filter((c) => ok(c) && !picked.includes(c));
      if (!ids.length) break;
      const c = yield* this.askCountry(side, o.tag ?? 'placeEvent', `${prompt}（${i + 1}/${n}）`, ids, { card, done: o.optional });
      if (c === 'done') break;
      picked.push(c);
    }
    return picked;
  }

  countries(ok: (c: string) => boolean): string[] {
    return COUNTRY_LIST.map((c) => c.id).filter(ok);
  }

  inReg(c: string, r: RegionId | SubRegionId) {
    return inRegion(COUNTRIES[c], r);
  }

  regionCountries(r: RegionId | SubRegionId) {
    return countriesIn(r).map((c) => c.id);
  }

  /** 战争事件 */
  *war(side: Side, card: number, target: string, o: { need: number; vp: number; milops: number; selfMinus?: boolean }): Gen {
    const enemy = opp(side);
    const d = COUNTRIES[target];
    const enemyHome = enemy === 'US' ? 'usa' : 'ussr';
    let mod = d.adj.filter((a) => a === enemyHome || (a !== 'usa' && a !== 'ussr' && this.controls(enemy, a))).length;
    if (o.selfMinus && this.controls(enemy, target)) mod++;
    this.addMilops(side, o.milops);
    const r = this.roll();
    const ok = r - mod >= o.need;
    this.log(`${CARDS[card].zh}：目标${countryName(target)}，掷出 ${r}${mod ? `-${mod}` : ''}（需 ≥${o.need}）→ ${ok ? '胜利' : '失败'}`, {
      side, kind: 'roll',
      roll: { type: 'war', side, dice: [r], mods: [-mod], target, ok, need: `${CARDS[card].zh}：需要 ≥${o.need}`, result: ok ? `战争胜利，+${o.vp} VP` : '战争失败' },
    });
    if (ok) {
      const n = this.inf(target, enemy);
      this.setInf(target, enemy, 0);
      this.addInf(target, side, n);
      this.vp(side, o.vp, CARDS[card].zh);
    }
  }
}

function fmtMod(m: number) {
  return m === 0 ? '' : m > 0 ? `+${m}` : `${m}`;
}
