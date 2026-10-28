import Phaser from 'phaser';
import { SewerFrame, Tex } from '../../content/assetKeys';
import { damageToPlayer } from '../../logic/combat';
import { spreadDirections } from '../../logic/enemyAi';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { groundEffects } from '../behaviours/ground';
import type { Boss } from '../Boss';
import type { BossFamily } from './BossFamily';

const DANGER = 0xff2a2a;
const DANGER_EDGE = 0xff5a5a;
const WINDUP_TINT = 0xffb090;
const GLOB_TINT = 0x8fe05a;
const GLOB_SCALE = 1.6;
const GLOB_RANGE = 300;
const FAN_LENGTH = 110;
const PUDDLE_SHARE = 0.6;
const PUDDLE_MS = 4500;
const LANDING_REACH = 4;
const LANDING_GRACE_MS = 300;

/** Mother Sludge's own moves: the hop-slam (growing shadow, leap, landing with a slow puddle) and the telegraphed fan of globs. */
export class SludgeMoves {
  private shapes: Phaser.GameObjects.GameObject[] = [];
  private landing = { x: 0, y: 0 };
  private aim = new Phaser.Math.Vector2(1, 0);
  private aimed = false;
  private readonly baseScale: number;

  constructor(private readonly boss: Boss, private readonly family: BossFamily, private readonly emergeSpot: (x: number, y: number) => { x: number; y: number }) {
    this.baseScale = boss.def.scale ?? 1;
  }

  /** A fan is warned and waiting to fire. */
  get fanPending(): boolean {
    return this.aimed;
  }

  hopTelegraph(radius: number, durationMs: number, flightMs: number): void {
    const { boss } = this;
    const wanted = boss.isBlocked(boss.target.x, boss.target.y) ? this.emergeSpot(boss.target.x, boss.target.y) : { x: boss.target.x, y: boss.target.y };
    const spot = this.family.claimLanding(boss, wanted, radius, boss.clock.now + durationMs + LANDING_GRACE_MS, (x, y) => !boss.isBlocked(x, y));
    this.landing = spot;
    this.clear();
    const ring = boss.scene.add.circle(spot.x, spot.y + 4, radius, DANGER, 0.24).setStrokeStyle(3, 0xffe0d0, 1).setDepth(3);
    const fill = boss.scene.add.circle(spot.x, spot.y + 4, radius, DANGER, 0.5).setDepth(3).setScale(0.05);
    boss.scene.tweens.add({ targets: fill, scale: 1, duration: durationMs, ease: 'Quad.easeIn' });
    this.shapes = [ring, fill];
    boss.setFlipX(spot.x < boss.x);
    boss.scene.tweens.add({ targets: boss, scaleX: this.baseScale * 1.12, scaleY: this.baseScale * 0.8, duration: Math.max(60, durationMs - flightMs), ease: 'Quad.easeIn' });
    playSfx(boss.scene, 'enemyShot', { rate: 0.75, volume: 1.6 });
  }

  /** Leaves the ground: flies to the marked spot, bigger while in the air. */
  hopLaunch(flightMs: number): void {
    const { boss } = this;
    boss.scene.tweens.killTweensOf(boss);
    boss.setScale(this.baseScale);
    boss.scene.tweens.add({ targets: boss, scaleX: this.baseScale * 1.3, scaleY: this.baseScale * 1.3, duration: flightMs / 2, yoyo: true, ease: 'Sine.easeOut' });
    const secs = flightMs / 1000;
    boss.setVelocity(((this.landing.x - boss.x) / secs) * boss.speedFactor, ((this.landing.y - boss.y) / secs) * boss.speedFactor);
    playSfx(boss.scene, 'enemyShot', { rate: 1.3, volume: 1.2 });
  }

  /** Slam: damage inside the ring, a splash, and a puddle that slows (never hurts). */
  land(radius: number): void {
    const { boss } = this;
    const { x, y } = this.landing;
    this.clear();
    boss.scene.tweens.killTweensOf(boss);
    boss.setScale(this.baseScale);
    boss.setVelocity(0, 0);
    boss.setPosition(x, y);
    (boss.body as Phaser.Physics.Arcade.Body).reset(x, y);
    const splash = boss.scene.add.image(x, y + 2, Tex.sewer, SewerFrame.splash).setDepth(7).setScale(radius / 6).setAlpha(0.9);
    boss.scene.tweens.add({ targets: splash, scale: (radius / 6) * 1.25, alpha: 0, duration: 320, onComplete: () => splash.destroy() });
    boss.scene.tweens.add({ targets: boss, scaleX: this.baseScale * 1.15, scaleY: this.baseScale * 0.85, duration: 110, yoyo: true });
    feel.shake(200, 0.01);
    playSfx(boss.scene, 'slam');
    const { target } = boss;
    const covered = this.family.releaseLanding(boss, x, y, radius * PUDDLE_SHARE);
    if (target.dead || feel.isLocked) return;
    if (Phaser.Math.Distance.Between(x, y, target.x, target.y) <= radius + LANDING_REACH) {
      target.takeDamage(damageToPlayer(boss.def.slamDamage ?? 12, boss.level, target.level), x, y, 'boss');
    }
    if (!covered) groundEffects(boss.scene, boss.clock).puddle(target, x, y + 4, this.family, { radius: Math.round(radius * PUDDLE_SHARE), ttlMs: PUDDLE_MS });
  }

  /** Stops and shows where each glob will fly; the aim is locked now, so the player can step out of the fan. */
  fanTelegraph(count: number, arc: number, durationMs: number): void {
    const { boss } = this;
    const dx = boss.target.x - boss.x;
    const dy = boss.target.y - boss.y;
    if (Math.hypot(dx, dy) > 1e-6) this.aim.set(dx, dy).normalize();
    this.aimed = true;
    boss.setFlipX(this.aim.x < 0);
    this.clear();
    const lines = boss.scene.add.graphics().setDepth(3);
    lines.lineStyle(2, DANGER_EDGE, 0.7);
    for (const d of spreadDirections(this.aim.x, this.aim.y, count, arc, this.aim)) lines.lineBetween(boss.x, boss.y, boss.x + d.x * FAN_LENGTH, boss.y + d.y * FAN_LENGTH);
    lines.setAlpha(0.2);
    boss.scene.tweens.add({ targets: lines, alpha: 1, duration: durationMs, ease: 'Quad.easeIn' });
    this.shapes = [lines];
    boss.forcedTint = WINDUP_TINT;
    boss.setTint(WINDUP_TINT);
    playSfx(boss.scene, 'enemyShot', { rate: 0.65, volume: 1.6 });
  }

  fireFan(count: number, arc: number): void {
    const { boss } = this;
    this.aimed = false;
    this.clear();
    boss.forcedTint = null;
    boss.applyBaseTint();
    if (boss.target.dead || feel.isLocked) return;
    const damage = boss.boltDamage();
    for (const d of spreadDirections(this.aim.x, this.aim.y, count, arc, this.aim)) {
      boss.bolt(boss.x, boss.y, d.x, d.y, boss.def.boltSpeed ?? 65, damage, GLOB_RANGE, { tint: GLOB_TINT, scale: GLOB_SCALE });
    }
    playSfx(boss.scene, 'enemyShot', { volume: 1.6 });
  }

  clear(): void {
    for (const shape of this.shapes) shape.destroy();
    this.shapes = [];
  }
}
