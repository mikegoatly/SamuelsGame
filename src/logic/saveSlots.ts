import type { SaveData } from './save';

export const SLOT_COUNT = 3;
export const FIRST_SLOT = 1;
/** Slot 1 keeps the original key, so saves from before slots existed are slot 1 untouched. */
export const SLOT_KEYS: readonly string[] = ['samuels-game-save', 'samuels-game-save-2', 'samuels-game-save-3'];
export const ACTIVE_SLOT_KEY = 'samuels-game-slot';

export const isValidSlot = (slot: number): boolean => Number.isInteger(slot) && slot >= FIRST_SLOT && slot <= SLOT_COUNT;

export const slotKey = (slot: number): string => SLOT_KEYS[(isValidSlot(slot) ? slot : FIRST_SLOT) - 1]!;

/** Missing or junk values mean slot 1. */
export function parseActiveSlot(raw: string | null | undefined): number {
  if (typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) return FIRST_SLOT;
  const slot = Number(raw);
  return isValidSlot(slot) ? slot : FIRST_SLOT;
}

export type SlotSummary = { empty: true } | { empty: false; level: number; coins: number; cleared: number; hero: string };

export const EMPTY_SUMMARY: SlotSummary = { empty: true };

export const summarizeSlot = (save: SaveData | null): SlotSummary =>
  save === null ? EMPTY_SUMMARY : { empty: false, level: save.progress.level, coins: save.coins, cleared: save.levels.cleared.length, hero: save.heroes.selected };

export function slotRowLabel(slot: number, summary: SlotSummary, active: boolean): string {
  const body = summary.empty ? 'Empty - new game' : `Level ${summary.level}, ${summary.coins} coins`;
  return `Slot ${slot}: ${body}${active ? '  (playing)' : ''}`;
}
