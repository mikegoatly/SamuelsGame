import { describe, expect, it } from 'vitest';
import { desert } from '../src/content/levels/desert';
import { palace } from '../src/content/levels/palace';
import { ruins } from '../src/content/levels/ruins';
import { heroList } from '../src/content/heroes';
import { weaponList } from '../src/content/weapons';
import { DESERT_THEME, PALACE_THEME, RUINS_THEME } from '../src/logic/map/mapThemes';
import { estimateLevel, REFERENCE, type Reference } from './balanceModel';
import { weaponProfile, type WeaponProfile } from './weaponProfile';

const PARITY = 0.25;

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
const within = (value: number): boolean => Math.abs(value - 1) <= PARITY;
const heroesOf = (weaponId: string): string => heroList.filter((h) => h.signatureWeaponId === weaponId).map((h) => h.id).join('+') || '-';

const rows = weaponList.map((weapon) => {
  const profile = weaponProfile(weapon, REFERENCE.accuracy);
  const result = campaign(withWeapon(weapon.id));
  return {
    weapon: weapon.id,
    heroes: heroesOf(weapon.id),
    rawDps: +profile.rawDps.toFixed(1),
    effectiveDps: +(profile.rawDps * profile.accuracy * profile.uptime * profile.targetsPerHit).toFixed(1),
    roomDamagePct: +result.avgRoomPct.toFixed(1),
    damageRatio: +ratio(result.avgRoomPct, wand.avgRoomPct).toFixed(2),
    runSeconds: Math.round(result.seconds),
    clearRatio: +ratio(result.seconds, wand.seconds).toFixed(2),
  };
});

/** Weapons known to break parity today; the suite records the gap until they are tuned. */
const TODO_TUNE = new Set<string>(['apprenticeStaff', 'sludgeSlinger']);

describe('weapon balance: every weapon against the broken wand over the ruins-desert-palace run', () => {
  it('prints the comparison table', () => {
    console.table(rows);
    expect(rows).toHaveLength(weaponList.length);
  });

  it('the wand is its own baseline', () => {
    expect(rows.find((r) => r.weapon === 'brokenWand')).toMatchObject({ damageRatio: 1, clearRatio: 1 });
  });

  const parity = (row: (typeof rows)[number]): void => {
    expect(within(row.damageRatio), `room damage ratio ${row.damageRatio}`).toBe(true);
    expect(within(row.clearRatio), `clear time ratio ${row.clearRatio}`).toBe(true);
  };

  it.each(rows.filter((r) => !TODO_TUNE.has(r.weapon)).map((r) => [r.weapon, r] as const))('%s is within 25 percent of the wand for room damage and clear time', (_, row) => parity(row));

  // TODO(balance): tune apprenticeStaff — see docs/BALANCE-weapons.md
  // TODO(balance): tune sludgeSlinger — see docs/BALANCE-weapons.md
  it.fails.each(rows.filter((r) => TODO_TUNE.has(r.weapon)).map((r) => [r.weapon, r] as const))('%s is within 25 percent of the wand (TODO(balance): tune, see docs/BALANCE-weapons.md)', (_, row) => parity(row));
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
