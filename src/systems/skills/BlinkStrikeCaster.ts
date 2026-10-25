import { Tex } from '../../content/assetKeys';
import type { BlinkSkill } from '../../content/skills';
import { blinkDestination, pathVictims } from '../../logic/blinkStrike';
import type { Point } from '../../logic/geometry';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { sparkBurst } from './skillFx';
import { asTargets, dotEnemy, hurtEnemy, liveEnemies } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';
import { zonesFor } from './ZoneField';

const BODY_RADIUS = 5;
const MIN_TRAVEL = 6;
const GHOSTS = 5;
const BLINK = 0xc08cff;
const IMAGE_RADIUS = 22;
const IMAGE_MS = 2000;
const IMAGE_TICK_MS = 400;
const IMAGE_DAMAGE = 0.4;

/** Blink Strike: teleports toward the aim (stopping short of walls), hurts every enemy along the path and grants brief i-frames. */
export class BlinkStrikeCaster implements SkillCaster<BlinkSkill> {
  constructor(private readonly world: SkillWorld) {}

  cast({ x, y, aim, params }: CastCall<BlinkSkill>): boolean {
    const { scene, player, isSolid } = this.world;
    const from = { x: player.x, y: player.y };
    const to = blinkDestination(from, aim, params.distance, BODY_RADIUS, isSolid);
    if (Math.hypot(to.x - from.x, to.y - from.y) < MIN_TRAVEL) return false;
    const enemies = liveEnemies(this.world.enemies);
    for (const index of pathVictims(from, to, params.width, asTargets(enemies))) {
      hurtEnemy(this.world, enemies[index]!, params.damage, x, y, 1, 1.5);
    }
    this.afterimages(from, to);
    if (params.twist) this.leaveImage(from, params.damage);
    player.blinkTo(to.x, to.y, params.iframesMs);
    sparkBurst(scene, from.x, from.y, BLINK, 10, 60);
    sparkBurst(scene, to.x, to.y, BLINK, 10, 60);
    feel.shake(80, 0.003);
    playSfx(scene, 'blink');
    return true;
  }

  /** Level 5: a ghost of the hero stays where the blink began and burns anyone near it. */
  private leaveImage(at: Point, damage: number): void {
    zonesFor(this.world).spawn({
      x: at.x,
      y: at.y,
      radius: IMAGE_RADIUS,
      durationMs: IMAGE_MS,
      tickMs: IMAGE_TICK_MS,
      color: BLINK,
      ghost: true,
      onTick: (enemy) => dotEnemy(this.world, enemy, damage * IMAGE_DAMAGE, '#d0b0ff', 0xc08cff),
    });
  }

  /** Fading purple copies of the hero left along the path. */
  private afterimages(from: Point, to: Point): void {
    const { scene } = this.world;
    for (let i = 0; i < GHOSTS; i++) {
      const t = i / GHOSTS;
      const ghost = scene.add.image(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, Tex.tiles, this.world.player.hero.frame).setTint(BLINK).setAlpha(0.7).setDepth(9);
      ghost.setFlipX(to.x < from.x);
      scene.tweens.add({ targets: ghost, alpha: 0, duration: 260 + i * 40, onComplete: () => ghost.destroy() });
    }
  }
}
