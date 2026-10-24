import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLevelObjects } from '../src/logic/tiledObjects';
import { buildTmj } from '../tools/mapBuilder';
import { DESERT_THEME, RUINS_THEME } from '../tools/mapThemes';

const committed = (name: string) => JSON.parse(readFileSync(`public/assets/maps/${name}.tmj`, 'utf8')) as ReturnType<typeof buildTmj>;
const roundTrip = (value: unknown) => JSON.parse(JSON.stringify(value));

describe('map generation', () => {
  it('regenerates the committed ruins map exactly', () => {
    expect(roundTrip(buildTmj(RUINS_THEME))).toEqual(committed('ruins'));
  });

  it('regenerates the committed desert map exactly', () => {
    expect(roundTrip(buildTmj(DESERT_THEME))).toEqual(committed('desert'));
  });

  it('is deterministic', () => {
    expect(buildTmj(DESERT_THEME)).toEqual(buildTmj(DESERT_THEME));
  });
});

describe('desert map', () => {
  const map = committed('desert');
  const parsed = parseLevelObjects(map);

  it('has six combat rooms climbing from monster level 5 to 9 and a boss arena', () => {
    expect(parsed.rooms).toHaveLength(6);
    expect(parsed.rooms[0]!.minLevel).toBe(5);
    expect(parsed.rooms[5]!.maxLevel).toBe(9);
    for (let i = 1; i < 6; i++) expect(parsed.rooms[i]!.maxLevel).toBeGreaterThanOrEqual(parsed.rooms[i - 1]!.maxLevel);
    expect(parsed.bossArena).not.toBeNull();
    expect(parsed.rooms.map((r) => r.encounter)).toEqual(parsed.rooms.map((r) => `desert-room-${r.order}`));
  });

  it('has a door on both sides of every corridor and quicksand patches', () => {
    expect(parsed.doors.length).toBe(13);
    expect(parsed.hazards.length).toBeGreaterThanOrEqual(3);
  });

  it('uses only sand floor and sandstone wall tiles', () => {
    const layer = (name: string) => (map.layers.find((l) => l.name === name) as unknown as { data: number[] }).data;
    const floors = new Set(layer('ground').filter((g) => g > 0).map((g) => g - 1));
    for (const frame of floors) expect(frame >= 48 && frame <= 53).toBe(true);
    expect(layer('walls').some((g) => g - 1 === 40)).toBe(true);
  });
});
