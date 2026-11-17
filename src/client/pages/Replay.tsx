import { signal } from '@preact/signals';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Game } from '../../engine/game';
import type { Side } from '../../engine/types';
import { viewFor } from '../../engine/view';
import { api } from '../api';
import { Board } from '../game/Board';
import type { GameSession } from '../game/session';
import { go, toast } from '../store';

type Data = Awaited<ReturnType<typeof api.replay>>;

export function Replay({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [step, setStep] = useState(0);
  const [pov, setPov] = useState<Side>('US');
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    api.replay(id).then((d) => {
      setData(d);
      setStep(d.history.length);
    }).catch((e) => {
      toast((e as Error).message);
      go('/online');
    });
  }, [id]);

  const session = useMemo<GameSession | null>(() => {
    if (!data) return null;
    return { kind: 'online', view: signal(null), log: signal([]), names: signal(data.names), canUndo: signal(false), choose: () => {}, close: () => {} };
  }, [data]);

  useEffect(() => {
    if (!data || !session) return;
    const g = Game.replay({ seed: data.seed, options: data.options }, data.history.slice(0, step));
    const v = viewFor(g, pov);
    v.decision = undefined;
    session.view.value = v;
    session.log.value = v.log;
  }, [data, step, pov, session]);

  useEffect(() => {
    if (!playing || !data) return;
    const t = setInterval(() => setStep((x) => (x >= data.history.length ? (setPlaying(false), x) : x + 1)), 250);
    return () => clearInterval(t);
  }, [playing, data]);

  if (!data || !session) return <div class="hero"><div class="empty-hint">加载复盘…</div></div>;
  return (
    <>
      <Board session={session} />
      <div class="replay-bar">
        <button type="button" class="btn small" onClick={() => setStep(0)}>⏮</button>
        <button type="button" class="btn small" onClick={() => setStep(Math.max(0, step - 1))}>◀</button>
        <button type="button" class="btn small" onClick={() => setPlaying(!playing)}>{playing ? '⏸' : '▶'}</button>
        <button type="button" class="btn small" onClick={() => setStep(Math.min(data.history.length, step + 1))}>▶</button>
        <input type="range" min={0} max={data.history.length} value={step} onInput={(e) => setStep(Number((e.target as HTMLInputElement).value))} />
        <span>{step}/{data.history.length}</span>
        <div class="seg">
          {(['US', 'USSR'] as Side[]).map((s) => (
            <button type="button" key={s} class={pov === s ? 'on' : ''} onClick={() => setPov(s)}>{s === 'US' ? '美方视角' : '苏方视角'}</button>
          ))}
        </div>
      </div>
    </>
  );
}
