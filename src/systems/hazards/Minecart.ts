import Phaser from 'phaser';
import { MinesFrame, Tex } from '../../content/assetKeys';
import { MINES_TINT } from '../../content/minesTint';
import { HAZARD_HITS } from '../../logic/hazard/hits';
import { cartAt, cartEntry, cartHits, cartPhaseSince, nearRail, railLength, railOf, type Rail } from '../../logic/hazard/minecart';
import { Cooldowns } from '../../logic/hazard/victims';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { enemyRadius, hazardTargets, hurtEnemy, hurtPlayer, PLAYER_RADIUS, playerAlive } from './victims';

const PLAYER_HIT = HAZARD_HITS.minecart.fraction;
const ENEMY_HIT = 0.3;
/** One hit per victim per run: a cart is gone long before this. */
const PASS_GAP_MS = 2500;
const TIE_GAP = 8;

/** A rail across the room: it glows and rumbles for 1.2s with an arrow at the end the cart comes from, then a cart rattles through and hurts whoever is on the rail, monsters too. */
export class Minecart extends HazardBase {
  private readonly rail: Rail = railOf(this.rect);
  private readonly cart: Phaser.GameObjects.Image;
  private readonly hits = new Cooldowns<unknown>();
  private rumbledCycle = -1;
  private startedAt = 0;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec, 0.62);
    const vertical = Math.abs(this.rail.b.y - this.rail.a.y) > Math.abs(this.rail.b.x - this.rail.a.x);
    this.cart = world.scene.add.image(0, 0, Tex.mines, MinesFrame.minecart).setScale(1.4).setDepth(5.5).setVisible(false).setRotation(vertical ? Math.PI / 2 : 0);
    this.rest();
  }

  override activate(): void {
    if (!this.live) {
      this.startedAt = this.world.clock.now;
      this.rumbledCycle = -1;
    }
    super.activate();
  }

  protected rest(): void {
    this.cart.setVisible(false);
    this.paint(0);
  }

  protected tick(now: number): void {
    const { scene, player } = this.world;
    const phase = cartPhaseSince(now - this.startedAt, this.offset, this.rail);
    const warn = phase.name === 'warn' ? phase.progress : 0;
    if (phase.name === 'warn' && this.rumbledCycle !== phase.cycle) {
      this.rumbledCycle = phase.cycle;
      if (nearRail(this.rail, player)) playSfx(scene, 'rumble');
    }
    const pos = cartAt(this.rail, phase);
    this.cart.setVisible(pos !== null);
    this.paint(warn, phase.cycle, now);
    if (!pos) return;
    const { dir } = cartEntry(this.rail, phase.cycle);
    const rattle = feel.reduced ? 0 : Math.sin(now / 22) * 0.6;
    this.cart.setPosition(pos.x + (dir.y !== 0 ? rattle : 0), pos.y + (dir.x !== 0 ? rattle : 0)).setFlipX(dir.x < 0 || dir.y < 0);
    if (playerAlive(this.world) && cartHits(pos, player, PLAYER_RADIUS)) {
      this.hits.tryTake('player', now, PASS_GAP_MS, () => hurtPlayer(this.world, PLAYER_HIT, pos.x - dir.x * 8, pos.y - dir.y * 8, 'rubbleHit'));
    }
    for (const enemy of hazardTargets(this.world)) {
      if (cartHits(pos, enemy, enemyRadius(enemy)) && this.hits.take(enemy, now, PASS_GAP_MS)) hurtEnemy(enemy, ENEMY_HIT, pos.x - dir.x * 8, pos.y - dir.y * 8, 1);
    }
  }

  private paint(warn: number, cycle = 0, now = 0): void {
    const { a, b } = this.rail;
    const g = this.g.clear();
    const length = railLength(this.rail) || 1;
    const dx = (b.x - a.x) / length;
    const dy = (b.y - a.y) / length;
    const [nx, ny] = [-dy, dx];
    const pulse = feel.reduced ? 1 : 0.6 + 0.4 * Math.sin(now / 70);
    if (warn > 0) g.lineStyle(9, MINES_TINT.railGlow, (0.12 + 0.2 * warn) * pulse).lineBetween(a.x, a.y, b.x, b.y);
    for (let d = 2; d < length; d += TIE_GAP) g.lineStyle(2, 0x4a3524, 0.9).lineBetween(a.x + dx * d - nx * 4, a.y + dy * d - ny * 4, a.x + dx * d + nx * 4, a.y + dy * d + ny * 4);
    const colour = warn > 0 ? MINES_TINT.railGlow : MINES_TINT.rail;
    for (const side of [-2.5, 2.5]) g.lineStyle(1.5, colour, warn > 0 ? 0.6 + 0.4 * pulse : 0.85).lineBetween(a.x + nx * side, a.y + ny * side, b.x + nx * side, b.y + ny * side);
    if (warn > 0) this.arrow(cycle, pulse);
  }

  /** Chevrons at the end the cart will come out of, pointing the way it will go. */
  private arrow(cycle: number, pulse: number): void {
    const { from, dir } = cartEntry(this.rail, cycle);
    const g = this.g;
    for (let i = 0; i < 3; i++) {
      const [cx, cy] = [from.x + dir.x * (10 + i * 9), from.y + dir.y * (10 + i * 9)];
      const [px, py] = [-dir.y, dir.x];
      g.lineStyle(2.5, 0xff4a30, pulse).lineBetween(cx - dir.x * 4 + px * 6, cy - dir.y * 4 + py * 6, cx + dir.x * 3, cy + dir.y * 3).lineBetween(cx + dir.x * 3, cy + dir.y * 3, cx - dir.x * 4 - px * 6, cy - dir.y * 4 - py * 6);
    }
  }

  override calm(): void {
    this.hits.clear();
    super.calm();
  }

  override destroy(): void {
    this.cart.destroy();
    super.destroy();
  }
}

export const minecart = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new Minecart(world, spec);
