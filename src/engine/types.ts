import type { RegionId, Side } from '../data/types';

export type { Side } from '../data/types';

export interface GameOptions {
  /** 是否加入可选卡 #104–110 */
  optionalCards: boolean;
  /** 美方开局额外影响力（让分）；竞价结果也折算到这里，负数表示给苏方 */
  usBonus: number;
}

export const DEFAULT_OPTIONS: GameOptions = { optionalCards: true, usBonus: 2 };

export interface GameSetup {
  seed: number;
  options: GameOptions;
}

export type Phase = 'setup' | 'headline' | 'action' | 'turnEnd' | 'over';

export type Choice = string | number;

export interface Option {
  v: Choice;
  label?: string;
}

export type DecisionKind =
  | 'card' // 从若干张牌中选一张（v = 卡号，或 'pass' / 'done'）
  | 'country' // 选国家（v = 国家 id，或 'done'）
  | 'option'; // 选项（v 为字符串）

export interface Decision {
  side: Side;
  kind: DecisionKind;
  prompt: string;
  options: Option[];
  /** 当前正在结算的卡（界面高亮用） */
  card?: number;
  /** 行动点信息（界面显示） */
  ops?: { total: number; spent: number };
  /** 本次选择的用途，界面和 AI 据此理解选择的含义 */
  tag: DecisionTag;
}

export type DecisionTag =
  | 'headline' // 选头条牌
  | 'play' // 行动轮选牌
  | 'mode' // 选打法
  | 'opsMode' // 行动点用途：影响力 / 政变 / 调整
  | 'order' // 对手事件先后
  | 'placeOps' // 用行动点放影响力
  | 'coupTarget'
  | 'realignTarget'
  | 'placeEvent' // 事件放影响力
  | 'removeEvent' // 事件移除影响力
  | 'discard' // 弃牌
  | 'pickCard' // 其他选牌（SALT、Star Wars 等）
  | 'setup' // 开局自由放置
  | 'choice'; // 其他选项

export interface LogEntry {
  t: string;
  /** 仅对该方可见；缺省表示公开 */
  to?: Side;
  /** 动作方（着色） */
  side?: Side;
  turn: number;
  ar: number;
  kind?: 'roll' | 'score' | 'card' | 'headline' | 'turn' | 'warn' | 'end';
  /** 掷骰详情（界面做骰子动画） */
  roll?: RollInfo;
}

export interface RollInfo {
  type: 'coup' | 'realign' | 'war' | 'space' | 'olympics' | 'summit' | 'trap';
  /** 掷骰的一方；双方对掷时为第一颗骰子的一方 */
  side?: Side;
  dice: number[];
  /** 每颗骰子的修正 */
  mods?: number[];
  /** 目标国家 */
  target?: string;
  ok: boolean;
  /** 结果说明，如“移除 2 点” */
  result: string;
  /** 判定说明，如“需要 > 6” */
  need?: string;
}

export interface GameState {
  options: GameOptions;
  rng: number;
  rngCount: number;
  phase: Phase;
  turn: number;
  /** 当前行动轮序号（1 起），头条阶段为 0 */
  ar: number;
  phasing: Side;
  defcon: number;
  /** 正数美方领先，负数苏方领先 */
  vp: number;
  milops: Record<Side, number>;
  space: Record<Side, number>;
  spaceAttempts: Record<Side, number>;
  inf: Record<string, [number, number]>;
  deck: number[];
  discard: number[];
  removed: number[];
  hands: Record<Side, number[]>;
  /** 对手已知的手牌（离开手牌即失效） */
  known: Record<Side, number[]>;
  china: { holder: Side; faceUp: boolean };
  /** 已公开的头条牌 */
  headline: Partial<Record<Side, number>>;
  /** 持续事件区（桌边的牌） */
  inPlay: number[];
  flags: Flags;
  winner?: Side | null;
  winReason?: string;
  log: LogEntry[];
  /** 正在打出 / 结算的牌（界面用） */
  playing?: { card: number; side: Side };
  /** 出牌记录 */
  plays?: { turn: number; ar: number; side: Side; card: number; how: 'event' | 'ops' | 'space' | 'headline' }[];
  /** 每回合的头条记录（cancelled：被叛逃者取消的一方） */
  headlines?: { turn: number; US?: number; USSR?: number; cancelled?: Side }[];
  /** 各区域最近一次计分的结果（界面显示雾气）：at 为当时的日志长度 */
  lastScore?: Record<string, { side: Side | null; at: number }>;
}

export interface Flags {
  // ---- 本回合 ----
  containment?: boolean;
  brezhnev?: boolean;
  /** 受 Red Scare/Purge 影响的一方 */
  redScare?: Side[];
  vietnamRevolts?: boolean;
  /** CMC：发动政变即输的一方 */
  cmc?: Side;
  nuclearSubs?: boolean;
  salt?: boolean;
  /** LADS 打出者 */
  lads?: Side;
  iranContra?: boolean;
  chernobyl?: RegionId;
  yuri?: boolean;
  aldrichAmes?: boolean;
  northSeaOil8?: boolean;
  u2?: boolean;
  // ---- 跨行动轮 ----
  /** 下一行动轮必须把 Missile Envy 当行动点打出的一方 */
  missileEnvy?: Side;
  /** We Will Bury You 待结算 */
  wwby?: boolean;
  /** 本行动轮 DEFCON 曾移动到 2（NORAD） */
  defconTo2?: boolean;
  /** 本行动轮美方打出过 UN Intervention 事件（We Will Bury You） */
  unThisAR?: boolean;
  quagmire?: boolean;
  bearTrap?: boolean;
  // ---- 永久 ----
  warsawPact?: boolean;
  marshall?: boolean;
  nato?: boolean;
  deGaulle?: boolean;
  usJapan?: boolean;
  formosan?: boolean;
  willyBrandt?: boolean;
  flowerPower?: boolean;
  campDavid?: boolean;
  johnPaul?: boolean;
  shuttle?: boolean;
  iranianHostage?: boolean;
  ironLady?: boolean;
  northSeaOil?: boolean;
  reformer?: boolean;
  tearDownWall?: boolean;
  evilEmpire?: boolean;
  norad?: boolean;
  awacs?: boolean;
}

export const TURN_FLAGS: (keyof Flags)[] = [
  'containment', 'brezhnev', 'redScare', 'vietnamRevolts', 'cmc', 'nuclearSubs', 'salt', 'lads', 'iranContra',
  'chernobyl', 'yuri', 'aldrichAmes', 'northSeaOil8', 'u2',
];

export const opp = (s: Side): Side => (s === 'US' ? 'USSR' : 'US');
export const SIDE_ZH: Record<Side, string> = { US: '美国', USSR: '苏联' };
export const sideIdx = (s: Side) => (s === 'US' ? 0 : 1);
