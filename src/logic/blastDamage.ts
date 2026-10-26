export const BOSS_BLAST_SHARE = 0.25;
const KNOCKBACK = 1.4;

/** What a monster-made explosion does to another monster: bosses shrug most of it off and are never shoved. */
export function blastHitOnMonster(damage: number, boss: boolean): { damage: number; knockback: number } {
  return boss ? { damage: Math.max(1, Math.round(damage * BOSS_BLAST_SHARE)), knockback: 0 } : { damage, knockback: KNOCKBACK };
}
