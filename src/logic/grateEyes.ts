export const EYE_CYCLE_MS = 5000;
export type EyeState = 'open' | 'narrow' | 'shut';

const PHASES: readonly (readonly [until: number, state: EyeState])[] = [
  [2800, 'open'],
  [2920, 'narrow'],
  [3900, 'shut'],
  [4020, 'narrow'],
  [EYE_CYCLE_MS, 'open'],
];

/** The eyes under the grate: glaring, a quick blink, gone for about a second, a blink back. `offsetMs` keeps grates out of step. */
export function eyeState(now: number, offsetMs = 0): EyeState {
  const t = (((now + offsetMs) % EYE_CYCLE_MS) + EYE_CYCLE_MS) % EYE_CYCLE_MS;
  return PHASES.find(([until]) => t < until)![1];
}

/** Which period of `periodMs` we are in; a change means "it is time again" (drips, mist puffs). */
export const cycleIndex = (now: number, periodMs: number, offsetMs = 0): number => Math.floor((now + offsetMs) / periodMs);
