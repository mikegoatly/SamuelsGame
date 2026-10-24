import type { ChainSkill } from '../../content/skills';
import { chainDamage, chainTargets } from '../../logic/chainLightning';
import { lineClear } from '../../logic/lineOfSight';
import { playSfx } from '../sfx';
import { lightningBolt, sparkBurst } from './skillFx';
import { asTargets, dotEnemy, hurtEnemy, liveEnemies } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';
import { zonesFor } from './ZoneField';

const BOLT = 0xfff27a;
const FIZZLE_LENGTH = 26;
const FIELD_RADIUS = 22;
const FIELD_MS = 3000;
const FIELD_TICK_MS = 500;
const FIELD_DAMAGE = 0.3;

/** Chain Lightning: strikes the nearest enemy in the aim cone, then jumps to the nearest unhit ones; every hop needs a clear line. */
export class ChainLightningCaster implements SkillCaster<ChainSkill> {
  constructor(private readonly world: SkillWorld) {}

  cast({ x, y, aim, params }: CastCall<ChainSkill>): boolean {
    const { scene, isSolid } = this.world;
    const enemies = liveEnemies(this.world.enemies);
    const origin = { x, y };
    const chain = chainTargets(origin, aim, params, asTargets(enemies), (from, to) => lineClear(from, to, isSolid));
    if (chain.length === 0) {
      lightningBolt(scene, [origin, { x: x + aim.x * FIZZLE_LENGTH, y: y + aim.y * FIZZLE_LENGTH }], BOLT, 120);
      return false;
    }
    const hit = chain.map((index) => enemies[index]!);
    lightningBolt(scene, [origin, ...hit.map((e) => ({ x: e.x, y: e.y }))], BOLT);
    hit.forEach((enemy, jump) => {
      hurtEnemy(this.world, enemy, chainDamage(params.damage, params.falloff, jump), x, y);
      sparkBurst(scene, enemy.x, enemy.y, BOLT, 6, 50);
      if (params.twist) this.leaveField(enemy, params.damage);
    });
    playSfx(scene, 'zap');
    return true;
  }

  /** Level 5: every struck enemy leaves a crackling static field behind. */
  private leaveField(at: { x: number; y: number }, damage: number): void {
    zonesFor(this.world).spawn({
      x: at.x,
      y: at.y,
      radius: FIELD_RADIUS,
      durationMs: FIELD_MS,
      tickMs: FIELD_TICK_MS,
      color: BOLT,
      onTick: (enemy) => dotEnemy(this.world, enemy, damage * FIELD_DAMAGE, '#fff27a', 0xfff27a),
    });
  }
}
