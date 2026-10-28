import type { BossBrainConfig } from '../logic/bossBrain';

export const stoneGuardianBrain: BossBrainConfig = {
  phaseTwoAt: 0.5,
  phases: {
    1: {
      speedMultiplier: 1,
      attacks: [
        { kind: 'slam', firstMs: 3000, cooldownMs: 3000, telegraphMs: 800, radius: 60 },
        { kind: 'burst', firstMs: 4000, everyMs: 3400, count: 8 },
      ],
    },
    2: {
      speedMultiplier: 1.5,
      attacks: [
        { kind: 'slam', firstMs: 3000, cooldownMs: 2000, telegraphMs: 800, radius: 60 },
        { kind: 'burst', firstMs: 4000, everyMs: 3000, count: 12 },
        { kind: 'summon', firstMs: 2000, everyMs: 8000, count: 2, minion: 'bat', levelDrop: 2, maxAlive: 4 },
      ],
    },
  },
};

/** Burrows under the sand and erupts beneath the player, spits fans of sand; calls scorpions once wounded. */
export const sandRatBrain: BossBrainConfig = {
  phaseTwoAt: 0.5,
  phases: {
    1: {
      speedMultiplier: 1,
      attacks: [
        { kind: 'burrow', firstMs: 5000, cooldownMs: 6200, travelMs: 1600, telegraphMs: 900, radius: 48 },
        { kind: 'spit', firstMs: 2500, everyMs: 2800, count: 3, arc: 0.55 },
      ],
    },
    2: {
      speedMultiplier: 1.35,
      attacks: [
        { kind: 'burrow', firstMs: 3000, cooldownMs: 4400, travelMs: 1300, telegraphMs: 800, radius: 52 },
        { kind: 'spit', firstMs: 2000, everyMs: 2200, count: 5, arc: 0.9 },
        { kind: 'summon', firstMs: 2500, everyMs: 9000, count: 2, minion: 'scorpion', levelDrop: 3, maxAlive: 4 },
      ],
    },
  },
};

/** Lunge combos, dense blade rings and double spirals; below half health it teleports and fires seeking bolts instead of spirals. */
export const madKingBrain: BossBrainConfig = {
  phaseTwoAt: 0.5,
  phases: {
    1: {
      speedMultiplier: 1.1,
      attacks: [
        { kind: 'lunge', firstMs: 4000, cooldownMs: 5200, telegraphMs: 650, dashMs: 400, dashSpeed: 340, width: 18, lunges: 3, chainTelegraphMs: 500 },
        { kind: 'burst', firstMs: 5000, everyMs: 3600, count: 16 },
        { kind: 'spiral', firstMs: 8000, everyMs: 7000, count: 14, turns: 2, arms: 2 },
        { kind: 'summon', firstMs: 11000, everyMs: 24000, count: 2, minion: 'palaceGuard', levelDrop: 2, maxAlive: 3 },
      ],
    },
    2: {
      speedMultiplier: 1.3,
      attacks: [
        { kind: 'lunge', firstMs: 3000, cooldownMs: 4000, telegraphMs: 600, dashMs: 400, dashSpeed: 360, width: 18, lunges: 2, chainTelegraphMs: 450 },
        { kind: 'teleport', firstMs: 3500, cooldownMs: 6500, vanishMs: 800, telegraphMs: 800, radius: 52 },
        { kind: 'seek', firstMs: 2500, everyMs: 2800, count: 6, turnRate: 1.3, lifeMs: 3200, speedFactor: 0.8 },
        { kind: 'burst', firstMs: 6000, everyMs: 6000, count: 12 },
        { kind: 'summon', firstMs: 9000, everyMs: 20000, count: 2, minion: 'palaceGuard', levelDrop: 2, maxAlive: 3 },
      ],
    },
  },
};

/** Mother Sludge: leaps with a growing shadow, spits a fan of slow globs after a warning stance and calls two blobs now and then. She splits at 66% (see logic/bossSplit), so there is one phase. */
export const motherSludgeBrain: BossBrainConfig = (() => {
  const phase = {
    speedMultiplier: 1,
    attacks: [
      { kind: 'hop' as const, firstMs: 3500, cooldownMs: 4200, telegraphMs: 1100, flightMs: 450, radius: 46 },
      { kind: 'spit' as const, firstMs: 2500, everyMs: 5200, count: 5, arc: 1.2, windupMs: 800 },
      { kind: 'summon' as const, firstMs: 9000, everyMs: 20000, count: 2, minion: 'sludgeBlob', levelDrop: 2, maxAlive: 4 },
    ],
  };
  return { phaseTwoAt: 0, phases: { 1: phase, 2: phase } };
})();

const hopAndSpit = (hop: { firstMs: number; cooldownMs: number; telegraphMs: number; flightMs: number; radius: number }, spit: { firstMs: number; everyMs: number; count: number; arc: number; windupMs: number }): BossBrainConfig => {
  const phase = { speedMultiplier: 1, attacks: [{ kind: 'hop' as const, ...hop }, { kind: 'spit' as const, ...spit }] };
  return { phaseTwoAt: 0, phases: { 1: phase, 2: phase } };
};

/** The two halves: quicker hops, a smaller fan of globs, no summoning. */
export const sludgelingBrain = hopAndSpit(
  { firstMs: 2500, cooldownMs: 3800, telegraphMs: 900, flightMs: 400, radius: 34 },
  { firstMs: 4000, everyMs: 4800, count: 3, arc: 0.8, windupMs: 700 },
);

/** The four small ones: the fastest hoppers, a thin spit. */
export const sludgeletBrain = hopAndSpit(
  { firstMs: 2200, cooldownMs: 3800, telegraphMs: 800, flightMs: 350, radius: 26 },
  { firstMs: 4200, everyMs: 5200, count: 3, arc: 0.5, windupMs: 650 },
);
