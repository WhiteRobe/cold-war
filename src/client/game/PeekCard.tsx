// 悬停看牌：在锚点旁边找块空地展开完整卡面和预估（右边放不下放左边，上下夹在视口内）。
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

export interface PeekAnchor { id: number; left: number; right: number; top: number; bottom: number }

export function PeekCard({ at, children }: { at: PeekAnchor; children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight, gap = 12;
    const W = window.innerWidth, H = window.innerHeight;
    const x = at.right + gap + w <= W - 8 ? at.right + gap : Math.max(8, at.left - gap - w);
    const y = Math.max(8, Math.min(H - h - 8, at.top - 20));
    setPos({ x, y });
  }, [at.id, at.left, at.top]);
  return (
    <div ref={ref} class="peek-card" style={pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : { left: '-9999px', top: '0px', visibility: 'hidden' }} key={at.id}>
      {children}
    </div>
  );
}
