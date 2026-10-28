import Phaser from 'phaser';
import { rectCenter } from '../../logic/geometry';
import { gasDensity, gasHurts, gasPhase } from '../../logic/hazard/vents';
import { HAZARD_HITS } from '../../logic/hazard/hits';
import { Cooldowns } from '../../logic/hazard/victims';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { puff, smokeEmitter, steady, type Emitter } from './emitters';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { dotEnemy, enemyRadius, hazardTargets, hurtPlayer, PLAYER_RADIUS, playerAlive } from './victims';

const TICK_MS = HAZARD_HITS.gasVent.gapMs;
const PLAYER_TICK = HAZARD_HITS.gasVent.fraction;
const ENEMY_TICK = 0.05;
const GAS = 0x9be84a;

/** A floor grate that hisses for a second, then breathes a poison cloud that ticks damage on anyone inside. */
export class GasVent extends HazardBase {
  protected readonly centre = rectCenter(this.spec.rect);
  protected readonly radius = this.spec.params.radius ?? 26;
  private readonly ticks = new Cooldowns<unknown>();
  private readonly mist: Emitter;
  private readonly carry = { value: 0 };
  private warned = -1;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec);
    this.mist = smokeEmitter(world.scene, 3, { speed: { min: 4, max: 18 }, lifespan: 900, scale: { start: 0.06, end: 0.19 }, alpha: { start: 0.5, end: 0 }, blendMode: Phaser.BlendModes.NORMAL });
    this.rest();
  }

  protected rest(): void {
    this.paint(0, 0);
  }

  protected tick(now: number, dtMs: number): void {
    const p = gasPhase(now, this.offset);
    const density = gasDensity(p);
    this.paint(density, p.name === 'warn' ? p.progress : 0);
    if (p.name === 'warn' && this.warned !== p.cycle) {
      this.warned = p.cycle;
      playSfx(this.world.scene, 'gasHiss');
    }
    const rate = p.name === 'on' ? 26 * density : p.name === 'warn' ? 6 : 0;
    const n = steady(this.carry, rate, dtMs);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * this.radius * (p.name === 'on' ? 0.9 : 0.25);
      puff(this.mist, this.centre.x + Math.cos(a) * r, this.centre.y + Math.sin(a) * r, GAS, 1);
    }
    if (gasHurts(p)) this.poison(now);
  }

  private poison(now: number): void {
    const { player } = this.world;
    const { x, y } = this.centre;
    if (playerAlive(this.world) && Math.hypot(player.x - x, player.y - y) <= this.radius + PLAYER_RADIUS) {
      this.ticks.tryTake('player', now, TICK_MS, () => hurtPlayer(this.world, PLAYER_TICK, player.x, player.y));
    }
    for (const enemy of hazardTargets(this.world)) {
      if (Math.hypot(enemy.x - x, enemy.y - y) <= this.radius + enemyRadius(enemy) && this.ticks.take(enemy, now, TICK_MS)) dotEnemy(enemy, ENEMY_TICK, '#8fe05a', 0x8fe05a);
    }
  }

  /** The resting look of the source: a floor grate (wall pipes draw nothing here, their sprite is the source). */
  protected drawSource(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x14180c, 0.85).fillCircle(x, y, 7);
    g.lineStyle(2, 0x4a5a24, 1).strokeCircle(x, y, 7);
    for (let i = -1; i <= 1; i++) g.lineStyle(1, 0x050804, 1).lineBetween(x - 5, y + i * 2.5, x + 5, y + i * 2.5);
  }

  private paint(density: number, warn: number): void {
    const { x, y } = this.centre;
    const g = this.g.clear();
    this.drawSource(g, x, y);
    if (density > 0) g.fillStyle(GAS, 0.1 + 0.22 * density).fillCircle(x, y, this.radius).lineStyle(2, GAS, 0.35 + 0.5 * density).strokeCircle(x, y, this.radius);
    if (warn > 0) this.warnRing(g, x, y, warn);
  }

  /** The pre-puff warning: a ring closing in on the cloud's edge (blinking, or steady when flashes are reduced). */
  protected warnRing(g: Phaser.GameObjects.Graphics, x: number, y: number, warn: number): void {
    const pulse = feel.reduced || Math.floor(warn * 8) % 2 === 0;
    g.lineStyle(2, pulse ? 0xe8ff7a : 0x5c7a1c, 0.85).strokeCircle(x, y, this.radius * (0.55 + 0.45 * warn));
  }

  override calm(): void {
    this.ticks.clear();
    super.calm();
  }

  override destroy(): void {
    this.mist.destroy();
    super.destroy();
  }
}

export const gasVent = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new GasVent(world, spec);
