import Phaser from 'phaser';
import { getEnemy, type EnemyDef } from '../content/enemies';
import { Boss } from '../entities/Boss';
import { Enemy, type EnemyContext } from '../entities/Enemy';
import { insetRect, rectContains, type Rect } from '../logic/geometry';
import { pickRectSpawn } from '../logic/spawnPoints';

const FADE_IN_MS = 300;
const BOSS_FADE_IN_MS = 700;
const MINION_RADIUS = 36;
const MINION_INSET = 24;

export interface BossArea {
  rect: Rect;
  isBlocked: (x: number, y: number) => boolean;
}

/** Creates enemies into the shared physics group with a fade-in during which they cannot hurt the player. */
export class EnemyFactory {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly group: Phaser.Physics.Arcade.Group,
    private readonly context: EnemyContext,
  ) {}

  spawn(def: EnemyDef, level: number, x: number, y: number): Enemy {
    return this.fadeIn(new Enemy(this.scene, x, y, def, level, this.context), FADE_IN_MS);
  }

  spawnBoss(def: EnemyDef, level: number, x: number, y: number, area: BossArea): Boss {
    const hooks = {
      summon: (id: string, lvl: number, sx: number, sy: number) => {
        const at = this.minionSpot(area, sx, sy);
        this.spawn(getEnemy(id), lvl, at.x, at.y);
      },
    };
    return this.fadeIn(new Boss(this.scene, x, y, def, level, this.context, hooks), BOSS_FADE_IN_MS);
  }

  /** A free spot next to the boss inside the arena; falls back to anywhere free in the arena. */
  private minionSpot(area: BossArea, x: number, y: number): { x: number; y: number } {
    const inner = insetRect(area.rect, MINION_INSET);
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const spot = { x: x + Math.cos(angle) * MINION_RADIUS, y: y + Math.sin(angle) * MINION_RADIUS };
      if (rectContains(inner, spot) && !area.isBlocked(spot.x, spot.y)) return spot;
    }
    return pickRectSpawn(area.rect, { x, y }, MINION_RADIUS, Math.random, area.isBlocked, MINION_INSET);
  }

  private fadeIn<T extends Enemy>(enemy: T, duration: number): T {
    this.group.add(enemy);
    enemy.setAlpha(0);
    enemy.armed = false;
    this.scene.tweens.add({ targets: enemy, alpha: 1, duration, onComplete: () => (enemy.armed = true) });
    return enemy;
  }
}
