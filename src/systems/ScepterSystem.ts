import Phaser from 'phaser';
import { MinesFrame, Tex } from '../content/assetKeys';
import { NabThief } from '../entities/NabThief';
import type { Enemy } from '../entities/Enemy';
import type { Projectile } from '../entities/Projectile';
import { boltHit, isEncased, noShards, SCEPTER, shardsAt, sprayCanEncase, sprayHit, sprayTargets, type ShardEvent, type ShardState } from '../logic/scepter';
import { feel } from './feel';
import { playSfx } from './sfx';
import { hurtEnemy, liveEnemies, runOver } from './skills/targets';
import type { SkillWorld } from './skills/types';

const ENCASE_ALPHA = 0.6;
const SPRAY_MS = 160;

/** Crystal Scepter: bolts stick shards in monsters, 4 encase (frozen; bosses slowed), the next bolt shatters for bonus damage and sprays shards onto monsters nearby. */
export class ScepterSystem {
  private readonly shards = new Map<Enemy, ShardState>();
  private readonly marks = new Map<Enemy, { shards: Phaser.GameObjects.Image[]; encase: Phaser.GameObjects.Image }>();
  private readonly twist: boolean;

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    this.twist = world.player.weapon.activeTwist === 'shardEncase';
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.draw, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.draw, this);
      this.marks.clear();
    });
  }

  /** A scepter bolt dealt its damage to `enemy`. */
  onBolt(bolt: Projectile, enemy: Enemy): void {
    if (!bolt.weapon.scepter || enemy instanceof NabThief || !enemy.alive || runOver(this.world)) return;
    const now = this.world.clock.now;
    const step = boltHit(this.shards.get(enemy) ?? noShards(), now);
    this.shards.set(enemy, step.state);
    if (step.event === 'shatter') this.shatter(enemy, bolt.weapon.baseDamage * bolt.damageScale);
    else this.react(enemy, step.event);
  }

  private react(enemy: Enemy, event: ShardEvent): void {
    if (event === 'encase') {
      if (enemy.def.boss) enemy.applySlow(SCEPTER.bossSlow, SCEPTER.encaseMs);
      else enemy.stun(SCEPTER.encaseMs);
      playSfx(this.world.scene, 'chime', { volume: 0.7 });
    } else if (event === 'shard') playSfx(this.world.scene, 'crystalHit');
  }

  private shatter(enemy: Enemy, boltDamage: number): void {
    const { x, y } = enemy;
    playSfx(this.world.scene, 'shatter');
    feel.shake(80, 0.002);
    const others = liveEnemies(this.world.enemies).filter((e) => e !== enemy && !(e instanceof NabThief));
    const now = this.world.clock.now;
    for (const index of sprayTargets({ x, y }, others, SCEPTER.sprayRadius, SCEPTER.sprayCount)) {
      const target = others[index]!;
      this.sprayFx(x, y, target.x, target.y);
      const step = sprayHit(this.shards.get(target) ?? noShards(), now, sprayCanEncase(this.twist, { elite: target.isElite, boss: target.def.boss === true }));
      this.shards.set(target, step.state);
      this.react(target, step.event);
    }
    this.burstFx(x, y);
    if (enemy.alive) hurtEnemy(this.world, enemy, boltDamage * SCEPTER.shatterBonus, x, y - 1, 1, 0.5, 'skill');
  }

  private draw(): void {
    const now = this.world.clock.now;
    for (const [enemy, state] of this.shards) {
      const count = shardsAt(state, now);
      if (!enemy.active || !enemy.alive || count === 0) {
        this.shards.delete(enemy);
        continue;
      }
      const marks = this.marksFor(enemy);
      const half = enemy.displayWidth / 2;
      const encased = isEncased(state, now);
      marks.encase.setVisible(encased).setPosition(enemy.x, enemy.y).setScale(Math.max(enemy.displayWidth, enemy.displayHeight) / 14);
      marks.shards.forEach((shard, i) => {
        const angle = -Math.PI / 2 + ((i - (count - 1) / 2) * Math.PI) / 4;
        shard.setVisible(i < count).setPosition(enemy.x + Math.cos(angle) * (half + 1), enemy.y + Math.sin(angle) * (half + 1)).setRotation(angle + Math.PI / 2);
      });
    }
    for (const [enemy, marks] of this.marks) {
      if (this.shards.has(enemy)) continue;
      marks.encase.destroy();
      marks.shards.forEach((shard) => shard.destroy());
      this.marks.delete(enemy);
    }
  }

  private marksFor(enemy: Enemy): { shards: Phaser.GameObjects.Image[]; encase: Phaser.GameObjects.Image } {
    const existing = this.marks.get(enemy);
    if (existing) return existing;
    const { scene } = this.world;
    const marks = {
      encase: scene.add.image(enemy.x, enemy.y, Tex.mines, MinesFrame.encased).setDepth(7).setAlpha(ENCASE_ALPHA),
      shards: Array.from({ length: SCEPTER.shardsToEncase }, () => scene.add.image(enemy.x, enemy.y, Tex.mines, MinesFrame.stuckShard).setDepth(8)),
    };
    this.marks.set(enemy, marks);
    return marks;
  }

  private sprayFx(x: number, y: number, tx: number, ty: number): void {
    const shard = this.world.scene.add.image(x, y, Tex.mines, MinesFrame.shatterShard).setDepth(9).setRotation(Math.atan2(ty - y, tx - x) + Math.PI / 2);
    this.world.scene.tweens.add({ targets: shard, x: tx, y: ty, duration: SPRAY_MS, onComplete: () => shard.destroy() });
  }

  private burstFx(x: number, y: number): void {
    const count = feel.reduced ? 4 : 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.sprayFx(x, y, x + Math.cos(angle) * 22, y + Math.sin(angle) * 22);
    }
  }
}
