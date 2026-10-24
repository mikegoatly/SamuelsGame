/** One frame of a linear volume fade toward `target`; a full 0..maxVolume sweep takes `fadeMs`. */
export function fadeStep(current: number, target: number, deltaMs: number, fadeMs: number, maxVolume = 1): number {
  if (fadeMs <= 0) return target;
  const step = (deltaMs / fadeMs) * maxVolume;
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}

export type CrossfadePlan = { action: 'none' } | { action: 'add' } | { action: 'revive'; index: number };

/** What `crossfadeTo(key)` should do given the live tracks (target 1 = playing, 0 = fading out). */
export function planCrossfade(tracks: ReadonlyArray<{ key: string; target: number }>, key: string): CrossfadePlan {
  if (tracks.some((t) => t.key === key && t.target > 0)) return { action: 'none' };
  const index = tracks.findIndex((t) => t.key === key);
  return index >= 0 ? { action: 'revive', index } : { action: 'add' };
}
