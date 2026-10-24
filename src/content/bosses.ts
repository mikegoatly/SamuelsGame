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
        { kind: 'summon', firstMs: 2000, everyMs: 8000, count: 2, minion: 'bat', levelDrop: 2, maxAlive: 4 },
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
        { kind: 'summon', firstMs: 2500, everyMs: 9000, count: 2, minion: 'scorpion', levelDrop: 3, maxAlive: 4 },
      ],
    },
  },
};

/** Sword lunges along a telegraphed line, spinning blade rings and guard reinforcements; teleports between thrones and fires spirals once wounded. */
export const madKingBrain: BossBrainConfig = {
  phaseTwoAt: 0.5,
  phases: {
    1: {
      speedMultiplier: 1,
      attacks: [
        { kind: 'lunge', firstMs: 4000, cooldownMs: 5000, telegraphMs: 700, dashMs: 400, dashSpeed: 340, width: 18 },
        { kind: 'burst', firstMs: 6500, everyMs: 5200, count: 12 },
        { kind: 'summon', firstMs: 11000, everyMs: 24000, count: 2, minion: 'palaceGuard', levelDrop: 2, maxAlive: 3 },
      ],
    },
    2: {
      speedMultiplier: 1.25,
      attacks: [
        { kind: 'lunge', firstMs: 3000, cooldownMs: 3800, telegraphMs: 600, dashMs: 400, dashSpeed: 360, width: 18 },
        { kind: 'teleport', firstMs: 3500, cooldownMs: 6500, vanishMs: 800, telegraphMs: 800, radius: 52 },
        { kind: 'spiral', firstMs: 5000, everyMs: 5200, count: 24, turns: 2 },
        { kind: 'burst', firstMs: 7000, everyMs: 6500, count: 16 },
        { kind: 'summon', firstMs: 9000, everyMs: 20000, count: 2, minion: 'palaceGuard', levelDrop: 2, maxAlive: 3 },
      ],
    },
  },
};
