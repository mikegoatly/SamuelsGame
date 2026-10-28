export const DEFER_CAPPED_MS = 2000;

/** Can another of a capped monster arrive? Uncapped monsters always can; a capped one waits until a slot frees up (it is never dropped). */
export const hasFreeSlot = (alive: number, maxAlive: number | undefined): boolean => maxAlive === undefined || alive < maxAlive;
