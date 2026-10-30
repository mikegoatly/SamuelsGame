const BASE = 0.45;
const PULSE_MS = 450;
const PULSE_PERIOD_MS = 90;

/** How bright the laser's warning line is `elapsedMs` into its wind-up: calm and clear, then it pulses brighter just before firing (a smooth rise only when flashes are reduced). */
export function laserTelegraphAlpha(elapsedMs: number, windupMs: number, reduced: boolean): number {
  const left = windupMs - Math.max(0, elapsedMs);
  const ramp = Math.min(1, Math.max(0, 1 - left / PULSE_MS));
  if (left <= 0) return reduced ? 0.9 : 1;
  if (reduced) return BASE + (0.9 - BASE) * Math.min(1, Math.max(0, elapsedMs / windupMs));
  const floor = BASE + (0.8 - BASE) * ramp;
  const wave = (Math.sin((left / PULSE_PERIOD_MS) * Math.PI * 2) + 1) / 2;
  return ramp === 0 ? BASE : floor + (1 - floor) * wave * ramp;
}
