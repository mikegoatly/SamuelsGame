import { describe, expect, it } from 'vitest';
import { Frame, GlitchFrame } from '../src/content/assetKeys';
import { getHero, heroList, RATING } from '../src/content/heroes';

describe('Glitch the Glitcher', () => {
  const hero = getHero('glitcher');

  it('is the last hero in the list, a hidden blue robot', () => {
    expect(heroList[heroList.length - 1]).toBe(hero);
    expect(hero).toMatchObject({ id: 'glitcher', name: 'Glitch the Glitcher', className: 'Robot', hidden: true, signatureWeaponId: 'pixelPulse' });
    expect(hero.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(hero.hint).toBeTruthy();
  });

  it('has high health, low speed, mid attack and 1.1 damage', () => {
    expect(hero.stats).toMatchObject({ maxHp: RATING.high, moveSpeed: RATING.low, attackRate: RATING.mid, damage: 1.1 });
  });

  it('carries the Phase Glitch passive with a short child-readable text', () => {
    expect(hero.passive).toMatchObject({ id: 'phaseGlitch', name: 'Phase Glitch' });
    expect(hero.passive.text.length).toBeLessThan(90);
  });

  it('draws his frame from the tile sheet slot the preload fills with the Glitch sheet hero', () => {
    expect(hero.frame).toBe(Frame.glitcher);
    expect(GlitchFrame.hero).toBe(0);
    expect(Frame.glitcher).toBeGreaterThanOrEqual(144);
  });
});
