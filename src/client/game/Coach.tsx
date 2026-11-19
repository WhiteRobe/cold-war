// 新手引导：按局面依次弹出提示，并把相关界面圈出来。每条只出现一次；教学局里强制开启。
import { signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { CARDS, CHINA_CARD, COUNTRIES, type Side } from '../../data';
import type { Choice, Decision } from '../../engine/types';
import type { GameView } from '../../engine/view';

const KEY_ON = 'cw.coach.on';
const KEY_SEEN = 'cw.coach.seen';

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY_SEEN) || '[]'));
  } catch {
    return new Set();
  }
}

export const coachOn = signal(localStorage.getItem(KEY_ON) !== 'off');
const seen = signal(loadSeen());

export function setCoach(on: boolean) {
  coachOn.value = on;
  localStorage.setItem(KEY_ON, on ? 'on' : 'off');
}

export function resetCoach() {
  seen.value = new Set();
  localStorage.removeItem(KEY_SEEN);
  setCoach(true);
}

function markSeen(id: string) {
  const s = new Set(seen.value);
  s.add(id);
  seen.value = s;
  localStorage.setItem(KEY_SEEN, JSON.stringify([...s]));
}

const SIDE_ZH: Record<Side, string> = { US: '美国', USSR: '苏联' };
const opp = (s: Side): Side => (s === 'US' ? 'USSR' : 'US');

interface Tip {
  id: string;
  title: string;
  text: (v: GameView, d?: Decision) => string;
  /** data-tour 名称 */
  target?: string;
  when: (v: GameView, d?: Decision) => boolean;
}

const cardSideOf = (d?: Decision) => (d?.card ? CARDS[d.card].side : null);

