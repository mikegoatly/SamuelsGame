import Phaser from 'phaser';
import { Frame } from '../content/assetKeys';
import { spiritWolf } from '../content/skills';
import type { Enemy } from '../entities/Enemy';
import type { AllyLook } from '../entities/SpiritWolf';
import { EdgeWatch } from '../logic/edge';
import { pushCapped, TickGate } from '../logic/heroTraps';
import { risesAgain } from '../logic/passives';
import type { GameEvents } from './GameEvents';
import { GloopTrailFx } from './GloopTrailFx';
import { SpiritWolfCaster } from './skills/SpiritWolfCaster';
import { hurtEnemy } from './skills/targets';
import type { SkillWorld } from './skills/types';
import { zonesFor } from './skills/ZoneField';

const TRAP = { radius: 16, durationMs: 3000, tickMs: 500, damage: 6, color: 0xd0d8ff, max: 2 };
const SKELETON_LOOK: AllyLook = { frame: Frame.ghost, tint: 0xb8f0a0 };
const SKELETON = { durationMs: 8000, biteDamage: 8, biteEveryMs: 700, speed: 80, count: 1, twist: false };

/** Hero passives that act in the world: the rogue's dagger trap (dropped where a dash ends, two at most, never stacking on one enemy) and the necromancer's risen skeletons (the Spirit Wolf's hunting AI; allies are not enemies, so they never affect room clears). */
export class HeroSystem {
  private readonly dash = new EdgeWatch();
  private readonly gate = new TickGate(TRAP.tickMs * 0.9);
  private readonly traps: (() => void)[] = [];

  constructor(
    private readonly world: SkillWorld,
    events: GameEvents,
    private readonly rng: () => number = Math.random,
  ) {
    const { effects } = world.player;
    const { scene } = world;
    if (effects.dashTrap) {
      scene.events.on(Phaser.Scenes.Events.UPDATE, this.watchDash, this);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.watchDash, this));
    }
    if (effects.trail) new GloopTrailFx(world);
    if (effects.riseChance > 0) {
      const skeletons = new SpiritWolfCaster(world, SKELETON_LOOK);
      events.on('enemy-died', (_level, x, y, _table, boss, byAlly) => {
        if (risesAgain(effects, this.rng, { boss, byAlly, live: skeletons.live })) {
          skeletons.cast({ skill: spiritWolf, level: 1, x, y, aim: new Phaser.Math.Vector2(1, 0), params: SKELETON });
        }
      });
    }
  }

  private watchDash(): void {
    const { player } = this.world;
    if (this.dash.step(player.isDashing) === 'fell' && !player.dead) this.dropTrap(player.x, player.y);
  }

  private dropTrap(x: number, y: number): void {
    const { clock } = this.world;
    const cancel = zonesFor(this.world).spawn({
      x,
      y,
      radius: TRAP.radius,
      durationMs: TRAP.durationMs,
      tickMs: TRAP.tickMs,
      color: TRAP.color,
      onTick: (enemy: Enemy) => {
        if (this.gate.allow(enemy, clock.now)) hurtEnemy(this.world, enemy, TRAP.damage, x, y, 1, 0.2);
      },
    });
    for (const old of pushCapped(this.traps, cancel, TRAP.max)) old();
  }
}
