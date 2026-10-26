export interface PhaseDef<N extends string = string> {
  name: N;
  ms: number;
}

export interface PhaseAt<N extends string = string> {
  name: N;
  /** Milliseconds into the current phase. */
  t: number;
  /** 0..1 through the current phase. */
  progress: number;
  /** Whole cycles elapsed, so callers can re-roll things once per cycle. */
  cycle: number;
}

export const cycleLength = (phases: readonly PhaseDef[]): number => phases.reduce((sum, p) => sum + p.ms, 0);

/** Which phase of a repeating timeline `now + offsetMs` falls in. */
export function phaseAt<N extends string>(now: number, offsetMs: number, phases: readonly PhaseDef<N>[]): PhaseAt<N> {
  const length = cycleLength(phases);
  const time = now + offsetMs;
  const cycle = Math.floor(time / length);
  let t = time - cycle * length;
  for (const phase of phases) {
    if (t < phase.ms) return { name: phase.name, t, progress: phase.ms > 0 ? t / phase.ms : 1, cycle };
    t -= phase.ms;
  }
  const last = phases[phases.length - 1]!;
  return { name: last.name, t: last.ms, progress: 1, cycle };
}
