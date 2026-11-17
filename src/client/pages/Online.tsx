import { go } from '../store';

export function Online() {
  return (
    <div class="page">
      <header class="page-top">
        <button type="button" class="icon-btn" onClick={() => go('/')}>←</button>
        <h1>在线大厅</h1>
      </header>
      <div class="empty-hint">在线对战开发中</div>
    </div>
  );
}
