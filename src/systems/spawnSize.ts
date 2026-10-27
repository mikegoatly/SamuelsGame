import { getEnemy } from '../content/enemies';
import { expectedGroupSize } from '../logic/groupSize';

/** Expected number of monsters an arrival of this enemy brings (for the alive cap). */
export function spawnSize(enemyId: string): number {
  const { pack } = getEnemy(enemyId);
  return expectedGroupSize(pack, pack ? getEnemy(pack.member).custom === 'twin' : false);
}
