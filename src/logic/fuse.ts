export interface FuseTuning {
  triggerRange: number;
  fuseMs: number;
}

export interface FuseState {
  phase: 'rush' | 'lit';
  litAt: number;
}

export type FuseEvent = 'lit' | 'boom';

export const newFuse = (): FuseState => ({ phase: 'rush', litAt: 0 });

/** Rush until close, light the fuse (which keeps burning whatever the player does), then boom. */
export function stepFuse(state: FuseState, now: number, distance: number, t: FuseTuning): { state: FuseState; event: FuseEvent | null } {
  if (state.phase === 'rush') {
    return distance <= t.triggerRange ? { state: { phase: 'lit', litAt: now }, event: 'lit' } : { state, event: null };
  }
  return now - state.litAt >= t.fuseMs ? { state: { phase: 'rush', litAt: 0 }, event: 'boom' } : { state, event: null };
}

const SLOWEST_FLASH_MS = 260;
const FASTEST_FLASH_MS = 60;

/** Flashes white faster and faster as the fuse burns down. */
export function fuseFlashOn(state: FuseState, now: number, t: FuseTuning): boolean {
  if (state.phase !== 'lit') return false;
  const elapsed = now - state.litAt;
  const progress = Math.min(1, elapsed / t.fuseMs);
  const period = SLOWEST_FLASH_MS - (SLOWEST_FLASH_MS - FASTEST_FLASH_MS) * progress;
  return Math.floor(elapsed / (period / 2)) % 2 === 0;
}
