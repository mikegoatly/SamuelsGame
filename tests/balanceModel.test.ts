import { describe, expect, it } from 'vitest';
import { desert } from '../src/content/levels/desert';
import { palace } from '../src/content/levels/palace';
import { ruins } from '../src/content/levels/ruins';
import { sewer } from '../src/content/levels/sewer';
import { SEWER_CURVE, SEWER_ENCOUNTERS, SEWER_POOL } from '../src/content/levels/sewerMonsters';
import { DWARF_GOLD, NECROMANCER_KILLS, ROGUE_TIME_MS } from '../src/logic/unlocks';
import { upgradeCost } from '../src/logic/upgrades';
import { TIER_MULTIPLIER } from '../src/content/upgradeInfo';
import { totalGems, type Gems } from '../src/logic/gems';
import { DESERT_THEME, PALACE_THEME, RUINS_THEME } from '../src/logic/map/mapThemes';
import { estimateLevel, estimateRoom, gearedReference, heroicVariant, REFERENCE, type LevelEstimate } from './balanceModel';

const CASES = [
  { level: ruins, theme: RUINS_THEME },
  { level: desert, theme: DESERT_THEME },
  { level: palace, theme: PALACE_THEME },
];

/** Each level entered at its recommended level, and the whole journey with the player carrying their level over. */
const [ruinsRun, desertRun, palaceRun] = CASES.map(({ level, theme }) => estimateLevel(level, theme.encounters, level.recommendedLevel, REFERENCE, theme));
const journey = ((): LevelEstimate[] => {
  const first = estimateLevel(ruins, RUINS_THEME.encounters, 1, REFERENCE, RUINS_THEME);
  const second = estimateLevel(desert, DESERT_THEME.encounters, first.endLevel, REFERENCE, DESERT_THEME);
  return [first, second, estimateLevel(palace, PALACE_THEME.encounters, second.endLevel, REFERENCE, PALACE_THEME)];
})();

const goldOf = (runs: LevelEstimate[]): number => runs.reduce((sum, r) => sum + r.loot.gold, 0);
const pcts = (run: LevelEstimate): number[] => run.rooms.map((r) => r.damagePct * 100);
const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;
const allRooms = [ruinsRun!, desertRun!, palaceRun!].flatMap(pcts);

describe('balance model: damage per room for the reference player', () => {
  it('starts gentle: the first ruins room costs under 12% of health', () => {
    expect(pcts(ruinsRun!)[0]).toBeLessThan(12);
  });

  it('never asks more than 65% of health in a single room, with no room that is trivial', () => {
    for (const pct of allRooms) {
      expect(pct).toBeLessThan(65);
      expect(pct).toBeGreaterThan(4);
    }
  });

  it('has no spikes: a room costs at most 20 points more than the one before it, and never collapses below 40% of it', () => {
    for (let i = 1; i < allRooms.length; i++) {
      expect(allRooms[i]! - allRooms[i - 1]!, `room ${i + 1}`).toBeLessThanOrEqual(20);
      expect(allRooms[i]!, `room ${i + 1}`).toBeGreaterThanOrEqual(allRooms[i - 1]! * 0.4);
    }
  });

  it('rises within every level (last rooms harder than first) and from level to level', () => {
    const levels = [ruinsRun!, desertRun!, palaceRun!].map(pcts);
    for (const rooms of levels) expect(mean(rooms.slice(-2))).toBeGreaterThan(mean(rooms.slice(0, 2)) * 1.5);
    expect(mean(levels[1]!)).toBeGreaterThan(mean(levels[0]!) * 1.5);
    expect(mean(levels[2]!)).toBeGreaterThan(mean(levels[1]!));
    expect(levels[1]![0]!).toBeGreaterThan(levels[0]![levels[0]!.length - 1]! * 0.45);
    expect(levels[2]![0]!).toBeGreaterThan(levels[1]![levels[1]!.length - 1]! * 0.4);
  });

  it('is survivable: potions dropped in a level cover over half of the damage taken there', () => {
    for (const run of [ruinsRun!, desertRun!, palaceRun!]) {
      const damage = run.rooms.reduce((sum, r) => sum + r.damage, 0);
      expect(run.loot.heal * 0.7).toBeGreaterThan(damage * 0.5);
    }
  });

  it('a standing bot suffers twice what the dodging reference does', () => {
    for (const room of [...ruinsRun!.rooms, ...palaceRun!.rooms]) expect(room.standingDamage).toBeCloseTo(room.damage / (1 - REFERENCE.dodge), 6);
  });

  it('bigger rooms and higher monsters cost more', () => {
    const room = estimateRoom(desert, 4, DESERT_THEME.encounters[3]!, 7);
    const tougher = estimateRoom(desert, 4, { ...DESERT_THEME.encounters[3]!, minLevel: 9, maxLevel: 9 }, 7);
    expect(tougher.damage).toBeGreaterThan(room.damage);
    expect(estimateRoom(desert, 4, DESERT_THEME.encounters[3]!, 12).damage).toBeLessThan(room.damage);
  });
});

