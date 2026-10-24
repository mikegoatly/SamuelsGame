import { describe, expect, it } from 'vitest';
import { SkillCooldowns } from '../src/logic/skillCooldown';
import { expectClose } from './builders';

describe('SkillCooldowns', () => {
  it('is ready until started, then counts down on the supplied clock', () => {
    const cooldowns = new SkillCooldowns();
    expect(cooldowns.ready('fireball', 0)).toBe(true);
    cooldowns.start('fireball', 1000, 2500);
    expect(cooldowns.ready('fireball', 1000)).toBe(false);
    expect(cooldowns.remaining('fireball', 2000)).toBe(1500);
    expectClose(cooldowns.fraction('fireball', 2000), 0.4);
    expect(cooldowns.ready('fireball', 3500)).toBe(true);
    expect(cooldowns.fraction('fireball', 3500)).toBe(1);
  });

  it('keeps skills independent and resets', () => {
    const cooldowns = new SkillCooldowns();
    cooldowns.start('a', 0, 1000);
    expect(cooldowns.ready('b', 0)).toBe(true);
    cooldowns.reset();
    expect(cooldowns.ready('a', 0)).toBe(true);
  });

  it('never reports a negative remaining time or a fraction outside 0..1', () => {
    const cooldowns = new SkillCooldowns();
    cooldowns.start('a', 0, 100);
    expect(cooldowns.remaining('a', 999)).toBe(0);
    expect(cooldowns.fraction('a', -50)).toBe(0);
  });
});
