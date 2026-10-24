import Phaser from 'phaser';
import { Sfx, Tex } from '../content/assetKeys';
import type { EnemyDef } from '../content/enemies';
import { damageToPlayer } from '../logic/combat';
import { spreadDirections } from '../logic/enemyAi';
import { bossPhase, newBossState, stepBoss, type BossAction, type BossBrainConfig, type BossState } from '../logic/bossBrain';
import { Enemy, type EnemyContext } from './Enemy';
import type { Player } from './Player';

const BOLT_RANGE = 340;
const BURROW_SPEED_MULTIPLIER = 4;
const DUST = 0xd8b070;

export interface BossHooks {
  /** Spawns a minion near (x, y); the host picks a free spot. */
  summon(enemyId: string, level: number, x: number, y: number): void;
  /** A free spot inside the arena just beside (x, y) for the boss to erupt at. */
  emergeSpot(x: number, y: number): { x: number; y: number };
}

/** Generic boss body: the pure state machine in `logic/bossBrain` (data-driven per boss) decides, this class performs. */
export class Boss extends Enemy {
  private readonly config: BossBrainConfig;
  private brain: BossState;
  private burstSpin = 0;
  private telegraph: Phaser.GameObjects.Arc[] = [];
  private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly lastAim = new Phaser.Math.Vector2(1, 0);
  private strike = { x: 0, y: 0, radius: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef, level: number, context: EnemyContext, private readonly hooks: BossHooks) {
    super(scene, x, y, def, level, context);
    this.config = def.brain!;
    this.setSize(12, 12).setOffset(2, 4);
    this.brain = newBossState(this.config, this.clock.now);
    this.events.emit('boss-spawned', def.name ?? def.id, this.hp, this.maxHp);
  }

  override get targetable(): boolean {
    return this.alive && this.brain.mode !== 'burrowed' && this.brain.mode !== 'rising';
  }

  override takeHit(amount: number, directionX: number, directionY: number): void {
    if (!this.targetable) return;
    super.takeHit(amount, directionX, directionY);
    if (this.alive) this.events.emit('boss-hp', this.hp, this.maxHp);
  }

  override tryContact(player: Player): void {
    if (this.targetable) super.tryContact(player);
  }

  protected override act(time: number): void {
    if (!this.armed) return;
    const step = stepBoss(this.config, this.brain, time, this.hp / this.maxHp);
    this.brain = step.state;
    for (const action of step.actions) this.perform(action);
    const { mode } = this.brain;
    if (mode === 'telegraph' || mode === 'rising') {
      this.setVelocity(0, 0);
      return;
    }
    const speed = this.def.speed * this.config.phases[bossPhase(this.config, this.hp / this.maxHp)].speedMultiplier;
    this.chase(time, mode === 'burrowed' ? speed * BURROW_SPEED_MULTIPLIER : speed);
  }

  protected override die(): void {
    this.clearTelegraph();
    this.stopDust();
    this.shots.clear();
    this.scene.cameras.main.shake(500, 0.012);
    super.die();
    this.events.emit('boss-hp', 0, this.maxHp);
    this.events.emit('boss-died', this.x, this.y);
  }

  private perform(action: BossAction): void {
    if (action.type === 'telegraph') this.startTelegraph(action.radius, action.durationMs);
    else if (action.type === 'slam') this.strikeArea(false);
    else if (action.type === 'emerge') this.strikeArea(true);
    else if (action.type === 'burrow') this.burrow();
    else if (action.type === 'burst') this.burst(action.count);
    else if (action.type === 'spit') this.spit(action.count, action.arc);
    else if (action.type === 'summon') this.summon(action.count, action.minion, action.levelDrop);
    else this.enrage();
  }

  private startTelegraph(radius: number, durationMs: number): void {
    const rising = this.brain.mode === 'rising';
    if (rising) this.surfaceUnderTarget();
    const [color, edge] = rising ? [0xc89a50, 0xffd890] : [0xff2a2a, 0xff5a5a];
    this.strike = { x: this.x, y: this.y + 4, radius };
    const ring = this.scene.add.circle(this.x, this.y + 4, radius, color, 0.14).setStrokeStyle(2, edge, 0.9).setDepth(3);
    const fill = this.scene.add.circle(this.x, this.y + 4, radius, color, 0.38).setDepth(3).setScale(0.05);
    this.scene.tweens.add({ targets: fill, scale: 1, duration: durationMs, ease: 'Quad.easeIn' });
    this.telegraph = [ring, fill];
    if (rising) this.stopDust();
    this.scene.sound.play(Sfx.shoot, { volume: 0.3, rate: 0.5 });
  }

