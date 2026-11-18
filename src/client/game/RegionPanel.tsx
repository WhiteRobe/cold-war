// 侧栏「局势」：各区域实控国家、战场国、计分等级、现在计分与终局预估。
import { COUNTRY_LIST, REGIONS, REGION_ZH, countriesIn, type RegionId, type Side } from '../../data';
import { controller, scoreRegion, scoreSEA } from '../../engine/scoring';
import type { GameView } from '../../engine/view';
import { leadText, projectFinal } from './projection';

const LV_ZH = { none: '—', presence: '存在', domination: '支配', control: '控制' };
const SCORING_CARD: Record<string, number> = { asia: 1, europe: 2, middleEast: 3, centralAmerica: 37, southeastAsia: 38, africa: 79, southAmerica: 81 };
const DOT: Record<string, string> = {
  europe: '#6d7490', asia: '#c9962a', middleEast: '#5f8f3a', africa: '#b24d93', centralAmerica: '#2f9c95', southAmerica: '#7072c4', southeastAsia: '#c9962a',
};

function cardWhere(v: GameView, id: number): string {
  const me = v.me;
  if (me && v.hands[me].includes(id)) return '在你手中';
  if (v.discard.includes(id)) return '在弃牌堆（洗牌后回来）';
  if (v.removed.includes(id)) return '已移出游戏';
  const opp: Side = me === 'US' ? 'USSR' : 'US';
  if (me && v.hands[opp].includes(id)) return '在对手手中（已知）';
  const eraTurn = id === 1 || id === 2 || id === 3 ? 1 : 4;
  if (v.turn < eraTurn) return '中期才加入牌库';
  return '在牌库或对手手中';
}

const signed = (n: number) => (n > 0 ? `美 +${n}` : n < 0 ? `苏 +${-n}` : '0');

function Bar({ us, ussr, total }: { us: number; ussr: number; total: number }) {
  const free = total - us - ussr;
  return (
    <div class="rp-bar" title={`美国控制 ${us} 国，苏联控制 ${ussr} 国，未受控 ${free} 国`}>
      {us > 0 && <span class="seg us" style={{ flex: us }}>{us}</span>}
      {free > 0 && <span class="seg free" style={{ flex: free }}>{free}</span>}
      {ussr > 0 && <span class="seg ussr" style={{ flex: ussr }}>{ussr}</span>}
    </div>
  );
}

export function RegionCard({ v, region }: { v: GameView; region: RegionId | 'southeastAsia' }) {
  const list = countriesIn(region);
  const ctl = (id: string) => controller(v as never, id);
  const us = list.filter((c) => ctl(c.id) === 'US').length;
  const ussr = list.filter((c) => ctl(c.id) === 'USSR').length;
  const bgs = list.filter((c) => c.bg || (region === 'asia' && c.id === 'taiwan' && v.flags.formosan && ctl('taiwan') === 'US'));
  let now: string, lvUs = '', lvUssr = '', final: number | null = null, auto: Side | undefined;
  if (region === 'southeastAsia') {
    const sc = scoreSEA(v as never);
    now = signed(sc.net);
    lvUs = `${sc.points.US} 分`;
    lvUssr = `${sc.points.USSR} 分`;
  } else {
    const shuttle = !!v.flags.shuttle && (region === 'asia' || region === 'middleEast');
    const sc = scoreRegion(v as never, region, { formosan: v.flags.formosan, shuttle });
    now = sc.autoWin ? `${sc.autoWin === 'US' ? '美' : '苏'}控制即胜` : signed(sc.net);
    lvUs = `${LV_ZH[sc.US.level]} ${sc.points.US}`;
    lvUssr = `${LV_ZH[sc.USSR.level]} ${sc.points.USSR}`;
    const fin = scoreRegion(v as never, region, { formosan: v.flags.formosan });
    final = fin.net;
    auto = fin.autoWin;
  }
  const card = SCORING_CARD[region];
  return (
    <div class="rp-card" style={{ borderLeftColor: DOT[region] }}>
      <div class="rp-head">
        <span class="rp-name">{REGION_ZH[region]}</span>
        <span class="rp-lv us">{lvUs}</span>
        <span class="rp-lv ussr">{lvUssr}</span>
      </div>
      <Bar us={us} ussr={ussr} total={list.length} />
      <div class="rp-bgs">
        <span class="rp-k">战场国</span>
        {bgs.length ? bgs.map((c) => {
          const w = ctl(c.id);
          return <span key={c.id} class={`rp-bg ${w ? w.toLowerCase() : ''}`} title={`${c.zh}：${w ? (w === 'US' ? '美国控制' : '苏联控制') : '未受控'}`}>{c.zh.slice(0, 2)}</span>;
        }) : <span class="rp-k">无</span>}
      </div>
      <div class="rp-foot">
        <span>现在计分 <b class={now.startsWith('美') ? 'us' : now.startsWith('苏') ? 'ussr' : ''}>{now}</b></span>
        {final !== null && <span>终局 <b class={auto ? auto.toLowerCase() : final > 0 ? 'us' : final < 0 ? 'ussr' : ''}>{auto ? '控制即胜' : signed(final)}</b></span>}
        <span class="rp-card-where" title="这个区域的计分卡在哪">计分卡：{cardWhere(v, card)}</span>
      </div>
    </div>
  );
}

export function RegionPanel({ view }: { view: GameView }) {
  const pj = projectFinal(view);
  const usAll = COUNTRY_LIST.filter((c) => controller(view as never, c.id) === 'US').length;
  const ussrAll = COUNTRY_LIST.filter((c) => controller(view as never, c.id) === 'USSR').length;
  const usBg = COUNTRY_LIST.filter((c) => c.bg && controller(view as never, c.id) === 'US').length;
  const ussrBg = COUNTRY_LIST.filter((c) => c.bg && controller(view as never, c.id) === 'USSR').length;
  return (
    <div class="region-panel">
      <div class="rp-summary">
        <div>
          当前：<b>{leadText(view.vp)}</b>
        </div>
        <div>
          若现在终局：
          <b class={pj.autoWin ? pj.autoWin.toLowerCase() : pj.total > 0 ? 'us' : pj.total < 0 ? 'ussr' : ''}>
            {pj.autoWin ? `${pj.autoWin === 'US' ? '美国' : '苏联'}控制欧洲直接获胜` : leadText(pj.total)}
          </b>
        </div>
        <div class="rp-total">
          <span class="us">美国控制 {usAll} 国（战场 {usBg}）</span>
          <span class="ussr">苏联控制 {ussrAll} 国（战场 {ussrBg}）</span>
        </div>
      </div>
      {REGIONS.map((r) => (
        <RegionCard key={r} v={view} region={r} />
      ))}
      <RegionCard v={view} region="southeastAsia" />
      <div class="pop-note">现在计分 = 此刻打出计分卡的结果；终局 = 第 10 回合结束时的得分。</div>
    </div>
  );
}
