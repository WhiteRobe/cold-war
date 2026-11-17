import { CARDS, COUNTRIES } from '../data';
import type { Side } from './types';

export class GameOver extends Error {
  constructor(public winner: Side | null, public reason: string) {
    super(reason);
  }
}

export const cardName = (id: number) => `#${id} ${CARDS[id].zh}`;
export const countryName = (c: string) => (c === 'usa' ? '美国' : c === 'ussr' ? '苏联' : COUNTRIES[c].zh);
