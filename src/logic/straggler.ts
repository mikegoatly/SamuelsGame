import { availablePool, type EnemyInfo, type LevelCurve, type PoolEntry, type WaveSpawn } from './waveMix';
import type { LevelRange } from './waves';
import { pickWeighted } from './weighted';

const MAX_STRAGGLER_COST = 2;

/** One small monster for the overtime trickle: cheap ones from what the room can currently field, at the room's top level. */
export function stragglerOf(pool: readonly PoolEntry[], curve: LevelCurve, order: number, levels: LevelRange, info: (id: string) => EnemyInfo, rng: () => number): WaveSpawn {
  const available = availablePool(pool, curve, order);
  const cheap = available.filter((e) => info(e.enemyId).cost <= MAX_STRAGGLER_COST);
  const pick = pickWeighted(cheap.length > 0 ? cheap : available, rng) ?? available[0];
  if (!pick) throw new Error('no monsters available for a straggler');
  return { enemyId: pick.enemyId, level: levels[1], role: info(pick.enemyId).role };
}
