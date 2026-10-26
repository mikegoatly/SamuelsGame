import { expectedLoot } from '../logic/lootValue';
import { roomGoldEstimate, treasureDrops, TREASURE_ROOM_ORDER } from '../logic/treasure';
import { getEnemy } from './enemies';
import { items } from './items';
import { curveOf } from './levels/curve';
import type { LevelConfig } from './levels';
import { lootTables } from './lootTables';

const coinValue = (itemId: string): number => {
  const item = items[itemId];
  return item?.kind === 'coin' ? item.value : 0;
};

/** Average gold of one kill from the level's monster pool, weighted by how often each appears. */
function goldPerKill(level: LevelConfig): number {
  const total = level.enemyPool.reduce((sum, e) => sum + e.weight, 0);
  if (total === 0) return 0;
  return level.enemyPool.reduce((sum, e) => {
    const table = lootTables[getEnemy(e.enemyId).lootTableId];
    return sum + (table ? expectedLoot(table, coinValue).gold : 0) * (e.weight / total);
  }, 0);
}

/** Item ids a treasure chest in this level drops: about one mid-run room's gold and a potion. */
export const treasureItemsFor = (level: LevelConfig): string[] => treasureDrops(roomGoldEstimate(curveOf(level), TREASURE_ROOM_ORDER, goldPerKill(level)));
