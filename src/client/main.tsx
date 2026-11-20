import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './styles.css';
import { route, toastMsg } from './store';
import { setMusicTrack } from './audio';
import { Home } from './pages/Home';
import { lazy } from './ui/lazy';
import { Board } from './game/Board';
import { getSave, offlineSession } from './game/offline';
import type { GameSession } from './game/session';

const Online = lazy(() => import('./pages/Online').then((m) => m.Online));
const Room = lazy<{ id: string }>(() => import('./pages/Room').then((m) => m.Room));
const Rules = lazy(() => import('./pages/Rules').then((m) => m.Rules));
const Cards = lazy(() => import('./pages/Cards').then((m) => m.Cards));
const Replay = lazy<{ id: string }>(() => import('./pages/Replay').then((m) => m.Replay));

function OfflineGame({ id }: { id: string }) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [tutorial, setTutorial] = useState(false);
  useEffect(() => {
    const save = getSave(id);
    if (!save) {
      location.hash = '/';
      return;
    }
    setTutorial(!!save.tutorial);
    const s = offlineSession(save);
    setSession(s);
    return () => s.close();
  }, [id]);
  if (!session) return <div class="hero"><div class="empty-hint">加载中…</div></div>;
  return <Board session={session} tutorial={tutorial} />;
}

/** 仅开发环境：#/dev-victory/US | USSR | draw 预览胜利动画 */
const DevVictory = import.meta.env.DEV ? lazy<{ w: string }>(() => import('./game/Victory').then((m) => ({ w }: { w: string }) => (
  <m.VictoryScene winner={w === 'draw' ? null : (w as 'US' | 'USSR')} me="USSR">
    <div class="modal-box over-box"><h2>预览</h2><p>胜利动画</p></div>
  </m.VictoryScene>
))) : null;

/** 仅开发环境：#/dev-event/<卡号> 预览事件动画 */
const DevEvent = import.meta.env.DEV ? lazy<{ ids: string }>(() => import('./game/EventFx').then((m) => ({ ids }: { ids: string }) => (
  <div class="dev-ev" style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {ids.split(',').map((id) => <div key={id} style={{ width: 340 }}><m.EventStage card={Number(id)} side="USSR" /></div>)}
  </div>
))) : null;

/** 仅开发环境：#/dev-defcon 预览 DEFCON 升降动画（5→2 逐级下降，再逐级回升） */
const DevDefcon = import.meta.env.DEV ? lazy(() => import('./game/Tracks').then((m) => () => {
  const seq = [5, 4, 3, 2, 3, 4, 5];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % seq.length), 3000); return () => clearInterval(t); }, []);
  return <div style={{ margin: 80 }}><div class="tracks"><m.Defcon d={seq[i]} /></div></div>;
})) : null;

/** 仅开发环境：#/dev-space 预览太空竞赛得分飘字与特权弹窗（双方轮流推进） */
const DevSpace = import.meta.env.DEV ? lazy(() => import('./game/SpaceArsenal').then((m) => () => {
  const steps = [[0, 0], [1, 0], [1, 1], [2, 1], [2, 3], [4, 3], [4, 5], [6, 5], [6, 8]];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(steps.length - 1, x + 1)), 2600); return () => clearInterval(t); }, []);
  const [us, ussr] = steps[i];
  return (
    <svg viewBox="0 0 1500 420" style={{ width: '100%', background: '#93aab6' }}>
      <m.SpaceArsenal view={{ space: { US: us, USSR: ussr } } as never} home={{ US: [140, 330], USSR: [1100, 330] }} />
    </svg>
  );
})) : null;

function App() {
  const r = route.value;
  if (DevVictory && location.hash.startsWith('#/dev-victory/')) return <DevVictory w={location.hash.split('/')[2]} />;
  if (DevSpace && location.hash.startsWith('#/dev-space')) return <DevSpace />;
  if (DevDefcon && location.hash.startsWith('#/dev-defcon')) return <DevDefcon />;
  if (DevEvent && location.hash.startsWith('#/dev-event/')) return <DevEvent ids={location.hash.split('/')[2]} />;
  // 对局页面由 Board 自己切换到对局音乐；其余页面放首页音乐
  useEffect(() => {
    if (r.name !== 'offline' && r.name !== 'room' && r.name !== 'replay') setMusicTrack('menu');
  }, [r.name]);
  let page;
  if (r.name === 'offline') page = <OfflineGame id={r.id} key={r.id} />;
  else if (r.name === 'online') page = <Online />;
  else if (r.name === 'room') page = <Room id={r.id} key={r.id} />;
  else if (r.name === 'rules') page = <Rules />;
  else if (r.name === 'cards') page = <Cards />;
  else if (r.name === 'replay') page = <Replay id={r.id} key={r.id} />;
  else page = <Home />;
  return (
    <>
      {page}
      {toastMsg.value && <div class="toast">{toastMsg.value}</div>}
    </>
  );
}

render(<App />, document.getElementById('app')!);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
