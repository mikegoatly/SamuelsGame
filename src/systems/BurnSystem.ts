import Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import { BURN, Burning, OwedTick, type BurnPower } from '../logic/burning';
import { hazardDamage } from '../logic/hazard/victims';
import { FLAME_TINT, BurnFx } from './BurnFx';
import { feel } from './feel';
import { floatText } from './floatText';
import type { GameEvents } from './GameEvents';
import { hurtPlayer } from './hazards/victims';
import { dotEnemy, runOver } from './skills/targets';
import type { SkillWorld } from './skills/types';

const FLAME_CSS = '#ff9a3c';
const FLICKER_MS = 160;
const HOLD_MS = 120;
const SPARK_GAP_MS = 110;
const HERO = 'hero';

/**
 * Fire that sticks. Monsters set alight burn for 3s and the hero for 2s; lighting something already burning only refreshes it.
 * A burn tick that kills pays out exactly like any other kill (it goes through Enemy.takeDot -> die), and nothing burns once the run is over.
 * A target standing in a fire pit is "held": its pit tick applies and the burn waits until it steps out.
 */
export class BurnSystem {
  private readonly enemies = new Burning<Enemy>();
  private readonly hero = new Burning<string, true>();
  private readonly owed = new OwedTick();
  private readonly held = new Map<unknown, number>();
  private readonly fx: BurnFx;
  private lastNow: number;
  private nextFlickerAt = 0;
  private nextSparkAt = 0;
  private heroBurning = false;

  constructor(
    private readonly world: SkillWorld,
    private readonly events: GameEvents,
  ) {
    const { scene, clock } = world;
    this.fx = new BurnFx(scene);
    this.lastNow = clock.now;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      this.fx.destroy();
    });
  }

  get playerBurning(): boolean {
    return this.hero.burning(HERO);
  }

  /** A fire pit says this target (an enemy, or the player) is standing in it right now: its burn ticks pause until it leaves. */
  hold(target: unknown): void {
    this.held.set(target, this.world.clock.now);
  }

  private isHeld(target: unknown, now: number): boolean {
    const at = this.held.get(target);
    return at !== undefined && now - at <= HOLD_MS;
  }

  igniteEnemy(enemy: Enemy, power: BurnPower): void {
    if (runOver(this.world) || !enemy.targetable || enemy.def.boss) return;
    const fresh = !this.enemies.burning(enemy);
    this.enemies.ignite(enemy, this.world.clock.now, BURN.enemyMs, power);
    if (fresh) this.setEnemyFlame(enemy, true);
  }

  /** The hero catches fire unless dashing through; the pit's own hurt i-frames don't count, or leaving just after a pit tick would never ignite. */
  ignitePlayer(): void {
    const { player, clock } = this.world;
    if (runOver(this.world) || player.isDashing) return;
    this.hero.ignite(HERO, clock.now, BURN.playerMs, true);
    this.setHeroFlame(true);
  }

  /** A potion puts the hero's fire out. */
  extinguishPlayer(): void {
    this.hero.extinguish(HERO);
    this.owed.clear();
    this.setHeroFlame(false);
  }

  private update(): void {
    const now = this.world.clock.now;
    const dt = Math.min(100, now - this.lastNow);
    this.lastNow = now;
    const locked = runOver(this.world);
    if (locked && this.held.size > 0) this.held.clear();
    this.tickEnemies(now, dt, locked);
    this.tickHero(now, dt, locked);
  }

  private tickEnemies(now: number, dt: number, locked: boolean): void {
    if (!this.enemies.any) return;
    const { ticks, ended } = this.enemies.step(now, locked, isLive);
    for (const { key: enemy, power } of ticks) {
      if (this.isHeld(enemy, now)) continue;
      if ('weapon' in power) dotEnemy(this.world, enemy, power.weapon, FLAME_CSS, FLAME_TINT);
      else enemy.takeDot(hazardDamage(enemy.maxHp, power.fraction), FLAME_CSS, FLAME_TINT);
    }
    for (const enemy of ended) {
      this.fx.forget(enemy);
      this.held.delete(enemy);
      this.setEnemyFlame(enemy, false);
    }
    const flicker = now >= this.nextFlickerAt;
    if (flicker) this.nextFlickerAt = now + FLICKER_MS;
    for (const enemy of this.enemies.keys()) {
      if (!isLive(enemy)) continue;
      this.fx.sparks(enemy, enemy.x, enemy.y - enemy.displayHeight * 0.15, enemy.displayWidth * 0.6, dt);
      if (flicker && !feel.reduced) enemy.applyBaseTint();
    }
  }

  private tickHero(now: number, dt: number, locked: boolean): void {
    const { player } = this.world;
    const dead = locked || player.dead;
    const { ticks, ended } = this.hero.step(now, dead);
    this.owed.add(this.isHeld(player, now) ? 0 : ticks.length);
    this.owed.pay(dead || this.isHeld(player, now), () => this.hurtHero());
    if (ended.length > 0) {
      if (ticks.length === 0) this.owed.clear();
      this.setHeroFlame(false);
    }
    const on = this.hero.burning(HERO);
    this.fx.heroGlow(player.x, player.y, now, on);
    if (on) this.fx.sparks(HERO, player.x, player.y - 2, 10, dt);
  }

  /** One gentle tick: health drops with a small red number, but no knockback, stop, shake, rumble or hurt sound. */
  private hurtHero(): boolean {
    const { player, scene } = this.world;
    const hp = player.hp;
    if (!hurtPlayer(this.world, BURN.playerFraction, player.x, player.y, undefined, true)) return false;
    const lost = hp - player.hp;
    if (lost > 0) floatText(scene, player.x, player.y - 14, String(lost), FLAME_CSS, 8, 12, 500);
    return true;
  }

  private setEnemyFlame(enemy: Enemy, on: boolean): void {
    enemy.burning = on;
    if (enemy.active) enemy.applyBaseTint();
  }

  private setHeroFlame(on: boolean): void {
    if (on === this.heroBurning) return;
    this.heroBurning = on;
    this.events.emit('burning-changed', on);
  }

  /** A javelin's flame trail: a spark every so often, none when flashes are reduced. */
  spark(x: number, y: number): void {
    const now = this.world.clock.now;
    if (feel.reduced || now < this.nextSparkAt) return;
    this.nextSparkAt = now + SPARK_GAP_MS;
    this.fx.spark(x, y);
  }
}

const isLive = (enemy: Enemy): boolean => enemy.active && enemy.targetable;
