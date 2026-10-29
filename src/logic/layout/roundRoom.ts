import type { DungeonLayout, Pillar } from '../dungeonLayout';

/** Corridor lane rows (the corridor's three rows plus a tile of margin) are never walled off, so the way in always stays open. */
const LANE_HALF = 2;

/** The boss chamber rounded off into an ellipse by filling its corners with interior wall; cover standing in the new wall is dropped. */
export function roundBossRoom(layout: DungeonLayout): DungeonLayout {
  const room = layout.rooms.find((r) => r.kind === 'boss');
  if (!room) return layout;
  const { rect } = room;
  const [mx, my, a, b] = [rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, rect.h / 2];
  const walled: Pillar[] = [];
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    if (Math.abs(y - room.cy) <= LANE_HALF) continue;
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      if (((x + 0.5 - mx) / a) ** 2 + ((y + 0.5 - my) / b) ** 2 > 1) walled.push({ room: room.index, x, y });
    }
  }
  const keys = new Set(walled.map((p) => `${p.x},${p.y}`));
  return { ...layout, blocks: [...layout.blocks, ...walled], pillars: layout.pillars.filter((p) => !keys.has(`${p.x},${p.y}`)) };
}
