export interface Stick {
  x: number;
  y: number;
}

/** Radial deadzone: 0 below inner, rescaled so magnitude reaches 1 at outer. */
export function applyDeadzone(x: number, y: number, inner = 0.2, outer = 0.95): Stick {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= inner) return { x: 0, y: 0 };
  const scaled = Math.min(1, (magnitude - inner) / (outer - inner));
  return { x: (x / magnitude) * scaled, y: (y / magnitude) * scaled };
}

export function pastThreshold(value: number, threshold = 0.5): boolean {
  return value > threshold;
}
