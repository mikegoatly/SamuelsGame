import type { PoolEntry } from './waveMix';

export interface PoolSource {
  id: string;
  boss?: boolean;
  baseHp: number;
  baseDamage: number;
  speed: number;
  behaviour: string;
  splitInto?: { id: string };
}

/** Rooms of Glitch: monsters are held back by difficulty so the last tier only joins in the final rooms. */
export const GLITCH_ROOMS = 6;
const TIERS = 5;
const TOP_WEIGHT = 4;

/** A rough threat score: tougher, harder-hitting, faster monsters and scripted ones (custom behaviours) rank higher. */
export const threat = (def: PoolSource): number => def.baseHp + def.baseDamage * 3 + def.speed / 2 + (def.behaviour === 'custom' ? 25 : 0);

/** Every non-boss monster except the pieces a monster splits into (they only ever appear by splitting), easiest to hardest. The easy ones debut in room 1 with the biggest weight; each harder tier joins a room later and weighs less (so the early rooms stay simple, the late ones mix everything). */
export function glitchPool(defs: readonly PoolSource[]): PoolEntry[] {
  const splitPieces = new Set(defs.flatMap((def) => (def.splitInto ? [def.splitInto.id] : [])));
  const ranked = defs
    .filter((def) => !def.boss && !splitPieces.has(def.id))
    .map((def) => ({ def, power: threat(def) }))
    .sort((a, b) => a.power - b.power || a.def.id.localeCompare(b.def.id));
  const last = Math.max(1, ranked.length - 1);
  return ranked.map(({ def }, i) => {
    const tier = Math.min(TIERS - 1, Math.floor((i / last) * TIERS));
    return { enemyId: def.id, weight: TOP_WEIGHT - Math.min(TOP_WEIGHT - 1, Math.floor((tier * (TOP_WEIGHT - 1)) / (TIERS - 1))), fromRoom: 1 + tier };
  });
}
