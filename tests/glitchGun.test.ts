import { describe, expect, it } from 'vitest';
import { heroList } from '../src/content/heroes';
import { glitchGun, pixelPulse, usableWeapons } from '../src/content/weapons';
import { weaponDps } from '../src/content/weaponDps';
import { GLITCH_TWISTS, glitchDpsFactor, glitchTargets, rollGlitchTwist } from '../src/logic/glitchGun';
import { mulberry32 } from '../src/logic/rng';
import { sequenceRng } from './builders';

describe('rollGlitchTwist', () => {
  it.each(GLITCH_TWISTS.map((t, i) => [t.id, (i + 0.5) / GLITCH_TWISTS.length] as const))('a roll of %s lands on that twist', (id, roll) => {
    expect(rollGlitchTwist(sequenceRng(roll)).id).toBe(id);
  });

  it('shows every twist in its own colour', () => {
    expect(new Set(GLITCH_TWISTS.map((t) => t.tint)).size).toBe(GLITCH_TWISTS.length);
  });

  it('rolls every twist about equally often', () => {
    const rng = mulberry32(11);
    const counts = new Map<string, number>();
    for (let i = 0; i < 8000; i++) {
      const id = rollGlitchTwist(rng).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const twist of GLITCH_TWISTS) expect(counts.get(twist.id)! / 8000).toBeGreaterThan(0.18);
  });

  it('has no twist that is best on one target and in a crowd at once', () => {
    for (const a of GLITCH_TWISTS) {
      const strictlyBest = GLITCH_TWISTS.every((b) => b === a || (a.damageScale > b.damageScale && a.crowdTargets > b.crowdTargets));
      expect(strictlyBest, a.id).toBe(false);
    }
  });
});

describe('the new weapons', () => {
  it('Pixel Pulse is 18 damage per 600ms, piercing, hero-only, uncoloured (its bolt art is cyan)', () => {
    expect(pixelPulse).toMatchObject({ baseDamage: 18, fireRateMs: 600, pierceAll: true, heroOnly: 'glitcher', tint: null });
    expect(weaponDps(pixelPulse)).toBeCloseTo(30, 5);
  });

  it('Glitch Gun averages a tier 3 DPS over its twists', () => {
    expect(glitchDpsFactor()).toBeGreaterThan(1);
    expect(weaponDps(glitchGun)).toBeGreaterThan(45);
    expect(weaponDps(glitchGun)).toBeLessThan(58);
    expect(glitchTargets()).toBeGreaterThan(1);
  });
});

describe('hero-only weapons', () => {
  const heroIds = heroList.map((h) => h.id);
  it.each(heroIds)('%s may use Pixel Pulse only if they are Glitch the Glitcher', (heroId) => {
    expect(usableWeapons(['pixelPulse'], heroId)).toEqual(heroId === 'glitcher' ? ['pixelPulse'] : []);
  });

  it('every other hero keeps the Glitch Gun', () => {
    for (const id of heroIds) expect(usableWeapons(['glitchGun'], id)).toEqual(['glitchGun']);
  });

  it('shows the four twists in clearly different hues (cyan, violet, red, yellow)', () => {
    expect(GLITCH_TWISTS.map((t) => t.tint)).toEqual([0x60e0ff, 0xb07cff, 0xff6a6a, 0xffd860]);
  });
});
