import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import type { EnemyDef } from '../content/enemies';
import { damageToPlayer } from '../logic/combat';
import { spiralVolley } from '../logic/aim';
import { spreadDirections } from '../logic/enemyAi';
import { bossPhase, newBossState, stepBoss, summonCount, type BossAction, type BossBrainConfig, type BossState } from '../logic/bossBrain';
import { feel } from '../systems/feel';
import { playSfx } from '../systems/sfx';
import { Enemy, type EnemyContext } from './Enemy';
import type { Player } from './Player';

const BOLT_RANGE = 340;
const SEEK_RANGE = 420;
const SEEK_TINT = 0xc070ff;
const BURROW_SPEED_MULTIPLIER = 4;
const DUST = 0xd8b070;
const MAGIC = 0xd8a0ff;
const LUNGE_TINT = 0xff6a4a;
const TELEPORT_MARGIN = 16;

export interface BossHooks {
  /** Spawns a minion near (x, y); the host picks a free spot. */
  summon(enemyId: string, level: number, x: number, y: number): void;
  /** A free spot inside the arena just beside (x, y) for the boss to erupt at. */
  emergeSpot(x: number, y: number): { x: number; y: number };
  /** A free spot on a throne (or anywhere safe) away from the player for the boss to teleport to. */
  teleportSpot(last: { x: number; y: number } | null, avoid: { x: number; y: number }, avoidRadius: number): { x: number; y: number };
  /** Live enemies of this type, for the minion cap. */
  aliveCount(enemyId: string): number;
}

/** Generic boss body: the pure state machine in `logic/bossBrain` (data-driven per boss) decides, this class performs. */
export class Boss extends Enemy {
  private readonly config: BossBrainConfig;
  private brain: BossState;
  private burstSpin = 0;
  private telegraph: Phaser.GameObjects.Shape[] = [];
  private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly lastAim = new Phaser.Math.Vector2(1, 0);
  private strike = { x: 0, y: 0, radius: 0, magic: false };
  private lungeDirection = new Phaser.Math.Vector2(1, 0);
  /** One chance per lunge to connect; a dodge (dash or i-frames) uses it up. */
  private lungeResolved = false;
  private lastThrone: { x: number; y: number } | null = null;

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

  override takeHit(amount: number, directionX: number, directionY: number, knockback = 1): void {
    if (!this.targetable) return;
    super.takeHit(amount, directionX, directionY, knockback);
    if (this.alive) this.events.emit('boss-hp', this.hp, this.maxHp);
  }

  /** Bosses only drift while walking; lunges, slams, burrows and teleports are never interrupted. */
  protected override get pullable(): boolean {
    return super.pullable && this.brain.mode === 'chase';
  }

  override takeDot(amount: number, css?: string, tint?: number): void {
    super.takeDot(amount, css, tint);
    if (this.alive) this.events.emit('boss-hp', this.hp, this.maxHp);
  }

  override tryContact(player: Player): void {
    if (!this.targetable) return;
    if (this.brain.mode === 'dash') {
      if (this.lungeResolved) return;
      this.lungeResolved = true;
      player.takeDamage(damageToPlayer(this.def.slamDamage ?? 20, this.level, player.level), this.x, this.y);
      return;
    }
    super.tryContact(player);
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
    if (mode === 'dash') return;
    if (mode === 'burrowed' && this.brain.active === 'teleport') {
      this.setVelocity(0, 0);
      return;
    }
    const speed = this.def.speed * this.config.phases[bossPhase(this.config, this.hp / this.maxHp)].speedMultiplier;
    const burrowed = mode === 'burrowed';
    this.chase(time, burrowed ? speed * BURROW_SPEED_MULTIPLIER : speed, !burrowed);
  }

  protected override die(): void {
    this.forcedTint = null;
    this.clearTelegraph();
    this.stopDust();
    this.shots.clear();
    feel.shake(500, 0.012);
    playSfx(this.scene, 'bossRoar');
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
    else if (action.type === 'summon') this.summon(action.count, action.minion, action.levelDrop, action.maxAlive);
    else if (action.type === 'telegraphLine') this.startLine(action.length, action.width, action.durationMs);
    else if (action.type === 'lunge') this.startLunge(action.speed);
    else if (action.type === 'lungeEnd') this.endLunge();
    else if (action.type === 'vanish') this.vanishAway();
    else if (action.type === 'appear') this.appear();
    else if (action.type === 'spiral') this.spiral(action.count, action.turns, action.arms);
    else if (action.type === 'seek') this.seek(action.count, action.turnRate, action.ms, action.speedFactor);
    else this.enrage();
  }

