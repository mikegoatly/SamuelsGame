import { strikeAt } from '../strikes';
import type { NovaSkill } from '../../content/skills';
import { novaVictims } from '../../logic/frostNova';
import { lineClear } from '../../logic/lineOfSight';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { ringBurst, sparkBurst } from './skillFx';
import { asTargets, hurtEnemy, liveEnemies } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';

const FROST = 0x7ad8ff;
const FREEZE_MS = 1000;

/** Frost Nova: an instant ring around the player that hurts and slows every enemy it reaches (walls block it). Level 5 also freezes them solid for a second. */
export class FrostNovaCaster implements SkillCaster<NovaSkill> {
  constructor(private readonly world: SkillWorld) {}

  cast({ x, y, params }: CastCall<NovaSkill>): boolean {
    const { scene, isSolid } = this.world;
    const enemies = liveEnemies(this.world.enemies);
    const centre = { x, y };
    for (const index of novaVictims(centre, params.radius, asTargets(enemies))) {
      const enemy = enemies[index]!;
      if (!lineClear(centre, enemy, isSolid)) continue;
      hurtEnemy(this.world, enemy, params.damage, x, y);
      enemy.applySlow(params.slowFactor, params.slowMs);
      if (params.twist) enemy.stun(FREEZE_MS);
      sparkBurst(scene, enemy.x, enemy.y, FROST, 5, 40);
    }
    strikeAt(scene, x, y, params.radius);
    ringBurst(scene, x, y, params.radius, FROST);
    ringBurst(scene, x, y, params.radius * 0.7, 0xffffff, 260);
    sparkBurst(scene, x, y, FROST, 16, params.radius * 1.4);
    feel.shake(90, 0.003);
    playSfx(scene, 'frostNova');
    return true;
  }
}
