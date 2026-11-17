import type { RegionId } from '../../data';
import type { Effect } from '.';

const region = (r: RegionId): Effect => ({
  *run(g) {
    g.scoreRegionCard(r);
  },
});

export const SCORING: Record<number, Effect> = {
  1: region('asia'),
  2: region('europe'),
  3: region('middleEast'),
  37: region('centralAmerica'),
  38: {
    *run(g) {
      g.scoreSEACard();
    },
  },
  79: region('africa'),
  81: region('southAmerica'),
};
