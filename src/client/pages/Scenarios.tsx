// 剧本页：浏览内置 / 玩家上传的剧本，编写新剧本（表单或导入 JSON），上传、导出、删除（需密码）。
import { useEffect, useState } from 'preact/hooks';
import { CARDS, CARD_LIST, COUNTRY_LIST, REGIONS, REGION_ZH, setWorld, type Side } from '../../data';
import { BUILTIN_SCENARIOS, EVENT_FLAGS, validateScenario, type Scenario } from '../../engine/scenario';
import { api } from '../api';
import { go, toast } from '../store';

/** 读取全部剧本：内置 + 服务端（取不到服务端时只给内置） */
export async function loadScenarios(): Promise<Scenario[]> {
  try {
    return [...BUILTIN_SCENARIOS, ...(await api.scenarios())];
  } catch {
    return BUILTIN_SCENARIOS;
  }
}

/** 选好的剧本带回首页开局 */

const EMPTY: Scenario = { id: '', name: '', author: '', year: '', story: '', startTurn: 1, endTurn: 10, defcon: 5, vp: 0, space: { US: 0, USSR: 0 }, china: 'USSR', inf: {}, events: [], placement: true };

export function Scenarios() {
  // 剧本只针对标准世界（看过不死不休的对局后，国家表可能还是不死不休的样子）
  setWorld({});
  const [list, setList] = useState<Scenario[]>(BUILTIN_SCENARIOS);
  const [editing, setEditing] = useState<Scenario | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const reload = () => loadScenarios().then(setList);
  useEffect(() => void reload(), []);

  const del = async (s: Scenario) => {
    const pw = prompt(`删除剧本「${s.name}」需要输入密码：`);
    if (pw === null) return;
    try {
      await api.deleteScenario(s.id, pw);
      toast('已删除');
      reload();
    } catch (e) {
      toast(String((e as Error).message));
    }
  };
  const exportJson = (s: Scenario) => {
    const { builtin: _b, ...rest } = s;
    const blob = new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${s.name}.json`;
    a.click();
  };

  if (editing) return <Editor init={editing} onDone={(saved) => { setEditing(null); if (saved) reload(); }} />;

  return (
    <div class="page">
      <header class="page-top">
        <button type="button" class="icon-btn" onClick={() => go('/')}>←</button>
        <h1>剧本</h1>
        <button type="button" class="btn primary" style={{ marginLeft: 'auto' }} onClick={() => setEditing({ ...EMPTY })}>＋ 写一个新剧本</button>
      </header>
      <p class="sc-intro">剧本决定一局从哪个时间点开始：DEFCON、胜利点、太空竞赛、各国影响力、已经发生过的事件，以及一段背景故事。内置剧本不能删除；玩家上传的剧本所有人都能看到和使用。</p>
      <div class="sc-list">
        {list.map((s) => (
          <div key={s.id} class={`sc-card${open === s.id ? ' open' : ''}`}>
            <div class="sc-head" onClick={() => setOpen(open === s.id ? null : s.id)}>
              <span class="sc-year">{s.year || '—'}</span>
              <span class="sc-name">{s.name}</span>
              {s.builtin ? <span class="sc-tag">内置</span> : <span class="sc-tag user">玩家：{s.author || '匿名'}</span>}
              <span class="sc-turns">第 {s.startTurn}–{s.endTurn} 回合</span>
            </div>
            <p class="sc-story">{s.story}</p>
            {open === s.id && <Summary s={s} />}
            <div class="sc-btns">
              <button type="button" class="btn small" onClick={() => setEditing({ ...s, id: '', builtin: undefined, name: `${s.name}（改）` })}>以此为底稿改写</button>
              <button type="button" class="btn small ghost" onClick={() => exportJson(s)}>导出 JSON</button>
              {!s.builtin && <button type="button" class="btn small ghost danger" onClick={() => del(s)}>删除</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Summary({ s }: { s: Scenario }) {
  const inf = Object.entries(s.inf ?? {});
  return (
    <div class="sc-summary">
      <div>DEFCON {s.defcon ?? 5} · 胜利点 {s.vp ? (s.vp > 0 ? `美 +${s.vp}` : `苏 +${-s.vp}`) : '0'} · 太空 美 {s.space?.US ?? 0} / 苏 {s.space?.USSR ?? 0} · 中国牌在{(s.china ?? 'USSR') === 'US' ? '美国' : '苏联'}手中{s.placement && s.startTurn === 1 ? ' · 保留开局自由布置' : ''}</div>
      {!!s.events?.length && <div>已发生：{s.events.map((id) => CARDS[id]?.zh).join('、')}</div>}
      {!!inf.length && <div>影响力：{inf.map(([c, v]) => `${COUNTRY_LIST.find((x) => x.id === c)?.zh} ${v[0]}/${v[1]}`).join('，')}</div>}
    </div>
  );
}

/** 剧本编辑器：表单 + 导入 JSON；上传前在本地校验 */
function Editor({ init, onDone }: { init: Scenario; onDone: (saved: boolean) => void }) {
  const [s, setS] = useState<Scenario>(init);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Scenario>) => setS({ ...s, ...p });
  const num = (v: string) => (v === '' ? 0 : Math.round(Number(v)));
  const setInf = (c: string, i: 0 | 1, v: number) => {
    const cur = s.inf?.[c] ?? COUNTRY_LIST.find((x) => x.id === c)!.start;
    const nv: [number, number] = i === 0 ? [v, cur[1]] : [cur[0], v];
    set({ inf: { ...s.inf, [c]: nv } });
  };
  const toggleEvent = (id: number) => set({ events: s.events?.includes(id) ? s.events.filter((x) => x !== id) : [...(s.events ?? []), id] });
  const err = validateScenario(s);
  const upload = async () => {
    const bad = validateScenario(s);
    if (bad) return toast(bad);
    setBusy(true);
    try {
      await api.uploadScenario(s);
      toast('上传成功');
      onDone(true);
    } catch (e) {
      toast(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };
  const importJson = (f: File) =>
    f.text().then((t) => {
      try {
        const x = JSON.parse(t) as Scenario;
        const bad = validateScenario(x);
        if (bad) return toast(`导入失败：${bad}`);
        setS({ ...EMPTY, ...x, id: '', builtin: undefined });
        toast('已导入，可以继续修改');
      } catch {
        toast('文件不是合法的 JSON');
      }
    });
  // 能“已发生”的事件：所有非计分卡（持续事件会置上对应标记）
  const eventCards = CARD_LIST.filter((c) => !c.scoring && !c.endless && c.id !== 6);
  const side = (v: Side) => (v === 'US' ? '美国' : '苏联');
  return (
    <div class="page sc-editor">
      <header class="page-top">
        <button type="button" class="icon-btn" onClick={() => onDone(false)}>←</button>
        <h1>编写剧本</h1>
        <label class="btn small ghost" style={{ marginLeft: 'auto' }}>
          导入 JSON
          <input type="file" accept=".json,application/json" hidden onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) importJson(f); }} />
        </label>
      </header>

      <section class="panel">
        <h2>基本信息</h2>
        <div class="sc-grid">
          <label>剧本名称<input class="input" value={s.name} maxLength={40} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} /></label>
          <label>作者<input class="input" value={s.author} maxLength={20} onInput={(e) => set({ author: (e.target as HTMLInputElement).value })} /></label>
          <label>年代<input class="input" value={s.year} maxLength={20} placeholder="如 1962 年 10 月" onInput={(e) => set({ year: (e.target as HTMLInputElement).value })} /></label>
        </div>
        <label class="sc-story-input">背景故事（必填，20–2000 字）
          <textarea class="input" rows={5} value={s.story} onInput={(e) => set({ story: (e.target as HTMLTextAreaElement).value })} />
          <small>{s.story.trim().length} 字</small>
        </label>
      </section>

      <section class="panel">
        <h2>局面</h2>
        <div class="sc-grid">
          <label>开始回合<input class="input" type="number" min={1} max={10} value={s.startTurn} onInput={(e) => set({ startTurn: num((e.target as HTMLInputElement).value) })} /></label>
          <label>结束回合<input class="input" type="number" min={1} max={10} value={s.endTurn} onInput={(e) => set({ endTurn: num((e.target as HTMLInputElement).value) })} /></label>
          <label>DEFCON<input class="input" type="number" min={2} max={5} value={s.defcon} onInput={(e) => set({ defcon: num((e.target as HTMLInputElement).value) })} /></label>
          <label>胜利点（正数美方领先）<input class="input" type="number" min={-19} max={19} value={s.vp} onInput={(e) => set({ vp: num((e.target as HTMLInputElement).value) })} /></label>
          <label>美国太空进度<input class="input" type="number" min={0} max={8} value={s.space?.US ?? 0} onInput={(e) => set({ space: { ...s.space, US: num((e.target as HTMLInputElement).value) } })} /></label>
          <label>苏联太空进度<input class="input" type="number" min={0} max={8} value={s.space?.USSR ?? 0} onInput={(e) => set({ space: { ...s.space, USSR: num((e.target as HTMLInputElement).value) } })} /></label>
          <label>中国牌持有方
            <select class="input" value={s.china ?? 'USSR'} onChange={(e) => set({ china: (e.target as HTMLSelectElement).value as Side })}>
              {(['USSR', 'US'] as const).map((v) => <option key={v} value={v}>{side(v)}</option>)}
            </select>
          </label>
          {s.startTurn === 1 && (
            <label class="check"><input type="checkbox" checked={!!s.placement} onChange={(e) => set({ placement: (e.target as HTMLInputElement).checked })} />保留开局自由布置（东欧 6 点、西欧 7 点）</label>
          )}
        </div>
      </section>

      <section class="panel">
        <h2>各国起始影响力 <small>美 / 苏，留空的国家沿用标准开局</small></h2>
        <div class="sc-inf">
          {REGIONS.map((r) => (
            <div key={r} class="sc-region">
              <h3>{REGION_ZH[r]}</h3>
              {COUNTRY_LIST.filter((c) => c.region === r).map((c) => {
                const v = s.inf?.[c.id] ?? c.start;
                const changed = !!s.inf?.[c.id];
                return (
                  <div key={c.id} class={`sc-inf-row${changed ? ' changed' : ''}`}>
                    <span>{c.zh}<small>{c.stability}{c.bg ? '★' : ''}</small></span>
                    <input class="input us" type="number" min={0} max={20} value={v[0]} onInput={(e) => setInf(c.id, 0, num((e.target as HTMLInputElement).value))} />
                    <input class="input ussr" type="number" min={0} max={20} value={v[1]} onInput={(e) => setInf(c.id, 1, num((e.target as HTMLInputElement).value))} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section class="panel">
        <h2>开局前已经发生的事件 <small>带星的事件会移出游戏；持续事件会生效</small></h2>
        <div class="sc-events">
          {eventCards.map((c) => (
            <label key={c.id} class={`sc-ev side-${c.side.toLowerCase()}${s.events?.includes(c.id) ? ' on' : ''}`}>
              <input type="checkbox" checked={!!s.events?.includes(c.id)} onChange={() => toggleEvent(c.id)} />
              #{c.id} {c.zh}{EVENT_FLAGS[c.id] ? ' ⏳' : ''}
            </label>
          ))}
        </div>
      </section>

      <div class="sc-actions">
        {err && <span class="sc-err">{err}</span>}
        <button type="button" class="btn ghost" onClick={() => {
          const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${s.name || '剧本'}.json`;
          a.click();
        }}>导出 JSON</button>
        <button type="button" class="btn primary" disabled={busy || !!err} onClick={upload}>上传剧本</button>
      </div>
    </div>
  );
}
