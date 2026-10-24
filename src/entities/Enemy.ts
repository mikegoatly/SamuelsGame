import Phaser from 'phaser';
import { gameText } from '../ui/gameText';
import { Frame, TILE_SIZE, Tex } from '../content/assetKeys';
import { deathTint } from '../content/deathTints';
import type { EnemyDef } from '../content/enemies';
import { damageToPlayer, enemyMaxHp } from '../logic/combat';
import { leadAim } from '../logic/aim';
import { steerToward } from '../logic/angle';
import { newBlinkState, pickBlinkPoint, stepBlink, type BlinkState } from '../logic/blink';
import { chargeLaneLength, cloakAlpha, newChargeState, stepCharge, type ChargeState, type ChargeTuning } from '../logic/charge';
import { rangedStance, spreadDirections } from '../logic/enemyAi';
import { lineClear } from '../logic/lineOfSight';
import { Navigator, PathBudget } from '../logic/navigator';
import { isFrontal, shieldedDamage } from '../logic/shield';
import { deathBurst } from '../systems/fx';
import { feel } from '../systems/feel';
import type { GameClock } from '../systems/GameClock';
import type { GameEvents } from '../systems/GameEvents';
import { floatText } from '../systems/floatText';
import { playSfx } from '../systems/sfx';
import type { EnemyProjectiles, ShotStyle } from './EnemyProjectile';
import type { Player } from './Player';

const CONTACT_COOLDOWN_MS = 900;
const KNOCKBACK_SPEED = 140;
const KNOCKBACK_MS = 140;
const LEVEL_GAP_TINT = 3;
const KITE_NEAR = 85;
const KITE_FAR = 115;
const SHOT_RANGE = 260;
const SHOOT_DISTANCE = 220;
const DEFAULT_CHARGE: ChargeTuning = { triggerRange: 110, windupMs: 600, dashMs: 380, recoverMs: 800, dashSpeed: 280 };
const WINDUP_TINT = 0xff5a3a;
const SHIELD_TINT = 0xc8d8ff;
const HIT_REVEAL_MS = 600;
const ORB_SCALE = 1.35;
const ORB_TINT = 0xc070ff;
const ORB_RANGE = 320;
const BODY_RADIUS = 7;
const pathBudget = new PathBudget();

export interface EnemyContext {
  target: Player;
  events: GameEvents;
  shots: EnemyProjectiles;
  clock: GameClock;
  /** Wall/door test in world px; lets enemies respect line of sight. */
  isBlocked?: (x: number, y: number) => boolean;
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
  protected readonly isBlocked: (x: number, y: number) => boolean;
  private readonly navigator?: Navigator;
  private readonly label: Phaser.GameObjects.Text;
  private readonly baseTint: number | null;
  private readonly wobblePhase = Math.random() * Math.PI * 2;
  private readonly desired = new Phaser.Math.Vector2();
  private knockbackUntil = 0;
  private nextContactAt = 0;
  private nextShotAt: number;
  private charge: ChargeState = newChargeState();
  private chargeDirection = new Phaser.Math.Vector2(1, 0);
  private lane?: Phaser.GameObjects.Rectangle;
  private blink: BlinkState = newBlinkState();
  /** Tint that survives the hit flash (e.g. a boss winding up a lunge). */
  protected forcedTint: number | null = null;
  private facing = 0;
  private revealedUntil = 0;
  private readonly shieldImage?: Phaser.GameObjects.Image;

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
    this.isBlocked = context.isBlocked ?? (() => false);
    if (context.isBlocked) this.navigator = new Navigator(context.isBlocked, TILE_SIZE, Math.random, pathBudget);
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

    if (def.shield) this.shieldImage = scene.add.image(x, y, Tex.tiles, Frame.shield).setDepth(6).setTint(SHIELD_TINT).setScale(0.9);

