import { getEnemy } from '../content/enemies';
import type { Player } from '../entities/Player';
import type { Affix } from '../logic/elites';
import type { EnemyFactory } from './EnemyFactory';

/** Dev builds only: `window.__spawn('wisp', level, dx, dy, 'swift')` drops a monster next to the player for testing. */
export function exposeSpawner(factory: EnemyFactory, player: Player): void {
  if (!import.meta.env.DEV) return;
  (window as unknown as { __spawn: unknown }).__spawn = (id: string, level = 1, dx = 60, dy = 0, affix?: Affix) =>
    factory.spawnGroup(getEnemy(id), level, player.x + dx, player.y + dy, affix).length;
}

/** Dev builds only: `window.__spawnBoss('bert', 17)` starts a boss fight in a 320x256 arena centred on the player (for trying Bert without a level). */
export function exposeBossSpawner(factory: EnemyFactory, player: Player): void {
  if (!import.meta.env.DEV) return;
  (window as unknown as { __spawnBoss: unknown }).__spawnBoss = (id: string, level = 17) => {
    const rect = { x: player.x - 160, y: player.y - 128, w: 320, h: 256 };
    factory.spawnBoss(getEnemy(id), level, player.x, player.y - 80, { rect, thrones: [], isBlocked: () => false });
  };
}
