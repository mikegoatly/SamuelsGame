export const SLOT_COUNT = 3;

export type Slots = readonly (string | null)[];

export interface Loadout {
  weapon: string;
  slots: Slots;
}

export const emptySlots = (): (string | null)[] => Array.from({ length: SLOT_COUNT }, () => null);

export const firstEmptySlot = (slots: Slots): number => slots.indexOf(null);

/** Puts `id` in `slot`; a skill already equipped elsewhere swaps places, so none is ever duplicated. */
export function equipInSlot(slots: Slots, slot: number, id: string): (string | null)[] {
  const next = [...slots];
  if (slot < 0 || slot >= SLOT_COUNT) return next;
  const from = next.indexOf(id);
  if (from >= 0) next[from] = next[slot] ?? null;
  next[slot] = id;
  return next;
}

/** Exactly SLOT_COUNT entries; anything unowned, repeated or not a string becomes an empty slot. */
export function sanitizeSlots(raw: unknown, owned: readonly string[]): (string | null)[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const id: unknown = list[i];
    if (typeof id !== 'string' || !owned.includes(id) || seen.has(id)) return null;
    seen.add(id);
    return id;
  });
}

/** Steps a slot through the owned skills no other slot uses, then empty, wrapping. */
export function cycleSlotSkill(slots: Slots, slot: number, owned: readonly string[], direction: 1 | -1): (string | null)[] {
  const choices: (string | null)[] = [...owned.filter((id) => !slots.some((other, i) => i !== slot && other === id)), null];
  const index = choices.indexOf(slots[slot] ?? null);
  const next = choices[(index + direction + choices.length) % choices.length] ?? null;
  const result = [...slots];
  result[slot] = next;
  return result;
}
