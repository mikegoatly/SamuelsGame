export type Rgb = readonly [number, number, number];

/** In-place RGBA recolour: each opaque pixel becomes `tone` scaled by its luma (mid grey ~ the tone itself), keeping the sprite's shading. */
export function toTone(rgba: Uint8ClampedArray, tone: Rgb, gain = 1): void {
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    const luma = (0.3 * rgba[i]! + 0.59 * rgba[i + 1]! + 0.11 * rgba[i + 2]!) / 128;
    rgba[i] = tone[0] * luma * gain;
    rgba[i + 1] = tone[1] * luma * gain;
    rgba[i + 2] = tone[2] * luma * gain;
  }
}
