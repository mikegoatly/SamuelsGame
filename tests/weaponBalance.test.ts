import { describe, expect, it } from 'vitest';
import { desert } from '../src/content/levels/desert';
import { palace } from '../src/content/levels/palace';
import { ruins } from '../src/content/levels/ruins';
import { heroList } from '../src/content/heroes';
import { weaponList } from '../src/content/weapons';
import { DESERT_THEME, PALACE_THEME, RUINS_THEME } from '../src/logic/map/mapThemes';
import { estimateLevel, REFERENCE, type Reference } from './balanceModel';
import { weaponUpgradeInfo } from '../src/content/upgradeInfo';
import type { SkillTier } from '../src/logic/shop';
import { weaponProfile, type WeaponProfile } from './weaponProfile';

/** Room damage and clear time against the broken wand (below 1 is stronger), by weapon tier. */
const BANDS: Record<SkillTier, { damage: [number, number]; clear: [number, number] }> = {
  1: { damage: [1.5, 3.5], clear: [1.3, 2.5] },
  2: { damage: [0.75, 1.25], clear: [0.75, 1.25] },
  3: { damage: [0.55, 0.85], clear: [0.6, 0.9] },
};
/** A level 5 tier 1 weapon stays within this factor of the wand (a starter must not be a dead end). */
const STARTER_MAX_UPGRADED = 1.4;

/** The same chained campaign as the balance model's journey (ruins, desert, palace, carrying the level over), at weapon level 1. */
function campaign(ref: Reference) {
  const first = estimateLevel(ruins, RUINS_THEME.encounters, 1, ref, RUINS_THEME);
  const second = estimateLevel(desert, DESERT_THEME.encounters, first.endLevel, ref, DESERT_THEME);
  const third = estimateLevel(palace, PALACE_THEME.encounters, second.endLevel, ref, PALACE_THEME);
  const rooms = [first, second, third].flatMap((run) => run.rooms.map((room) => room.damagePct * 100));
  return { avgRoomPct: rooms.reduce((a, b) => a + b, 0) / rooms.length, seconds: first.runSeconds + second.runSeconds + third.runSeconds };
}

const withWeapon = (weaponId: string, profile?: Partial<WeaponProfile>): Reference => ({ ...REFERENCE, weaponId, profile });

const wand = campaign(withWeapon('brokenWand'));
const ratio = (value: number, base: number): number => value / base;
const inBand = (value: number, [min, max]: [number, number]): boolean => value >= min && value <= max;
const tierOf = (weaponId: string): SkillTier => weaponUpgradeInfo[weaponId]!.tier;
const heroesOf = (weaponId: string): string => heroList.filter((h) => h.signatureWeaponId === weaponId).map((h) => h.id).join('+') || '-';

const rows = weaponList.map((weapon) => {
  const profile = weaponProfile(weapon, REFERENCE.accuracy);
  const result = campaign(withWeapon(weapon.id));
  return {
    weapon: weapon.id,
    tier: tierOf(weapon.id),
    heroes: heroesOf(weapon.id),
    rawDps: +profile.rawDps.toFixed(1),
    effectiveDps: +(profile.rawDps * profile.accuracy * profile.uptime * profile.targetsPerHit).toFixed(1),
    roomDamagePct: +result.avgRoomPct.toFixed(1),
    damageRatio: +ratio(result.avgRoomPct, wand.avgRoomPct).toFixed(2),
    runSeconds: Math.round(result.seconds),
    clearRatio: +ratio(result.seconds, wand.seconds).toFixed(2),
  };
});

/** Weapons that cannot yet be tuned into their tier band (none today). */
const TODO_TUNE = new Set<string>();

