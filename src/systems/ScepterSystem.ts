import Phaser from 'phaser';
import { NabThief } from '../entities/NabThief';
import type { Enemy } from '../entities/Enemy';
import type { Projectile } from '../entities/Projectile';
import { boltHit, isEncased, noShards, SCEPTER, shardsAt, sprayCanEncase, sprayHit, sprayTargets, type ShardEvent, type ShardState } from '../logic/scepter';
import { feel } from './feel';
import { playSfx } from './sfx';
import { hurtEnemy, liveEnemies, runOver } from './skills/targets';
import type { SkillWorld } from './skills/types';

const SHARD_COLOR = 0x8fe8ff;
const SHARD_EDGE = 0x2a5c8c;
const ENCASE_ALPHA = 0.45;
const SPRAY_MS = 160;

/** Crystal Scepter: bolts stick shards in monsters, 4 encase (frozen; bosses slowed), the next bolt shatters for bonus damage and sprays shards onto monsters nearby. */
export class ScepterSystem {
  private readonly shards = new Map<Enemy, ShardState>();
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly twist: boolean;

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    this.twist = world.player.weapon.activeTwist === 'shardEncase';
    this.gfx = scene.add.graphics().setDepth(7);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.draw, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.draw, this));
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
    const g = this.gfx.clear();
    const now = this.world.clock.now;
    for (const [enemy, state] of this.shards) {
      const count = shardsAt(state, now);
      if (!enemy.active || !enemy.alive || count === 0) {
        this.shards.delete(enemy);
        continue;
      }
      const half = enemy.displayWidth / 2;
      if (isEncased(state, now)) {
        g.fillStyle(SHARD_COLOR, ENCASE_ALPHA).fillRect(enemy.x - half - 2, enemy.y - enemy.displayHeight / 2 - 2, half * 2 + 4, enemy.displayHeight + 4);
        g.lineStyle(1, 0xffffff, 0.8).strokeRect(enemy.x - half - 2, enemy.y - enemy.displayHeight / 2 - 2, half * 2 + 4, enemy.displayHeight + 4);
      }
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + ((i - (count - 1) / 2) * Math.PI) / 4;
        this.diamond(enemy.x + Math.cos(angle) * (half + 1), enemy.y + Math.sin(angle) * (half + 1), 2.5);
      }
    }
  }

  private diamond(x: number, y: number, r: number): void {
    this.gfx.fillStyle(SHARD_COLOR, 1).fillTriangle(x, y - r * 1.4, x + r, y, x - r, y).fillTriangle(x, y + r * 1.4, x + r, y, x - r, y);
    this.gfx.lineStyle(1, SHARD_EDGE, 0.8).strokeTriangle(x, y - r * 1.4, x + r, y + r * 1.4, x - r, y);
  }

  private sprayFx(x: number, y: number, tx: number, ty: number): void {
    const shard = this.world.scene.add.rectangle(x, y, 3, 3, SHARD_COLOR).setDepth(9).setRotation(Math.PI / 4);
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
