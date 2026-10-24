import Phaser from 'phaser';
import type { WolfSkill } from '../../content/skills';
import type { Enemy } from '../../entities/Enemy';
import { SpiritWolf } from '../../entities/SpiritWolf';
import { lineClear } from '../../logic/lineOfSight';
import { StuckWatch, biteReady, nearestTarget, packSpawnOffsets } from '../../logic/spiritWolf';
import { playSfx } from '../sfx';
import { sparkBurst } from './skillFx';
import { asTargets, hurtEnemy, liveEnemies, runOver } from './targets';
import type { CastCall, SkillCaster, SkillWorld } from './types';

const SPIRIT = 0x9ad8ff;
const BITE_REACH = 4;
const HOME_DISTANCE = 26;
const MAX_STEP_MS = 33;
const STUCK_MS = 1000;
const STUCK_MOVE = 3;
const IGNORE_MS = 3000;

interface Pack {
  wolf: SpiritWolf;
  params: WolfSkill['params'][number];
  stuck: StuckWatch;
  /** Enemies this wolf gave up on (unreachable) and until when. */
  ignored: Map<Enemy, number>;
}

/** Spirit Wolf: allied wolves that hunt the nearest enemy (path-finding round walls) and bite it, then fade. Level 5 summons two. */
export class SpiritWolfCaster implements SkillCaster<WolfSkill> {
  private readonly wolves = new Set<Pack>();
  private lastNow = 0;

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  cast({ x, y, params }: CastCall<WolfSkill>): boolean {
    const { scene, clock, isSolid } = this.world;
    for (const offset of packSpawnOffsets(params.count)) {
      const at = isSolid(x + offset.x, y + offset.y) ? { x, y } : { x: x + offset.x, y: y + offset.y };
      const wolf = new SpiritWolf(scene, at.x, at.y, clock.now + params.durationMs, isSolid);
      sparkBurst(scene, at.x, at.y, SPIRIT, 8, 50);
      this.wolves.add({ wolf, params, stuck: new StuckWatch(STUCK_MS, STUCK_MOVE), ignored: new Map() });
    }
    playSfx(scene, 'wolfSummon');
    return true;
  }

  private update(): void {
    const { clock } = this.world;
    const delta = Math.min(clock.now - this.lastNow, MAX_STEP_MS);
    this.lastNow = clock.now;
    if (delta <= 0) return;
    const enemies = liveEnemies(this.world.enemies);
    for (const pack of [...this.wolves]) {
      if (clock.now >= pack.wolf.until || runOver(this.world)) this.dismiss(pack);
      else this.hunt(pack, enemies, delta);
    }
  }

  /** Nearest enemy in clear sight; if none can be seen, the nearest one not given up on (the navigator walks round walls). */
  private pickPrey(pack: Pack, enemies: Enemy[]): Enemy | null {
    const { wolf, ignored } = pack;
    const now = this.world.clock.now;
    const free = (i: number): boolean => (ignored.get(enemies[i]!) ?? 0) <= now;
    const targets = asTargets(enemies);
    const seen = nearestTarget(wolf, targets, (i) => free(i) && lineClear(wolf, enemies[i]!, this.world.isSolid));
    const index = seen ?? nearestTarget(wolf, targets, free);
    return index === null ? null : enemies[index]!;
  }

  private hunt(pack: Pack, enemies: Enemy[], delta: number): void {
    const { wolf, params } = pack;
    const { clock, player } = this.world;
    const prey = this.pickPrey(pack, enemies);
    if (prey && pack.stuck.stuck(clock.now, wolf) && !lineClear(wolf, prey, this.world.isSolid)) pack.ignored.set(prey, clock.now + IGNORE_MS);
    if (!prey) {
      if (Math.hypot(player.x - wolf.x, player.y - wolf.y) > HOME_DISTANCE) wolf.walkToward(clock.now, player, params.speed, delta);
      return;
    }
    const edge = Math.hypot(prey.x - wolf.x, prey.y - wolf.y) - prey.displayWidth / 2;
    if (biteReady(clock.now, wolf.nextBiteAt, edge, BITE_REACH)) this.bite(wolf, prey, params);
    else if (edge > BITE_REACH) wolf.walkToward(clock.now, prey, params.speed, delta);
  }

  private bite(wolf: SpiritWolf, prey: Enemy, params: Pack['params']): void {
    wolf.nextBiteAt = this.world.clock.now + params.biteEveryMs;
    hurtEnemy(this.world, prey, params.biteDamage, wolf.x, wolf.y, 1, 0.6);
    sparkBurst(this.world.scene, prey.x, prey.y, SPIRIT, 4, 40);
    playSfx(this.world.scene, 'wolfBite');
    this.world.scene.tweens.add({ targets: wolf, scale: { from: 1.5, to: 1.1 }, duration: 120 });
  }

  private dismiss(pack: Pack): void {
    this.wolves.delete(pack);
    sparkBurst(this.world.scene, pack.wolf.x, pack.wolf.y, SPIRIT, 12, 60);
    pack.wolf.destroy();
  }
}
