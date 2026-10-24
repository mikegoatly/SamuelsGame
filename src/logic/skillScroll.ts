/** Chance per kill that a skill scroll drops. */
export const SCROLL_CHANCE = { normal: 0.005, boss: 0.03 } as const;

/** A random skill the player does not own yet, or null when they own them all. */
export function pickScrollSkill(allIds: readonly string[], ownedIds: readonly string[], rng: () => number): string | null {
  const unowned = allIds.filter((id) => !ownedIds.includes(id));
  if (unowned.length === 0) return null;
  return unowned[Math.min(unowned.length - 1, Math.floor(rng() * unowned.length))] ?? null;
}

export function rollSkillScroll(chance: number, allIds: readonly string[], ownedIds: readonly string[], rng: () => number): string | null {
  if (rng() >= chance) return null;
  return pickScrollSkill(allIds, ownedIds, rng);
}