const TIPS: Tip[] = [
  {
    id: 'welcome', title: '欢迎来到冷战热斗',
    text: (v) =>
      `你执${SIDE_ZH[v.me!]}。获胜方式有三种：胜利点达到 20；打出「欧洲计分」时控制欧洲；或者撑完 10 个回合后终局计分领先。` +
      '另外，千万别在自己行动时让 DEFCON 降到 1，那样你直接输。',
    when: (v) => !!v.me,
  },
  {
    id: 'setup', title: '开局布置', target: 'map',
    text: (v) =>
      `先在高亮的${v.me === 'USSR' ? '东欧' : '西欧'}国家里放影响力。每个国家方框：左边蓝格是美国影响力，右边红格是苏联影响力，右上角数字是稳定度。` +
      '影响力 ≥ 稳定度，并且比对手多出至少稳定度，就算控制（格子变成实心）。名字条的颜色代表所在区域；稳定度显示在黑底金边星章里的是「战场国」，计分时最值钱。控制一国后会在方框上插一面旗。',
    when: (_v, d) => d?.tag === 'setup',
  },
  {
    id: 'tracks', title: '顶栏的轨道', target: 'tracks',
    text: () => '从左到右：回合、DEFCON（越低越危险）、胜利点（往右美国领先，往左苏联领先）、军事行动、太空竞赛、中国牌和牌堆。',
    when: (v) => v.phase === 'headline' || v.phase === 'action',
  },
  {
    id: 'headline', title: '头条阶段', target: 'hand',
    text: () =>
      '每回合开始，双方同时暗选一张牌当「头条」，亮出后只发动事件，行动点高的一方先结算。' +
      '挑一张对你有利的事件。注意：拿对手阵营的牌当头条，发动的是对手的事件。',
    when: (_v, d) => d?.tag === 'headline',
  },
  {
    id: 'cards', title: '认识卡牌', target: 'hand',
    text: () =>
      '蓝色卡头是美国事件，红色是苏联事件，红蓝各半是双方都能用的事件，棕色是计分卡。左上角数字是行动点。' +
      '每个行动轮必须打出一张牌，点一下高亮的手牌就是打出它。没高亮时点卡牌可以放大看说明。',
    when: (_v, d) => d?.tag === 'play',
  },
  {
    id: 'modeOwn', title: '一张牌，三种打法', target: 'decision',
    text: () =>
      '「事件」执行卡面上的效果；「行动点」用来放影响力、政变或调整阵营；「太空竞赛」用这张牌掷骰推进太空轨（每回合限一次），牌上的事件不发动。',
    when: (v, d) => d?.tag === 'mode' && !!d.card && cardSideOf(d) !== opp(v.me!),
  },
  {
    id: 'modeOpp', title: '这是对手的牌', target: 'decision',
    text: (v) =>
      `这张是${SIDE_ZH[opp(v.me!)]}的事件牌。你拿它用行动点时，对手的事件照样会发动（你可以选先发动还是后发动）。` +
      '如果事件对你很伤，可以拿去「太空竞赛」：这样事件不会发动，是甩掉坏牌的常用办法。头条阶段打出的话，也会发动对手事件。',
    when: (v, d) => d?.tag === 'mode' && !!d.card && cardSideOf(d) === opp(v.me!),
  },
  {
    id: 'opsMode', title: '行动点的用途', target: 'decision',
    text: () =>
      '「放置影响力」最常用，用来抢地盘；「政变」直接攻击对手的影响力，靠掷骰；「调整阵营」双方掷骰比大小，赢了削减对手影响力。政变和调整都要求目标国有对手影响力。',
    when: (_v, d) => d?.tag === 'opsMode',
  },
  {
    id: 'placeOps', title: '放影响力的规则', target: 'map',
    text: () =>
      '只能放在本轮开始时已有你影响力的国家，或它们的邻国（与你本土相邻的国家也可以）。放进对手控制的国家每点要 2 行动点。行动点必须用完。高亮的国家都是现在能放的。',
    when: (_v, d) => d?.tag === 'placeOps',
  },
  {
    id: 'coup', title: '政变', target: 'map',
    text: () =>
      '掷一个骰子加上行动点，结果大于 2×稳定度就成功：差值先移除对手影响力，不够再加上你的。鼠标停在国家上能看到成功率。' +
      '战场国政变无论成败都会让 DEFCON −1；政变用掉的行动点会计入军事行动。',
    when: (_v, d) => d?.tag === 'coupTarget',
  },
  {
    id: 'realign', title: '调整阵营', target: 'map',
    text: () =>
      '每点行动点掷一次。双方各掷一个骰子：每个相邻的己控国、在该国影响力更多、该国与本土相邻各 +1。点数高的一方移除对手差值的影响力。不影响 DEFCON，也不计军事行动。鼠标停在国家上能看到胜率。',
    when: (_v, d) => d?.tag === 'realignTarget',
  },
  {
    id: 'scoring', title: '手里有计分卡', target: 'hand',
    text: () =>
      '计分卡打出时，按该区域当前局势给双方算分。回合结束时还捏在手里会直接判负，所以本回合一定要打出去。' +
      '点地图上的区域名称（如「欧洲」）可以预览现在打出各得几分，挑对你最有利的时机。',
    when: (v, d) => d?.tag === 'play' && !!v.me && v.hands[v.me].some((c) => CARDS[c].scoring),
  },
  {
    id: 'china', title: '中国牌', target: 'china',
    text: () => '中国牌有 4 行动点，全部用在亚洲还会再 +1。打出后背面朝上交给对手，第 10 回合结束时持有者 +1 VP。它不算手牌，也不能当头条。',
    when: (v, d) => d?.tag === 'play' && v.china.holder === v.me && v.china.faceUp,
  },
  {
    id: 'space', title: '太空竞赛', target: 'space',
    text: () =>
      '太空轨共 8 格。到达某些格先到者得 VP，有的格还带特权（比如每回合可尝试两次、对手先亮头条）。行动点不够高的格子不能尝试。',
    when: (v) => v.space.US + v.space.USSR > 0,
  },
  {
    id: 'milops', title: '军事行动快不够了', target: 'milops',
    text: (v) =>
      `回合结束时双方的军事行动都要达到当前 DEFCON 值（现在是 ${v.defcon}），每差 1 点对手 +1 VP。政变和战争类事件能补军事行动。`,
    when: (v) => v.phase === 'action' && v.ar >= 4 && !!v.me && v.milops[v.me] < v.defcon,
  },
  {
    id: 'defcon3', title: 'DEFCON 下降了', target: 'defcon',
    text: () => 'DEFCON 越低，能政变和调整的地方越少：4 禁止欧洲，3 再禁止亚洲，2 再禁止中东。每回合开始 DEFCON 会自动 +1。',
    when: (v) => v.defcon <= 4,
  },
  {
    id: 'defcon2', title: '危险：DEFCON 2', target: 'defcon',
    text: () =>
      '现在任何让 DEFCON 再降一级的行动（在战场国政变、某些事件）都会让当时的行动方直接输掉。即使是对手的事件，只要发生在你的行动轮里，输的也是你。在战场国政变会被直接禁止，其他危险操作会弹出确认。',
    when: (v) => v.defcon === 2,
  },
  {
    id: 'log', title: '对手做了什么', target: 'log',
    text: () => '对手打出的牌会在地图中央亮一下（点一下就关掉）。每一步都会写进右侧的「记录」，看不懂刚才发生了什么就去翻翻。',
    when: (v) => !!v.playing && v.playing.side !== v.me,
  },
  {
    id: 'effects', title: '生效中的事件', target: 'effects',
    text: () => '地图左上角的标签是正在生效的事件效果，点一下可以查看对应的卡。',
    when: (v) => Object.values(v.flags).some(Boolean),
  },
  {
    id: 'turn2', title: '新的回合', target: 'tracks',
    text: () => '每回合开始 DEFCON +1，双方补牌到 8 张。第 4 回合进入冷战中期：补到 9 张、每回合 7 个行动轮，并加入中期牌。',
    when: (v) => v.turn >= 2,
  },
  {
    id: 'quickref', title: '规则速查', target: 'sidetabs',
    text: () => '右侧「速查」页有政变、调整、计分等规则摘要；首页的「规则摘要」更完整。忘了就点开看看。',
    when: (v) => v.turn >= 2 || (v.phase === 'action' && v.ar >= 2),
  },
];

