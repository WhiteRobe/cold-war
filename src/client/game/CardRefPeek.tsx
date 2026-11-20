// 卡牌说明里悬停《卡名》时，在鼠标旁边弹出被引用的那张卡（挂在页面最外层，盖在所有弹窗上面）。
import { CardFace } from './CardFace';
import { refPeek } from './cardCtx';

export function CardRefPeek() {
  const p = refPeek.value;
  if (!p) return null;
  const W = 260, H = 380;
  const left = p.x + 16 + W > window.innerWidth ? p.x - 16 - W : p.x + 16;
  const top = Math.max(8, Math.min(window.innerHeight - H - 8, p.y - 40));
  return (
    <div class="ref-peek" style={{ left: `${Math.max(8, left)}px`, top: `${top}px`, width: `${W}px` }}>
      <CardFace id={p.id} />
    </div>
  );
}
