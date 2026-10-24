const LOW_HP = 0.25;
const HURT_PEAK = 0.7;
const HURT_MS = 450;
const BEAT_MS = 900;

/** Alpha of the red edge glow while hp is under 25%: a double "lub-dub" beat, faster and stronger the lower it gets. Steady when reduced. */
export function lowHpPulse(hpRatio: number, timeMs: number, reduced = false): number {
  if (hpRatio <= 0 || hpRatio >= LOW_HP) return 0;
  const danger = 1 - hpRatio / LOW_HP;
  const strength = 0.3 + 0.25 * danger;
  if (reduced) return strength * 0.6;
  const period = BEAT_MS * (1 - 0.3 * danger);
  const phase = (timeMs % period) / period;
  const beat = (centre: number, width: number): number => Math.max(0, 1 - Math.abs(phase - centre) / width);
  return strength * Math.min(1, beat(0.1, 0.12) + 0.7 * beat(0.3, 0.12));
}

/** Alpha of the red flash `sinceMs` after taking damage. */
export function hurtVignetteAlpha(sinceMs: number, reduced = false): number {
  const left = 1 - sinceMs / (reduced ? HURT_MS * 1.5 : HURT_MS);
  return left <= 0 ? 0 : HURT_PEAK * (reduced ? 0.5 : 1) * left;
}