describe('weapon balance: every weapon against the broken wand over the ruins-desert-palace run, by tier', () => {
  it('prints the comparison table', () => {
    console.table(rows);
    expect(rows).toHaveLength(weaponList.length);
  });

  it('the wand is its own baseline', () => {
    expect(rows.find((r) => r.weapon === 'brokenWand')).toMatchObject({ damageRatio: 1, clearRatio: 1 });
  });

  it('every weapon has a tier', () => {
    for (const weapon of weaponList) expect([1, 2, 3], weapon.id).toContain(weaponUpgradeInfo[weapon.id]?.tier);
  });

  const bandCheck = (row: (typeof rows)[number]): void => {
    const band = BANDS[row.tier];
    expect(inBand(row.damageRatio, band.damage), `tier ${row.tier} room damage ratio ${row.damageRatio} outside ${band.damage}`).toBe(true);
    expect(inBand(row.clearRatio, band.clear), `tier ${row.tier} clear time ratio ${row.clearRatio} outside ${band.clear}`).toBe(true);
  };

  it.each(rows.filter((r) => !TODO_TUNE.has(r.weapon)).map((r) => [`${r.weapon} (tier ${r.tier})`, r] as const))('%s is inside its tier band for room damage and clear time', (_, row) => bandCheck(row));

  it.each(rows.filter((r) => r.tier === 1).map((r) => [r.weapon] as const))('tier 1 %s at upgrade level 5 is within 1.4x of the wand', (id) => {
    const upgraded = campaign({ ...REFERENCE, weaponId: id, weaponLevel: 5 });
    expect(ratio(upgraded.avgRoomPct, wand.avgRoomPct), 'room damage vs the level 1 wand').toBeLessThanOrEqual(STARTER_MAX_UPGRADED);
    expect(ratio(upgraded.seconds, wand.seconds), 'clear time vs the level 1 wand').toBeLessThanOrEqual(STARTER_MAX_UPGRADED);
  });

  it('every tier 3 weapon beats every tier 2 weapon on room damage', () => {
    const tier2 = rows.filter((r) => r.tier === 2).map((r) => r.roomDamagePct);
    for (const row of rows.filter((r) => r.tier === 3)) expect(row.roomDamagePct, row.weapon).toBeLessThan(Math.min(...tier2));
  });

  // TODO(balance): list weapons here only when they cannot be tuned into band; see docs/BALANCE-weapons.md
  it.each(rows.filter((r) => TODO_TUNE.has(r.weapon)).map((r) => [r.weapon, r] as const))('%s is inside its tier band (known gap)', (_, row) => {
    expect(() => bandCheck(row)).toThrow();
  });
});

describe('weapon balance: what makes the golden sword strong (one factor off at a time)', () => {
  const sword = weaponProfile(weaponList.find((w) => w.id === 'goldenSword')!, REFERENCE.accuracy);
  const OFF: [string, Partial<WeaponProfile>][] = [
    ['all factors on', {}],
    ['single target', { targetsPerHit: 1 }],
    ['no knockback', { contactAvoided: 0 }],
    ['no bolt swatting', { boltsBlocked: 0 }],
    ['no melee accuracy bonus', { accuracy: REFERENCE.accuracy }],
    ['no walk-in cost', { closeIn: 0, uptime: 1 }],
    ['raw DPS of the wand', { rawDps: 40 }],
    ['all extras off (DPS x accuracy only)', { targetsPerHit: 1, contactAvoided: 0, boltsBlocked: 0, closeIn: 0, uptime: 1, accuracy: REFERENCE.accuracy }],
  ];
  const table = OFF.map(([name, profile]) => {
    const result = campaign(withWeapon('goldenSword', profile));
    return { variant: name, roomDamagePct: +result.avgRoomPct.toFixed(1), damageRatio: +ratio(result.avgRoomPct, wand.avgRoomPct).toFixed(2), runSeconds: Math.round(result.seconds), clearRatio: +ratio(result.seconds, wand.seconds).toFixed(2) };
  });

  it('prints the ablation table', () => {
    console.table(table);
    expect(sword.rawDps).toBeGreaterThan(40);
    expect(table[0]!.roomDamagePct).toBeLessThanOrEqual(table[table.length - 1]!.roomDamagePct);
  });
});
