import Phaser from 'phaser';
import { Frame, Tex } from '../content/assetKeys';
import type { WeaponDef } from '../content/weapons';
import type { Enemy } from '../entities/Enemy';
import { aimPoint } from '../logic/aimPoint';
import { DotTracker } from '../logic/dot';
import { fireballVictims } from '../logic/fireball';
import { pushCapped } from '../logic/heroTraps';
import { backOffFromWall, lineClear } from '../logic/lineOfSight';
import { lobFlightMs, lobPosition, lobProgress, SLUDGE } from '../logic/sludge';
import { muzzleFlash } from './fx';
import { playSfx } from './sfx';
import { ringBurst, sparkBurst } from './skills/skillFx';
import { asTargets, dotEnemy, hurtEnemy, liveEnemies, runOver } from './skills/targets';
import type { SkillWorld } from './skills/types';
import { zonesFor } from './skills/ZoneField';

const GOO = 0x7adf4a;
const HIT_REACH = 5;

interface Parts {
  blob: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  marker: Phaser.GameObjects.Arc;
}

interface Flying extends Parts {
  weapon: WeaponDef;
  from: { x: number; y: number };
  to: { x: number; y: number };
  startedAt: number;
  flightMs: number;
}

/** Sludge Slinger: lobs a blob in an arc to the aim point (a ring marks the landing); it bursts on landing, on an enemy or on a wall for a small blast and leaves a slowing puddle. Level 5: puddles also poison. */
export class SludgeSystem {
  private readonly flying = new Set<Flying>();
  private readonly spare: Parts[] = [];
  private readonly puddles: (() => void)[] = [];
  private readonly poison = new DotTracker<Enemy>();
  private poisonDamage = 0;

  constructor(private readonly world: SkillWorld) {
    const { scene, player } = world;
    player.lobHandler = (x, y, aim, distance, weapon) => this.lob(x, y, aim, distance, weapon);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private lob(x: number, y: number, aim: number, distance: number, weapon: WeaponDef): void {
    const { scene, clock, isSolid } = this.world;
    const direction = { x: Math.cos(aim), y: Math.sin(aim) };
    const from = { x: x + direction.x * 10, y: y + direction.y * 10 };
    const to = aimPoint(from, direction, Math.max(0, distance - 10), isSolid);
    const flightMs = lobFlightMs(Math.hypot(to.x - from.x, to.y - from.y), weapon.speed);
    const parts = this.spare.pop() ?? this.makeParts();
    parts.blob.setPosition(from.x, from.y).setVisible(true);
    parts.shadow.setPosition(from.x, from.y).setVisible(true);
    parts.marker.setPosition(to.x, to.y).setVisible(true);
    this.flying.add({ ...parts, weapon, from, to, startedAt: clock.now, flightMs });
    playSfx(scene, 'shoot', { rate: 0.6, volume: 0.9 });
    muzzleFlash(scene, from.x, from.y, aim, GOO);
  }

  private makeParts(): Parts {
    const { scene } = this.world;
    return {
      blob: scene.add.image(0, 0, Tex.tiles, Frame.blob).setDepth(10),
      shadow: scene.add.ellipse(0, 0, 8, 4, 0x000000, 0.3).setDepth(2),
      marker: scene.add.circle(0, 0, 7, GOO, 0.12).setStrokeStyle(1, GOO, 0.8).setDepth(2),
    };
  }

  private update(): void {
    if (this.flying.size === 0 && !this.poison.hasEntries()) return;
    if (runOver(this.world)) {
      for (const item of this.flying) this.discard(item);
      this.flying.clear();
      this.poison.clear();
      return;
    }
    const now = this.world.clock.now;
    for (const item of this.flying) {
      const t = lobProgress(now - item.startedAt, item.flightMs);
      const at = lobPosition(item.from, item.to, t, SLUDGE.arcPeak);
      item.blob.setPosition(at.x, at.y - at.lift).setRotation(t * 6);
      item.shadow.setPosition(at.x, at.y);
      if (t >= 1 || this.hitsSomething(at)) this.burst(item, at);
    }
    for (const enemy of this.poison.due(now)) {
      if (!enemy.active || !enemy.alive) this.poison.remove(enemy);
      else dotEnemy(this.world, enemy, this.poisonDamage, undefined, GOO);
    }
  }

  private hitsSomething(at: { x: number; y: number }): boolean {
    if (this.world.isSolid(at.x, at.y)) return true;
    for (const e of this.world.enemies.getChildren() as Enemy[]) {
      if (e.active && e.alive && e.targetable && Phaser.Math.Distance.Between(at.x, at.y, e.x, e.y) <= e.displayWidth / 2 + HIT_REACH) return true;
    }
    return false;
  }

  private discard(item: Flying): void {
    for (const object of [item.blob, item.shadow, item.marker]) object.setVisible(false);
    this.spare.push({ blob: item.blob, shadow: item.shadow, marker: item.marker });
  }

  private burst(item: Flying, at: { x: number; y: number }): void {
    this.flying.delete(item);
    this.discard(item);
    const { scene, isSolid } = this.world;
    const direction = { x: item.to.x - item.from.x, y: item.to.y - item.from.y };
    const { x, y } = backOffFromWall(at, direction, isSolid);
    const enemies = liveEnemies(this.world.enemies);
    for (const { index, multiplier } of fireballVictims({ x, y }, asTargets(enemies), SLUDGE.burstRadius, SLUDGE.burstEdgeDamage)) {
      const enemy = enemies[index]!;
      if (lineClear({ x, y }, enemy, isSolid)) hurtEnemy(this.world, enemy, item.weapon.baseDamage, x, y, multiplier, 0.6, 'basic');
    }
    ringBurst(scene, x, y, SLUDGE.burstRadius, GOO, 260);
    sparkBurst(scene, x, y, GOO, 10, 50);
    playSfx(scene, 'poison', { rate: 1.4, volume: 0.8 });
    this.leavePuddle(x, y, item.weapon);
  }

  private leavePuddle(x: number, y: number, weapon: WeaponDef): void {
    const { clock } = this.world;
    const poisons = weapon.activeTwist === 'poisonPuddle';
    if (poisons) this.poisonDamage = Math.max(1, weapon.baseDamage * SLUDGE.poisonShare);
    const cancel = zonesFor(this.world).spawn({
      x,
      y,
      radius: SLUDGE.puddleRadius,
      durationMs: SLUDGE.puddleMs,
      tickMs: SLUDGE.slowTickMs,
      color: GOO,
      onTick: (enemy) => {
        enemy.applySlow(SLUDGE.slowFactor, SLUDGE.slowMs);
        if (poisons) this.poison.apply(enemy, clock.now, SLUDGE.poisonLingerMs, SLUDGE.poisonTickMs);
      },
    });
    for (const old of pushCapped(this.puddles, cancel, SLUDGE.maxPuddles)) old();
  }
}
