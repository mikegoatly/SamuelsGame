import Phaser from 'phaser';
import type { WellSkill } from '../../content/skills';
import { aimPoint } from '../../logic/aimPoint';
import { fireballVictims } from '../../logic/fireball';
import { pullFactor, pullStep } from '../../logic/gravityWell';
import { lineClear } from '../../logic/lineOfSight';
import { newZone, zoneStep, type Zone } from '../../logic/zone';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { explosionBlast, ringBurst, sparkBurst } from './skillFx';
import { asTargets, dotEnemy, enemiesInRadius, hurtEnemy, liveEnemies, runOver } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';

const VOID = 0xb06aff;
const HOLD_RADIUS = 5;
const COLLAPSE_RADIUS = 52;
const MAX_STEP_MS = 33;

interface Well {
  x: number;
  y: number;
  zone: Zone;
  params: WellSkill['params'][number];
  disc: Phaser.GameObjects.Arc;
  swirl: Phaser.GameObjects.Image;
}

/** Gravity Well: drags enemies toward a point for 2 seconds (bosses at a quarter of the pull) with small damage ticks. Level 5 collapses with an explosion. */
export class GravityWellCaster implements SkillCaster<WellSkill> {
  private readonly wells = new Set<Well>();
  private lastNow = 0;

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  cast({ x, y, aim, params, skill }: CastCall<WellSkill>): boolean {
    const { scene, clock, isSolid } = this.world;
    const at = aimPoint({ x, y }, aim, params.range, isSolid);
    const disc = scene.add.circle(at.x, at.y, params.radius, 0x24103c, 0.45).setStrokeStyle(2, VOID, 0.9).setDepth(2);
    const swirl = scene.add
      .image(at.x, at.y, `skill-src-${skill.id}`)
      .setTint(VOID)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3)
      .setDisplaySize(params.radius * 1.8, params.radius * 1.8);
    this.wells.add({ ...at, zone: newZone(clock.now, params.durationMs, params.tickMs), params, disc, swirl });
    ringBurst(scene, at.x, at.y, params.radius, VOID, 300);
    playSfx(scene, 'gravity');
    return true;
  }

  private update(): void {
    const { clock } = this.world;
    const delta = Math.min(clock.now - this.lastNow, MAX_STEP_MS);
    this.lastNow = clock.now;
    const over = runOver(this.world);
    for (const well of [...this.wells]) {
      if (over) {
        this.wells.delete(well);
        well.disc.destroy();
        well.swirl.destroy();
        continue;
      }
      well.swirl.rotation -= delta * 0.008;
      const step = zoneStep(well.zone, clock.now);
      if (step === 'expired') {
        this.collapse(well);
        continue;
      }
      for (const enemy of enemiesInRadius(this.world, well.x, well.y, well.params.radius)) {
        const pull = pullStep(enemy, well, well.params.pullSpeed, delta, pullFactor(enemy.def.boss === true), HOLD_RADIUS);
        enemy.nudge(pull.dx, pull.dy);
        if (step === 'tick') dotEnemy(this.world, enemy, well.params.damagePerTick, '#d0a0ff', 0xc090ff);
      }
    }
  }

  private collapse(well: Well): void {
    const { scene, isSolid } = this.world;
    this.wells.delete(well);
    well.disc.destroy();
    well.swirl.destroy();
    ringBurst(scene, well.x, well.y, well.params.radius * 0.6, VOID, 250);
    if (!well.params.twist) return;
    const enemies = liveEnemies(this.world.enemies);
    for (const { index, multiplier } of fireballVictims(well, asTargets(enemies), COLLAPSE_RADIUS, 0.6)) {
      const enemy = enemies[index]!;
      if (lineClear(well, enemy, isSolid)) hurtEnemy(this.world, enemy, well.params.collapseDamage, well.x, well.y, multiplier, 1.4);
    }
    explosionBlast(scene, well.x, well.y, COLLAPSE_RADIUS, VOID, VOID);
    sparkBurst(scene, well.x, well.y, VOID, 16, 90);
    feel.shake(160, 0.007);
    playSfx(scene, 'explosion');
  }
}
