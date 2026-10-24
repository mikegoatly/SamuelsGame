import { describe, expect, it } from 'vitest';
import { bossPhase, newBossState, phaseTuning, stepBoss, type BossAction, type BossState } from '../src/logic/bossBrain';
import { bossHp } from './builders';

const ratio = (r: number): number => bossHp(r).hp / bossHp(r).max;

/** Steps in 100ms ticks from `from` to `to`, collecting actions with the time they fired. */
function run(state: BossState, from: number, to: number, hpRatio: number) {
  const log: { at: number; action: BossAction }[] = [];
  let current = state;
  for (let now = from; now <= to; now += 100) {
    const step = stepBoss(current, now, hpRatio);
    current = step.state;
    for (const action of step.actions) log.push({ at: now, action });
  }
  return { state: current, log };
}

const types = (log: { action: BossAction }[]) => log.map((l) => l.action.type);

describe('bossPhase', () => {
  it('switches at 50% hp', () => {
    expect(bossPhase(ratio(1))).toBe(1);
    expect(bossPhase(ratio(0.51))).toBe(1);
    expect(bossPhase(ratio(0.5))).toBe(2);
    expect(bossPhase(ratio(0.1))).toBe(2);
  });

  it('phase 2 is faster, bursts more bolts and summons', () => {
    const one = phaseTuning(1);
    const two = phaseTuning(2);
    expect(one.burstCount).toBe(8);
    expect(two.burstCount).toBe(12);
    expect(two.speedMultiplier).toBeGreaterThan(one.speedMultiplier);
    expect(two.slamCooldownMs).toBeLessThan(one.slamCooldownMs);
    expect(one.summonEveryMs).toBeNull();
    expect(two.summonCount).toBe(2);
  });
});

describe('stepBoss', () => {
  it('does nothing before the first timers elapse', () => {
    const { log, state } = run(newBossState(0), 0, 1000, 1);
    expect(log).toEqual([]);
    expect(state.mode).toBe('chase');
  });

  it('telegraphs a slam, strikes 0.8s later and returns to chasing', () => {
    const tuning = phaseTuning(1);
    const { log, state } = run(newBossState(0), 0, tuning.firstSlamMs + 900, 1);
    const telegraph = log.find((l) => l.action.type === 'telegraph')!;
    const slam = log.find((l) => l.action.type === 'slam')!;
    expect(telegraph.at).toBe(tuning.firstSlamMs);
    expect(slam.at - telegraph.at).toBe(tuning.telegraphMs);
    expect(tuning.telegraphMs).toBe(800);
    expect(state.mode).toBe('chase');
    expect(state.nextSlamAt).toBe(slam.at + tuning.slamCooldownMs);
  });

  it('fires 8-bolt bursts on a steady beat in phase 1 and never summons', () => {
    const { log } = run(newBossState(0), 0, 13000, 1);
    const bursts = log.filter((l) => l.action.type === 'burst');
    expect(bursts.length).toBeGreaterThanOrEqual(3);
    expect(bursts.every((b) => b.action.type === 'burst' && b.action.count === 8)).toBe(true);
    expect(types(log)).not.toContain('summon');
    expect(types(log)).not.toContain('phase');
  });

  it('announces phase 2 once, then bursts 12 and summons 2 bats on a timer', () => {
    const start = run(newBossState(0), 0, 500, 1).state;
    const { log } = run(start, 600, 20000, 0.4);
    expect(types(log).filter((t) => t === 'phase')).toHaveLength(1);
    const bursts = log.filter((l) => l.action.type === 'burst').map((l) => l.action);
    expect(bursts.every((a) => a.type === 'burst' && a.count === 12)).toBe(true);
    const summons = log.filter((l) => l.action.type === 'summon');
    expect(summons.length).toBeGreaterThanOrEqual(2);
    expect(summons[1]!.at - summons[0]!.at).toBe(phaseTuning(2).summonEveryMs);
    expect(summons.every((s) => s.action.type === 'summon' && s.action.count === 2)).toBe(true);
  });

  it('stays in phase 2 if hp is reported higher again', () => {
    const entered = run(newBossState(0), 0, 200, 0.3).state;
    expect(stepBoss(entered, 300, 0.9).state.phase).toBe(2);
  });
});
