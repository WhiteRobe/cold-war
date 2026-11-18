// 程序合成的背景音乐与音效（Web Audio，无音频文件，离线可用）。
import { signal } from '@preact/signals';

export type Sfx =
  | 'card' | 'place' | 'dice' | 'coupWin' | 'coupFail' | 'defconDown' | 'defconUp'
  | 'vpGood' | 'vpBad' | 'space' | 'scoring' | 'headline' | 'turn' | 'win' | 'lose' | 'click'
  | 'controlGain' | 'controlLose' | 'fog';

export type Track = 'menu' | 'game';

const KEY = 'cw.audio';
export const audioPrefs = signal<{ music: boolean; sfx: boolean }>(
  (() => {
    try {
      return { music: true, sfx: true, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
      return { music: true, sfx: true };
    }
  })(),
);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let unlocked = false;

const MUSIC_VOL = 0.2;
const SFX_VOL = 0.8;

function ac(): AudioContext | null {
  if (!unlocked || typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_VOL;
    sfxBus.connect(master);
    // 共用一段白噪声，鼓和纸牌声都从里面截取，不用每次重新生成
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended' && document.visibilityState === 'visible') ctx.resume().catch(() => {});
  return ctx;
}

export function setAudioPrefs(p: Partial<{ music: boolean; sfx: boolean }>) {
  audioPrefs.value = { ...audioPrefs.value, ...p };
  localStorage.setItem(KEY, JSON.stringify(audioPrefs.value));
  if (p.music !== undefined) syncMusic();
}

function unlock() {
  if (unlocked) return;
  unlocked = true;
  ac();
  syncMusic();
}
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, unlock, { once: true, capture: true });

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {});
  else ctx.resume().catch(() => {});
});

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

// ---------------------------------------------------------------------------
// 基础发声
// ---------------------------------------------------------------------------

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  slide?: number;
  attack?: number;
  release?: number;
  at?: number;
  dest?: AudioNode;
  filter?: number;
}

function tone(freq: number, dur: number, o: ToneOpts = {}) {
  const c = ctx;
  if (!c) return;
  const t = o.at ?? c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * o.slide), t + dur);
  const v = o.vol ?? 0.2;
  const a = o.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.setValueAtTime(v, t + Math.max(a, dur - (o.release ?? dur * 0.6)));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filter;
    osc.connect(f);
    node = f;
  }
  node.connect(g).connect(o.dest ?? sfxBus!);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur: number, o: { vol?: number; freq?: number; q?: number; at?: number; type?: BiquadFilterType; dest?: AudioNode; attack?: number } = {}) {
  const c = ctx;
  if (!c || !noiseBuf) return;
  const t = o.at ?? c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.value = o.freq ?? 1200;
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  const v = o.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(o.dest ?? sfxBus!);
  src.start(t, Math.random() * 1.5, dur + 0.05);
}

// ---------------------------------------------------------------------------
// 音效
// ---------------------------------------------------------------------------

const lastPlayed: Partial<Record<Sfx, number>> = {};

