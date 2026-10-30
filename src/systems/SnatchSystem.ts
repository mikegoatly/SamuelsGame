import Phaser from 'phaser';
import { NabThief } from '../entities/NabThief';
import { canSnatchFrom, segmentHitsCircle, SnatchLog } from '../logic/snatch';
import { floatText } from './floatText';
import type { LootSystem } from './LootSystem';
import { playSfx } from './sfx';
import { liveEnemies, runOver } from './skills/targets';
import type { SkillWorld } from './skills/types';

const REACH = 6;

/** Nab's Snatch: a dash that passes through a monster steals one coin from it, once per monster. */
export class SnatchSystem {
  private readonly log = new SnatchLog();
  private last = { x: 0, y: 0 };

  constructor(
    private readonly world: SkillWorld,
    private readonly loot: LootSystem,
  ) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private update(): void {
    const { player } = this.world;
    const from = this.last;
    this.last = { x: player.x, y: player.y };
    if (!player.isDashing || runOver(this.world)) return;
    for (const enemy of liveEnemies(this.world.enemies)) {
      if (enemy instanceof NabThief || !canSnatchFrom({ boss: enemy.def.boss === true, roomMonster: enemy.roomMonster }) || !segmentHitsCircle(from, player, enemy, enemy.bodyRadius() + REACH) || !this.log.take(enemy)) continue;
      this.loot.grant('coin');
      floatText(this.world.scene, enemy.x, enemy.y - 12, 'Snatched!', '#ffe066', 16, 14, 800);
      playSfx(this.world.scene, 'thwip', { volume: 0.7 });
    }
  }
}
