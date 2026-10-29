import { strikeAt } from '../strikes';
import Phaser from 'phaser';
import type { FireballSkill } from '../../content/skills';
import { GOD_DAMAGE_MULTIPLIER, GOD_MODE } from '../../debug';
import { Fireball } from '../../entities/Fireball';
import { fireballDamage, fireballVictims, splitDirections } from '../../logic/fireball';
import { backOffFromWall, lineClear } from '../../logic/lineOfSight';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { explosionBlast } from './skillFx';
import { asTargets, liveEnemies, runOver } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';

const FLIGHT_HIT_REACH = 5;
const MAX_STEP_MS = 33;

interface Flying {
  ball: Fireball;
  params: FireballSkill['params'][number];
  mini?: boolean;
}

const MINIS = 3;
const MINI_DAMAGE = 0.4;
const MINI_RADIUS = 0.6;
const MINI_RANGE = 80;
const MINI_START = 14;

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
    if (runOver(this.world)) {
      for (const item of this.flying) item.ball.destroy();
      this.flying.clear();
      return;
    }
    for (const item of [...this.flying]) {
      const { ball, params } = item;
      const seconds = Math.min(delta, MAX_STEP_MS) / 1000;
      ball.x += ball.velocity.x * seconds;
      ball.y += ball.velocity.y * seconds;
      ball.travelled += params.speed * seconds;
      if (this.hitsSomething(ball, item.mini === true) || ball.travelled >= params.range) this.explode(item);
    }
  }

  private hitsSomething(ball: Fireball, mini: boolean): boolean {
    if (this.world.isSolid(ball.x, ball.y)) return true;
    if (mini && ball.travelled < MINI_START) return false;
    return liveEnemies(this.world.enemies).some((e) => Phaser.Math.Distance.Between(ball.x, ball.y, e.x, e.y) <= e.displayWidth / 2 + FLIGHT_HIT_REACH);
  }

  private explode(item: Flying): void {
    const { ball, params } = item;
    this.flying.delete(item);
    const heading = ball.velocity.clone().normalize();
    const { isSolid, player } = this.world;
    const { x, y } = backOffFromWall(ball, ball.velocity, isSolid);
    ball.destroy();
    const enemies = liveEnemies(this.world.enemies);
    for (const { index, multiplier } of fireballVictims({ x, y }, asTargets(enemies), params.radius, params.edgeDamage)) {
      const enemy = enemies[index]!;
      if (!lineClear({ x, y }, enemy, isSolid)) continue;
      const raw = fireballDamage(params.damage, player.level, enemy.level, player.stats.damageMultiplier);
      enemy.takeHit(Math.max(1, Math.round(raw * multiplier)) * (GOD_MODE ? GOD_DAMAGE_MULTIPLIER : 1), enemy.x - x, enemy.y - y, 1, 'skill');
    }
    this.showBlast(x, y, params.radius);
    strikeAt(this.world.scene, x, y, params.radius);
    if (params.twist && !item.mini) this.split({ x, y }, heading, params);
  }

  /** Level 5 twist: the blast throws out three mini fireballs. */
  private split(at: { x: number; y: number }, heading: { x: number; y: number }, params: Flying['params']): void {
    const mini = { ...params, damage: params.damage * MINI_DAMAGE, radius: params.radius * MINI_RADIUS, range: MINI_RANGE };
    for (const d of splitDirections(heading, MINIS)) {
      const dir = new Phaser.Math.Vector2(d.x, d.y);
      this.flying.add({ ball: new Fireball(this.world.scene, at.x + d.x * MINI_START, at.y + d.y * MINI_START, dir, params.speed).setScale(0.7), params: mini, mini: true });
    }
  }

  private showBlast(x: number, y: number, radius: number): void {
    const { scene } = this.world;
    explosionBlast(scene, x, y, radius);
    feel.shake(130, 0.006);
    playSfx(scene, 'explosion');
  }
}