export function sfx(name: Sfx) {
  if (!audioPrefs.value.sfx) return;
  const c = ac();
  if (!c) return;
  const now = c.currentTime;
  // 同一音效 80ms 内不叠加
  if ((lastPlayed[name] ?? -1) > now - 0.08) return;
  lastPlayed[name] = now;
  switch (name) {
    case 'click':
      tone(700, 0.05, { type: 'triangle', vol: 0.05 });
      break;
    case 'card':
      noise(0.12, { freq: 3500, q: 0.6, vol: 0.18 });
      noise(0.08, { freq: 6000, q: 1.5, vol: 0.08, at: now + 0.06 });
      break;
    case 'place':
      tone(1046, 0.07, { type: 'triangle', vol: 0.07 });
      noise(0.03, { freq: 2500, q: 3, vol: 0.08 });
      break;
    case 'dice':
      for (let i = 0; i < 7; i++) noise(0.04, { freq: 2200 + Math.random() * 1600, vol: 0.2, q: 5, at: now + i * 0.055 + Math.random() * 0.02 });
      noise(0.06, { freq: 900, q: 2, vol: 0.15, at: now + 0.42 });
      break;
    case 'coupWin':
      tone(196, 0.18, { type: 'sawtooth', vol: 0.07, filter: 1800, at: now + 0.45 });
      tone(294, 0.18, { type: 'sawtooth', vol: 0.07, filter: 1800, at: now + 0.6 });
      tone(392, 0.45, { type: 'sawtooth', vol: 0.08, filter: 2200, at: now + 0.75 });
      noise(0.25, { freq: 200, vol: 0.25, type: 'lowpass', at: now + 0.45 });
      break;
    case 'coupFail':
      tone(220, 0.25, { type: 'triangle', vol: 0.09, at: now + 0.45 });
      tone(164.8, 0.5, { type: 'triangle', vol: 0.09, at: now + 0.65, slide: 0.94 });
      break;
    case 'defconDown':
      for (let i = 0; i < 3; i++) {
        tone(880, 0.32, { type: 'square', vol: 0.035, slide: 0.7, filter: 2500, at: now + i * 0.38 });
      }
      tone(55, 1.2, { type: 'sawtooth', vol: 0.08, filter: 300, at: now });
      break;
    case 'defconUp':
      tone(392, 0.4, { type: 'sine', vol: 0.08 });
      tone(523, 0.6, { type: 'sine', vol: 0.07, at: now + 0.15 });
      break;
    case 'vpGood':
      tone(392, 0.14, { type: 'sawtooth', vol: 0.06, filter: 1600 });
      tone(523, 0.32, { type: 'sawtooth', vol: 0.07, filter: 2000, at: now + 0.12 });
      break;
    case 'vpBad':
      tone(311, 0.16, { type: 'sawtooth', vol: 0.05, filter: 1200 });
      tone(233, 0.36, { type: 'sawtooth', vol: 0.06, filter: 1000, at: now + 0.13 });
      break;
    case 'space':
      tone(330, 0.9, { type: 'triangle', vol: 0.08, slide: 3 });
      tone(660, 0.6, { type: 'sine', vol: 0.04, slide: 2, at: now + 0.3 });
      noise(0.8, { freq: 500, vol: 0.12, type: 'lowpass', attack: 0.2 });
      break;
    case 'scoring':
      [262, 330, 392].forEach((f, i) => tone(f, 0.7, { type: 'sawtooth', vol: 0.045, filter: 1500, at: now + i * 0.04 }));
      noise(0.5, { freq: 120, vol: 0.25, type: 'lowpass' });
      break;
    case 'headline':
      for (let i = 0; i < 10; i++) noise(0.05, { freq: 1800, q: 1.2, vol: 0.06 + i * 0.012, at: now + i * 0.045 });
      noise(0.3, { freq: 220, vol: 0.3, type: 'lowpass', at: now + 0.47 });
      tone(110, 0.4, { type: 'sine', vol: 0.15, slide: 0.7, at: now + 0.47 });
      break;
    case 'controlGain':
      // 盖章 + 短号角
      noise(0.09, { freq: 160, vol: 0.35, type: 'lowpass' });
      tone(98, 0.18, { type: 'sine', vol: 0.18, slide: 0.6 });
      tone(523, 0.12, { type: 'sawtooth', vol: 0.05, filter: 2200, at: now + 0.1 });
      tone(784, 0.4, { type: 'sawtooth', vol: 0.06, filter: 2600, at: now + 0.2 });
      noise(0.35, { freq: 4500, q: 0.8, vol: 0.04, at: now + 0.12 });
      break;
    case 'controlLose':
      noise(0.09, { freq: 140, vol: 0.3, type: 'lowpass' });
      tone(330, 0.2, { type: 'sawtooth', vol: 0.05, filter: 1200, at: now + 0.08 });
      tone(247, 0.45, { type: 'sawtooth', vol: 0.055, filter: 1000, at: now + 0.22, slide: 0.95 });
      break;
    case 'fog':
      noise(1.6, { freq: 380, q: 0.5, vol: 0.14, type: 'lowpass', attack: 0.5 });
      tone(73, 1.6, { type: 'sine', vol: 0.08, attack: 0.4 });
      break;
    case 'turn':
      tone(587, 0.18, { type: 'sine', vol: 0.08 });
      tone(880, 0.3, { type: 'sine', vol: 0.07, at: now + 0.12 });
      break;
    case 'win':
      [523, 659, 784].forEach((f, i) => tone(f, 0.35, { type: 'sawtooth', vol: 0.06, filter: 2200, at: now + i * 0.18 }));
      [523, 659, 784, 1046].forEach((f) => tone(f, 1.4, { type: 'sawtooth', vol: 0.045, filter: 2400, at: now + 0.55 }));
      noise(0.6, { freq: 150, vol: 0.3, type: 'lowpass', at: now + 0.55 });
      break;
    case 'lose':
      [440, 415, 392, 330].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.08, at: now + i * 0.35 }));
      tone(110, 1.6, { type: 'sawtooth', vol: 0.06, filter: 400, at: now + 1.05 });
      break;
  }
}

// ---------------------------------------------------------------------------
// 背景音乐：lookahead 调度器，按八分音符步进
// ---------------------------------------------------------------------------

interface TrackDef {
  bpm: number;
  /** 每小节一个和弦（MIDI） */
  chords: number[][];
  step(i: number, t: number, dur: number, chord: number[], tense: boolean): void;
}

let padFilter: BiquadFilterNode | null = null;

