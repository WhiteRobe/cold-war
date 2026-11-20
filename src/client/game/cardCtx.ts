// 卡牌说明着色用的当前局面：对局页面写入，卡面读取（不在对局里时为空，只画下划线不着色）。
import { signal } from '@preact/signals';
import type { GameView } from '../../engine/view';

export const cardView = signal<GameView | null>(null);
