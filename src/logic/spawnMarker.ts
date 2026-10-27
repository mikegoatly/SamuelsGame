import type { Point } from './geometry';

/** How long the floor marker shows before a monster arrives. */
export const MARKER_MS = 800;

export const markerProgress = (now: number, startedAt: number, durationMs = MARKER_MS): number => Math.min(1, Math.max(0, (now - startedAt) / durationMs));

/** True when the player stands close enough to a finished marker that the arrival must move elsewhere. */
export const playerOnMarker = (marker: Point, player: Point, radius: number): boolean => Math.hypot(marker.x - player.x, marker.y - player.y) <= radius;

/** Ring size and opacity at `progress` (0..1); a steady glow instead of a flicker when reducing flashes. */
export function markerPulse(progress: number, reduced: boolean, spread = 0): { radius: number; alpha: number } {
  const radius = 8 + 8 * progress + spread;
  const alpha = reduced ? 0.6 : 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(progress * Math.PI * 6));
  return { radius, alpha };
}
