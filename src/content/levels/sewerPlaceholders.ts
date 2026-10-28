import { Frame } from '../assetKeys';
import { sandRatBrain } from '../bosses';
import type { EnemyDef } from '../enemies';

/*
 * PLACEHOLDER: stand-in boss so the Sunken Sewer plays end to end in DEV (`?debug=sewer`). The Mother Sludge phase replaces it
 * (and the `bossId` in `sewer.ts` and the import in `enemies.ts`), then this file can be deleted.
 */

/** The Sand Rat's fight in green. */
export const SEWER_PLACEHOLDER_BOSS: EnemyDef = {
  id: 'sewerPlaceholderBoss',
  name: 'Sludge Rat',
  frame: Frame.serpent,
  baseHp: 1100,
  baseDamage: 16,
  speed: 30,
  behaviour: 'boss',
  lootTableId: 'sandRat',
  tint: 0x7ad88a,
  scale: 3,
  boss: true,
  brain: sandRatBrain,
  slamDamage: 22,
  boltDamage: 9,
  boltSpeed: 95,
};
