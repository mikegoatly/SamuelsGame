import Phaser from 'phaser';
import type { ShieldSkill } from '../../content/skills';
import type { EnemyProjectile } from '../../entities/EnemyProjectile';
import { absorb, newShield, shieldActive, shieldBurstDamage, type ShieldState } from '../../logic/arcaneShield';
import { novaVictims } from '../../logic/frostNova';
import { lineClear } from '../../logic/lineOfSight';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { ringBurst, sparkBurst } from './skillFx';
import { asTargets, hurtEnemy, liveEnemies, runOver } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';

const SHIELD = 0x8ab4ff;
const BOLT_PADDING = 3;
const FLICKER_MS = 600;
const BURST_RADIUS = 70;

/** Arcane Shield: a bubble that follows the player, destroys enemy bolts it touches and soaks up damage that still reaches the player. Level 5: it bursts outward when it ends, hurting and shoving enemies. */
export class ArcaneShieldCaster implements SkillCaster<ShieldSkill> {
  private shield: ShieldState | null = null;
  private radius = 20;
  private burstDamage = 0;
  private bubble?: Phaser.GameObjects.Arc;

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  cast({ params }: CastCall<ShieldSkill>): boolean {
    const { scene, player, clock } = this.world;
    this.end(false);
    this.radius = params.radius;
    this.burstDamage = params.twist ? shieldBurstDamage(params.absorb) : 0;
    this.shield = newShield(clock.now, params.durationMs, params.absorb);
    player.damageAbsorber = (amount) => this.soak(amount);
    this.bubble = scene.add.circle(player.x, player.y, params.radius, SHIELD, 0.2).setStrokeStyle(2, 0xdbe8ff, 0.95).setDepth(12);
    scene.tweens.add({ targets: this.bubble, scale: { from: 0.4, to: 1 }, duration: 160, ease: 'Back.easeOut' });
    playSfx(scene, 'shieldUp');
    return true;
  }

  private soak(amount: number): number {
    const { shield } = this;
    if (!shield || !shieldActive(shield, this.world.clock.now)) return amount;
    const through = absorb(shield, amount);
    playSfx(this.world.scene, 'shieldHit');
    this.bubble?.setFillStyle(0xffffff, 0.5);
    this.world.scene.time.delayedCall(70, () => this.bubble?.active && this.bubble.setFillStyle(SHIELD, 0.2));
    return through;
  }

  private update(): void {
    const { shield, bubble } = this;
    if (!shield || !bubble) return;
    const { player, clock } = this.world;
    if (!shieldActive(shield, clock.now) || player.dead) {
      this.end(shield.remaining <= 0);
      return;
    }
    bubble.setPosition(player.x, player.y - 1);
    bubble.setAlpha(shield.until - clock.now < FLICKER_MS && Math.floor(clock.now / 80) % 2 === 0 ? 0.35 : 1);
    this.destroyBolts(player.x, player.y);
  }

  private destroyBolts(x: number, y: number): void {
    const reach = this.radius + BOLT_PADDING;
    for (const bolt of this.world.shots.group.getChildren() as EnemyProjectile[]) {
      if (!bolt.active || Phaser.Math.Distance.Between(x, y, bolt.x, bolt.y) > reach) continue;
      sparkBurst(this.world.scene, bolt.x, bolt.y, SHIELD, 4, 40);
      bolt.kill();
      playSfx(this.world.scene, 'shieldHit');
    }
  }

  private end(broken: boolean): void {
    const { player, scene } = this.world;
    if (!this.shield) return;
    this.shield = null;
    player.damageAbsorber = undefined;
    const { bubble } = this;
    this.bubble = undefined;
    if (!bubble) return;
    ringBurst(scene, bubble.x, bubble.y, this.radius * (broken ? 2.4 : 1.6), SHIELD, 300);
    if (this.burstDamage > 0 && !runOver(this.world)) this.burst(bubble.x, bubble.y);
    if (broken) {
      sparkBurst(scene, bubble.x, bubble.y, SHIELD, 14, 90);
      playSfx(scene, 'shieldBreak');
      feel.shake(70, 0.002);
    }
    bubble.destroy();
  }

  private burst(x: number, y: number): void {
    const { scene, isSolid } = this.world;
    const enemies = liveEnemies(this.world.enemies);
    const centre = { x, y };
    for (const index of novaVictims(centre, BURST_RADIUS, asTargets(enemies))) {
      const enemy = enemies[index]!;
      if (lineClear(centre, enemy, isSolid)) hurtEnemy(this.world, enemy, this.burstDamage, x, y, 1, 2);
    }
    ringBurst(scene, x, y, BURST_RADIUS, 0xffffff, 380);
    sparkBurst(scene, x, y, SHIELD, 16, BURST_RADIUS * 1.5);
    feel.shake(110, 0.004);
  }
}