  private startTelegraph(radius: number, durationMs: number): void {
    const rising = this.brain.mode === 'rising';
    const teleporting = rising && this.brain.active === 'teleport';
    if (teleporting) {
      this.lastThrone = this.hooks.teleportSpot(this.lastThrone, this.target, radius + TELEPORT_MARGIN);
      this.moveTo(this.lastThrone);
    }
    else if (rising) this.surfaceUnderTarget();
    const [color, edge] = teleporting ? [0xa060e0, 0xe0b0ff] : rising ? [0xc89a50, 0xffd890] : [0xff2a2a, 0xff5a5a];
    this.strike = { x: this.x, y: this.y + 4, radius, magic: teleporting };
    const ring = this.scene.add.circle(this.x, this.y + 4, radius, color, 0.14).setStrokeStyle(2, edge, 0.9).setDepth(3);
    const fill = this.scene.add.circle(this.x, this.y + 4, radius, color, 0.38).setDepth(3).setScale(0.05);
    this.scene.tweens.add({ targets: fill, scale: 1, duration: durationMs, ease: 'Quad.easeIn' });
    this.telegraph = [ring, fill];
    if (rising) this.stopDust();
    playSfx(this.scene, 'enemyShot', { rate: 0.75, volume: 1.6 });
  }

  /** The hidden boss pops up beside where the player stands when the warning starts, inside the arena and off any wall. */
  private surfaceUnderTarget(): void {
    this.moveTo(this.hooks.emergeSpot(this.target.x, this.target.y));
  }

  private moveTo(spot: { x: number; y: number }): void {
    this.setPosition(spot.x, spot.y);
    (this.body as Phaser.Physics.Arcade.Body).reset(spot.x, spot.y);
  }

  /** Red lane from the king along the line he is about to charge down; aimed once, at the start of the windup. */
  private startLine(length: number, width: number, durationMs: number): void {
    this.lungeDirection.set(this.target.x - this.x, this.target.y - this.y);
    if (this.lungeDirection.lengthSq() < 1e-6) this.lungeDirection.copy(this.lastAim);
    this.lungeDirection.normalize();
    this.lastAim.copy(this.lungeDirection);
    this.setFlipX(this.lungeDirection.x < 0);
    const half = length / 2;
    const lane = this.scene.add.rectangle(this.x + this.lungeDirection.x * half, this.y + this.lungeDirection.y * half, length, width, LUNGE_TINT, 0.2).setRotation(this.lungeDirection.angle()).setStrokeStyle(1, 0xff9a7a, 0.9).setDepth(3);
    const fill = this.scene.add.rectangle(this.x, this.y, 2, width, LUNGE_TINT, 0.45).setRotation(this.lungeDirection.angle()).setOrigin(0, 0.5).setDepth(3);
    this.scene.tweens.add({ targets: fill, width: length, duration: durationMs, ease: 'Quad.easeIn' });
    this.telegraph = [lane, fill];
    this.forcedTint = LUNGE_TINT;
    this.setTint(LUNGE_TINT);
    playSfx(this.scene, 'enemyShot', { rate: 0.65, volume: 1.6 });
  }

  private startLunge(speed: number): void {
    this.clearTelegraph();
    this.lungeResolved = false;
    const slowed = speed * this.speedFactor;
    this.setVelocity(this.lungeDirection.x * slowed, this.lungeDirection.y * slowed);
    playSfx(this.scene, 'slam', { volume: 0.7 });
  }

  private endLunge(): void {
    this.setVelocity(0, 0);
    this.forcedTint = null;
    this.applyBaseTint();
  }

  private vanishAway(): void {
    this.conceal(true);
    this.setVelocity(0, 0);
    this.puff();
    playSfx(this.scene, 'enemyShot', { rate: 0.5, volume: 1.8 });
  }