/** 当前要显示的提示 */
function pick(v: GameView): Tip | null {
  if (!v.me || v.phase === 'over') return null;
  const d = v.decision;
  for (const t of TIPS) if (!seen.value.has(t.id) && t.when(v, d)) return t;
  return null;
}

export function Coach({ view, force }: { view: GameView; force?: boolean }) {
  const on = force || coachOn.value;
  const tip = on ? pick(view) : null;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!tip?.target) return setRect(null);
    const el = document.querySelector(`[data-tour="${tip.target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [tip?.id, view]);

  useEffect(() => {
    const onResize = () => {
      if (!tip?.target) return;
      const el = document.querySelector(`[data-tour="${tip.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [tip?.id]);

  if (!tip) return null;
  const pad = 4;
  // 气泡放在目标旁边：目标在下半屏就放上方
  let style: Record<string, string> = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  if (rect) {
    const w = 340;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, rect.left + rect.width / 2 - w / 2));
    const big = rect.height > window.innerHeight * 0.5;
    if (big) style = { left: `${Math.max(8, rect.left + 12)}px`, top: `${rect.top + 12}px` };
    else if (rect.top > window.innerHeight / 2) style = { left: `${left}px`, bottom: `${window.innerHeight - rect.top + 12}px` };
    else style = { left: `${left}px`, top: `${rect.bottom + 12}px` };
  }
  return (
    <>
      {rect && (
        <div
          class="coach-ring"
          style={{ left: `${rect.left - pad}px`, top: `${rect.top - pad}px`, width: `${rect.width + pad * 2}px`, height: `${rect.height + pad * 2}px` }}
        />
      )}
      <div class="coach-tip" style={style}>
        <div class="coach-title">💡 {tip.title}</div>
        <div class="coach-text">{tip.text(view, view.decision)}</div>
        <div class="coach-btns">
          {!force && (
            <button type="button" class="btn small ghost" onClick={() => setCoach(false)}>关闭新手提示</button>
          )}
          <button type="button" class="btn small primary" onClick={() => markSeen(tip.id)}>知道了</button>
        </div>
      </div>
    </>
  );
}

