/** The Crystal Mines' darkness is a camera vignette (a real light mask costs too much on phones); reduced mode turns it down and holds it steady. */
export const CAVE_VIGNETTE = { radius: 0.78, strength: 0.6, reducedStrength: 0.35, breatheDepth: 0.08, breatheMs: 5200 } as const;

export function caveVignetteStrength(reduced: boolean, nowMs: number): number {
  if (reduced) return CAVE_VIGNETTE.reducedStrength;
  return CAVE_VIGNETTE.strength + CAVE_VIGNETTE.breatheDepth * Math.sin((2 * Math.PI * nowMs) / CAVE_VIGNETTE.breatheMs);
}

/** Alpha stops of the baked vignette gradient, from the clear centre (0) to the edge (1): clear inside half the radius, then easing to black. */
export function vignetteAlphaAt(t: number, radius: number = CAVE_VIGNETTE.radius): number {
  if (t <= radius * 0.5) return 0;
  const k = Math.min(1, (t - radius * 0.5) / (1 - radius * 0.5));
  return k * k;
}

/** Screen-covering size of a scrollFactor-0 image under camera zoom `zoom` (zoom scales every object about the screen centre), with a little bleed so no edge shows. */
export const coverSize = (width: number, height: number, zoom: number): { width: number; height: number } => ({ width: (width / zoom) * 1.04, height: (height / zoom) * 1.04 });
