import type Phaser from 'phaser';
import { blastHitOnMonster } from '../../logic/blastDamage';
import { damageToPlayer, enemyDamage } from '../../logic/combat';
import { novaVictims } from '../../logic/frostNova';
import { explosionBlast } from '../../systems/skills/skillFx';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import type { Enemy } from '../Enemy';
import type { Player } from '../Player';
import type { EnemyWorld } from './types';

export interface BlastSpec {
  x: number;
  y: number;
  radius: number;
  /** Base damage before level scaling, for the player. */
  base: number;
  level: number;
  /** Monsters take `monsterShare` of the player's damage. */
  monsterShare?: number;
  /** The bomber itself is never hurt by its own blast. */
  except?: Enemy;
}

const MONSTER_SHARE = 2.5;

/** One explosion: hurts the player and every other monster in reach, with a pixel blast and a short shake. */
export function detonate(scene: Phaser.Scene, world: EnemyWorld, player: Player, spec: BlastSpec): void {
  explosionBlast(scene, spec.x, spec.y, spec.radius);
  playSfx(scene, 'bombBlast');
  feel.shake(120, 0.006);
  if (Math.hypot(player.x - spec.x, player.y - spec.y) <= spec.radius + 4) {
    player.takeDamage(damageToPlayer(spec.base, spec.level, player.level), spec.x, spec.y, 'hazard');
  }
  const victims = world.all().filter((e) => e !== spec.except && e.targetable);
  const hit = novaVictims({ x: spec.x, y: spec.y }, spec.radius, victims.map((e) => ({ x: e.x, y: e.y, reach: e.displayWidth / 2 })));
  for (const index of hit) {
    const enemy = victims[index]!;
    const hurt = blastHitOnMonster(Math.round(enemyDamage(spec.base, spec.level) * (spec.monsterShare ?? MONSTER_SHARE)), enemy.def.boss === true);
    enemy.takeHit(hurt.damage, enemy.x - spec.x, enemy.y - spec.y, hurt.knockback, 'skill');
  }
}

/** A red disc that swells over `ms`, then calls `then` (volatile elites and jester bombs warn before they go off). */
export function telegraphBlast(scene: Phaser.Scene, x: number, y: number, radius: number, ms: number, then: () => void): void {
  const ring = scene.add.circle(x, y, radius, 0xff3a2a, 0.16).setStrokeStyle(2, 0xff6a4a, 0.9).setDepth(3);
  const fill = scene.add.circle(x, y, radius, 0xff3a2a, 0.4).setDepth(3).setScale(0.05);
  scene.tweens.add({ targets: fill, scale: 1, duration: ms, ease: 'Quad.easeIn' });
  scene.time.delayedCall(ms, () => {
    ring.destroy();
    fill.destroy();
    then();
  });
}