    this.label = gameText(scene, x, y, `Lv${level}`, 8, { color: '#d8d8e8', world: true })
      .setOrigin(0.5)
      .setDepth(6)
      .setAlpha(0.8);
  }

  /** False while the enemy cannot be hurt (e.g. a boss under the sand); bolts pass through. */
  get targetable(): boolean {
    return this.alive && this.blink.phase !== 'vanish';
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.alive) return;
    const now = this.clock.now;
    if (now >= this.knockbackUntil) this.act(now);
    if (this.def.shield) this.updateShield(delta);
    this.applyCloak(now);
    this.label.setPosition(this.x, this.y - this.displayHeight / 2 - 2);
  }

  /** The shield swings slowly toward the player, so circling round the back works. */
  private updateShield(delta: number): void {
    const { shield } = this.def;
    if (!shield || !this.shieldImage) return;
    this.facing = steerToward(this.facing, Math.atan2(this.target.y - this.y, this.target.x - this.x), (shield.turnRate * delta) / 1000);
    this.shieldImage
      .setPosition(this.x + Math.cos(this.facing) * 9, this.y + Math.sin(this.facing) * 9 + 1)
      .setRotation(this.facing)
      .setVisible(this.alive && this.blink.phase !== 'vanish')
      .setAlpha(this.alpha);
  }

  /** Assassins fade while stalking; a fresh hit shows them briefly. */
  private applyCloak(now: number): void {
    const { cloak } = this.def;
    if (cloak === undefined || !this.armed || this.def.behaviour !== 'charger') return;
    const alpha = now < this.revealedUntil ? 1 : cloakAlpha(this.charge.phase, cloak);
    this.setAlpha(alpha);
    this.label.setAlpha(Math.min(0.8, alpha));
  }

  tryContact(player: Player): void {
    const now = this.clock.now;
    if (!this.alive || !this.armed || now < this.nextContactAt || now < this.knockbackUntil) return;
    const applied = player.takeDamage(damageToPlayer(this.def.baseDamage, this.level, player.level), this.x, this.y);
    if (applied) this.nextContactAt = now + CONTACT_COOLDOWN_MS;
  }

  /** `direction` is the way the blow travels; `knockback` scales the shove (sword > bolt). */
  takeHit(amount: number, directionX: number, directionY: number, knockback = 1): void {
    if (!this.alive) return;
    const { shield } = this.def;
    const blocked = shield !== undefined && isFrontal(this.facing, { x: -directionX, y: -directionY }, shield.arc);
    const dealt = shield ? shieldedDamage(amount, blocked, shield.reduction) : amount;
    this.hp -= dealt;
    this.revealedUntil = this.clock.now + HIT_REVEAL_MS;
    floatText(this.scene, this.x, this.y - this.displayHeight / 2, String(dealt), blocked ? '#9ab4ff' : '#ffe066', 8, 14, 700);
    if (blocked) this.flashShield();
    playSfx(this.scene, 'enemyHit');
    if (this.def.boss) feel.hitStop(30);
    if (this.hp <= 0) {
      this.die();
      return;
    }
    this.cancelDash();
    if (!this.def.boss) {
      const knock = new Phaser.Math.Vector2(directionX, directionY).normalize().scale(KNOCKBACK_SPEED * knockback);
      this.setVelocity(knock.x, knock.y);
      this.knockbackUntil = this.clock.now + KNOCKBACK_MS;
    }
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.alive && this.applyBaseTint());
  }

  private flashShield(): void {
    if (!this.shieldImage) return;
    this.shieldImage.setTint(0xffffff);
    this.scene.time.delayedCall(90, () => this.shieldImage?.active && this.shieldImage.setTint(SHIELD_TINT));
  }

  protected act(time: number): void {
    if (this.def.behaviour === 'mage') this.castMage(time);
    else if (this.def.behaviour === 'ranged') this.kite(time);
    else if (this.def.behaviour === 'charger') this.chargeAt(time);
    else this.chase(time);
  }

  /** Hides or shows the sprite and its level label (used by bosses burrowing). */
  protected conceal(hidden: boolean): void {
    this.setAlpha(hidden ? 0 : 1);
    this.label.setVisible(!hidden);
    (this.body as Phaser.Physics.Arcade.Body).checkCollision.none = hidden;
  }

  /** Stalks the player, freezes with a red lane marking the dash, then dashes in a straight line. */
  private chargeAt(time: number): void {
    const tuning = this.def.charge ?? DEFAULT_CHARGE;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    const sees = this.armed && lineClear(this, this.target, this.isBlocked);
    const step = stepCharge(this.charge, time, sees ? distance : Infinity, tuning);
    this.charge = step.state;
    if (step.event === 'windup') this.beginWindup(tuning);
    else if (step.event === 'dash') this.beginDash(tuning);
    else if (step.event === 'recover') this.setVelocity(0, 0);
    const { phase } = this.charge;
    if (phase === 'windup') this.placeLane(tuning);
    if (phase === 'stalk') this.chase(time);
    else if (phase !== 'dash') this.setVelocity(0, 0);
  }

  private beginWindup(tuning: ChargeTuning): void {
    this.chargeDirection.set(this.target.x - this.x, this.target.y - this.y).normalize();
    this.setVelocity(0, 0);
    this.setFlipX(this.chargeDirection.x < 0);
    this.lane = this.scene.add.rectangle(0, 0, chargeLaneLength(tuning), 10, 0xff2a2a, 0.25).setRotation(this.chargeDirection.angle()).setDepth(3);
    this.placeLane(tuning);
    this.setTint(WINDUP_TINT);
    playSfx(this.scene, 'enemyShot', { rate: 0.7 });
  }

  /** Keeps the warning lane glued to the scorpion, so a knock during the windup cannot leave it pointing from the old spot. */
  private placeLane(tuning: ChargeTuning): void {
    const half = chargeLaneLength(tuning) / 2;
    this.lane?.setPosition(this.x + this.chargeDirection.x * half, this.y + this.chargeDirection.y * half);
  }

  /** A hit mid-dash ends it: the knockback must not be overridden by (or fight with) the dash velocity. */
  private cancelDash(): void {
    if (this.charge.phase !== 'dash') return;
    this.charge = { phase: 'recover', until: this.clock.now + (this.def.charge ?? DEFAULT_CHARGE).recoverMs };
  }

  private beginDash(tuning: ChargeTuning): void {
    this.clearLane();
    this.applyBaseTint();
    this.setVelocity(this.chargeDirection.x * tuning.dashSpeed, this.chargeDirection.y * tuning.dashSpeed);
  }

  private clearLane(): void {
    this.lane?.destroy();
    this.lane = undefined;
  }

  /** Walks toward the player, round walls and pillars when a straight line would snag (skipped by `usePath = false`). */
  protected chase(time: number, speed = this.def.speed, usePath = true): void {
    const walks = usePath && this.def.behaviour !== 'erratic';
    const goal = this.navigator && walks ? this.navigator.aim(time, this, this.target, this.bodyRadius(), speed) : this.target;
    this.desired.set(goal.x - this.x, goal.y - this.y);
    if (this.desired.lengthSq() < 1) return;
    this.desired.normalize();
    if (this.def.behaviour === 'erratic') {
      this.desired.rotate(Math.sin(time / 140 + this.wobblePhase) * 0.9);
    }
    this.setVelocity(this.desired.x * speed, this.desired.y * speed);
    this.setFlipX(this.desired.x < 0);
  }

  private bodyRadius(): number {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return Math.max(body.halfWidth, body.halfHeight);
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
    if (stance === 'approach' && this.navigator && !lineClear(this, this.target, this.isBlocked)) {
      const goal = this.navigator.aim(time, this, this.target, this.bodyRadius(), this.def.speed);
      const gx = goal.x - this.x;
      const gy = goal.y - this.y;
      const length = Math.hypot(gx, gy) || 1;
      this.setVelocity((gx / length) * this.def.speed, (gy / length) * this.def.speed);
      this.setFlipX(dx < 0);
      return;
    }
    this.setVelocity((ux * radial - uy * strafe) * this.def.speed, (uy * radial + ux * strafe) * this.def.speed);
    this.setFlipX(dx < 0);
    if (this.armed && time >= this.nextShotAt && distance <= SHOOT_DISTANCE) {
      this.nextShotAt = time + (this.def.fireEveryMs ?? 1800);
      this.shoot(ux, uy);
    }
  }

  /** One volley at the player; archers lead their target, mages fire slow homing orbs. */
  private shoot(ux: number, uy: number): void {
    const damage = damageToPlayer(this.def.baseDamage, this.level, this.target.level);
    const speed = this.def.shotSpeed ?? 70;
    const aim = this.def.lead ? leadAim(this, this.target, (this.target.body as Phaser.Physics.Arcade.Body).velocity, speed) : { x: ux, y: uy };
    const { count, arc } = this.def.spread ?? { count: 1, arc: 0 };
    const homing = this.def.homing;
    const style: ShotStyle | undefined = homing ? { tint: ORB_TINT, scale: ORB_SCALE, homing: { ...homing, target: this.target } } : undefined;
    for (const d of spreadDirections(aim.x, aim.y, count, arc)) this.shots.fire(this.x, this.y, d.x, d.y, speed, damage, homing ? ORB_RANGE : SHOT_RANGE, style);
    playSfx(this.scene, 'enemyShot', { rate: homing ? 0.6 : 1, volume: 0.9 });
  }

  /** Dark mage: kites and lobs orbs, but blinks away (hidden for a moment) when the player closes in, then answers with an orb. */
  private castMage(time: number): void {
    const tuning = this.def.blink;
    if (!tuning) return this.kite(time);
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    const step = stepBlink(this.blink, time, this.armed ? distance : Infinity, tuning);
    this.blink = step.state;
    if (step.event === 'vanish') {
      this.nextShotAt = time + (this.def.fireEveryMs ?? 1800);
      this.vanish();
    }
    else if (step.event === 'appear') this.appearElsewhere(tuning.distance);
    else if (step.event === 'cast') {
      this.nextShotAt = time + (this.def.fireEveryMs ?? 1800);
      this.shoot(this.target.x - this.x, this.target.y - this.y);
    }
    if (this.blink.phase === 'vanish') this.setVelocity(0, 0);
    else this.kite(time);
  }

  private vanish(): void {
    this.setVelocity(0, 0);
    this.conceal(true);
    this.puff();
    playSfx(this.scene, 'enemyShot', { rate: 0.5 });
  }

  private appearElsewhere(distance: number): void {
    const spot = pickBlinkPoint(this, this.target, distance, Math.random, this.isBlocked, BODY_RADIUS);
    this.setPosition(spot.x, spot.y);
    (this.body as Phaser.Physics.Arcade.Body).reset(spot.x, spot.y);
    this.conceal(false);
    this.puff();
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
    this.clearLane();
    this.label.destroy();
    this.shieldImage?.destroy();
    this.events.emit('enemy-died', this.level, this.x, this.y, this.def.lootTableId);
    deathBurst(this.scene, this.x, this.y, deathTint(this.def.id, this.def.tint), this.def.boss === true);
    playSfx(this.scene, 'enemyDie');
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: this.scale * 0.4,
      duration: 180,
      onComplete: () => this.destroy(),
    });
  }

  protected puff(): void {
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

  protected applyBaseTint(): void {
    if (this.charge.phase === 'windup') this.setTint(WINDUP_TINT);
    else if (this.forcedTint !== null) this.setTint(this.forcedTint);
    else if (this.baseTint === null) this.clearTint();
    else this.setTint(this.baseTint);
  }

  override destroy(fromScene?: boolean): void {
    this.clearLane();
    this.label.destroy();
    this.shieldImage?.destroy();
    super.destroy(fromScene);
  }
}
