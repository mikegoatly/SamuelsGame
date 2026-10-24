import type { ChainSkill } from '../../content/skills';
import { chainDamage, chainTargets } from '../../logic/chainLightning';
import { lineClear } from '../../logic/lineOfSight';
import { playSfx } from '../sfx';
import { lightningBolt, sparkBurst } from './skillFx';
import { asTargets, hurtEnemy, liveEnemies } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';

const BOLT = 0xfff27a;
const FIZZLE_LENGTH = 26;

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
    });
    playSfx(scene, 'zap');
    return true;
  }
}
