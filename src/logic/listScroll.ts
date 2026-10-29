/** Pixels a touch must travel before it counts as a scroll drag rather than a tap. */
export const DRAG_THRESHOLD_PX = 8;

export function isDrag(dx: number, dy: number, threshold = DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

/** First visible row after dragging `dy` pixels from `startOffset` (dragging up scrolls down). */
export function dragOffset(startOffset: number, dy: number, pitch: number, maxOffset: number): number {
  const next = startOffset - Math.round(dy / pitch);
  return Math.max(0, Math.min(Math.max(0, maxOffset), next));
}
