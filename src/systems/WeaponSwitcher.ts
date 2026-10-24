import type { Player } from '../entities/Player';
import { getWeapon, knownWeapons } from '../content/weapons';
import { equipWeapon } from '../logic/save';
import { nextWeapon } from '../logic/weaponCycle';
import type { GameEvents } from './GameEvents';
import type { SaveSystem } from './SaveSystem';

/** Cycles through the owned weapons on request (Q, wheel, pad, touch) and remembers the choice in the save. */
export class WeaponSwitcher {
  constructor(
    private readonly player: Player,
    private readonly events: GameEvents,
    private readonly save: SaveSystem,
  ) {
    events.on('weapon-cycle', (direction) => this.cycle(direction));
  }

  private cycle(direction: 1 | -1): void {
    if (this.player.dead) return;
    const { owned, equipped } = this.save.data.weapons;
    const id = nextWeapon(knownWeapons(owned), equipped, direction);
    if (id === equipped) return;
    this.save.update((data) => equipWeapon(data, id));
    this.player.equip(getWeapon(id));
    this.events.emit('weapon-changed', id);
  }
}
