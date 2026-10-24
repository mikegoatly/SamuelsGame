import Phaser from 'phaser';
import { FONT, Sfx, Tex } from '../content/assetKeys';
import type { EnemyDef } from '../content/enemies';
import { damageToPlayer, enemyMaxHp } from '../logic/combat';
import { rangedStance } from '../logic/enemyAi';
import type { GameClock } from '../systems/GameClock';
import type { GameEvents } from '../systems/GameEvents';
import { floatText } from '../systems/floatText';
import type { EnemyProjectiles } from './EnemyProjectile';
import type { Player } from './Player';

const CONTACT_COOLDOWN_MS = 900;
const KNOCKBACK_SPEED = 140;
const KNOCKBACK_MS = 140;
const LEVEL_GAP_TINT = 3;
const KITE_NEAR = 85;
const KITE_FAR = 115;
const SHOT_RANGE = 260;
const SHOOT_DISTANCE = 220;

export interface EnemyContext {
  target: Player;
  events: GameEvents;
  shots: EnemyProjectiles;
  clock: GameClock;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly level: number;
  readonly maxHp: number;
  hp: number;
  alive = true;
  armed = true;

  protected readonly target: Player;
  protected readonly events: GameEvents;
  protected readonly shots: EnemyProjectiles;
  protected readonly clock: GameClock;
  private readonly label: Phaser.GameObjects.Text;
  private readonly baseTint: number | null;
  private readonly wobblePhase = Math.random() * Math.PI * 2;
  private readonly desired = new Phaser.Math.Vector2();
  private knockbackUntil = 0;
  private nextContactAt = 0;
  private nextShotAt: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: EnemyDef,
    level: number,
    context: EnemyContext,
  ) {
    super(scene, x, y, def.texture ?? Tex.tiles, def.texture ? 0 : def.frame);
    this.target = context.target;
    this.events = context.events;
    this.shots = context.shots;
    this.clock = context.clock;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.level = level;
    this.maxHp = this.hp = enemyMaxHp(def.baseHp, level);
    this.setSize(10, 10).setOffset(3, 5).setDepth(5);
    if (def.scale) this.setScale(def.scale);
    this.nextShotAt = context.clock.now + 700 + Math.random() * 700;

    const gap = level - this.target.level;
    this.baseTint = def.tint ?? (gap >= LEVEL_GAP_TINT ? 0xff8080 : gap <= -LEVEL_GAP_TINT ? 0x9a9a9a : null);
    this.applyBaseTint();

    this.label = scene.add
      .text(x, y, `Lv${level}`, { fontFamily: FONT, fontSize: '8px', color: '#d8d8e8', stroke: '#14121c', strokeThickness: 2 })
      .setOrigin(0.5)
      .setDepth(6)
      .setResolution(2)
      .setAlpha(0.8);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.alive) return;
    const now = this.clock.now;
    if (now >= this.knockbackUntil) this.act(now);
    this.label.setPosition(this.x, this.y - this.displayHeight / 2 - 2);
  }

  tryContact(player: Player): void {
    const now = this.clock.now;
    if (!this.alive || !this.armed || now < this.nextContactAt || now < this.knockbackUntil) return;
    const applied = player.takeDamage(damageToPlayer(this.def.baseDamage, this.level, player.level), this.x, this.y);
    if (applied) this.nextContactAt = now + CONTACT_COOLDOWN_MS;
  }

  takeHit(amount: number, directionX: number, directionY: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    floatText(this.scene, this.x, this.y - this.displayHeight / 2, String(amount), '#ffe066');
    this.scene.sound.play(Sfx.hit, { volume: 0.4 });
    if (this.hp <= 0) {
      this.die();
      return;
    }
    if (!this.def.boss) {
      const knock = new Phaser.Math.Vector2(directionX, directionY).normalize().scale(KNOCKBACK_SPEED);
      this.setVelocity(knock.x, knock.y);
      this.knockbackUntil = this.clock.now + KNOCKBACK_MS;
    }
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.alive && this.applyBaseTint());
  }

  protected act(time: number): void {
    if (this.def.behaviour === 'ranged') this.kite(time);
    else this.chase(time);
  }

  protected chase(time: number, speed = this.def.speed): void {
    this.desired.set(this.target.x - this.x, this.target.y - this.y);
    if (this.desired.lengthSq() < 1) return;
    this.desired.normalize();
    if (this.def.behaviour === 'erratic') {
      this.desired.rotate(Math.sin(time / 140 + this.wobblePhase) * 0.9);
    }
    this.setVelocity(this.desired.x * speed, this.desired.y * speed);
    this.setFlipX(this.desired.x < 0);
  }

  /** Keeps a firing distance from the player and shoots slow bolts on a timer. */
  private kite(time: number): void {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return;
    const stance = rangedStance(distance, KITE_NEAR, KITE_FAR);
    const radial = stance === 'retreat' ? -1 : stance === 'approach' ? 1 : 0;
    const strafe = stance === 'hold' ? Math.sin(time / 650 + this.wobblePhase) * 0.5 : 0;
    const ux = dx / distance;
    const uy = dy / distance;
    this.setVelocity((ux * radial - uy * strafe) * this.def.speed, (uy * radial + ux * strafe) * this.def.speed);
    this.setFlipX(dx < 0);
    if (this.armed && time >= this.nextShotAt && distance <= SHOOT_DISTANCE) {
      this.nextShotAt = time + (this.def.fireEveryMs ?? 1800);
      this.shots.fire(this.x, this.y, ux, uy, this.def.shotSpeed ?? 70, damageToPlayer(this.def.baseDamage, this.level, this.target.level), SHOT_RANGE);
      this.scene.sound.play(Sfx.shoot, { volume: 0.15, rate: 0.6 });
    }
  }

  /** Removes the enemy without death rewards (e.g. minions when their boss falls). */
  dismiss(): void {
    if (!this.alive) return;
    this.alive = false;
    this.disableBody();
    this.destroy();
  }

  protected die(): void {
    this.alive = false;
    this.disableBody();
    this.label.destroy();
    this.events.emit('enemy-died', this.level, this.x, this.y, this.def.lootTableId);
    this.puff();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: this.scale * 0.4,
      duration: 180,
      onComplete: () => this.destroy(),
    });
  }

  private puff(): void {
    const emitter = this.scene.add.particles(this.x, this.y, Tex.puff, {
      speed: { min: 20, max: 70 },
      lifespan: 350,
      scale: { start: 1, end: 0 },
      tint: this.def.tint ?? 0xd8d8e8,
      emitting: false,
    });
    emitter.setDepth(8).explode(this.def.boss ? 40 : 10);
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  private applyBaseTint(): void {
    if (this.baseTint === null) this.clearTint();
    else this.setTint(this.baseTint);
  }

  override destroy(fromScene?: boolean): void {
    this.label.destroy();
    super.destroy(fromScene);
  }
}
