// 主播模式：地图底图去掉国界（各洲一整块颜色，苏联西半红、东半并入亚洲），涉及台湾的表述改为「台湾地区」。
import { signal } from '@preact/signals';
import { CARDS, COUNTRIES, bumpWorldVersion } from '../data';
import { STORIES } from '../data/stories';

const KEY = 'cw.streamer';
export const streamer = signal(typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1');

/** 主播模式下的文字替换（地名「台湾海峡」不改） */
export function st(text: string): string {
  return streamer.value ? text.replace(/台湾(?!地区|海峡)/g, '台湾地区') : text;
}

// 原始文字：切换时据此恢复
const orig = {
  country: COUNTRIES.taiwan.zh,
  // 只记涉及台湾的卡（联合国牌等会被不死不休改名的卡不碰）
  cards: Object.fromEntries(Object.values(CARDS).filter((c) => /台湾/.test(c.zh + c.text)).map((c) => [c.id, { zh: c.zh, text: c.text }])),
  stories: { ...STORIES },
};

function applyNames() {
  const on = streamer.value;
  COUNTRIES.taiwan.zh = on ? st(orig.country) : orig.country;
  for (const [id, o] of Object.entries(orig.cards)) {
    const c = CARDS[Number(id)];
    c.zh = on ? st(o.zh) : o.zh;
    c.text = on ? st(o.text) : o.text;
  }
  for (const [k, v] of Object.entries(orig.stories)) (STORIES as Record<string, string>)[k] = on ? st(v) : v;
  // 让依赖国家名、底图的缓存重算
  bumpWorldVersion();
}

export function setStreamer(on: boolean) {
  streamer.value = on;
  localStorage.setItem(KEY, on ? '1' : '0');
  applyNames();
}

applyNames();
