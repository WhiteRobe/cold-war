/** mulberry32：状态是一个 uint32，可直接存进 JSON 状态。 */
export function nextRandom(state: { rng: number; rngCount: number }): number {
  state.rngCount++;
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(state: { rng: number; rngCount: number }, n: number): number {
  return Math.floor(nextRandom(state) * n);
}

export function shuffle<T>(state: { rng: number; rngCount: number }, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(state, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
