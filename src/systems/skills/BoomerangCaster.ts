import Phaser from 'phaser';
import { Frame, Tex } from '../../content/assetKeys';
import type { BoomerangSkill } from '../../content/skills';
import type { Enemy } from '../../entities/Enemy';
import { HitOnce, launchBlade, stepBlade, type BladeState } from '../../logic/boomerang';
import { spreadDirections } from '../../logic/enemyAi';
import { playSfx } from '../sfx';
import { sparkBurst } from './skillFx';
import { lineClear } from '../../logic/lineOfSight';
import { hurtEnemy, liveEnemies, runOver } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';

const BLADE = 0xd0d8e8;
const HIT_REACH = 7;
const CATCH_RADIUS = 8;
const SPIN = 0.04;
const V_ARC = 0.9;
const MAX_STEP_MS = 33;

interface Flight {
  blade: BladeState;
  origin: { x: number; y: number };
  dir: { x: number; y: number };
  params: BoomerangSkill['params'][number];
  sprite: Phaser.GameObjects.Image;
  hits: HitOnce<Enemy>;
}

/** Boomerang Blade: flies out along the aim, turns at max range or a wall and homes back to the hero; each enemy is cut once per pass. Level 5 throws two blades in a V. */
export class BoomerangCaster implements SkillCaster<BoomerangSkill> {
  private readonly flights = new Set<Flight>();

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  cast({ x, y, aim, params }: CastCall<BoomerangSkill>): boolean {
    const dirs = params.twist ? spreadDirections(aim.x, aim.y, 2, V_ARC) : [{ x: aim.x, y: aim.y }];
    for (const dir of dirs) {
      const sprite = this.world.scene.add.image(x, y, Tex.tiles, Frame.blade).setTint(BLADE).setDepth(9).setScale(1.3);
      this.flights.add({ blade: launchBlade({ x, y }), origin: { x, y }, dir, params, sprite, hits: new HitOnce() });
    }
    playSfx(this.world.scene, 'swing', { rate: 1.2 });
    return true;
  }

  private update(_time: number, delta: number): void {
    const { player } = this.world;
    for (const flight of [...this.flights]) {
      const { sprite, params } = flight;
      const was = flight.blade.phase;
      flight.blade = stepBlade(
        flight.blade,
        { dir: flight.dir, target: player, distance: (params.speed * Math.min(delta, MAX_STEP_MS)) / 1000, range: params.range, blocked: this.world.isSolid, catchRadius: CATCH_RADIUS },
        flight.origin,
      );
      if (runOver(this.world) || flight.blade.done) {
        sprite.destroy();
        this.flights.delete(flight);
        continue;
      }
      if (was !== flight.blade.phase) sparkBurst(this.world.scene, flight.blade.x, flight.blade.y, BLADE, 5, 40);
      sprite.setPosition(flight.blade.x, flight.blade.y).rotation += SPIN * delta;
      this.cut(flight);
    }
  }

  private cut(flight: Flight): void {
    const { blade, params } = flight;
    for (const enemy of liveEnemies(this.world.enemies)) {
      if (Phaser.Math.Distance.Between(blade.x, blade.y, enemy.x, enemy.y) > enemy.displayWidth / 2 + HIT_REACH || !lineClear(blade, enemy, this.world.isSolid) || !flight.hits.claim(blade.phase, enemy)) continue;
      hurtEnemy(this.world, enemy, params.damage, blade.x, blade.y, 1, 0.8);
      sparkBurst(this.world.scene, enemy.x, enemy.y, BLADE, 4, 40);
      playSfx(this.world.scene, 'swordHit');
    }
  }
}
