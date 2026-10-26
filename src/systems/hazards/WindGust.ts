import { rectContains } from '../../logic/geometry';
import { windPhase, windVelocity } from '../../logic/hazard/wind';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { playSfx } from '../sfx';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { hazardTargets, playerAlive } from './victims';

const CHEVRON_GAP = 44;
const ENEMY_SHARE = 0.8;

/** Hash to 0..1 so streak positions are stable without storing them. */
const unit = (i: number, salt: number): number => Math.abs(Math.sin(i * 127.1 + salt * 311.7) * 43758.5453) % 1;

/** Periodic gusts across the whole room: chevrons flicker along the wind's heading for a second, then streaks fly and everyone is pushed. */
export class WindGust extends HazardBase {
  private readonly angle = ((this.spec.params.dir ?? 0) * Math.PI) / 180;
  private readonly level = this.spec.params.level ?? 1;
  private blown = -1;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec, 7);
    this.rest();
  }

  protected rest(): void {
    this.g.clear();
    this.world.player.windPush = { x: 0, y: 0 };
  }

  protected tick(now: number, dtMs: number): void {
    const { player } = this.world;
    const p = windPhase(now, this.offset);
    const push = windVelocity(p, this.angle, this.level);
    const inRoom = playerAlive(this.world) && rectContains(this.rect, player);
    player.windPush = inRoom ? push : { x: 0, y: 0 };
    if (push.x !== 0 || push.y !== 0) {
      const k = (dtMs / 1000) * ENEMY_SHARE;
      for (const enemy of hazardTargets(this.world)) if (rectContains(this.rect, enemy)) enemy.nudge(push.x * k, push.y * k);
    }
    this.g.clear();
    if (p.name === 'warn') this.chevrons(p.progress, now);
    else if (p.name === 'blow') this.streaks(p.progress, now);
    if (p.name === 'blow' && this.blown !== p.cycle) {
      this.blown = p.cycle;
      playSfx(this.world.scene, 'windGust');
    }
  }

  private chevrons(progress: number, now: number): void {
    const { x, y, w, h } = this.rect;
    const { player } = this.world;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const alpha = (0.2 + 0.5 * progress) * (Math.floor(now / 110) % 2 === 0 ? 1 : 0.65);
    const g = this.g.lineStyle(2, 0xffffff, alpha);
    for (let cx = x + CHEVRON_GAP / 2; cx < x + w; cx += CHEVRON_GAP) {
      for (let cy = y + CHEVRON_GAP / 2; cy < y + h; cy += CHEVRON_GAP) {
        if (Math.hypot(cx - player.x, cy - player.y) > 150) continue;
        const arm = (u: number, v: number): [number, number] => [cx + u * cos - v * sin, cy + u * sin + v * cos];
        const [ax, ay] = arm(-5, -6);
        const [bx, by] = arm(4, 0);
        const [dx, dy] = arm(-5, 6);
        g.beginPath().moveTo(ax, ay).lineTo(bx, by).lineTo(dx, dy).strokePath();
      }
    }
  }

  private streaks(progress: number, now: number): void {
    const { x, y, w, h } = this.rect;
    const alongX = Math.abs(Math.cos(this.angle)) > 0.5;
    const span = alongX ? w : h;
    const across = alongX ? h : w;
    const dir = Math.cos(this.angle) + Math.sin(this.angle) > 0 ? 1 : -1;
    const alpha = 0.45 * Math.min(1, progress * 4, (1 - progress) * 4 + 0.2);
    const g = this.g.lineStyle(1.5, 0xfff4d8, alpha);
    const count = 14 + this.level * 8;
    for (let i = 0; i < count; i++) {
      const speed = 300 + 160 * unit(i, 3);
      const len = 14 + 18 * unit(i, 5);
      const along = (((unit(i, 1) * span + dir * (now / 1000) * speed) % span) + span) % span;
      const lateral = unit(i, 2) * across;
      const px = alongX ? x + along : x + lateral;
      const py = alongX ? y + lateral : y + along;
      g.lineBetween(px, py, px - (alongX ? dir * len : 0), py - (alongX ? 0 : dir * len));
    }
  }

  override halt(): void {
    this.world.player.windPush = { x: 0, y: 0 };
    super.halt();
  }
}

export const windGust = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new WindGust(world, spec);
