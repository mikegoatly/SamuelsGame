import { insetRect, rectContains, type Point } from './geometry';
import type { RoomSpec } from './tiledObjects';
import { waveEnemyLevels } from './waves';

/** The uncleared room whose rect (shrunk by `inset` px, so doorways don't count) holds the point. */
export function findRoomAt(rooms: readonly RoomSpec[], point: Point, inset: number, cleared: ReadonlySet<number>): RoomSpec | undefined {
  return rooms.find((room) => !cleared.has(room.order) && rectContains(insetRect(room.rect, inset), point));
}

export function roomWaves(room: RoomSpec): number[][] {
  return Array.from({ length: room.waves }, (_, i) => waveEnemyLevels(i + 1, [room.minLevel, room.maxLevel]));
}
