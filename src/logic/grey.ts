/** In-place RGBA desaturation to a slightly cool grey, for turning a sprite into stone. */
export function toStone(rgba: Uint8ClampedArray): void {
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    const luma = 0.3 * rgba[i]! + 0.59 * rgba[i + 1]! + 0.11 * rgba[i + 2]!;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = luma;
  }
}
