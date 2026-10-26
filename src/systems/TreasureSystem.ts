import type Phaser from 'phaser';
import { treasureItemsFor } from '../content/treasureValue';
import type { LevelConfig } from '../content/levels';
import { TreasureChest } from '../entities/TreasureChest';
import type { Player } from '../entities/Player';
import type { Point } from '../logic/geometry';
import { feel } from './feel';
import { floatText } from './floatText';
import type { LootSystem } from './LootSystem';
import { playSfx } from './sfx';

/** Side-room chests: touching one opens it and bursts its coins and potion through the loot system. */
export class TreasureSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly loot: Pick<LootSystem, 'spawn'>,
    private readonly level: LevelConfig,
    points: readonly Point[],
  ) {
    for (const { x, y } of points) {
      const chest = new TreasureChest(scene, x, y);
      scene.physics.add.overlap(player, chest, () => this.tryOpen(chest));
    }
  }

  private tryOpen(chest: TreasureChest): void {
    if (chest.opened || feel.isLocked || this.player.dead) return;
    chest.open();
    playSfx(this.scene, 'charm');
    feel.shake(90, 0.003);
    floatText(this.scene, chest.x, chest.y - 20, 'Treasure!', '#ffe066', 16, 20, 1200);
    for (const itemId of treasureItemsFor(this.level)) this.loot.spawn(itemId, chest.x, chest.y);
  }
}