function pad(chord: number[], t: number, dur: number, vol: number) {
  if (!ctx || !padFilter) return;
  for (const m of chord) {
    for (const det of [-6, 6]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = mtof(m);
      osc.detune.value = det;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
      g.gain.setValueAtTime(vol, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
      osc.connect(g).connect(padFilter);
      osc.start(t);
      osc.stop(t + dur + 0.5);
    }
  }
}

const TRACKS: Record<Track, TrackDef> = {
  // 首页：D 小调，庄重缓慢。i–VI–iv–V
  menu: {
    bpm: 58,
    chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]],
    step(i, t, dur, chord) {
      const bar = Math.floor(i / 8) % 4;
      const s = i % 8;
      const dest = musicBus!;
      if (s === 0) {
        pad(chord, t, dur * 8, 0.035);
        tone(mtof(chord[0] - 12), dur * 7, { type: 'triangle', vol: 0.16, attack: 0.3, dest });
      }
      // 定音鼓
      if (bar === 0 && s === 0) tone(73.4, 1.2, { type: 'sine', vol: 0.22, slide: 0.85, dest });
      if (bar === 2 && s === 4) tone(65.4, 1, { type: 'sine', vol: 0.16, slide: 0.85, dest });
      // 稀疏的号角旋律
      const mel: Record<number, number[]> = { 0: [62, -1, -1, -1, 65, -1, 64, -1], 1: [62, -1, -1, -1, -1, -1, -1, -1], 2: [58, -1, -1, -1, 62, -1, 60, -1], 3: [61, -1, -1, -1, 57, -1, -1, -1] };
      const n = mel[bar][s];
      if (n > 0) tone(mtof(n), dur * 3.5, { type: 'triangle', vol: 0.05, attack: 0.15, dest, filter: 1400 });
      // 第 4 小节末尾的小鼓滚奏
      if (bar === 3 && s >= 6) for (let k = 0; k < 6; k++) noise(0.05, { freq: 1700, q: 1, vol: 0.012 + (s - 6) * 0.01 + k * 0.004, at: t + (k * dur) / 6, dest });
    },
  },
  // 对局：A 小调，紧张的琶音 + 军鼓，DEFCON 2 时加速并加入低音脉冲和警报
  game: {
    bpm: 92,
    chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
    step(i, t, dur, chord, tense) {
      const bar = Math.floor(i / 8) % 4;
      const s = i % 8;
      const dest = musicBus!;
      if (s === 0) pad(chord, t, dur * 8, 0.018);
      // 琶音
      const arp = [0, 1, 2, 1, 0, 2, 1, 2][s];
      tone(mtof(chord[arp] + 12), dur * 0.9, { type: 'triangle', vol: 0.035, release: dur * 0.7, dest, filter: 2400 });
      // 低音
      if (s === 0 || s === 4) tone(mtof(chord[0] - 12), dur * 1.8, { type: 'triangle', vol: 0.13, dest });
      if (tense) tone(mtof(chord[0] - 24), dur * 0.7, { type: 'sawtooth', vol: 0.06, dest, filter: 220 });
      // 军鼓：二、四拍轻击，第 4 小节末滚奏
      if (s === 2 || s === 6) noise(0.09, { freq: 1900, q: 0.9, vol: 0.035, at: t, dest });
      if (s === 7 && bar === 3) for (let k = 1; k < 4; k++) noise(0.04, { freq: 1900, q: 0.9, vol: 0.02 + k * 0.006, at: t + (k * dur) / 4, dest });
      if (s === 0 && bar === 0) noise(0.25, { freq: 120, vol: 0.12, type: 'lowpass', at: t, dest });
      // 警报
      if (tense && s === 0 && bar % 2 === 0) tone(990, dur * 3, { type: 'sine', vol: 0.014, slide: 0.66, dest, attack: 0.05 });
    },
  },
};

let want: Track | null = null;
let current: Track | null = null;
let tense = false;
let timer: ReturnType<typeof setInterval> | undefined;
let nextTime = 0;
let stepIdx = 0;

/** 设置当前应该播放的曲目（null 表示静音） */
export function setMusicTrack(t: Track | null) {
  want = t;
  syncMusic();
}

export function setTension(on: boolean) {
  tense = on;
}

function syncMusic() {
  const target = audioPrefs.value.music ? want : null;
  if (!unlocked) return;
  const c = ac();
  if (!c || !musicBus) return;
  if (target === current && (target === null || timer)) return;
  const now = c.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value, now);
  musicBus.gain.linearRampToValueAtTime(0, now + 0.6);
  clearInterval(timer);
  timer = undefined;
  current = target;
  if (!target) return;
  setTimeout(() => {
    if (current !== target || !ctx || !musicBus) return;
    if (!padFilter) {
      padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 900;
      padFilter.Q.value = 0.5;
      padFilter.connect(musicBus);
    }
    nextTime = ctx.currentTime + 0.1;
    stepIdx = 0;
    const g = musicBus.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(0, ctx.currentTime);
    g.linearRampToValueAtTime(MUSIC_VOL, ctx.currentTime + 2);
    clearInterval(timer);
    timer = setInterval(tick, 60);
    tick();
  }, 650);
}

function tick() {
  if (!ctx || !current) return;
  if (ctx.state !== 'running') return;
  const def = TRACKS[current];
  // 页面在后台恢复后不要一次补一大串
  if (nextTime < ctx.currentTime - 0.5) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.3) {
    const bpm = def.bpm * (tense && current === 'game' ? 1.2 : 1);
    const dur = 60 / bpm / 2;
    const chord = def.chords[Math.floor(stepIdx / 8) % def.chords.length];
    def.step(stepIdx, nextTime, dur, chord, tense && current === 'game');
    nextTime += dur;
    stepIdx = (stepIdx + 1) % (8 * def.chords.length);
  }
}
