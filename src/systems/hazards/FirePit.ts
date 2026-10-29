import Phaser from 'phaser';
import { rectContains } from '../../logic/geometry';
import type { Enemy } from '../../entities/Enemy';
import { BURN } from '../../logic/burning';
import { HAZARD_HITS } from '../../logic/hazard/hits';
import { Cooldowns } from '../../logic/hazard/victims';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { puff, smokeEmitter, steady, type Emitter } from './emitters';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { dotEnemy, hazardTargets, hurtPlayer, playerAlive } from './victims';

const TICK_MS = HAZARD_HITS.firePit.gapMs;
const PLAYER_TICK = HAZARD_HITS.firePit.fraction;
const ENEMY_TICK = 0.06;

/** Charred tiles that burn for as long as the level lasts: a flickering glow, rising flames, and a burn tick on anyone standing in them. */
export class FirePit extends HazardBase {
  private readonly ticks = new Cooldowns<unknown>();
  private readonly flames: Emitter;
  private readonly carry = { value: 0 };
  private occupants = new Set<unknown>();

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec);
    this.flames = smokeEmitter(world.scene, 2.5, {
      speedY: { min: -34, max: -14 },
      speedX: { min: -6, max: 6 },
      lifespan: 520,
      scale: { start: 0.05, end: 0.01 },
      alpha: { start: 0.85, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.rest();
  }

  protected rest(): void {
    this.paint(0, false);
  }

  /** Fire does not calm when the room is cleared; only a finished run puts it out. */
  override calm(): void {}

  override halt(): void {
    this.live = false;
    this.paint(0, false);
  }

  protected tick(now: number, dtMs: number): void {
    const flicker = 0.55 + 0.25 * Math.sin(now / 130) + 0.2 * Math.sin(now / 53);
    this.paint(flicker, true);
    const { x, y, w, h } = this.rect;
    const n = steady(this.carry, w * h * 0.07, dtMs);
    for (let i = 0; i < n; i++) puff(this.flames, x + 3 + Math.random() * (w - 6), y + h * 0.4 + Math.random() * h * 0.6, Math.random() < 0.4 ? 0xffd860 : 0xff7a28, 1);
    this.burn(now);
  }

  /** Standing in the pit, only the pit's own tick applies; the burn starts (and keeps refreshing) once the target steps out, so the fire lingers. */
  private burn(now: number): void {
    const { player, burn } = this.world;
    const area = { x: this.rect.x - 1, y: this.rect.y - 1, w: this.rect.w + 2, h: this.rect.h + 2 };
    const inside = new Set<unknown>();
    if (playerAlive(this.world) && rectContains(area, player)) {
      inside.add(player);
      this.ticks.tryTake('player', now, TICK_MS, () => hurtPlayer(this.world, PLAYER_TICK, player.x, player.y));
      burn?.hold(player);
    }
    for (const enemy of hazardTargets(this.world)) {
      if (!rectContains(area, enemy)) continue;
      inside.add(enemy);
      if (this.ticks.take(enemy, now, TICK_MS)) dotEnemy(enemy, ENEMY_TICK, '#ff9a3c', 0xff8a3c);
      burn?.hold(enemy);
    }
    for (const was of this.occupants) if (!inside.has(was)) this.leave(was);
    this.occupants = inside;
  }

  private leave(who: unknown): void {
    const { burn, player } = this.world;
    if (who === player) burn?.ignitePlayer();
    else burn?.igniteEnemy(who as Enemy, { fraction: BURN.pitEnemyFraction });
  }

  private paint(glow: number, lit: boolean): void {
    const { x, y, w, h } = this.rect;
    const g = this.g.clear();
    if (lit) g.fillStyle(0xff7a20, 0.12 + 0.12 * glow).fillRect(x - 4, y - 4, w + 8, h + 8);
    g.fillStyle(0x1a0e0a, 0.92).fillRect(x, y, w, h);
    g.lineStyle(2, lit ? 0xff8a30 : 0x6a4a3a, 1).strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle(lit ? 0xff6a1c : 0x5a3a2a, lit ? 0.35 + 0.35 * glow : 0.8).fillRect(x + 3, y + 3, w - 6, h - 6);
    if (lit) g.fillStyle(0xffd070, 0.25 + 0.3 * glow).fillRect(x + 6, y + 6, w - 12, h - 12);
  }

  override destroy(): void {
    this.flames.destroy();
    super.destroy();
  }
}

export const firePit = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new FirePit(world, spec);
