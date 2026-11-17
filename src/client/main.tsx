import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './styles.css';
import { route, toastMsg } from './store';
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
  useEffect(() => {
    const save = getSave(id);
    if (!save) {
      location.hash = '/';
      return;
    }
    const s = offlineSession(save);
    setSession(s);
    return () => s.close();
  }, [id]);
  if (!session) return <div class="hero"><div class="empty-hint">加载中…</div></div>;
  return <Board session={session} />;
}

function App() {
  const r = route.value;
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
