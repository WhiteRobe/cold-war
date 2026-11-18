import { useEffect, useRef, useState } from 'preact/hooks';
import { CARDS, CARD_LIST, CHINA_CARD, COUNTRY_LIST, REGION_ZH, type RegionId, type Side } from '../../data';
import { scoreRegion } from '../../engine/scoring';
import type { Choice, Decision, LogEntry } from '../../engine/types';
import { Coach, coachOn, danger, setCoach } from './Coach';
import type { GameView } from '../../engine/view';
import { audioPrefs, setAudioPrefs, setMusicTrack, setTension, sfx } from '../audio';
import { go } from '../store';
import { CardFace, MiniCard } from './CardFace';
import { MapView } from './MapView';
import type { GameSession } from './session';
import { Effects, Tracks } from './Tracks';

const SIDE_ZH: Record<Side, string> = { US: '美国', USSR: '苏联' };

export function Board({ session, tutorial }: { session: GameSession; tutorial?: boolean }) {
  const view = session.view.value;
  const names = session.names.value;
  const [zoomCard, setZoomCard] = useState<number | null>(null);
  const [pile, setPile] = useState<'discard' | 'removed' | 'deck' | null>(null);
  const [region, setRegion] = useState<RegionId | null>(null);
  const [tab, setTab] = useState<'log' | 'help'>('log');
  const flash = useFlash(view);
  const { popup, close: closePopup } = usePopup(view);
  useGameSounds(view, session.log.value);
  const [overSeen, setOverSeen] = useState(false);
  const [handOpen, setHandOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ msg: string; v: Choice } | null>(null);

  if (!view) return <div class="hero"><div class="empty-hint">正在载入对局…</div></div>;
  const me = view.me;
  const d = view.decision;
  const selectable = new Set<string>(d?.kind === 'country' ? d.options.map((o) => String(o.v)).filter((v) => v !== 'done') : []);
  const handChoice = d && d.kind === 'card' && (d.tag === 'play' || d.tag === 'headline' || (d.tag === 'discard' && d.options.every((o) => o.v === 'pass' || (me && view.hands[me].includes(o.v as number)) || o.v === CHINA_CARD)));
  const handOpts = new Set<number>(handChoice ? d!.options.map((o) => o.v).filter((v): v is number => typeof v === 'number') : []);

  /** 会让自己当场输掉的选择先确认一下 */
  const choose = (v: Choice) => {
    const msg = d ? danger(view, d, v) : null;
    if (msg) setConfirm({ msg, v });
    else session.choose(v);
  };

  const myHand = me ? [...view.hands[me]] : [];
  if (me && view.china.holder === me) myHand.push(CHINA_CARD);
  const oppSide: Side = me === 'USSR' ? 'US' : 'USSR';
  const known = view.hands[oppSide];

  return (
    <div class={`board me-${(me ?? 'none').toLowerCase()}`}>
      <div class="rotate-hint">请把手机横过来玩 ↻</div>
      <header class="board-top">
        <button type="button" class="icon-btn" title="返回" onClick={() => go('/')}>←</button>
        <Tracks view={view} names={names} onPile={setPile} />
        <button type="button" class={`icon-btn coach-btn${coachOn.value || tutorial ? ' on' : ''}`} title={coachOn.value ? '关闭新手提示' : '打开新手提示'} onClick={() => setCoach(!coachOn.value)}>?</button>
        <AudioToggles />
      </header>
      <main class="board-map" data-tour="map">
        <Effects view={view} onCard={setZoomCard} />
        <MapView view={view} selectable={selectable} onPick={(c) => choose(c)} flash={flash} onRegion={setRegion} />
        {popup && (
          <div class="play-popup" onClick={closePopup} title="点击关闭">
            <div class={`pp-who ${popup.side.toLowerCase()}`}>{names[popup.side]}打出</div>
            <CardFace id={popup.card} />
          </div>
        )}
      </main>
      <aside class="board-side">
        <DecisionPanel view={view} d={d} names={names} choose={choose} onZoom={setZoomCard} />
        {view.phase === 'headline' && Object.keys(view.headline).length > 0 && (
          <div class="headline-box">
            <div class="hb-title">头条</div>
            <div class="hb-cards">
              {(['US', 'USSR'] as Side[]).map((s) => view.headline[s] && (
                <div key={s} class={`hb-card ${s.toLowerCase()}`}>
                  <div>{names[s]}</div>
                  <MiniCard id={view.headline[s]!} onClick={() => setZoomCard(view.headline[s]!)} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div class="side-tabs" data-tour="sidetabs">
          <button type="button" class={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>记录</button>
          <button type="button" class={tab === 'help' ? 'on' : ''} onClick={() => setTab('help')}>速查</button>
        </div>
        {tab === 'log' ? <LogView log={session.log.value} me={me} /> : <QuickRef />}
      </aside>
      <button type="button" class={`hand-toggle${handChoice ? ' need' : ''}`} onClick={() => setHandOpen(!handOpen)}>
        手牌 {myHand.length}{handOpen ? ' ▾' : ' ▴'}
      </button>
      <footer class={`board-hand${handOpen || handChoice ? ' open' : ''}`}>
        <div class="hand-main" data-tour="hand">
        <div class="hand-label">
          {me ? `${SIDE_ZH[me]}手牌` : '观战'}
          {session.undo && (
            <button type="button" class="undo-btn" disabled={!session.canUndo.value} onClick={() => session.undo!()}>撤销</button>
          )}
        </div>
        <div class="hand-cards">
          {myHand.map((c) => {
            const isChina = c === CHINA_CARD;
            const active = handOpts.has(c);
            return (
              <MiniCard
                key={c}
                id={c}
                active={active}
                dim={!!handChoice && !active}
                faceDown={isChina && !view.china.faceUp}
                onClick={() => (active ? choose(c) : setZoomCard(c))}
              />
            );
          })}
          {!myHand.length && <div class="empty-hint">没有手牌</div>}
        </div>
        </div>
        {known.length > 0 && (
          <div class="known-opp">
            <div class="hand-label">已知对手手牌</div>
            <div class="hand-cards small">
              {known.map((c) => <MiniCard key={c} id={c} onClick={() => setZoomCard(c)} />)}
            </div>
          </div>
        )}
      </footer>

      <Coach view={view} force={tutorial} />
      {confirm && (
        <div class="modal" onClick={() => setConfirm(null)}>
          <div class="modal-box danger-box" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ 危险操作</h3>
            <p>{confirm.msg}</p>
            <div class="row">
              <button type="button" class="btn primary" onClick={() => setConfirm(null)}>我再想想</button>
              <button type="button" class="btn" onClick={() => { session.choose(confirm.v); setConfirm(null); }}>坚持执行</button>
            </div>
          </div>
        </div>
      )}
      {zoomCard !== null && (
        <div class="modal" onClick={() => setZoomCard(null)}>
          <div class="modal-card" onClick={(e) => e.stopPropagation()}>
            <CardFace id={zoomCard} faceDown={zoomCard === CHINA_CARD && !view.china.faceUp} />
            <button type="button" class="btn" onClick={() => setZoomCard(null)}>关闭</button>
          </div>
        </div>
      )}
      {pile && <PileModal view={view} pile={pile} onClose={() => setPile(null)} onCard={setZoomCard} />}
      {region && <RegionModal view={view} region={region} onClose={() => setRegion(null)} />}
      {view.phase === 'over' && !overSeen && (
        <div class="modal">
          <div class="modal-box over-box">
            <h2>{view.winner ? `${names[view.winner]}（${SIDE_ZH[view.winner]}）获胜` : '平局'}</h2>
            <p>{view.winReason}</p>
            <p>最终 VP：{view.vp > 0 ? `美国 +${view.vp}` : view.vp < 0 ? `苏联 +${-view.vp}` : '0'} · 第 {view.turn} 回合</p>
            <div class="row">
              <button type="button" class="btn" onClick={() => setOverSeen(true)}>查看棋盘</button>
              <button type="button" class="btn primary" onClick={() => go('/')}>返回首页</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DecisionPanel({ view, d, names, choose, onZoom }: { view: GameView; d?: Decision; names: Record<Side, string>; choose: (v: Choice) => void; onZoom: (c: number) => void }) {
  if (view.phase === 'over') return <div class="decision idle">对局已结束</div>;
  if (!d) {
    const w = view.waitingFor.filter((s) => s !== view.me);
    return (
      <div class="decision idle">
        {view.playing && <PlayingCard view={view} names={names} onZoom={onZoom} />}
        <div class="waiting">
          <span class="dots" />
          {w.length ? `等待 ${w.map((s) => names[s]).join('、')}…` : '结算中…'}
        </div>
      </div>
    );
  }
  const showCard = d.card && d.tag !== 'play' && d.tag !== 'headline';
  return (
    <div class={`decision tag-${d.tag}`} data-tour="decision">
      {showCard && d.tag === 'mode' ? (
        <div class="decision-card" onClick={() => onZoom(d.card!)}>
          <CardFace id={d.card!} />
        </div>
      ) : showCard ? (
        <div class="decision-mini" onClick={() => onZoom(d.card!)}>
          <MiniCard id={d.card!} />
        </div>
      ) : null}
      <div class="prompt">{d.prompt}</div>
      {d.ops && (
        <div class="ops-bar">
          {Array.from({ length: d.ops.total }, (_, i) => (
            <span key={i} class={i < d.ops!.spent ? 'used' : ''} />
          ))}
        </div>
      )}
      {d.kind === 'option' && (
        <div class="options">
          {d.options.map((o) => (
            <button type="button" key={o.v} class={`btn opt opt-${o.v}`} onClick={() => choose(o.v)}>
              {o.label ?? o.v}
            </button>
          ))}
        </div>
      )}
      {d.kind === 'country' && (
        <>
          <div class="hint">在地图上点击高亮的国家</div>
          <div class="country-chips">
            {d.options.filter((o) => o.v !== 'done').map((o) => (
              <button type="button" key={o.v} class="chip" onClick={() => choose(o.v)}>{o.label}</button>
            ))}
          </div>
          {d.options.some((o) => o.v === 'done') && (
            <button type="button" class="btn" onClick={() => choose('done')}>结束</button>
          )}
        </>
      )}
      {d.kind === 'card' && (
        <>
          {(d.tag === 'play' || d.tag === 'headline') && <div class="hint">点击下方高亮的手牌</div>}
          {d.tag !== 'play' && d.tag !== 'headline' && (
            <div class="option-cards">
              {d.options.filter((o) => typeof o.v === 'number').map((o) => (
                <MiniCard key={o.v} id={o.v as number} active onClick={() => choose(o.v)} />
              ))}
            </div>
          )}
          {d.options.filter((o) => o.v === 'pass').map((o) => (
            <button type="button" key="pass" class="btn" onClick={() => choose('pass')}>{o.label}</button>
          ))}
        </>
      )}
    </div>
  );
}

function PlayingCard({ view, names, onZoom }: { view: GameView; names: Record<Side, string>; onZoom: (c: number) => void }) {
  const p = view.playing!;
  return (
    <div class="playing" onClick={() => onZoom(p.card)}>
      <div class={`pp-who ${p.side.toLowerCase()}`}>{names[p.side]}正在结算</div>
      <MiniCard id={p.card} />
    </div>
  );
}

function LogView({ log, me }: { log: LogEntry[]; me: Side | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);
  const shown = log.slice(-400);
  return (
    <div class="log" ref={ref} data-tour="log">
      {shown.map((e, i) => (
        <div key={log.length - shown.length + i} class={`log-e k-${e.kind ?? 'n'}${e.side ? ` s-${e.side.toLowerCase()}` : ''}${e.to ? ' private' : ''}`}>
          {e.kind === 'turn' ? null : <span class="log-t">{e.turn}.{e.ar}</span>}
          {e.t}
          {e.to && e.to === me && <span class="log-private">（仅你可见）</span>}
        </div>
      ))}
    </div>
  );
}

function QuickRef() {
  return (
    <div class="quickref">
      <h4>行动点用途</h4>
      <p><b>放影响力</b>：放在本轮开始时已有己方影响力的国家或其邻国；敌控国每点 2 行动点。</p>
      <p><b>政变</b>：掷骰 + 行动点 − 2×稳定度 &gt; 0 成功，先移除对手再增加己方；战场国 DEFCON −1；计入军事行动。</p>
      <p><b>调整</b>：每点行动点掷一次，双方各掷骰，相邻己控国、影响力更多、与本国相邻各 +1；高者移除对手差值。</p>
      <p><b>太空竞赛</b>：每回合 1 次（有特权 2 次），牌上的事件不发动。</p>
      <h4>DEFCON</h4>
      <p>4：欧洲禁政变/调整；3：再加亚洲；2：再加中东；1：行动方输。战场国政变 DEFCON −1。</p>
      <h4>计分</h4>
      <p><b>存在</b>：至少控制 1 国。<b>支配</b>：国家数与战场国数都多于对手，且至少有 1 个非战场国。<b>控制</b>：国家数多于对手且控制全部战场国。另每控制一个战场国 +1，每控制一个与敌方超级大国相邻的国家 +1。</p>
      <h4>回合结束</h4>
      <p>军事行动每少 1 点对手 +1 VP；手里有计分卡直接判负；中国牌翻回正面。</p>
      <p><a href="#/rules">完整规则摘要 →</a></p>
    </div>
  );
}

function PileModal({ view, pile, onClose, onCard }: { view: GameView; pile: 'discard' | 'removed' | 'deck'; onClose: () => void; onCard: (c: number) => void }) {
  let cards: number[];
  let title: string;
  if (pile === 'discard') {
    cards = view.discard;
    title = '弃牌堆';
  } else if (pile === 'removed') {
    cards = [...view.removed, ...view.inPlay];
    title = '已移出 / 持续生效';
  } else {
    const era = view.turn <= 3 ? ['early'] : view.turn <= 7 ? ['early', 'mid'] : ['early', 'mid', 'late'];
    const seen = new Set([...view.discard, ...view.removed, ...view.inPlay, ...view.hands.US, ...view.hands.USSR, ...Object.values(view.headline), CHINA_CARD]);
    if (view.playing) seen.add(view.playing.card);
    cards = CARD_LIST.filter((c) => era.includes(c.era) && (view.options.optionalCards || !c.optional) && !seen.has(c.id)).map((c) => c.id);
    title = `牌库（${view.deckCount} 张）或对手手牌中的牌`;
  }
  return (
    <div class="modal" onClick={onClose}>
      <div class="modal-box wide" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div class="pile-cards">
          {cards.map((c) => <MiniCard key={c} id={c} onClick={() => onCard(c)} />)}
          {!cards.length && <div class="empty-hint">空</div>}
        </div>
        <button type="button" class="btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}

const LV_ZH = { none: '无', presence: '存在', domination: '支配', control: '控制' };

function RegionModal({ view, region, onClose }: { view: GameView; region: RegionId; onClose: () => void }) {
  const sc = scoreRegion(view as never, region, { formosan: view.flags.formosan, shuttle: view.flags.shuttle && (region === 'asia' || region === 'middleEast') });
  return (
    <div class="modal" onClick={onClose}>
      <div class="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>{REGION_ZH[region]}计分预览</h3>
        <table class="score-table">
          <thead>
            <tr><th /><th class="us">美国</th><th class="ussr">苏联</th></tr>
          </thead>
          <tbody>
            <tr><td>等级</td><td>{LV_ZH[sc.US.level]}</td><td>{LV_ZH[sc.USSR.level]}</td></tr>
            <tr><td>控制国家</td><td>{sc.US.countries}</td><td>{sc.USSR.countries}</td></tr>
            <tr><td>控制战场国</td><td>{sc.US.bgs}</td><td>{sc.USSR.bgs}</td></tr>
            <tr><td>邻接敌方本土</td><td>{sc.US.adjEnemy}</td><td>{sc.USSR.adjEnemy}</td></tr>
            <tr><td>得分</td><td>{sc.points.US}</td><td>{sc.points.USSR}</td></tr>
          </tbody>
        </table>
        <p>{sc.autoWin ? `${SIDE_ZH[sc.autoWin]}控制欧洲，打出欧洲计分即获胜！` : sc.net === 0 ? '现在打出计分卡：不加分' : `现在打出计分卡：${sc.net > 0 ? '美国' : '苏联'} +${Math.abs(sc.net)} VP`}</p>
        <button type="button" class="btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}

/** 影响力有变化的国家闪一下 */
function useFlash(view: GameView | null) {
  const prev = useRef<Record<string, [number, number]> | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!view) return;
    const p = prev.current;
    prev.current = view.inf;
    if (!p) return;
    const changed = new Set(COUNTRY_LIST.map((c) => c.id).filter((id) => p[id][0] !== view.inf[id][0] || p[id][1] !== view.inf[id][1]));
    if (!changed.size) return;
    setFlash(changed);
    const t = setTimeout(() => setFlash(new Set()), 1200);
    return () => clearTimeout(t);
  }, [view?.inf]);
  return flash;
}

/** 对手打出的牌弹出展示一会儿（计时器不能随 view 变化被清掉，否则 AI 结算完后弹窗会一直停在中间） */
function usePopup(view: GameView | null) {
  const [popup, setPopup] = useState<{ card: number; side: Side } | null>(null);
  const last = useRef<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const key = view?.playing ? `${view.playing.side}:${view.playing.card}:${view.turn}:${view.ar}` : '';
  useEffect(() => {
    if (!view?.playing || key === last.current) return;
    last.current = key;
    if (view.playing.side === view.me) return;
    setPopup(view.playing);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPopup(null), 2200);
  }, [key]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const close = () => {
    clearTimeout(timer.current);
    setPopup(null);
  };
  return { popup, close };
}

void CARDS;

/** 音乐 / 音效开关 */
export function AudioToggles({ musicOnly }: { musicOnly?: boolean }) {
  const p = audioPrefs.value;
  return (
    <div class="audio-toggles">
      <button type="button" class={`icon-btn${p.music ? ' on' : ''}`} title={p.music ? '关闭背景音乐' : '开启背景音乐'} onClick={() => setAudioPrefs({ music: !p.music })}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2" />
          <circle cx="6.5" cy="17" r="2.5" fill="currentColor" />
          <circle cx="17.5" cy="15" r="2.5" fill="currentColor" />
          {!p.music && <path d="M3 3l18 18" stroke="currentColor" stroke-width="2" />}
        </svg>
      </button>
      {!musicOnly && (
        <button type="button" class={`icon-btn${p.sfx ? ' on' : ''}`} title={p.sfx ? '关闭音效' : '开启音效'} onClick={() => setAudioPrefs({ sfx: !p.sfx })}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
            {p.sfx ? <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" /> : <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" />}
          </svg>
        </button>
      )}
    </div>
  );
}

/** 根据局面变化播放音效，并切换对局音乐 */
function useGameSounds(view: GameView | null, log: LogEntry[]) {
  const prev = useRef<GameView | null>(null);
  const logSeen = useRef(-1);
  useEffect(() => {
    setMusicTrack('game');
    return () => {
      setTension(false);
      setMusicTrack('menu');
    };
  }, []);
  useEffect(() => {
    if (!view) return;
    setTension(view.defcon <= 2 && view.phase !== 'over');
    const p = prev.current;
    prev.current = view;
    const seen = logSeen.current;
    logSeen.current = log.length;
    // 首次载入 / 重连整段重放时不补播
    if (!p || seen < 0 || log.length < seen || log.length - seen > 40) return;
    const fresh = log.slice(seen);
    let rolled = false;
    for (const e of fresh) {
      if (e.kind === 'card') sfx('card');
      else if (e.kind === 'headline' && e.t.startsWith('头条：')) sfx('headline');
      else if (e.kind === 'roll') {
        rolled = true;
        sfx('dice');
        if (e.t.includes('政变')) sfx(e.t.includes('成功') ? 'coupWin' : 'coupFail');
        else if (e.t.includes('太空竞赛') && e.t.includes('成功')) setTimeout(() => sfx('space'), 450);
      } else if (e.kind === 'score' && e.t.includes('计分：')) sfx('scoring');
      else if (e.kind === 'end') {
        const me = view.me;
        if (!view.winner) sfx('scoring');
        else sfx(me && view.winner !== me ? 'lose' : 'win');
      }
    }
    if (view.defcon < p.defcon) sfx('defconDown');
    else if (view.defcon > p.defcon && view.turn === p.turn) sfx('defconUp');
    if (view.vp !== p.vp && view.phase !== 'over') {
      const toUs = view.vp > p.vp;
      const good = view.me ? (view.me === 'US') === toUs : true;
      setTimeout(() => sfx(good ? 'vpGood' : 'vpBad'), rolled ? 500 : 0);
    }
    if (!rolled && COUNTRY_LIST.some((c) => p.inf[c.id][0] !== view.inf[c.id][0] || p.inf[c.id][1] !== view.inf[c.id][1])) sfx('place');
    if (view.decision && !p.decision) sfx('turn');
  }, [view]);
}
