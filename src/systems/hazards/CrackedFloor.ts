import type Phaser from 'phaser';
import { crackState, safeExit, type CrackState } from '../../logic/hazard/crack';
import { rectContains } from '../../logic/geometry';
import { HAZARD_HITS } from '../../logic/hazard/hits';
import { Cooldowns } from '../../logic/hazard/victims';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { HazardBase } from './HazardBase';
import { enemyRadius, hazardTargets, hurtEnemy, hurtPlayer, PLAYER_RADIUS, playerAlive } from './victims';
import type { Hazard, HazardWorld } from './types';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';

const PLAYER_FALL = HAZARD_HITS.crackedFloor.fraction;
const ENEMY_FALL = 0.25;
const EXIT_MARGIN = 9;
const SAFE_MS = 700;

/** A slab that cracks when stepped on, drops into a pit after 0.8s (hurting and ejecting whoever is in it) and slowly re-forms. */
export class CrackedFloor extends HazardBase {
  private steppedAt: number | null = null;
  private drawn = '';
  private readonly falls = new Cooldowns<unknown>();

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec);
    this.rest();
  }

  protected rest(): void {
    this.paint('intact', 0, 0);
  }

  protected tick(now: number): void {
    const { player, clock } = this.world;
    const state = crackState(this.steppedAt === null ? null : now - this.steppedAt);
    if (state === 'intact') {
      this.steppedAt = null;
      if (this.occupied(player.x, player.y, playerAlive(this.world)) || hazardTargets(this.world).some((e) => this.inside(e.x, e.y))) {
        this.steppedAt = now;
        playSfx(this.world.scene, 'crack');
      }
    } else if (state === 'pit') {
      this.dropVictims(now);
    }
    const elapsed = this.steppedAt === null ? 0 : now - this.steppedAt;
    this.paint(state, elapsed, clock.now);
  }

  private inside(x: number, y: number): boolean {
    return rectContains({ x: this.rect.x + 1, y: this.rect.y + 1, w: this.rect.w - 2, h: this.rect.h - 2 }, { x, y });
  }

  private occupied(x: number, y: number, alive: boolean): boolean {
    return alive && this.inside(x, y);
  }

  private dropVictims(now: number): void {
    const { player, isSolid } = this.world;
    if (this.occupied(player.x, player.y, playerAlive(this.world))) {
      this.falls.tryTake('player', now, 1200, () => {
        const hurt = hurtPlayer(this.world, PLAYER_FALL, player.x, player.y);
        if (!hurt && player.invulnerable) return false;
        const out = safeExit(this.rect, player, EXIT_MARGIN, PLAYER_RADIUS, isSolid);
        playSfx(this.world.scene, 'pitFall');
        feel.shake(110, 0.004);
        if (out) player.blinkTo(out.x, out.y, hurt ? SAFE_MS : 250);
        return true;
      });
    }
    for (const enemy of hazardTargets(this.world)) {
      if (!this.inside(enemy.x, enemy.y) || !this.falls.take(enemy, now, 1500)) continue;
      hurtEnemy(enemy, ENEMY_FALL, enemy.x, enemy.y);
      const out = safeExit(this.rect, enemy, EXIT_MARGIN, enemyRadius(enemy), isSolid);
      if (out) enemy.nudge(out.x - enemy.x, out.y - enemy.y);
    }
  }

  private paint(state: CrackState, elapsed: number, clock: number): void {
    const blink = state === 'cracking' && Math.floor(clock / 90) % 2 === 0;
    const key = `${state}${blink ? 1 : 0}${state === 'reforming' ? Math.floor(clock / 120) % 2 : ''}${state === 'cracking' ? Math.floor(elapsed / 200) : ''}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const { x, y, w, h } = this.rect;
    const g = this.g.clear();
    if (state === 'pit' || state === 'reforming') {
      const shrink = state === 'reforming' ? 3 + (Math.floor(clock / 120) % 2) * 2 : 0;
      g.fillStyle(0x0a0608, 0.95).fillRect(x + shrink, y + shrink, w - 2 * shrink, h - 2 * shrink);
      g.fillStyle(0x2a1c14, 1).fillRect(x + shrink, y + shrink, w - 2 * shrink, 3);
      g.lineStyle(2, state === 'pit' ? 0x6a4a2c : 0x8a8a6a, 1).strokeRect(x + shrink + 1, y + shrink + 1, w - 2 * shrink - 2, h - 2 * shrink - 2);
      return;
    }
    const heat = state === 'cracking' ? Math.min(1, 0.35 + elapsed / 900) : 0;
    g.fillStyle(blink ? 0x6a3a1a : 0x000000, state === 'cracking' ? 0.35 : 0.1).fillRect(x, y, w, h);
    g.lineStyle(state === 'cracking' ? 2 : 1, state === 'cracking' ? (blink ? 0xff8a3a : 0xffd070) : 0x2a2018, state === 'cracking' ? 0.6 + heat * 0.4 : 0.75);
    this.cracks(g, x, y, w, h, state === 'cracking' ? 1 + Math.floor(elapsed / 270) : 0);
    g.lineStyle(1, 0x2a2018, 0.7).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  private cracks(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, extra: number): void {
    const lines: [number, number, number, number][] = [
      [0.1, 0.2, 0.45, 0.5], [0.45, 0.5, 0.4, 0.9], [0.45, 0.5, 0.9, 0.35], [0.7, 0.4, 0.75, 0.85], [0.2, 0.7, 0.45, 0.5], [0.6, 0.1, 0.7, 0.4],
    ];
    lines.slice(0, 3 + extra).forEach(([a, b, c, d]) => g.lineBetween(x + a * w, y + b * h, x + c * w, y + d * h));
  }

  override calm(): void {
    this.steppedAt = null;
    this.falls.clear();
    this.drawn = '';
    super.calm();
  }
}

export const crackedFloor = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new CrackedFloor(world, spec);
