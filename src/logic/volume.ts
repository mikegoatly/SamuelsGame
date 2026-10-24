export const VOLUME_STEP = 10;

/** Moves a 0-100 percentage one step, snapping to the grid; `wrap` loops past the ends (Enter on a slider). */
export function stepVolume(value: number, direction: 1 | -1, wrap = false): number {
  const snapped = direction > 0 ? Math.floor(value / VOLUME_STEP) * VOLUME_STEP : Math.ceil(value / VOLUME_STEP) * VOLUME_STEP;
  const next = snapped + direction * VOLUME_STEP;
  if (next > 100) return wrap ? 0 : 100;
  if (next < 0) return wrap ? 100 : 0;
  return next;
}

/** Perceptual-ish curve: percent -> linear gain. */
export const volumeGain = (percent: number): number => (percent <= 0 ? 0 : (Math.min(100, percent) / 100) ** 1.5);