/**
 * The sewer sits between desert and palace. Its pool, curve and encounters come from `sewerMonsters.ts` (the map theme will carry the same
 * encounters); the model runs without the map, so the flush and gas hazards and the boss are not counted yet and the targets leave room for them.
 */
describe('balance model: the sewer between desert and palace', () => {
  const level = { ...sewer, enemyPool: SEWER_POOL, curve: SEWER_CURVE };
  const run = estimateLevel(level, SEWER_ENCOUNTERS, level.recommendedLevel, REFERENCE);
  const rooms = pcts(run);

  it('has one room per intro monster and starts gentle', () => {
    expect(rooms).toHaveLength(SEWER_CURVE.intro.length);
    expect(rooms[0]).toBeLessThan(30);
  });

  it('no room is trivial or above 65% of health, and none spikes more than 20 points over the one before', () => {
    for (const pct of rooms) {
      expect(pct).toBeGreaterThan(8);
      expect(pct).toBeLessThan(65);
    }
    for (let i = 1; i < rooms.length; i++) {
      expect(rooms[i]! - rooms[i - 1]!, `room ${i + 1}`).toBeLessThanOrEqual(20);
      expect(rooms[i]!, `room ${i + 1}`).toBeGreaterThanOrEqual(rooms[i - 1]! * 0.4);
    }
  });

  it('rises: the last rooms cost over 1.5 times the first ones', () => {
    expect(mean(rooms.slice(-2))).toBeGreaterThan(mean(rooms.slice(0, 2)) * 1.5);
  });

  it('is about as hard on average as its neighbours (within 25% of the desert, at most the palace)', () => {
    expect(mean(rooms)).toBeGreaterThan(mean(pcts(desertRun!)) * 0.75);
    expect(mean(rooms)).toBeLessThan(mean(pcts(palaceRun!)) * 1.05);
  });

  it('is survivable: potions cover over half of the damage taken', () => {
    expect(run.loot.heal * 0.7).toBeGreaterThan(run.rooms.reduce((sum, r) => sum + r.damage, 0) * 0.5);
  });

  it('pays between desert and palace once the boss is added (rooms alone: 200-450 gold)', () => {
    expect(run.loot.gold).toBeGreaterThan(200);
    expect(run.loot.gold).toBeLessThan(450);
  });

  it('a full clear of the rooms takes 2.5-4.5 minutes without the boss', () => {
    expect(run.runSeconds / 60).toBeGreaterThan(2.5);
    expect(run.runSeconds / 60).toBeLessThan(4.5);
  });
});

describe('balance model: levelling and pacing', () => {
  it('a player arrives at each next level near its recommended level', () => {
    expect(journey[0]!.endLevel).toBeGreaterThanOrEqual(5);
    expect(journey[0]!.endLevel).toBeLessThanOrEqual(desert.recommendedLevel + 2);
    expect(journey[1]!.endLevel).toBeGreaterThanOrEqual(palace.recommendedLevel - 1);
    expect(journey[1]!.endLevel).toBeLessThanOrEqual(palace.recommendedLevel + 1);
    expect(journey[2]!.endLevel).toBeGreaterThanOrEqual(13);
    expect(journey[2]!.endLevel).toBeLessThanOrEqual(15);
  });

  it('a full clear takes a few minutes: ruins 1.5-3, desert 3-5, palace 5-8', () => {
    const minutes = [ruinsRun!, desertRun!, palaceRun!].map((run) => run.runSeconds / 60);
    expect(minutes[0]!).toBeGreaterThan(1.5);
    expect(minutes[0]!).toBeLessThan(3);
    expect(minutes[1]!).toBeGreaterThan(3);
    expect(minutes[1]!).toBeLessThan(5);
    expect(minutes[2]!).toBeGreaterThan(5);
    expect(minutes[2]!).toBeLessThan(8);
  });
});

describe('balance model: hero unlock pacing', () => {
  it('the rogue time limit leaves a brisk reference player room to spare, but not a casual one', () => {
    expect(desertRun!.runSeconds).toBeLessThan(ROGUE_TIME_MS / 1000);
    expect(desertRun!.runSeconds).toBeGreaterThan((ROGUE_TIME_MS / 1000) * 0.6);
  });

  it('the dwarf needs saving through roughly the first two levels, and the necromancer a few passes', () => {
    expect(journey[0]!.loot.gold + journey[1]!.loot.gold).toBeLessThan(DWARF_GOLD);
    expect(goldOf(journey)).toBeGreaterThan(DWARF_GOLD);
    const kills = journey.map((run) => run.rooms.reduce((sum, r) => sum + r.monsters, 0));
    expect(NECROMANCER_KILLS / (kills[0]! + kills[1]! + kills[2]!)).toBeLessThan(5);
  });
});

