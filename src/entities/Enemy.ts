import Phaser from 'phaser';
import { FONT, Sfx, Tex } from '../content/assetKeys';
import type { EnemyDef } from '../content/enemies';
import { damageToPlayer, enemyMaxHp } from '../logic/combat';
import type { GameEvents } from '../systems/GameEvents';
import { floatText } from '../systems/floatText';
import type { Player } from './Player';

const CONTACT_COOLDOWN_MS = 900;
const KNOCKBACK_SPEED = 140;
const KNOCKBACK_MS = 140;
const LEVEL_GAP_TINT = 3;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly level: number;
  readonly maxHp: number;
  hp: number;
  alive = true;
  armed = true;

  private readonly label: Phaser.GameObjects.Text;
  private readonly baseTint: number | null;
  private readonly wobblePhase = Math.random() * Math.PI * 2;
  private readonly desired = new Phaser.Math.Vector2();
  private knockbackUntil = 0;
  private nextContactAt = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: EnemyDef,
    level: number,
    private readonly target: Player,
    private readonly events: GameEvents,
  ) {
    super(scene, x, y, Tex.tiles, def.frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.level = level;
    this.maxHp = this.hp = enemyMaxHp(def.baseHp, level);
    this.setSize(10, 10).setOffset(3, 5).setDepth(5);

    const gap = level - target.level;
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
    if (time >= this.knockbackUntil) this.chase(time);
    this.label.setPosition(this.x, this.y - 12);
  }

  tryContact(player: Player): void {
    const now = this.scene.time.now;
    if (!this.alive || !this.armed || now < this.nextContactAt || now < this.knockbackUntil) return;
    const applied = player.takeDamage(damageToPlayer(this.def.baseDamage, this.level, player.level), this.x, this.y);
    if (applied) this.nextContactAt = now + CONTACT_COOLDOWN_MS;
  }

  takeHit(amount: number, directionX: number, directionY: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    floatText(this.scene, this.x, this.y - 8, String(amount), '#ffe066');
    this.scene.sound.play(Sfx.hit, { volume: 0.4 });
    if (this.hp <= 0) {
      this.die();
      return;
    }
    const knock = new Phaser.Math.Vector2(directionX, directionY).normalize().scale(KNOCKBACK_SPEED);
    this.setVelocity(knock.x, knock.y);
    this.knockbackUntil = this.scene.time.now + KNOCKBACK_MS;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.alive && this.applyBaseTint());
  }

  private chase(time: number): void {
    this.desired.set(this.target.x - this.x, this.target.y - this.y);
    if (this.desired.lengthSq() < 1) return;
    this.desired.normalize();
    if (this.def.behaviour === 'erratic') {
      this.desired.rotate(Math.sin(time / 140 + this.wobblePhase) * 0.9);
    }
    this.setVelocity(this.desired.x * this.def.speed, this.desired.y * this.def.speed);
    this.setFlipX(this.desired.x < 0);
  }

  private die(): void {
    this.alive = false;
    this.disableBody();
    this.label.destroy();
    this.events.emit('enemy-died', this.level, this.x, this.y, this.def.lootTableId);
    this.puff();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.4,
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
    emitter.setDepth(8).explode(10);
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
