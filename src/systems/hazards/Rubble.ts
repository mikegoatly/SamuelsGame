import Phaser from 'phaser';
import { Frame, Tex } from '../../content/assetKeys';
import type { Point } from '../../logic/geometry';
import { pickRubbleTarget, rockHits, rubblePhase, RUBBLE_RADIUS } from '../../logic/hazard/rubble';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { debrisBurst } from '../fx';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { enemyRadius, hazardTargets, hurtEnemy, hurtPlayer, PLAYER_RADIUS, playerAlive } from './victims';
import { HAZARD_HITS } from '../../logic/hazard/hits';

const PLAYER_HIT = HAZARD_HITS.rubble.fraction;
const ENEMY_HIT = 0.3;
const CYCLE_MS = 1900 + 1000 + 280;
const FALL_FROM = 150;
const SHAKE_RANGE = 220;

interface Slot {
  offset: number;
  cycle: number;
  target: Point;
  landed: boolean;
  rock: Phaser.GameObjects.Image;
}

/** Rocks drop at random spots, often near you: a shadow circle tightens for a second, then the rock lands and hurts everyone under it. */
export class Rubble extends HazardBase {
  private readonly slots: Slot[];

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec, 0.65);
    const count = Math.max(1, spec.params.rocks ?? 1);
    this.slots = Array.from({ length: count }, (_, i) => ({
      offset: spec.offsetMs + Math.round((i * CYCLE_MS) / count),
      cycle: -1,
      target: { x: 0, y: 0 },
      landed: true,
      rock: world.scene.add.image(0, 0, Tex.tiles, Frame.rocks).setScale(1.5).setTint(0xb0a898).setDepth(9).setVisible(false),
    }));
  }

  protected rest(): void {
    this.g.clear();
    for (const slot of this.slots) slot.rock.setVisible(false);
  }

  protected tick(now: number): void {
    this.g.clear();
    for (const slot of this.slots) this.step(slot, now);
  }

  private step(slot: Slot, now: number): void {
    const p = rubblePhase(now, slot.offset);
    if (p.cycle !== slot.cycle) {
      slot.cycle = p.cycle;
      slot.landed = false;
      const { player, isSolid } = this.world;
      slot.target = pickRubbleTarget(this.rect, playerAlive(this.world) ? player : null, Math.random, isSolid, 0.6, 28);
    }
    const { x, y } = slot.target;
    if (p.name === 'warn') {
      if (p.t < 40) playSfx(this.world.scene, 'rubbleWarn');
      const blink = p.progress > 0.7 && Math.floor(p.t / 90) % 2 === 0;
      this.g.fillStyle(0x000000, 0.12 + 0.38 * p.progress).fillEllipse(x, y, RUBBLE_RADIUS * 2, RUBBLE_RADIUS * 1.5);
      this.g.lineStyle(2, blink ? 0xffffff : 0xff4a30, 0.9).strokeEllipse(x, y, RUBBLE_RADIUS * 2 * (1.25 - 0.25 * p.progress), RUBBLE_RADIUS * 1.5 * (1.25 - 0.25 * p.progress));
      const drop = Math.max(0, (p.progress - 0.55) / 0.45);
      slot.rock.setVisible(drop > 0).setPosition(x, y - FALL_FROM * (1 - drop) * (1 - drop)).setRotation(drop * 5);
    } else if (p.name === 'impact') {
      if (!slot.landed) this.land(slot);
      this.g.fillStyle(0x1c1610, 0.5 * (1 - p.progress)).fillEllipse(x, y, RUBBLE_RADIUS * 1.6, RUBBLE_RADIUS * 1.1);
    } else {
      slot.rock.setVisible(false);
    }
  }

  private land(slot: Slot): void {
    const { scene, player } = this.world;
    const { x, y } = slot.target;
    slot.landed = true;
    slot.rock.setVisible(false);
    debrisBurst(scene, x, y);
    playSfx(scene, 'rubbleHit');
    if (Math.hypot(player.x - x, player.y - y) < SHAKE_RANGE) feel.shake(90, 0.003);
    if (playerAlive(this.world) && rockHits(slot.target, RUBBLE_RADIUS, player, PLAYER_RADIUS)) hurtPlayer(this.world, PLAYER_HIT, x, y);
    for (const enemy of hazardTargets(this.world)) if (rockHits(slot.target, RUBBLE_RADIUS, enemy, enemyRadius(enemy))) hurtEnemy(enemy, ENEMY_HIT, x, y);
  }

  override destroy(): void {
    for (const slot of this.slots) slot.rock.destroy();
    super.destroy();
  }
}

export const rubble = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new Rubble(world, spec);