describe('balance model: economy over one clear of each level', () => {
  const goldFor = (...runs: LevelEstimate[]): number => runs.reduce((sum, r) => sum + r.loot.gold, 0);
  const gems = (runs: LevelEstimate[]): Gems => ({
    red: runs.reduce((s, r) => s + r.loot.gems.red, 0),
    green: runs.reduce((s, r) => s + r.loot.gems.green, 0),
    blue: runs.reduce((s, r) => s + r.loot.gems.blue, 0),
  });
  const toLevel = (target: number, tier: 1 | 2 | 3): { gold: number; gems: number } => {
    let gold = 0;
    let gemCount = 0;
    for (let level = 1; level < target; level++) {
      const cost = upgradeCost(level, TIER_MULTIPLIER[tier])!;
      gold += cost.gold;
      gemCount += cost.gems;
    }
    return { gold, gems: gemCount };
  };

  it('each level pays something worth saving for', () => {
    expect(goldFor(ruinsRun!)).toBeGreaterThan(90);
    expect(goldFor(desertRun!)).toBeGreaterThan(250);
    expect(goldFor(palaceRun!)).toBeGreaterThan(420);
  });

  it('one clear of everything pays for two and a half tier 2 items at level 3 in gold (85% picked up), and every colour has enough gems for two', () => {
    const level3 = toLevel(3, 2);
    expect(goldFor(...journey) * 0.85).toBeGreaterThanOrEqual(level3.gold * 2.5);
    const total = gems(journey);
    for (const colour of ['red', 'green', 'blue'] as const) expect(total[colour], colour).toBeGreaterThanOrEqual(level3.gems * 2);
  });

  it('a favourite item reaches level 5 with a little replaying, not in one pass and not after a grind', () => {
    const level5 = toLevel(5, 2);
    const onePass = goldFor(...journey);
    expect(onePass).toBeLessThan(level5.gold);
    expect(onePass * 2).toBeGreaterThan(level5.gold);
    expect(onePass * 3).toBeGreaterThan(level5.gold * 1.5);
    expect(gems(journey).red).toBeGreaterThanOrEqual(level5.gems);
    expect(totalGems(gems(journey))).toBeLessThan(level5.gems * 5);
  });
});

describe('balance model: Heroic levels', () => {
  const HEROIC_CASES = CASES.flatMap(({ level, theme }) => [15, 25, 40].map((hero) => ({ level, theme, hero })));
  const runs = HEROIC_CASES.map(({ level, theme, hero }) => {
    const variant = heroicVariant(level, theme.encounters, hero);
    const ref = gearedReference(hero);
    return { name: `${level.id} @ hero ${hero}`, hero, ref, run: estimateLevel(variant.level, variant.encounters, hero, ref, theme), boss: variant.level.bossLevel! };
  });

  it.each(runs.map((r) => [r.name, r] as const))('%s: no room is crushing or trivial and the level has real teeth', (_, { run }) => {
    const rooms = pcts(run);
    for (const pct of rooms) {
      expect(pct).toBeLessThan(65);
      expect(pct).toBeGreaterThan(2.5);
    }
    expect(mean(rooms)).toBeGreaterThan(8);
    expect(rooms[rooms.length - 1]).toBeGreaterThan(14);
  });

  it.each(runs.map((r) => [r.name, r] as const))('%s: the boss is beatable in a reasonable fight and the run is a few minutes', (_, { run }) => {
    expect(run.bossSeconds).toBeGreaterThan(5);
    expect(run.bossSeconds).toBeLessThan(120);
    expect(run.runSeconds / 60).toBeGreaterThan(1.5);
    expect(run.runSeconds / 60).toBeLessThan(8);
  });

  it('later levels still cost more than earlier ones at the same hero level', () => {
    for (const hero of [15, 25, 40]) {
      const [r, d, p] = ['ruins', 'desert', 'palace'].map((id) => mean(pcts(runs.find((x) => x.name === `${id} @ hero ${hero}`)!.run)));
      expect(d).toBeGreaterThan(r!);
      expect(p).toBeGreaterThan(d!);
    }
  });
});

describe('balance model: Heroic curve', () => {
  it.each(CASES.flatMap(({ level, theme }) => [15, 25, 40].map((hero) => [`${level.id} @ hero ${hero}`, level, theme, hero] as const)))('%s: no room jumps more than 20 points over the one before', (_, level, theme, hero) => {
    const variant = heroicVariant(level, theme.encounters, hero);
    const rooms = pcts(estimateLevel(variant.level, variant.encounters, hero, gearedReference(hero), theme));
    for (let i = 1; i < rooms.length; i++) expect(rooms[i]! - rooms[i - 1]!, `room ${i + 1}`).toBeLessThanOrEqual(20);
  });
});
