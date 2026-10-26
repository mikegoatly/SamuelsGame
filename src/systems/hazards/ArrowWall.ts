import { rectContains } from '../../logic/geometry';
import { arrowHits, plateState, PLATE_TIMING, stepArrow, volleyLanes, type Arrow } from '../../logic/hazard/arrows';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { playSfx } from '../sfx';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { enemyRadius, hazardTargets, hurtEnemy, hurtPlayer, PLAYER_RADIUS, playerAlive } from './victims';
import { HAZARD_HITS } from '../../logic/hazard/hits';

const PLAYER_HIT = HAZARD_HITS.arrowWall.fraction;
const ENEMY_HIT = 0.2;
const SCAN_STEP = 8;

interface Lane {
  y: number;
  endX: number;
}

/** A pressure plate: step on it (or lure something onto it) and after a click a volley flies across the room from slits in the far wall. */
export class ArrowWall extends HazardBase {
  private readonly sign = this.spec.params.dir === 0 ? 1 : -1;
  private readonly emitX = this.spec.params.emitX ?? 0;
  private readonly lanes: Lane[];
  private readonly arrows: Arrow[] = [];
  private pressedAt: number | null = null;
  private fired = false;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec, 2);
    this.lanes = volleyLanes({ y: spec.params.stripY ?? 0, h: spec.params.stripH ?? 32 }).map((y) => ({ y, endX: this.scan(y) }));
    this.rest();
  }

  private scan(y: number): number {
    let x = this.emitX + this.sign * 10;
    for (let i = 0; i < 120 && !this.world.isSolid(x + this.sign * SCAN_STEP, y); i++) x += this.sign * SCAN_STEP;
    return x;
  }

  protected rest(): void {
    this.arrows.length = 0;
    this.pressedAt = null;
    this.fired = false;
    this.paint('armed', 0, false);
  }

  protected tick(now: number, dtMs: number): void {
    const state = plateState(this.pressedAt === null ? null : now - this.pressedAt);
    if (state === 'armed') {
      this.pressedAt = null;
      this.fired = false;
      if (this.steppedOn()) {
        this.pressedAt = now;
        playSfx(this.world.scene, 'plateClick');
      }
    } else if (state === 'cooldown' && !this.fired) {
      this.fire();
    }
    this.flyArrows(dtMs);
    this.paint(state, this.pressedAt === null ? 0 : now - this.pressedAt, Math.floor(now / 90) % 2 === 0);
  }

  private steppedOn(): boolean {
    const area = { x: this.rect.x + 2, y: this.rect.y + 2, w: this.rect.w - 4, h: this.rect.h - 4 };
    return (playerAlive(this.world) && rectContains(area, this.world.player)) || hazardTargets(this.world).some((e) => rectContains(area, e));
  }

  private fire(): void {
    this.fired = true;
    playSfx(this.world.scene, 'arrowShot');
    for (const lane of this.lanes) this.arrows.push({ x: this.emitX + this.sign * 10, y: lane.y, dir: this.sign as 1 | -1 });
  }

  private flyArrows(dtMs: number): void {
    const { player, isSolid } = this.world;
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i]!;
      stepArrow(arrow, dtMs);
      let spent = isSolid(arrow.x + arrow.dir * 4, arrow.y);
      if (!spent && playerAlive(this.world) && arrowHits(arrow, player, PLAYER_RADIUS)) spent = hurtPlayer(this.world, PLAYER_HIT, arrow.x - arrow.dir * 8, arrow.y) || spent;
      if (!spent) {
        const hit = hazardTargets(this.world).find((e) => arrowHits(arrow, e, enemyRadius(e)));
        if (hit) {
          hurtEnemy(hit, ENEMY_HIT, arrow.x - arrow.dir * 8, arrow.y, 0.4);
          spent = true;
        }
      }
      if (spent) this.arrows.splice(i, 1);
    }
  }

  private paint(state: 'armed' | 'click' | 'cooldown', elapsed: number, blink: boolean): void {
    const g = this.g.clear();
    const { x, y, w, h } = this.rect;
    const pressed = state !== 'armed';
    for (const lane of this.lanes) {
      g.fillStyle(0x0c0a10, 1).fillRect(this.emitX - 5, lane.y - 2, 10, 4);
      g.fillStyle(state === 'click' && blink ? 0xff5a3a : 0x6a2418, 1).fillRect(this.emitX - 3, lane.y - 1, 6, 2);
      if (state === 'click') {
        g.lineStyle(2, blink ? 0xff3a2a : 0xffb0a0, 0.55 + 0.4 * (elapsed / PLATE_TIMING.clickMs));
        for (let px = this.emitX + this.sign * 12; this.sign * (lane.endX - px) > 0; px += this.sign * 10) g.lineBetween(px, lane.y, px + this.sign * 5, lane.y);
      }
    }
    g.fillStyle(0x2c2832, 1).fillRect(x, y, w, h);
    g.fillStyle(pressed ? 0x4a2a2a : 0x6a4040, 1).fillRect(x + 2, y + (pressed ? 3 : 2), w - 4, h - (pressed ? 5 : 4));
    g.lineStyle(1.5, state === 'armed' ? 0xff5a4a : state === 'click' ? 0xffd070 : 0x7a7480, 1).strokeRect(x + 1, y + 1, w - 2, h - 2);
    for (const arrow of this.arrows) {
      g.lineStyle(2, 0xe8e0d0, 1).lineBetween(arrow.x - arrow.dir * 10, arrow.y, arrow.x, arrow.y);
      g.fillStyle(0xffffff, 1).fillTriangle(arrow.x + arrow.dir * 4, arrow.y, arrow.x, arrow.y - 3, arrow.x, arrow.y + 3);
    }
  }
}

export const arrowWall = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new ArrowWall(world, spec);
