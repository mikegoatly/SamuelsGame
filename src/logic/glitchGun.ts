import { BOW_SPREAD, PIERCE_EXTRA_ENEMIES } from './weaponTwists';

export type GlitchTwistId = 'pierce' | 'split' | 'heavy' | 'spread';

export interface GlitchTwist {
  id: GlitchTwistId;
  weight: number;
  /** Bolt colour: tells the player what this shot does. */
  tint: number;
  /** Damage multiplier on the shot's main bolt. */
  damageScale: number;
  /** Extra enemies the bolt passes through. */
  pierce: number;
  splits: boolean;
  /** Fires a fan of three (side bolts at BOW_SPREAD damage). */
  spread: boolean;
  /** Average enemies one shot hurts in a crowd (for the balance model). */
  crowdTargets: number;
}

/** Twists borrowed from the staff (pierce), wand (split), bow (spread) and a plain heavy hit. Heavy is best on one target, the others in crowds, so none is strictly best. */
export const GLITCH_TWISTS: readonly GlitchTwist[] = [
  { id: 'pierce', weight: 1, tint: 0x60e0ff, damageScale: 1, pierce: PIERCE_EXTRA_ENEMIES + 2, splits: false, spread: false, crowdTargets: 1.6 },
  { id: 'split', weight: 1, tint: 0xb07cff, damageScale: 1, pierce: 0, splits: true, spread: false, crowdTargets: 1.5 },
  { id: 'heavy', weight: 1, tint: 0xff6a6a, damageScale: 1.8, pierce: 0, splits: false, spread: false, crowdTargets: 1 },
  { id: 'spread', weight: 1, tint: 0xffd860, damageScale: 1, pierce: 0, splits: false, spread: true, crowdTargets: 1.3 },
];

export const GLITCH_SIDE_DAMAGE = BOW_SPREAD.sideDamageScale;

const totalWeight = GLITCH_TWISTS.reduce((sum, t) => sum + t.weight, 0);

/** One roll per shot. */
export function rollGlitchTwist(rng: () => number): GlitchTwist {
  let pick = rng() * totalWeight;
  for (const twist of GLITCH_TWISTS) {
    pick -= twist.weight;
    if (pick < 0) return twist;
  }
  return GLITCH_TWISTS[GLITCH_TWISTS.length - 1]!;
}

const average = (value: (t: GlitchTwist) => number): number => GLITCH_TWISTS.reduce((sum, t) => sum + t.weight * value(t), 0) / totalWeight;

/** Expected damage multiplier against one target (the main bolt only). */
export const glitchDpsFactor = (): number => average((t) => t.damageScale);

/** Expected enemies hurt per shot in a crowd. */
export const glitchTargets = (): number => average((t) => t.crowdTargets);
