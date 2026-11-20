// 卡牌说明着色用的当前局面：对局页面写入，卡面读取（不在对局里时为空，只画下划线不着色）。
import { signal } from '@preact/signals';
import type { GameView } from '../../engine/view';

export const cardView = signal<GameView | null>(null);

/** 卡牌说明里悬停《卡名》时弹出的卡面（全局一个） */
export const refPeek = signal<{ id: number; x: number; y: number } | null>(null);
