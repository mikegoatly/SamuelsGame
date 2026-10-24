import Phaser from 'phaser';
import { Sfx } from '../content/assetKeys';
import { items, RARITY_COLOR, type ItemDef } from '../content/items';
import { lootTables } from '../content/lootTables';
import { Pickup } from '../entities/Pickup';
import type { Player } from '../entities/Player';
import { rollDrops } from '../logic/loot';
import { resolvePotion } from '../logic/pickups';
import { addCharm } from '../logic/save';
import type { GameEvents } from './GameEvents';
import { floatText } from './floatText';
import type { SaveSystem } from './SaveSystem';

/** Coins collected this run; banked on clear/quit, discarded on death. */
export interface RunState {
  coins: number;
}

export class LootSystem {
  readonly group: Phaser.Physics.Arcade.Group;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly events: GameEvents,
    private readonly run: RunState,
    private readonly save: SaveSystem,
    private readonly rng: () => number = Math.random,
  ) {
    this.group = scene.physics.add.group({ allowGravity: false });
    scene.physics.add.overlap(player, this.group, (_, pickup) => (pickup as Pickup).tryCollect());
    events.on('enemy-died', (_level, x, y, tableId) => this.dropFrom(tableId, x, y));
  }

  get totalCoins(): number {
    return this.save.data.coins + this.run.coins;
  }

  dropFrom(tableId: string, x: number, y: number): void {
    const table = lootTables[tableId];
    if (!table) return;
    for (const itemId of rollDrops(table, this.rng)) this.spawn(itemId, x, y);
  }

  spawn(itemId: string, x: number, y: number): void {
    const def = items[itemId];
    if (!def) return;
    this.group.add(new Pickup(this.scene, x, y, def, this.player, (picked) => this.apply(picked)));
  }

  private apply(def: ItemDef): void {
    const { player } = this;
    const at = (text: string, color: string): void => floatText(this.scene, player.x, player.y - 14, text, color, 10, 16, 800);
    const color = RARITY_COLOR[def.rarity];
    if (def.kind === 'coin') {
      this.addCoins(def.value);
      at(`+${def.value} ${def.value === 1 ? 'coin' : 'coins'}`, color);
      this.chirp(1.6 + Math.min(def.value, 5) * 0.05);
    } else if (def.kind === 'heal') {
      const result = resolvePotion(player.hp, player.maxHp, def.heal);
      player.heal(result.healed);
      if (result.bonusCoins > 0) {
        this.addCoins(result.bonusCoins);
        at(`+${result.bonusCoins} coins`, RARITY_COLOR.common);
      } else {
        at(`+${result.healed} HP`, '#ff8a8a');
      }
      this.chirp(1.2);
    } else {
      this.save.update((save) => addCharm(save, def.charm));
      this.events.emit('charms-changed', this.save.data.charms);
      at(`${def.name}!`, color);
      this.chirp(2.2);
      this.scene.time.delayedCall(120, () => this.chirp(2.8));
    }
  }

  private addCoins(amount: number): void {
    this.run.coins += amount;
    this.events.emit('coins-changed', this.totalCoins);
  }

  private chirp(rate: number): void {
    this.scene.sound.play(Sfx.shoot, { volume: 0.25, rate });
  }
}
