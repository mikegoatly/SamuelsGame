import Phaser from 'phaser';
import { charmCard } from '../content/cards';
import { items, RARITY_COLOR, type ItemDef } from '../content/items';
import { lootTables } from '../content/lootTables';
import { Pickup } from '../entities/Pickup';
import type { Player } from '../entities/Player';
import { skillIds } from '../content/skills';
import { rollDrops } from '../logic/loot';
import { rollSkillScroll, SCROLL_CHANCE } from '../logic/skillScroll';
import { resolvePotion } from '../logic/pickups';
import { addCharm } from '../logic/save';
import type { CardPresenter } from './CardPresenter';
import type { SkillAcquisition } from './SkillAcquisition';
import type { GameClock } from './GameClock';
import type { GameEvents } from './GameEvents';
import { floatText } from './floatText';
import { playSfx } from './sfx';
import type { SaveSystem } from './SaveSystem';

/** Coins collected this run; banked on clear/quit, discarded on death. */
export interface RunState {
  coins: number;
}

const DUPLICATE_SCROLL_COINS = 10;

export class LootSystem {
  readonly group: Phaser.Physics.Arcade.Group;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly events: GameEvents,
    private readonly run: RunState,
    private readonly save: SaveSystem,
    private readonly clock: GameClock,
    private readonly cards: Pick<CardPresenter, 'request'>,
    private readonly acquisition: Pick<SkillAcquisition, 'learn'>,
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
    const owned = [...this.save.data.skills.owned.map((skill) => skill.id), ...this.scrollsOnGround()];
    const scroll = rollSkillScroll(table.scrollChance ?? SCROLL_CHANCE.normal, skillIds, owned, this.rng);
    if (scroll) this.spawn(`scroll_${scroll}`, x, y);
  }

  spawn(itemId: string, x: number, y: number): void {
    const def = items[itemId];
    if (!def) return;
    this.group.add(new Pickup(this.scene, x, y, def, this.player, (picked) => this.apply(picked), this.clock));
  }

  private apply(def: ItemDef): void {
    const { player } = this;
    const at = (text: string, color: string): void => floatText(this.scene, player.x, player.y - 14, text, color, 16, 20, 1500);
    const color = RARITY_COLOR[def.rarity];
    if (def.kind === 'coin') {
      this.addCoins(def.value);
      at(`+${def.value} ${def.value === 1 ? 'coin' : 'coins'}`, color);
      playSfx(this.scene, 'coin', { rate: 1 + Math.min(def.value, 5) * 0.03 });
    } else if (def.kind === 'heal') {
      const result = resolvePotion(player.hp, player.maxHp, def.heal);
      player.heal(result.healed);
      if (result.bonusCoins > 0) {
        this.addCoins(result.bonusCoins);
        at(`+${result.bonusCoins} coins`, RARITY_COLOR.common);
      } else {
        at(`+${result.healed} HP`, '#ff8a8a');
      }
      playSfx(this.scene, 'potion');
    } else if (def.kind === 'skill') {
      this.learnSkill(def, at);
    } else {
      this.save.update((save) => addCharm(save, def.charm));
      this.events.emit('charms-changed', this.save.data.charms);
      playSfx(this.scene, 'charm');
      if (this.offerCard(def)) return;
      at(`${def.name}!`, color);
    }
  }

  /** Skills whose scroll is already lying on the floor, so a second one is not dropped. */
  private scrollsOnGround(): string[] {
    return (this.group.getChildren() as Pickup[]).flatMap((pickup) => (pickup.active && pickup.def.kind === 'skill' ? [pickup.def.skillId] : []));
  }

  private learnSkill(def: Extract<ItemDef, { kind: 'skill' }>, at: (text: string, color: string) => void): void {
    const outcome = this.acquisition.learn(def.skillId);
    const name = def.name.replace(' Scroll', '');
    if (outcome === 'none') {
      this.addCoins(DUPLICATE_SCROLL_COINS);
      at(`Already known +${DUPLICATE_SCROLL_COINS} coins`, RARITY_COLOR.common);
    } else if (outcome === 'learned') at(`${name} learned!`, RARITY_COLOR[def.rarity]);
    else if (outcome === 'bag') at(`${name} (in bag)`, RARITY_COLOR[def.rarity]);
  }

  private offerCard(def: Extract<ItemDef, { kind: 'charm' }>): boolean {
    return this.cards.request(def.id, charmCard(def, this.save.data.charms[def.charm]));
  }

  private addCoins(amount: number): void {
    this.run.coins += amount;
    this.events.emit('coins-changed', this.totalCoins);
  }
}