  /** Reappears on the throne and sends out a shockwave the player must be clear of. */
  private appear(): void {
    this.strikeArea(true);
    this.puff();
  }

  /** Each extra arm spins the other way, so two arms cross each other. */
  private spiral(count: number, turns: number, arms: number): void {
    this.burstSpin += 0.5;
    const damage = this.boltDamage();
    for (let arm = 0; arm < arms; arm++) {
      const sign = arm % 2 === 0 ? 1 : -1;
      for (const bolt of spiralVolley(count, turns * sign, this.burstSpin + (arm * Math.PI) / arms, this.def.boltSpeed ?? 90)) {
        this.shots.fire(this.x, this.y, bolt.x, bolt.y, bolt.speed, damage, BOLT_RANGE);
      }
    }
    playSfx(this.scene, 'enemyShot', { rate: 0.7, volume: 1.6 });
  }

  /** A ring of slow purple orbs that curve toward the player for a few seconds, then fly straight; walls and the sword stop them. */
  private seek(count: number, turnRate: number, ms: number, speedFactor: number): void {
    this.burstSpin += 0.4;
    const damage = this.boltDamage();
    const speed = (this.def.boltSpeed ?? 90) * speedFactor;
    const style = { tint: SEEK_TINT, scale: 1.35, homing: { turnRate, ms, target: this.target } };
    for (let i = 0; i < count; i++) {
      const angle = this.burstSpin + (i * Math.PI * 2) / count;
      this.shots.fire(this.x, this.y, Math.cos(angle), Math.sin(angle), speed, damage, SEEK_RANGE, style);
    }
    playSfx(this.scene, 'enemyShot', { rate: 0.55, volume: 1.6 });
  }

  private strikeArea(emerging: boolean): void {
    const { x, y, radius } = this.strike;
    this.clearTelegraph();
    if (emerging) this.conceal(false);
    const magic = emerging && this.strike.magic;
    const wave = this.scene.add.circle(x, y, radius, magic ? MAGIC : emerging ? 0xf0d090 : 0xffffff, 0.35).setStrokeStyle(3, 0xffd0a0, 1).setDepth(7);
    this.scene.tweens.add({ targets: wave, scale: 1.25, alpha: 0, duration: 260, onComplete: () => wave.destroy() });
    if (emerging && !magic) this.sandBurst(x, y);
    feel.shake(200, 0.01);
    playSfx(this.scene, 'slam');
    if (Phaser.Math.Distance.Between(x, y, this.target.x, this.target.y) <= radius + 4) {
      this.target.takeDamage(damageToPlayer(this.def.slamDamage ?? 20, this.level, this.target.level), x, y);
    }
  }

  private burrow(): void {
    this.conceal(true);
    playSfx(this.scene, 'slam', { volume: 0.6, rate: 0.8 });
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
    playSfx(this.scene, 'enemyShot', { volume: 1.6 });
  }

  private spit(count: number, arc: number): void {
    const damage = this.boltDamage();
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    if (Math.hypot(dx, dy) > 1e-6) this.lastAim.set(dx, dy).normalize();
    for (const d of spreadDirections(dx, dy, count, arc, this.lastAim)) {
      this.shots.fire(this.x, this.y, d.x, d.y, this.def.boltSpeed ?? 90, damage, BOLT_RANGE);
    }
    playSfx(this.scene, 'enemyShot', { volume: 1.6 });
  }

  private summon(count: number, minion: string, levelDrop: number, maxAlive: number): void {
    const spawn = summonCount(count, maxAlive, this.hooks.aliveCount(minion));
    for (let i = 0; i < spawn; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.hooks.summon(minion, Math.max(1, this.level - levelDrop), this.x + Math.cos(angle) * 36, this.y + Math.sin(angle) * 36);
    }
  }

  private enrage(): void {
    this.scene.tweens.add({ targets: this, scale: this.scale * 1.15, duration: 160, yoyo: true });
    feel.shake(300, 0.01);
    feel.flash(200);
    playSfx(this.scene, 'bossPhase');
    playSfx(this.scene, 'bossRoar', { delay: 0.1 });
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
