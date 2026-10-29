import { strikeAt } from '../strikes';
import Phaser from 'phaser';
import type { CloudSkill } from '../../content/skills';
import type { Enemy } from '../../entities/Enemy';
import { aimPoint } from '../../logic/aimPoint';
import { DotTracker } from '../../logic/dot';
import { playSfx } from '../sfx';
import { dotEnemy, runOver } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';
import { zonesFor } from './ZoneField';

const POISON = 0x7adf4a;
const REFRESH_MS = 120;
const LINGER_MS = 900;

/** Poison Cloud: a lingering cloud that poisons enemies inside; one poison per enemy (refreshed, never stacked) keeps ticking briefly after they leave. Level 5: the cloud follows the hero. */
export class PoisonCloudCaster implements SkillCaster<CloudSkill> {
  private readonly poison = new DotTracker<Enemy>();
  private damage = 0;

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  cast({ x, y, aim, params }: CastCall<CloudSkill>): boolean {
    const { player, scene, clock, isSolid } = this.world;
    const centre = params.twist ? { x: player.x, y: player.y } : aimPoint({ x, y }, aim, params.range, isSolid);
    this.damage = params.damagePerTick;
    zonesFor(this.world).spawn({
      ...centre,
      radius: params.radius,
      durationMs: params.durationMs,
      tickMs: REFRESH_MS,
      color: POISON,
      follow: params.twist,
      onTick: (enemy) => this.poison.apply(enemy, clock.now, LINGER_MS, params.tickMs),
    });
    strikeAt(scene, centre.x, centre.y, params.radius);
    playSfx(scene, 'poison');
    return true;
  }

  private update(): void {
    if (runOver(this.world)) {
      this.poison.clear();
      return;
    }
    for (const enemy of this.poison.due(this.world.clock.now)) {
      if (!enemy.active || !enemy.alive) this.poison.remove(enemy);
      else dotEnemy(this.world, enemy, this.damage);
    }
  }
}
