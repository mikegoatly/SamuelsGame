import { describe, expect, it } from 'vitest';
import { RunLog } from '../src/logic/runLog';

describe('RunLog', () => {
  it('starts empty for the chosen hero and level', () => {
    const record = new RunLog('knight', 'ruins').finish(false, 0);
    expect(record).toMatchObject({ heroId: 'knight', levelId: 'ruins', cleared: false, kills: 0, potionsUsed: 0, skillAttempts: 0, dashes: 0 });
    expect(record.damageTaken).toEqual({ melee: 0, ranged: 0, hazard: 0, boss: 0 });
  });

  it('adds damage per source and counts kills and potions', () => {
    const log = new RunLog('wizard', 'ruins');
    log.damage('melee', 10);
    log.damage('melee', 5);
    log.damage('hazard', 7);
    log.kill();
    log.kill();
    log.potion();
    const record = log.finish(true, 5000);
    expect(record.damageTaken).toEqual({ melee: 15, ranged: 0, hazard: 7, boss: 0 });
    expect(record).toMatchObject({ kills: 2, potionsUsed: 1, cleared: true, timeMs: 5000 });
  });

  it('counts every skill attempt and dash', () => {
    const log = new RunLog('wizard', 'ruins');
    log.attempt();
    log.attempt();
    log.dash();
    const record = log.finish(true, 1);
    expect(record.skillAttempts).toBe(2);
    expect(record.dashes).toBe(1);
  });

  it('remembers which boss fell and the gold peak', () => {
    const log = new RunLog('wizard', 'ruins');
    log.gold(120);
    log.gold(80);
    log.bossKilled('stoneGuardian');
    const record = log.finish(true, 1);
    expect(record.bossKilled).toBe('stoneGuardian');
    expect(log.goldPeak).toBe(120);
  });
});
