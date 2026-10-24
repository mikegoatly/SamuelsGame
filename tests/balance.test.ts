import { describe, expect, it } from 'vitest';
import { stoneGuardian } from '../src/content/enemies';
import { ruins } from '../src/content/levels/ruins';
import { apprenticeStaff } from '../src/content/weapons';
import { damageToEnemy, enemyMaxHp } from '../src/logic/combat';

describe('stone guardian balance', () => {
  const level = ruins.bossLevel!;
  const hp = enemyMaxHp(stoneGuardian.baseHp, level);
  const secondsToKill = (playerLevel: number, accuracy: number): number => {
    const shotsPerSecond = 1000 / apprenticeStaff.fireRateMs;
    return hp / (damageToEnemy(apprenticeStaff.baseDamage, playerLevel, level) * shotsPerSecond * accuracy);
  };

  it('is a level 5 boss with a big but beatable health pool', () => {
    expect(level).toBe(5);
    expect(hp).toBeGreaterThanOrEqual(600);
    expect(hp).toBeLessThanOrEqual(900);
  });

  it('takes a level 4 player with the staff 60-90s at ~50% uptime', () => {
    expect(secondsToKill(4, 0.5)).toBeGreaterThanOrEqual(60);
    expect(secondsToKill(4, 0.5)).toBeLessThanOrEqual(90);
  });
});