  /** The hidden boss pops up beside where the player stands when the warning starts, inside the arena and off any wall. */
  private surfaceUnderTarget(): void {
    const spot = this.hooks.emergeSpot(this.target.x, this.target.y);
    this.setPosition(spot.x, spot.y);
    (this.body as Phaser.Physics.Arcade.Body).reset(spot.x, spot.y);
  }

  private strikeArea(emerging: boolean): void {
    const { x, y, radius } = this.strike;
    this.clearTelegraph();
    if (emerging) this.conceal(false);
    const wave = this.scene.add.circle(x, y, radius, emerging ? 0xf0d090 : 0xffffff, 0.35).setStrokeStyle(3, 0xffd0a0, 1).setDepth(7);
    this.scene.tweens.add({ targets: wave, scale: 1.25, alpha: 0, duration: 260, onComplete: () => wave.destroy() });
    if (emerging) this.sandBurst(x, y);
    this.scene.cameras.main.shake(200, 0.01);
    this.scene.sound.play(Sfx.hit, { volume: 0.7, rate: 0.5 });
    if (Phaser.Math.Distance.Between(x, y, this.target.x, this.target.y) <= radius + 4) {
      this.target.takeDamage(damageToPlayer(this.def.slamDamage ?? 20, this.level, this.target.level), x, y);
    }
  }

  private burrow(): void {
    this.conceal(true);
    this.scene.sound.play(Sfx.hit, { volume: 0.4, rate: 0.7 });
    this.sandBurst(this.x, this.y);
    this.dust = this.scene.add
      .particles(0, 0, Tex.puff, { follow: this, frequency: 35, lifespan: 600, speed: { min: 4, max: 22 }, scale: { start: 1.6, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: DUST })
      .setDepth(4);
  }

  private sandBurst(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, Tex.puff, { speed: { min: 30, max: 110 }, lifespan: 500, scale: { start: 1.8, end: 0 }, tint: DUST, emitting: false });
    emitter.setDepth(8).explode(24);
    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  private stopDust(): void {
    this.dust?.destroy();
    this.dust = undefined;
  }

  private boltDamage(): number {
    return damageToPlayer(this.def.boltDamage ?? 9, this.level, this.target.level);
  }

  private burst(count: number): void {
    this.burstSpin += 0.35;
    const damage = this.boltDamage();
    for (let i = 0; i < count; i++) {
      const angle = this.burstSpin + (i * Math.PI * 2) / count;
      this.shots.fire(this.x, this.y, Math.cos(angle), Math.sin(angle), this.def.boltSpeed ?? 90, damage, BOLT_RANGE);
    }
    this.scene.sound.play(Sfx.shoot, { volume: 0.3, rate: 0.7 });
  }

  private spit(count: number, arc: number): void {
    const damage = this.boltDamage();
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    if (Math.hypot(dx, dy) > 1e-6) this.lastAim.set(dx, dy).normalize();
    for (const d of spreadDirections(dx, dy, count, arc, this.lastAim)) {
      this.shots.fire(this.x, this.y, d.x, d.y, this.def.boltSpeed ?? 90, damage, BOLT_RANGE);
    }
    this.scene.sound.play(Sfx.shoot, { volume: 0.3, rate: 0.6 });
  }

  private summon(count: number, minion: string, levelDrop: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.hooks.summon(minion, Math.max(1, this.level - levelDrop), this.x + Math.cos(angle) * 36, this.y + Math.sin(angle) * 36);
    }
  }

  private enrage(): void {
    this.scene.tweens.add({ targets: this, scale: this.scale * 1.15, duration: 160, yoyo: true });
    this.scene.cameras.main.shake(300, 0.008);
    this.scene.sound.play(Sfx.hit, { volume: 0.6, rate: 0.4 });
  }

  private clearTelegraph(): void {
    for (const shape of this.telegraph) shape.destroy();
    this.telegraph = [];
  }

  override destroy(fromScene?: boolean): void {
    this.stopDust();
    super.destroy(fromScene);
  }
}
