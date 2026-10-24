import type { BossBrainConfig } from '../logic/bossBrain';

export const stoneGuardianBrain: BossBrainConfig = {
  phaseTwoAt: 0.5,
  phases: {
    1: {
      speedMultiplier: 1,
      attacks: [
        { kind: 'slam', firstMs: 3000, cooldownMs: 3500, telegraphMs: 800, radius: 60 },
        { kind: 'burst', firstMs: 4000, everyMs: 4000, count: 8 },
      ],
    },
    2: {
      speedMultiplier: 1.5,
      attacks: [
        { kind: 'slam', firstMs: 3000, cooldownMs: 2400, telegraphMs: 800, radius: 60 },
        { kind: 'burst', firstMs: 4000, everyMs: 3500, count: 12 },
        { kind: 'summon', firstMs: 2000, everyMs: 8000, count: 2, minion: 'bat', levelDrop: 2 },
      ],
    },
  },
};

/** Burrows under the sand and erupts beneath the player, spits fans of sand; calls scorpions once wounded. */
export const sandWyrmBrain: BossBrainConfig = {
  phaseTwoAt: 0.5,
  phases: {
    1: {
      speedMultiplier: 1,
      attacks: [
        { kind: 'burrow', firstMs: 5000, cooldownMs: 7000, travelMs: 1600, telegraphMs: 900, radius: 48 },
        { kind: 'spit', firstMs: 2500, everyMs: 3200, count: 3, arc: 0.55 },
      ],
    },
    2: {
      speedMultiplier: 1.35,
      attacks: [
        { kind: 'burrow', firstMs: 3000, cooldownMs: 5000, travelMs: 1300, telegraphMs: 800, radius: 52 },
        { kind: 'spit', firstMs: 2000, everyMs: 2600, count: 5, arc: 0.9 },
        { kind: 'summon', firstMs: 2500, everyMs: 9000, count: 2, minion: 'scorpion', levelDrop: 3 },
      ],
    },
  },
};
