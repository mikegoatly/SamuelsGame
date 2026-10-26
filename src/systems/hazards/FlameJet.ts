import Phaser from 'phaser';
import { rectContains, rectCenter, type Rect } from '../../logic/geometry';
import { flamePhase, jetHurts } from '../../logic/hazard/vents';
import { Cooldowns } from '../../logic/hazard/victims';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { emberBurst } from '../fx';
import { playSfx } from '../sfx';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { dotEnemy, hazardTargets, hurtPlayer, playerAlive } from './victims';

const TICK_MS = 700;
const PLAYER_HIT = 0.15;
const ENEMY_HIT = 0.14;
const WALL_HALF = 8;

/** A nozzle in the wall: idle, then a flickering glow along the reach for almost a second, then a column of flame for a second. */
export class FlameJet extends HazardBase {
  private readonly vertical = this.rect.h > this.rect.w;
  private readonly dirSign = (this.spec.params.dir ?? 90) === 90 || this.spec.params.dir === 0 ? 1 : -1;
  private readonly reach = this.vertical ? this.rect.h : this.rect.w;
  private readonly hits = new Cooldowns<unknown>();
  private fired = -1;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec, 2);
    this.rest();
  }

  protected rest(): void {
    this.paint('idle', 0, 0);
  }

  /** Nozzle centre on the wall tile behind the reach. */
  private get nozzle(): { x: number; y: number } {
    const c = rectCenter(this.rect);
    const back = this.reach / 2 + WALL_HALF;
    return this.vertical ? { x: c.x, y: c.y - this.dirSign * back } : { x: c.x - this.dirSign * back, y: c.y };
  }

  /** Strip of the reach from `from` to `to` px out of the nozzle, `half` wide each side. */
  private strip(from: number, to: number, half: number): Rect {
    const n = this.nozzle;
    const a = WALL_HALF + from;
    const b = WALL_HALF + to;
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
    return this.vertical
      ? { x: n.x - half, y: this.dirSign > 0 ? n.y + lo : n.y - hi, w: half * 2, h: hi - lo }
      : { x: this.dirSign > 0 ? n.x + lo : n.x - hi, y: n.y - half, w: hi - lo, h: half * 2 };
  }

  protected tick(now: number): void {
    const p = flamePhase(now, this.offset);
    this.paint(p.name, p.progress, now);
    if (p.name === 'jet' && this.fired !== p.cycle) {
      this.fired = p.cycle;
      playSfx(this.world.scene, 'flameJet');
      const n = this.nozzle;
      emberBurst(this.world.scene, n.x, n.y, 5);
    }
    if (jetHurts(p)) this.scorch(now, Math.min(1, p.t / 140));
  }

  private scorch(now: number, extent: number): void {
    const { player } = this.world;
    const zone = this.strip(0, this.reach * extent, 8);
    const area = { x: zone.x - 1, y: zone.y - 1, w: zone.w + 2, h: zone.h + 2 };
    if (playerAlive(this.world) && rectContains(area, player) && this.hits.take('player', now, TICK_MS)) hurtPlayer(this.world, PLAYER_HIT, player.x, player.y);
    for (const enemy of hazardTargets(this.world)) if (rectContains(area, enemy) && this.hits.take(enemy, now, TICK_MS)) dotEnemy(enemy, ENEMY_HIT, '#ff9a3c', 0xff8a3c);
  }

  private paint(phase: string, progress: number, now = 0): void {
    const g = this.g.clear();
    const n = this.nozzle;
    if (phase === 'warn') {
      const blink = Math.floor(progress * 9) % 2 === 0;
      const zone = this.strip(0, this.reach, 8);
      g.fillStyle(0xff5a20, 0.12 + 0.2 * progress).fillRect(zone.x, zone.y, zone.w, zone.h);
      g.lineStyle(1, blink ? 0xffe070 : 0xff4a20, 0.9).strokeRect(zone.x + 0.5, zone.y + 0.5, zone.w - 1, zone.h - 1);
    }
    if (phase === 'jet') this.flame(g, Math.min(1, (progress * 1000) / 140), now);
    g.fillStyle(0x3a2a18, 1).fillCircle(n.x, n.y, 6.5).lineStyle(2, phase === 'idle' ? 0x9a7a3a : 0xffa030, 1).strokeCircle(n.x, n.y, 6.5);
    g.fillStyle(phase === 'warn' ? 0xff7a30 : 0x120a06, 1).fillCircle(n.x, n.y, phase === 'warn' ? 2 + 2 * progress : 2.4);
  }

  private flame(g: Phaser.GameObjects.Graphics, extent: number, now: number): void {
    const flicker = 1 - 0.06 * Math.sin(now / 35);
    const len = this.reach * extent * flicker;
    for (const [half, color, alpha] of [[8, 0xff5a1c, 0.8], [5.5, 0xffa828, 0.9], [2.8, 0xfff2b0, 1]] as const) {
      const r = this.strip(0, len, half);
      g.fillStyle(color, alpha).fillRect(r.x, r.y, r.w, r.h);
    }
  }

  override calm(): void {
    this.hits.clear();
    super.calm();
  }
}

export const flameJet = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new FlameJet(world, spec);
