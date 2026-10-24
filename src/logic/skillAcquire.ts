import { firstEmptySlot, type Slots } from './loadout';

export type AcquisitionPlan = { kind: 'known' } | { kind: 'equip'; slot: number } | { kind: 'swap' };

/** What happens when the player picks up a skill: nothing new, a free slot gets it, or they must choose what to replace. */
export function planAcquisition(slots: Slots, alreadyOwned: boolean, isKnown: (id: string) => boolean = () => true): AcquisitionPlan {
  if (alreadyOwned) return { kind: 'known' };
  const slot = firstEmptySlot(slots.map((id) => (id !== null && isKnown(id) ? id : null)));
  return slot >= 0 ? { kind: 'equip', slot } : { kind: 'swap' };
}
