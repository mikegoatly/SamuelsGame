import { describe, expect, it } from 'vitest';
import { hazardCount, introductionOrder, roomKinds, roomLoad } from '../src/logic/hazard/plan';
import { DESERT_THEME, PALACE_THEME, RUINS_THEME, type MapTheme } from '../src/logic/map/mapThemes';

const plan = { crackedFloor: [0, 1, 1, 2], rubble: [0, 0, 1, 1] };

describe('hazard plan', () => {
  it('reads counts per room (1-based) and treats missing rooms as none', () => {
    expect(hazardCount(plan, 'crackedFloor', 1)).toBe(0);
    expect(hazardCount(plan, 'crackedFloor', 4)).toBe(2);
    expect(hazardCount(plan, 'crackedFloor', 9)).toBe(0);
    expect(hazardCount(plan, 'gasVent', 2)).toBe(0);
  });

  it('introduces kinds in order of first appearance', () => {
    expect(introductionOrder(plan)).toEqual(['crackedFloor', 'rubble']);
    expect(roomKinds(plan, 3)).toEqual(['crackedFloor', 'rubble']);
    expect(roomLoad(plan, 4)).toBe(3);
  });
});

const themes: [MapTheme, string[]][] = [
  [RUINS_THEME, ['crackedFloor', 'rubble', 'gasVent']],
  [DESERT_THEME, ['firePit', 'wind', 'sandstorm']],
  [PALACE_THEME, ['arrowWall', 'pendulum', 'flameJet']],
];

describe.each(themes)('escalation of theme %#', (theme, order) => {
  const rooms = theme.encounters.length;
  const plans = theme.hazards ?? {};

  it('introduces its hazards in the table order, one new kind at a time', () => {
    expect(introductionOrder(plans)).toEqual(order);
    const firstRoom = order.map((kind) => Array.from({ length: rooms }, (_, i) => i + 1).find((room) => hazardCount(plans, kind as never, room) > 0)!);
    expect(new Set(firstRoom).size).toBe(order.length);
    expect(firstRoom).toEqual([...firstRoom].sort((a, b) => a - b));
  });

  it('starts gentle and gets busier, combining kinds late', () => {
    expect(roomLoad(plans, 1)).toBeLessThanOrEqual(1);
    for (let room = 2; room <= rooms; room++) expect(roomLoad(plans, room)).toBeGreaterThanOrEqual(roomLoad(plans, room - 1));
    expect(roomKinds(plans, rooms).length).toBeGreaterThanOrEqual(2);
    expect(roomLoad(plans, rooms)).toBeGreaterThan(roomLoad(plans, 2));
  });

  it('gives the boss arena a hazard, except the sewer whose boss fight is busy enough', () => {
    if (theme.id === 'sewer') expect(theme.bossHazard).toBeUndefined();
    else expect(theme.bossHazard).toBeDefined();
  });
});
