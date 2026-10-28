import type { FuseTuning } from './fuse';
import type { HopTuning } from './hop';

export const HOP: HopTuning & { speed: number } = { sitMs: 520, leapMs: 300, speed: 78 };
/** Puffs up when this close; the fuse is the red-flash telegraph, then it pops. */
export const PUFF: FuseTuning = { triggerRange: 36, fuseMs: 750 };
export const CLOUD = { radius: 30, durationMs: 2800, tickMs: 700, damageShare: 1 } as const;

/** Poison ticks a cloud deals to someone who stays in it the whole time. */
export const cloudTicks = (durationMs: number, tickMs: number): number => Math.max(0, Math.ceil(durationMs / tickMs) - 1);
