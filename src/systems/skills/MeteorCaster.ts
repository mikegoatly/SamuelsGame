import { strikeAt } from '../strikes';
import Phaser from 'phaser';
import { Tex } from '../../content/assetKeys';
import type { MeteorSkill } from '../../content/skills';
import { aimPoint } from '../../logic/aimPoint';
import { fireballVictims } from '../../logic/fireball';
import { lineClear } from '../../logic/lineOfSight';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { explosionBlast, sparkBurst } from './skillFx';
import { asTargets, dotEnemy, hurtEnemy, liveEnemies, runOver } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';
import { zonesFor } from './ZoneField';

const FIRE = 0xff5a2a;
const FALL_HEIGHT = 150;
const BURN_MS = 3000;
const BURN_TICK_MS = 500;
const BURN_DAMAGE = 0.12;
const BURN_RADIUS = 0.8;

interface Falling {
  x: number;
  y: number;
  startedAt: number;
  params: MeteorSkill['params'][number];
  objects: Phaser.GameObjects.GameObject[];
  fill: Phaser.GameObjects.Arc;
  rock: Phaser.GameObjects.Image;
}

/** Meteor: marks the ground at the aim point, lands a second later (on the pause-safe clock) for a big blast. Level 5 leaves burning ground. */
export class MeteorCaster implements SkillCaster<MeteorSkill> {
  private readonly falling = new Set<Falling>();

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  cast({ x, y, aim, params }: CastCall<MeteorSkill>): boolean {
    const { scene, clock, isSolid } = this.world;
    const at = aimPoint({ x, y }, aim, params.range, isSolid);
    const mark = scene.add.circle(at.x, at.y, params.radius, FIRE, 0.1).setStrokeStyle(2, FIRE, 0.9).setDepth(2);
    const fill = scene.add.circle(at.x, at.y, params.radius, FIRE, 0.3).setDepth(2).setScale(0.05);
    const rock = scene.add.image(at.x, at.y - FALL_HEIGHT, Tex.fireball).setTint(0xffa060).setScale(2.4).setDepth(12);
    this.falling.add({ ...at, startedAt: clock.now, params, objects: [mark, fill, rock], fill, rock });
    playSfx(scene, 'meteorFall');
    return true;
  }

  private update(): void {
    const { clock } = this.world;
    const over = runOver(this.world);
    for (const item of [...this.falling]) {
      if (over) {
        this.falling.delete(item);
        item.objects.forEach((object) => object.destroy());
        continue;
      }
      const progress = Math.min(1, (clock.now - item.startedAt) / item.params.delayMs);
      item.fill.setScale(Math.max(0.05, progress));
      item.rock.setY(item.y - FALL_HEIGHT * (1 - progress) ** 2).setRotation(progress * 6);
      if (progress >= 1) this.land(item);
    }
  }

  private land(item: Falling): void {
    const { scene, isSolid } = this.world;
    const { x, y, params } = item;
    this.falling.delete(item);
    item.objects.forEach((object) => object.destroy());
    const enemies = liveEnemies(this.world.enemies);
    for (const { index, multiplier } of fireballVictims({ x, y }, asTargets(enemies), params.radius, params.edgeDamage)) {
      const enemy = enemies[index]!;
      if (lineClear({ x, y }, enemy, isSolid)) hurtEnemy(this.world, enemy, params.damage, x, y, multiplier, 1.6);
    }
    strikeAt(scene, x, y, params.radius);
    explosionBlast(scene, x, y, params.radius * 1.2);
    sparkBurst(scene, x, y, FIRE, 18, params.radius * 2);
    feel.shake(260, 0.012);
    playSfx(scene, 'meteorHit');
    if (params.twist) this.burn(x, y, params);
  }

  private burn(x: number, y: number, params: MeteorSkill['params'][number]): void {
    zonesFor(this.world).spawn({
      x,
      y,
      radius: params.radius * BURN_RADIUS,
      durationMs: BURN_MS,
      tickMs: BURN_TICK_MS,
      color: FIRE,
      onTick: (enemy) => dotEnemy(this.world, enemy, params.damage * BURN_DAMAGE, '#ff9a40', 0xff9a60),
    });
  }
}
