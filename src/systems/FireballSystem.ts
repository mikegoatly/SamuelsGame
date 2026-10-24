import Phaser from 'phaser';
import { EXPLOSION_FRAMES, Sfx, Tex } from '../content/assetKeys';
import { GOD_DAMAGE_MULTIPLIER, GOD_MODE } from '../debug';
import type { Enemy } from '../entities/Enemy';
import { Fireball } from '../entities/Fireball';
import type { Player } from '../entities/Player';
import { backOffFromWall, lineClear } from '../logic/lineOfSight';
import { FIREBALL, fireballDamage, fireballStatus, fireballVictims, type FireballStatus } from '../logic/fireball';
import type { GameClock } from './GameClock';

export const FIREBALL_STATE_KEY = 'fireballState';
const FLIGHT_HIT_REACH = 5;
const EXPLOSION_FPS = 28;
const MAX_STEP_MS = 33;

export interface FireballOptions {
  scene: Phaser.Scene;
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  clock: GameClock;
  unlocked: () => boolean;
  isSolid: (x: number, y: number) => boolean;
}

/** Alt-fire power: owns the cooldown, the flying fireball and the area blast. Publishes its status for the HUD and touch button. */
export class FireballSystem {
  private readonly balls = new Set<Fireball>();
  private readyAt = 0;
  private status: FireballStatus = { unlocked: false, available: false, ready: false, fraction: 0 };

  constructor(private readonly o: FireballOptions) {
    o.player.altFireHandler = (x, y, direction) => this.tryCast(x, y, direction);
    o.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    o.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => o.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
    this.publish();
  }

  get current(): FireballStatus {
    return this.status;
  }

  private tryCast(x: number, y: number, direction: Phaser.Math.Vector2): void {
    this.publish();
    if (!this.status.ready || this.o.player.dead) return;
    this.readyAt = this.o.clock.now + FIREBALL.cooldownMs;
    this.balls.add(new Fireball(this.o.scene, x, y, direction, FIREBALL.speed));
    this.o.scene.sound.play(Sfx.shoot, { volume: 0.4, rate: 0.55 });
    this.publish();
  }

  private update(_time: number, delta: number): void {
    this.publish();
    for (const ball of [...this.balls]) {
      const seconds = Math.min(delta, MAX_STEP_MS) / 1000;
      ball.x += ball.velocity.x * seconds;
      ball.y += ball.velocity.y * seconds;
      ball.travelled += FIREBALL.speed * seconds;
      if (this.hitsSomething(ball) || ball.travelled >= FIREBALL.range) this.explode(ball);
    }
  }

  private hitsSomething(ball: Fireball): boolean {
    if (this.o.isSolid(ball.x, ball.y)) return true;
    return this.liveEnemies().some((e) => Phaser.Math.Distance.Between(ball.x, ball.y, e.x, e.y) <= e.displayWidth / 2 + FLIGHT_HIT_REACH);
  }

  private liveEnemies(): Enemy[] {
    return (this.o.enemies.getChildren() as Enemy[]).filter((e) => e.active && e.alive && e.targetable);
  }

  private explode(ball: Fireball): void {
    this.balls.delete(ball);
    const { x, y } = backOffFromWall(ball, ball.velocity, this.o.isSolid);
    ball.destroy();
    const targets = this.liveEnemies();
    const reachable = fireballVictims({ x, y }, targets.map((e) => ({ x: e.x, y: e.y, reach: e.displayWidth / 2 })));
    const victims = reachable.filter(({ index }) => lineClear({ x, y }, targets[index]!, this.o.isSolid));
    const { player } = this.o;
    for (const { index, multiplier } of victims) {
      const enemy = targets[index]!;
      const raw = fireballDamage(player.weapon.baseDamage, player.level, enemy.level, player.stats.damageMultiplier);
      const damage = Math.max(1, Math.round(raw * multiplier)) * (GOD_MODE ? GOD_DAMAGE_MULTIPLIER : 1);
      enemy.takeHit(damage, enemy.x - x, enemy.y - y);
    }
    this.showBlast(x, y);
  }

  private showBlast(x: number, y: number): void {
    const { scene } = this.o;
    const key = 'fireball-explosion';
    if (!scene.anims.exists(key)) {
      scene.anims.create({ key, frames: EXPLOSION_FRAMES.map((frame) => ({ key: Tex.explosion, frame })), frameRate: EXPLOSION_FPS });
    }
    const sprite = scene.add.sprite(x, y, Tex.explosion, EXPLOSION_FRAMES[0]).setDepth(9).setTint(0xff9a40).setScale((FIREBALL.radius * 2.4) / 96);
    sprite.play(key).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
    const ring = scene.add.circle(x, y, FIREBALL.radius, 0xff7a2a, 0.18).setStrokeStyle(2, 0xffc060, 0.9).setDepth(8);
    scene.tweens.add({ targets: ring, alpha: 0, scale: 1.2, duration: 260, onComplete: () => ring.destroy() });
    scene.cameras.main.shake(130, 0.006);
    scene.sound.play(Sfx.explosion, { volume: 0.5 });
  }

  private publish(): void {
    const { player, scene, clock, unlocked } = this.o;
    const next = fireballStatus({ unlocked: unlocked(), castsPowers: player.weapon.castsPowers === true, now: clock.now, readyAt: this.readyAt });
    const { status } = this;
    if (next.unlocked === status.unlocked && next.available === status.available && next.ready === status.ready && next.fraction === status.fraction && scene.registry.has(FIREBALL_STATE_KEY)) return;
    this.status = next;
    scene.registry.set(FIREBALL_STATE_KEY, next);
  }
}
