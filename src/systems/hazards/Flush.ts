import { rectContains } from '../../logic/geometry';
import { dirVector, flushArrows, flushPhase, flushVelocity, type FlushPhase } from '../../logic/hazard/flush';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { claimPush, releasePush } from './pushOwner';
import { playerAlive } from './victims';
import type { Enemy } from '../../entities/Enemy';

const ENEMY_SHARE = 0.8;
const FOAM = 0xe4fff0;
const WARN = 0xd6ff8a;

/** Hash to 0..1 so foam streak positions are stable without storing them. */
const unit = (i: number, salt: number): number => Math.abs(Math.sin(i * 127.1 + salt * 311.7) * 43758.5453) % 1;

/**
 * One stretch of a sludge channel that surges: a gurgle and chevrons marching downstream for a second, then for two seconds
 * everything standing in it (the player and ordinary monsters) is carried that way. No damage. The channel's stretches share
 * the room's wake-up time and offset, so the whole channel goes at once; bridges stay dry.
 */
export class Flush extends HazardBase {
  private readonly deg = this.spec.params.dir ?? 0;
  private startedAt = 0;
  private warned = -1;
  private surged = -1;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec, 0.62);
    this.rest();
  }

  override activate(): void {
    if (!this.live) this.startedAt = this.world.clock.now;
    super.activate();
  }

  protected rest(): void {
    this.g.clear();
    this.release();
  }

  protected tick(now: number, dtMs: number): void {
    const p = flushPhase(now - this.startedAt, this.offset);
    const push = flushVelocity(p, this.deg);
    const moving = push.x !== 0 || push.y !== 0;
    const { player } = this.world;
    if (moving && playerAlive(this.world) && rectContains(this.rect, player)) {
      claimPush(player, this, push);
    } else this.release();
    if (moving) {
      const k = (dtMs / 1000) * ENEMY_SHARE;
      for (const child of this.world.enemies.getChildren()) {
        const enemy = child as Enemy;
        if (enemy.active && enemy.alive && enemy.targetable && !enemy.def.boss && rectContains(this.rect, enemy)) enemy.nudge(push.x * k, push.y * k);
      }
    }
    this.cues(p);
    this.paint(p, now);
  }

  /** Gives the player's push back, but only if this stretch is the one holding it. */
  private release(): void {
    releasePush(this.world.player, this);
  }

  private cues(p: FlushPhase): void {
    if (p.name === 'warn' && this.warned !== p.cycle) {
      this.warned = p.cycle;
      playSfx(this.world.scene, 'gurgle');
    }
    if (p.name === 'push' && this.surged !== p.cycle) {
      this.surged = p.cycle;
      playSfx(this.world.scene, 'splash');
    }
  }

  private paint(p: FlushPhase, now: number): void {
    const g = this.g.clear();
    if (p.name === 'calm') return;
    const { x, y, w, h } = this.rect;
    const flicker = feel.reduced || Math.floor(now / 110) % 2 === 0 ? 1 : 0.65;
    if (p.name === 'warn') g.fillStyle(WARN, 0.06 + 0.12 * p.progress * flicker).fillRect(x, y, w, h);
    for (const arrow of flushArrows(this.rect, this.deg, p)) {
      const d = dirVector(arrow.angle);
      const n = { x: -d.y, y: d.x };
      const tip = { x: arrow.x + d.x * 5, y: arrow.y + d.y * 5 };
      g.lineStyle(2, p.name === 'warn' ? WARN : FOAM, arrow.alpha * flicker);
      g.beginPath().moveTo(arrow.x - d.x * 4 + n.x * 5, arrow.y - d.y * 4 + n.y * 5).lineTo(tip.x, tip.y).lineTo(arrow.x - d.x * 4 - n.x * 5, arrow.y - d.y * 4 - n.y * 5).strokePath();
    }
    if (p.name === 'push') this.foam(p, now);
  }

  /** Short pale streaks racing downstream over the channel while it surges. */
  private foam(p: FlushPhase, now: number): void {
    const { x, y, w, h } = this.rect;
    const alongX = Math.abs(dirVector(this.deg).x) > 0.5;
    const sign = dirVector(this.deg).x + dirVector(this.deg).y > 0 ? 1 : -1;
    const span = alongX ? w : h;
    const across = alongX ? h : w;
    const alpha = 0.5 * Math.min(1, p.t / 300, (2000 - p.t) / 300);
    const g = this.g.lineStyle(1.5, FOAM, Math.max(0, alpha));
    for (let i = 0; i < Math.max(4, Math.round(span / 14)); i++) {
      const len = 8 + 10 * unit(i, 5);
      const along = (((unit(i, 1) * span + sign * (now / 1000) * (180 + 120 * unit(i, 3))) % span) + span) % span;
      const lateral = unit(i, 2) * across;
      const px = alongX ? x + along : x + lateral;
      const py = alongX ? y + lateral : y + along;
      g.lineBetween(px, py, px - (alongX ? sign * len : 0), py - (alongX ? 0 : sign * len));
    }
  }

  override halt(): void {
    this.release();
    super.halt();
  }
}

export const flush = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new Flush(world, spec);
