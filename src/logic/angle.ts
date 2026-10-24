const TAU = Math.PI * 2;

/** Shortest signed difference `a - b`, in (-pi, pi]. */
export function angleDiff(a: number, b: number): number {
  const d = (((a - b) % TAU) + TAU) % TAU;
  return d > Math.PI ? d - TAU : d;
}

/** Rotates `current` toward `target` by at most `maxTurn` radians, the short way round. */
export function steerToward(current: number, target: number, maxTurn: number): number {
  const diff = angleDiff(target, current);
  return Math.abs(diff) <= maxTurn ? target : current + Math.sign(diff) * maxTurn;
}
