import { useEffect, useMemo, useState } from 'preact/hooks';
import { AI_LEVEL_ZH } from '../../ai';
import { api } from '../api';
import { Board } from '../game/Board';
import { onlineSession, type OnlineRoom } from '../game/online';
import { go, me, toast } from '../store';

export function Room({ id }: { id: string }) {
  const [s, setS] = useState<OnlineRoom | null>(null);
  useEffect(() => {
    let sess: OnlineRoom | null = null;
    const open = () => {
      sess = onlineSession(id);
      setS(sess);
    };
    if (me.value) open();
    else
      api.me().then((u) => {
        me.value = u;
        open();
      }).catch(() => {
        me.value = null;
        toast('请先登录');
        go('/online');
      });
    return () => sess?.close();
  }, [id]);
  if (!s) return <div class="hero"><div class="empty-hint">连接中…</div></div>;
  const room = s.room.value;
  if (!room) return <div class="hero"><div class="empty-hint">{s.status.value === 'closed' ? '连接已断开' : '连接中…'}</div></div>;
  if (room.status === 'waiting') return <Waiting s={s} />;
  return (
    <>
      <Board session={s} />
      <OnlineBar s={s} />
    </>
  );
}

function Waiting({ s }: { s: OnlineRoom }) {
  const room = s.room.value!;
  const c = room.config;
  const link = useMemo(() => `${location.origin}/#/room/${room.id}`, [room.id]);
  const ready = c.ai !== null || (room.pending?.length ?? 0) >= 2;
  return (
    <div class="page">
      <header class="page-top">
        <button type="button" class="icon-btn" onClick={() => go('/online')}>←</button>
        <h1>{room.name}</h1>
      </header>
      <div class="panel waiting-room">
        <div class="code-big">房间码 <b>{room.code}</b></div>
        <div class="row left">
          <button type="button" class="btn" onClick={() => navigator.clipboard?.writeText(link).then(() => toast('链接已复制'))}>复制邀请链接</button>
        </div>
        <h3>玩家</h3>
        <ul class="players">
          {room.pending?.map((p) => (
            <li key={p.userId}>
              <span class={`dot ${p.online ? 'on' : ''}`} />
              {p.name}
              {p.name === room.host && '（房主）'}
            </li>
          ))}
          {c.ai !== null && <li><span class="dot on" />AI·{AI_LEVEL_ZH[c.ai]}</li>}
          {c.ai === null && (room.pending?.length ?? 0) < 2 && <li class="muted">等待对手加入…</li>}
        </ul>
        <p>
          房主阵营：{c.hostSide === 'random' ? '随机' : c.hostSide === 'US' ? '美国' : '苏联'} · 美方额外影响力 +{c.options.usBonus} · {c.options.optionalCards ? '含' : '不含'}可选卡
        </p>
        {s.host.value ? (
          <button type="button" class="btn primary big" disabled={!ready} onClick={() => s.send({ type: 'start' })}>{ready ? '开始对局' : '等待对手…'}</button>
        ) : (
          <div class="empty-hint">等待房主开始…</div>
        )}
      </div>
    </div>
  );
}

function OnlineBar({ s }: { s: OnlineRoom }) {
  const v = s.view.value;
  const ask = s.undoAsk.value;
  const [text, setText] = useState('');
  return (
    <>
      {s.status.value !== 'open' && <div class="conn-banner">{s.status.value === 'connecting' ? '正在重连…' : '连接已断开，刷新页面重试'}</div>}
      {ask && (
        <div class="modal">
          <div class="modal-box">
            <h3>对手请求悔棋</h3>
            <p>{s.names.value[ask]}想撤回上一步，同意吗？</p>
            <div class="row">
              <button type="button" class="btn" onClick={() => { s.send({ type: 'undoAnswer', ok: false }); s.undoAsk.value = null; }}>拒绝</button>
              <button type="button" class="btn primary" onClick={() => { s.send({ type: 'undoAnswer', ok: true }); s.undoAsk.value = null; }}>同意</button>
            </div>
          </div>
        </div>
      )}
      {v?.me && v.phase !== 'over' && (
        <div class="online-tools">
          <input
            class="input"
            placeholder="聊天…"
            value={text}
            maxLength={200}
            onInput={(e) => setText((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) {
                s.send({ type: 'chat', text });
                setText('');
              }
            }}
          />
          <button type="button" class="btn small" onClick={() => confirm('确定认输？') && s.send({ type: 'resign' })}>认输</button>
        </div>
      )}
    </>
  );
}
