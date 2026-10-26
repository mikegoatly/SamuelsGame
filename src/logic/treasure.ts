import { waveSlots, wavesInRoom, type LevelCurve } from './waveMix';

export const TREASURE_MIN_GOLD = 24;
export const TREASURE_POTION = 'healthPotionSmall';
/** Room whose fight a chest is worth: a mid-run room. */
export const TREASURE_ROOM_ORDER = 3;
const PILES: readonly (readonly [itemId: string, value: number])[] = [
  ['goldPile', 24],
  ['coinPile', 12],
  ['coin', 2],
];

/** Gold a fight in room `order` is expected to drop: every wave slot is about one kill. */
export function roomGoldEstimate(curve: LevelCurve, order: number, goldPerKill: number): number {
  let slots = 0;
  for (let wave = 1; wave <= wavesInRoom(curve, order); wave++) slots += waveSlots(curve, order, wave);
  return slots * goldPerKill;
}

/** Item ids a chest drops: piles of coins worth at least `gold` (and the minimum), plus one potion. */
export function treasureDrops(gold: number): string[] {
  let left = Math.max(TREASURE_MIN_GOLD, gold);
  const drops: string[] = [];
  for (const [itemId, value] of PILES) {
    while (left >= value) {
      drops.push(itemId);
      left -= value;
    }
  }
  if (left > 0) drops.push('coin');
  drops.push(TREASURE_POTION);
  return drops;
}
