import { CARD_LIST, CHINA_CARD } from '../src/data';
import type { GameState } from '../src/engine/types';

export function checkInvariants(s: GameState) {
  for (const [c, [a, b]] of Object.entries(s.inf)) if (a < 0 || b < 0) throw new Error(`影响力为负：${c}`);
  if (s.defcon < 1 || s.defcon > 5) throw new Error(`DEFCON 越界 ${s.defcon}`);
  const all = [...s.deck, ...s.discard, ...s.removed, ...s.hands.US, ...s.hands.USSR, ...s.inPlay, ...Object.values(s.headline)];
  if (s.playing && s.playing.card !== CHINA_CARD) all.push(s.playing.card);
  const seen = new Set<number>();
  for (const c of all) {
    if (c === CHINA_CARD) throw new Error('中国牌出现在牌区');
    if (seen.has(c) && c !== s.playing?.card) throw new Error(`牌重复：${c}`);
    seen.add(c);
  }
  void CARD_LIST;
}
