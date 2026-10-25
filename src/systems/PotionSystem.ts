import type Phaser from 'phaser';
import type { Player } from '../entities/Player';
import { withPotions } from '../logic/campPurchases';
import { drinkPotion } from '../logic/potions';
import { floatText } from './floatText';
import type { SaveSystem } from './SaveSystem';
import { playSfx } from './sfx';

/** The carry-in potion key: drinks one stored potion (40% of max HP) when hurt. */
export class PotionSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly save: SaveSystem,
  ) {
    player.potionHandler = () => this.drink();
  }

  private drink(): void {
    const { player } = this;
    const result = drinkPotion(this.save.data.potions, player.hp, player.maxHp, player.effects.potionMultiplier);
    const at = (text: string, color: string): void => floatText(this.scene, player.x, player.y - 14, text, color, 16, 20, 1200);
    if (!result.used) {
      at(this.save.data.potions > 0 ? 'HP full' : 'No potions', '#b0b0c8');
      return;
    }
    this.save.update((save) => withPotions(save, result.carried));
    player.heal(result.healed);
    player.events.emit('potion-used');
    at(`+${result.healed} HP`, '#ff8a8a');
    playSfx(this.scene, 'potion');
  }
}
