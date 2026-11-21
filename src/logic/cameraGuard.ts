export interface View {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

/** False when a camera's scroll or zoom is NaN, infinite or a zero zoom: such a view is a black screen and never recovers on its own. */
export const isSaneView = (v: View): boolean => Number.isFinite(v.scrollX) && Number.isFinite(v.scrollY) && Number.isFinite(v.zoom) && v.zoom > 0;
