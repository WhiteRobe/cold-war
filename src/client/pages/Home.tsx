import { useState } from 'preact/hooks';
import { AI_LEVEL_ZH, type AiLevel } from '../../ai';
import { DEFAULT_OPTIONS, type Side } from '../../engine/types';
import { deleteSave, listSaves, newSave } from '../game/offline';
import { StrengthBar } from './StrengthBar';
import { go, toast } from '../store';
import { coachOn, resetCoach, setCoach } from '../game/Coach';
import { AudioToggles } from '../game/Board';

export function Home() {
  const [side, setSide] = useState<Side | 'random'>('USSR');
  const [level, setLevel] = useState<AiLevel>(2);
  const [optional, setOptional] = useState(true);
  const [bonus, setBonus] = useState(2);
  const [saves, setSaves] = useState(listSaves());

  const start = () => {
    const human: Side = side === 'random' ? (Math.random() < 0.5 ? 'US' : 'USSR') : side;
    const s = newSave(human, level, { ...DEFAULT_OPTIONS, optionalCards: optional, usBonus: bonus });
    go(`/offline/${s.id}`);
  };

  const tutorial = () => {
    resetCoach();
    const s = newSave('USSR', 1, { ...DEFAULT_OPTIONS }, true);
    go(`/offline/${s.id}`);
  };

  return (
    <div class="home">
      <div class="home-audio"><AudioToggles musicOnly /></div>
      <div class="home-hero">
        <div class="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64"><polygon points="32,4 4,32 32,32" fill="#2f5d8a" /><polygon points="32,4 60,32 32,32" fill="#3d73a8" /><polygon points="4,32 32,60 32,32" fill="#b23a2e" /><polygon points="60,32 32,60 32,32" fill="#8f2c23" /><circle cx="32" cy="32" r="7" fill="#e9dfc7" /></svg>
        </div>
        <h1>冷战热斗</h1>
        <div class="subtitle">Twilight Struggle · 1945–1989 · 双人策略</div>
      </div>

      <StrengthBar />

      <section class="panel tutorial-panel">
        <div>
          <h2>第一次玩？</h2>
          <p>
            开一局新手教程：你执苏联，对手是最简单的 AI。每遇到一个新情况，都会弹出提示讲清楚规则和界面；
            会让你当场输掉的操作也会先问一句。完整规则可以看<a href="#/rules">规则摘要</a>。
          </p>
        </div>
        <div class="tutorial-actions">
          <button type="button" class="btn primary big" onClick={tutorial}>开始新手教程</button>
          <label class="check">
            <input type="checkbox" checked={coachOn.value} onChange={(e) => setCoach((e.target as HTMLInputElement).checked)} />
            普通对局也显示新手提示
          </label>
          <button type="button" class="btn small ghost" onClick={() => { resetCoach(); toast('新手提示已重置，会从头再显示一遍'); }}>重置新手提示</button>
        </div>
      </section>

      <div class="home-grid">
        <section class="panel">
          <h2>人机对战（离线）</h2>
          <div class="field">
            <label>我的阵营</label>
            <div class="seg">
              {(['USSR', 'US', 'random'] as const).map((s) => (
                <button type="button" key={s} class={side === s ? 'on' : ''} onClick={() => setSide(s)}>
                  {s === 'US' ? '美国' : s === 'USSR' ? '苏联' : '随机'}
                </button>
              ))}
            </div>
          </div>
          <div class="field">
            <label>AI 难度</label>
            <div class="seg">
              {([1, 2, 3] as AiLevel[]).map((l) => (
                <button type="button" key={l} class={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{AI_LEVEL_ZH[l]}</button>
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
          <label class="check">
            <input type="checkbox" checked={optional} onChange={(e) => setOptional((e.target as HTMLInputElement).checked)} />
            加入可选卡 #104–110（20 周年版默认）
          </label>
          <button type="button" class="btn primary big" onClick={start}>开始新对局</button>
          <p class="note">离线对局保存在本机浏览器，可随时退出、之后继续。断网也能玩。</p>
        </section>

        <section class="panel">
          <h2>继续对局</h2>
          {!saves.length && <div class="empty-hint">还没有存档</div>}
          <div class="saves">
            {saves.map((s) => (
              <div key={s.id} class="save-row">
                <button type="button" class="save-main" onClick={() => go(`/offline/${s.id}`)}>
                  <span class={`save-side ${s.human.toLowerCase()}`}>{s.human === 'US' ? '美' : '苏'}</span>
                  <span>
                    对 AI·{AI_LEVEL_ZH[s.ai]} · 第 {s.summary.turn} 回合 · VP {s.summary.vp > 0 ? `美+${s.summary.vp}` : s.summary.vp < 0 ? `苏+${-s.summary.vp}` : 0}
                    {s.summary.over && (s.summary.winner === s.human ? ' · 胜' : s.summary.winner ? ' · 负' : ' · 平')}
                  </span>
                  <small>{new Date(s.updatedAt).toLocaleString('zh-CN', { hour12: false })}</small>
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  title="删除"
                  onClick={() => {
                    if (confirm('删除这个存档？')) {
                      deleteSave(s.id);
                      setSaves(listSaves());
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        <section class="panel">
          <h2>在线对战</h2>
          <p>和朋友在线对局：建房后把房间码发给对方。也可以在线和 AI 打。</p>
          <button type="button" class="btn big" onClick={() => go('/online')}>进入大厅</button>
          <div class="links">
            <a href="#/rules">规则摘要</a>
            <a href="#/cards">卡牌图鉴</a>
          </div>
        </section>
      </div>
      <footer class="home-foot">
        非商业自用复刻。《Twilight Struggle》规则与卡牌文本版权归 GMT Games；本站美术为原创 low poly 插画。
      </footer>
    </div>
  );
}
