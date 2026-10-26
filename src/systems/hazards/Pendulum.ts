import { bladeHits, bladeTip, pendulumAngle, type PendulumSwing } from '../../logic/hazard/pendulum';
import { Cooldowns } from '../../logic/hazard/victims';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { playSfx } from '../sfx';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { enemyRadius, hazardTargets, hurtEnemy, hurtPlayer, PLAYER_RADIUS, playerAlive } from './victims';

const BLADE_RADIUS = 5;
const BLADE_FROM = 0.35;
const PLAYER_HIT = 0.14;
const ENEMY_HIT = 0.25;
const HIT_GAP_MS = 850;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** A blade swinging on an arm around a fixed pivot; the swept arc is always shown, so the danger zone can be read before it comes round. */
export class Pendulum extends HazardBase {
  private readonly pivot = { x: this.spec.params.pivotX ?? 0, y: this.spec.params.pivotY ?? 0 };
  private readonly length = this.spec.params.length ?? 30;
  private readonly swing: PendulumSwing = { base: rad(this.spec.params.base ?? 90), amplitude: rad(this.spec.params.amp ?? 60), periodMs: this.spec.params.period ?? 2600 };
  private readonly hits = new Cooldowns<unknown>();
  private lastSide = 0;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec, 2);
    this.rest();
  }

  protected rest(): void {
    this.paint(this.swing.base, false);
  }

  protected tick(now: number): void {
    const angle = pendulumAngle(now, this.offset, this.swing);
    this.paint(angle, true);
    const side = Math.sign(angle - this.swing.base);
    if (side !== this.lastSide && this.lastSide !== 0 && Math.hypot(this.world.player.x - this.pivot.x, this.world.player.y - this.pivot.y) < 150) playSfx(this.world.scene, 'bladeSwish');
    this.lastSide = side;
    const tip = bladeTip(this.pivot, angle, this.length);
    const from = bladeTip(this.pivot, angle, this.length * BLADE_FROM);
    const { player } = this.world;
    if (playerAlive(this.world) && bladeHits(from, tip, BLADE_RADIUS, player, PLAYER_RADIUS) && this.hits.take('player', now, HIT_GAP_MS)) {
      hurtPlayer(this.world, PLAYER_HIT, tip.x, tip.y, 'bladeSwish');
    }
    for (const enemy of hazardTargets(this.world)) {
      if (bladeHits(from, tip, BLADE_RADIUS, enemy, enemyRadius(enemy)) && this.hits.take(enemy, now, HIT_GAP_MS)) hurtEnemy(enemy, ENEMY_HIT, tip.x, tip.y);
    }
  }

  private paint(angle: number, moving: boolean): void {
    const { x, y } = this.pivot;
    const g = this.g.clear();
    const { base, amplitude } = this.swing;
    g.fillStyle(0xff3a3a, moving ? 0.1 : 0.05).slice(x, y, this.length + BLADE_RADIUS, base - amplitude, base + amplitude, false).fillPath();
    g.lineStyle(1, 0xff5a4a, moving ? 0.5 : 0.25).beginPath().arc(x, y, this.length + BLADE_RADIUS, base - amplitude, base + amplitude, false).strokePath();
    const tip = bladeTip(this.pivot, angle, this.length);
    g.lineStyle(3, 0x8a8478, 1).lineBetween(x, y, tip.x, tip.y);
    g.fillStyle(0xcfd4e0, 1).fillCircle(tip.x, tip.y, BLADE_RADIUS);
    g.lineStyle(1.5, 0xff4a3a, 1).strokeCircle(tip.x, tip.y, BLADE_RADIUS);
    g.fillStyle(0x2a2630, 1).fillCircle(x, y, 4.5).lineStyle(1.5, 0xd8b050, 1).strokeCircle(x, y, 4.5);
  }

  override calm(): void {
    this.hits.clear();
    this.lastSide = 0;
    super.calm();
  }
}

export const pendulum = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new Pendulum(world, spec);