// =====================================================================
// 危险操作确认：会让自己当场输掉的选择先问一句
// =====================================================================

/** DEFCON 2 时发动会再降一级的事件 */
const DEGRADE = new Set([4, 50, 89]);

/** 直接禁止的自杀操作：DEFCON 2 时在战场国政变（核潜艇等免降级的情况除外） */
export function suicide(v: GameView, d: Decision, choice: Choice): string | null {
  const me = v.me;
  if (!me || d.tag !== 'coupTarget' || typeof choice !== 'string' || !COUNTRIES[choice]) return null;
  const free = d.card === 47 || d.card === 91 || d.card === 96;
  const subs = me === 'US' && v.flags.nuclearSubs && !free && d.card !== 107;
  if (v.defcon === 2 && COUNTRIES[choice].bg && !subs) return `${COUNTRIES[choice].zh}是战场国，DEFCON 2 时在这里政变会降到 1，你会直接输掉，已禁止。换个非战场国，或者用左下角「撤销」改选别的行动。`;
  return null;
}

export function danger(v: GameView, d: Decision, choice: Choice): string | null {
  const me = v.me;
  if (!me) return null;
  const f = v.flags;
  if (d.tag === 'coupTarget' && typeof choice === 'string' && COUNTRIES[choice]) {
    if (f.cmc === me) return '古巴导弹危机期间你发动政变，如果不解除危机就会直接输掉。确定吗？';
    const free = d.card === 47 || d.card === 91 || d.card === 96;
    const subs = me === 'US' && f.nuclearSubs && !free && d.card !== 107;
  }
  if (d.tag === 'opsMode' && choice === 'coup' && f.cmc === me) return '古巴导弹危机期间你发动政变，如果不解除危机就会直接输掉。确定吗？';
  if (v.defcon === 2 && d.card) {
    const c = d.card;
    const side = CARDS[c].side;
    if (d.tag === 'mode' && DEGRADE.has(c) && (choice === 'event' || (choice === 'ops' && side === opp(me)))) {
      return `「${CARDS[c].zh}」的事件会让 DEFCON 再降一级（现在是 2），你是行动方，会直接输掉。改用太空竞赛可以避免事件发动。确定吗？`;
    }
    if (d.tag === 'mode' && c === 20 && choice === 'event') return '现在 DEFCON 为 2：如果对手抵制奥运会，DEFCON 会降到 1，作为主办方的你会输掉。确定吗？';
  }
  if (d.tag === 'headline' && typeof choice === 'number' && v.defcon === 2 && DEGRADE.has(choice)) {
    return `头条只发动事件。「${CARDS[choice].zh}」会让 DEFCON 从 2 降到 1，你会直接输掉。确定吗？`;
  }
  if (d.card === 46 && choice === '1') return '把 DEFCON 设为 1 会立刻引发核战争，你会输掉。确定吗？';
  if (d.card === 45 && choice === 'down' && v.defcon === 2) return 'DEFCON 降到 1 时，当前行动方会输掉。确定吗？';
  if (d.tag === 'play' && typeof choice === 'number' && v.phase === 'action') {
    const scoring = v.hands[me].filter((c) => CARDS[c].scoring).length;
    const base = v.turn <= 3 ? 6 : 7;
    const left = base - v.ar + 1;
    if (scoring > 0 && (choice === CHINA_CARD || !CARDS[choice].scoring) && scoring >= left) {
      return `你手里还有 ${scoring} 张计分卡，本回合只剩 ${left} 个行动轮。回合结束时还持有计分卡会直接判负。确定先打这张吗？`;
    }
  }
  return null;
}
