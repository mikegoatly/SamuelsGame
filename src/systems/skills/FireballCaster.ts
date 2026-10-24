import Phaser from 'phaser';
import { EXPLOSION_FRAMES, Tex } from '../../content/assetKeys';
import type { FireballSkill } from '../../content/skills';
import { GOD_DAMAGE_MULTIPLIER, GOD_MODE } from '../../debug';
import { Fireball } from '../../entities/Fireball';
import { fireballDamage, fireballVictims } from '../../logic/fireball';
import { backOffFromWall, lineClear } from '../../logic/lineOfSight';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { asTargets, liveEnemies } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';

const FLIGHT_HIT_REACH = 5;
const EXPLOSION_FPS = 28;
const MAX_STEP_MS = 33;

interface Flying {
  ball: Fireball;
  params: FireballSkill['params'][number];
}

/** Fireball skill: a slow orb that explodes on the first enemy, wall or at max range; the blast hurts everything around with falloff. */
export class FireballCaster implements SkillCaster<FireballSkill> {
  private readonly flying = new Set<Flying>();

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  cast({ x, y, aim, params }: CastCall<FireballSkill>): boolean {
    this.flying.add({ ball: new Fireball(this.world.scene, x, y, aim, params.speed), params });
    playSfx(this.world.scene, 'fireballCast');
    return true;
  }

  private update(_time: number, delta: number): void {
    for (const item of [...this.flying]) {
      const { ball, params } = item;
      const seconds = Math.min(delta, MAX_STEP_MS) / 1000;
      ball.x += ball.velocity.x * seconds;
      ball.y += ball.velocity.y * seconds;
      ball.travelled += params.speed * seconds;
      if (this.hitsSomething(ball) || ball.travelled >= params.range) this.explode(item);
    }
  }

  private hitsSomething(ball: Fireball): boolean {
    if (this.world.isSolid(ball.x, ball.y)) return true;
    return liveEnemies(this.world.enemies).some((e) => Phaser.Math.Distance.Between(ball.x, ball.y, e.x, e.y) <= e.displayWidth / 2 + FLIGHT_HIT_REACH);
  }

  private explode(item: Flying): void {
    const { ball, params } = item;
    this.flying.delete(item);
    const { isSolid, player } = this.world;
    const { x, y } = backOffFromWall(ball, ball.velocity, isSolid);
    ball.destroy();
    const enemies = liveEnemies(this.world.enemies);
    for (const { index, multiplier } of fireballVictims({ x, y }, asTargets(enemies), params.radius, params.edgeDamage)) {
      const enemy = enemies[index]!;
      if (!lineClear({ x, y }, enemy, isSolid)) continue;
      const raw = fireballDamage(params.damage, player.level, enemy.level, player.stats.damageMultiplier);
      enemy.takeHit(Math.max(1, Math.round(raw * multiplier)) * (GOD_MODE ? GOD_DAMAGE_MULTIPLIER : 1), enemy.x - x, enemy.y - y);
    }
    this.showBlast(x, y, params.radius);
  }

  private showBlast(x: number, y: number, radius: number): void {
    const { scene } = this.world;
    const key = 'fireball-explosion';
    if (!scene.anims.exists(key)) {
      scene.anims.create({ key, frames: EXPLOSION_FRAMES.map((frame) => ({ key: Tex.explosion, frame })), frameRate: EXPLOSION_FPS });
    }
    const sprite = scene.add.sprite(x, y, Tex.explosion, EXPLOSION_FRAMES[0]).setDepth(9).setTint(0xff9a40).setScale((radius * 2.4) / 96);
    sprite.play(key).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
    const ring = scene.add.circle(x, y, radius, 0xff7a2a, 0.18).setStrokeStyle(2, 0xffc060, 0.9).setDepth(8);
    scene.tweens.add({ targets: ring, alpha: 0, scale: 1.2, duration: 260, onComplete: () => ring.destroy() });
    feel.shake(130, 0.006);
    playSfx(scene, 'explosion');
  }
}
