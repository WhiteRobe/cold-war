import { useEffect, useState } from 'preact/hooks';
import { AI_LEVEL_ZH, type AiLevel } from '../../ai';
import { DEFAULT_OPTIONS } from '../../engine/types';
import type { LobbyMsg, RoomSummary, SeatChoice } from '../../shared/protocol';
import { api, type MatchRow } from '../api';
import { Conn } from '../net';
import { go, me, toast } from '../store';
import { ScenarioPicker, useScenarioPick } from './ScenarioPicker';

export function Online() {
  useEffect(() => {
    if (me.value === undefined) api.me().then((u) => (me.value = u)).catch(() => (me.value = null));
  }, []);
  const u = me.value;
  return (
    <div class="page">
      <header class="page-top">
        <button type="button" class="icon-btn" onClick={() => go('/')}>←</button>
        <h1>在线大厅</h1>
        {u && (
          <div class="who">
            {u.name}
            {u.guest && '（游客）'}
            <button type="button" class="btn small" onClick={() => api.logout().then(() => (me.value = null))}>退出</button>
          </div>
        )}
      </header>
      {u === undefined ? <div class="empty-hint">加载中…</div> : u ? <LobbyBody /> : <Login />}
    </div>
  );
}

function Login() {
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<{ id: string; name: string; guest: boolean }>) => {
    setBusy(true);
    try {
      me.value = await f();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div class="panel login">
      <h2>登录</h2>
      <input class="input" placeholder="用户名（2–16 位）" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      <input class="input" type="password" placeholder="密码（6 位以上）" value={pw} onInput={(e) => setPw((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && run(() => api.login(name, pw))} />
      <div class="row">
        <button type="button" class="btn primary" disabled={busy} onClick={() => run(() => api.login(name, pw))}>登录</button>
        <button type="button" class="btn" disabled={busy} onClick={() => run(() => api.register(name, pw))}>注册</button>
        <button type="button" class="btn" disabled={busy} onClick={() => run(() => api.guest())}>游客进入</button>
      </div>
      <p class="note">游客也能建房和加入，但不记录战绩。</p>
    </div>
  );
}

function LobbyBody() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [side, setSide] = useState<SeatChoice>('random');
  const [opp, setOpp] = useState<'human' | AiLevel>('human');
  const [priv, setPriv] = useState(false);
  const [bonus, setBonus] = useState(2);
  const [optional, setOptional] = useState(true);
  const pick = useScenarioPick();
  const [matches, setMatches] = useState<MatchRow[]>([]);

  useEffect(() => {
    const conn = new Conn<LobbyMsg, string>('/ws/lobby', (m) => {
      if (m.type === 'rooms') setRooms(m.rooms);
      else if (m.type === 'upsert') setRooms((r) => [m.room, ...r.filter((x) => x.id !== m.room.id)]);
      else if (m.type === 'remove') setRooms((r) => r.filter((x) => x.id !== m.id));
    }, () => {});
    if (!me.value?.guest) api.matches().then(setMatches).catch(() => {});
    return () => conn.close();
  }, []);

  const create = async () => {
    try {
      const r = await api.createRoom(name, { options: { ...DEFAULT_OPTIONS, usBonus: bonus, optionalCards: optional, ...(pick.scenario ? { scenario: pick.scenario } : {}) }, hostSide: side, ai: opp === 'human' ? null : opp }, priv);
      go(`/room/${r.id}`);
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const join = async () => {
    try {
      const r = await api.joinByCode(code.trim());
      go(`/room/${r.id}`);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <div class="home-grid">
      <section class="panel">
        <h2>建房</h2>
        <input class="input full" placeholder="房间名（可选）" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
        <div class="field">
          <label>我的阵营</label>
          <div class="seg">
            {(['random', 'USSR', 'US'] as SeatChoice[]).map((s) => (
              <button type="button" key={s} class={side === s ? 'on' : ''} onClick={() => setSide(s)}>{s === 'US' ? '美国' : s === 'USSR' ? '苏联' : '随机'}</button>
            ))}
          </div>
        </div>
        <div class="field">
          <label>对手</label>
          <div class="seg">
            {(['human', 1, 2] as const).map((o) => (
              <button type="button" key={o} class={opp === o ? 'on' : ''} onClick={() => setOpp(o)}>{o === 'human' ? '真人' : `AI·${AI_LEVEL_ZH[o]}`}</button>
            ))}
          </div>
        </div>
        <div class="field">
          <label>美方额外影响力</label>
          <div class="seg">
            {[0, 1, 2, 3].map((n) => (
              <button type="button" key={n} class={bonus === n ? 'on' : ''} onClick={() => setBonus(n)}>+{n}</button>
            ))}
          </div>
        </div>
        <label class="check"><input type="checkbox" checked={optional} onChange={(e) => setOptional((e.target as HTMLInputElement).checked)} />加入可选卡 #104–110</label>
        <ScenarioPicker pick={pick} />
        {opp === 'human' && <label class="check"><input type="checkbox" checked={priv} onChange={(e) => setPriv((e.target as HTMLInputElement).checked)} />私密房间（不在大厅显示，凭房间码加入）</label>}
        <button type="button" class="btn primary big" onClick={create}>创建房间</button>
      </section>

      <section class="panel">
        <h2>加入</h2>
        <div class="row left">
          <input class="input" placeholder="6 位房间码" value={code} maxLength={6} onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && join()} />
          <button type="button" class="btn" onClick={join}>加入</button>
        </div>
        <h3>公开房间</h3>
        {!rooms.length && <div class="empty-hint">暂无公开房间</div>}
        <div class="saves">
          {rooms.map((r) => (
            <button type="button" key={r.id} class="save-main" onClick={() => go(`/room/${r.id}`)}>
              <span>{r.name}</span>
              <small>{r.host} · {r.status === 'waiting' ? `等待中 ${r.humans}/2` : '对局中（观战）'}</small>
            </button>
          ))}
        </div>
      </section>

      {matches.length > 0 && (
        <section class="panel">
          <h2>我的战绩</h2>
          <div class="saves">
            {matches.map((m) => (
              <button type="button" key={m.id} class="save-main" onClick={() => go(`/replay/${m.room_id}`)}>
                <span><span class="us">{m.us_name}</span> vs <span class="ussr">{m.ussr_name}</span></span>
                <small>{m.winner ? `${m.winner === 'US' ? '美' : '苏'}胜` : '平'} · {m.reason} · T{m.turn}</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
