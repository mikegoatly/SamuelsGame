import type { EnemyInfo } from '../logic/waveMix';
import type { EnemyDef } from './enemies';

const TANK_HP = 50;

/** How the wave planner sees a monster: tanks cost more and take the front, shooters hang back. */
export function enemyInfo(def: EnemyDef): EnemyInfo {
  const shooter = def.behaviour === 'ranged' || def.behaviour === 'mage';
  const tank = def.baseHp >= TANK_HP || def.shield !== undefined;
  return {
    cost: def.cost ?? (tank ? 2 : 1),
    role: def.placement ?? (shooter ? 'back' : tank ? 'front' : 'any'),
    eliteOk: !def.boss && def.eliteOk !== false,
  };
}
