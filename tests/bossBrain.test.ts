import { describe, expect, it } from 'vitest';
import { sandRatBrain, stoneGuardianBrain } from '../src/content/bosses';
import { bossPhase, newBossState, phaseAttack, stepBoss, type BossAction, type BossBrainConfig, type BossState } from '../src/logic/bossBrain';
import { bossHp } from './builders';

const ratio = (r: number): number => bossHp(r).hp / bossHp(r).max;

type Logged = { at: number; action: BossAction };

/** Steps in 100ms ticks from `from` to `to`, collecting actions with the time they fired. */
function run(config: BossBrainConfig, state: BossState, from: number, to: number, hpRatio: number) {
  const log: Logged[] = [];
  let current = state;
  for (let now = from; now <= to; now += 100) {
    const step = stepBoss(config, current, now, hpRatio);
    current = step.state;
    for (const action of step.actions) log.push({ at: now, action });
  }
  return { state: current, log };
}

const types = (log: Logged[]) => log.map((l) => l.action.type);
const only = (log: Logged[], type: string) => log.filter((l) => l.action.type === type);
const fresh = (cfg: BossBrainConfig) => newBossState(cfg, 0);

describe('stone guardian brain', () => {
  const cfg = stoneGuardianBrain;
  const slam = (phase: 1 | 2) => phaseAttack(cfg, phase, 'slam')!;
  const burst = (phase: 1 | 2) => phaseAttack(cfg, phase, 'burst')!;
  const summon = (phase: 1 | 2) => phaseAttack(cfg, phase, 'summon');

  it('switches phase at 50% hp', () => {
    expect(bossPhase(cfg, ratio(1))).toBe(1);
    expect(bossPhase(cfg, ratio(0.51))).toBe(1);
    expect(bossPhase(cfg, ratio(0.5))).toBe(2);
    expect(bossPhase(cfg, ratio(0.1))).toBe(2);
  });

  it('phase 2 is faster, bursts more bolts and summons', () => {
    expect(burst(1).count).toBe(8);
    expect(burst(2).count).toBe(12);
    expect(cfg.phases[2].speedMultiplier).toBeGreaterThan(cfg.phases[1].speedMultiplier);
    expect(slam(2).cooldownMs).toBeLessThan(slam(1).cooldownMs);
    expect(summon(1)).toBeUndefined();
    expect(summon(2)!.count).toBe(2);
  });

  it('does nothing before the first timers elapse', () => {
    const { log, state } = run(cfg, fresh(cfg), 0, 1000, 1);
    expect(log).toEqual([]);
    expect(state.mode).toBe('chase');
  });

  it('telegraphs a slam, strikes 0.8s later and returns to chasing', () => {
    const attack = slam(1);
    const { log, state } = run(cfg, fresh(cfg), 0, attack.firstMs + 900, 1);
    const telegraph = only(log, 'telegraph')[0]!;
    const strike = only(log, 'slam')[0]!;
    expect(telegraph.at).toBe(attack.firstMs);
    expect(strike.at - telegraph.at).toBe(attack.telegraphMs);
    expect(attack.telegraphMs).toBe(800);
    expect(state.mode).toBe('chase');
    expect(state.due.slam).toBe(strike.at + attack.cooldownMs);
  });

  it('fires 8-bolt bursts on a steady beat in phase 1 and never summons', () => {
    const { log } = run(cfg, fresh(cfg), 0, 13000, 1);
    const bursts = only(log, 'burst');
    expect(bursts.length).toBeGreaterThanOrEqual(3);
    expect(bursts.every((b) => b.action.type === 'burst' && b.action.count === 8)).toBe(true);
    expect(types(log)).not.toContain('summon');
    expect(types(log)).not.toContain('phase');
  });

  it('announces phase 2 once, then bursts 12 and summons 2 bats on a timer', () => {
    const start = run(cfg, fresh(cfg), 0, 500, 1).state;
    const { log } = run(cfg, start, 600, 20000, 0.4);
    expect(only(log, 'phase')).toHaveLength(1);
    expect(only(log, 'burst').every((b) => b.action.type === 'burst' && b.action.count === 12)).toBe(true);
    const summons = only(log, 'summon');
    expect(summons.length).toBeGreaterThanOrEqual(2);
    expect(summons[1]!.at - summons[0]!.at).toBe(summon(2)!.everyMs);
    expect(summons.every((s) => s.action.type === 'summon' && s.action.count === 2 && s.action.minion === 'bat')).toBe(true);
  });

  it('stays in phase 2 if hp is reported higher again', () => {
    const entered = run(cfg, fresh(cfg), 0, 200, 0.3).state;
    expect(stepBoss(cfg, entered, 300, 0.9).state.phase).toBe(2);
  });
});

describe('hidden time', () => {
  it('pushes timed attacks back by the time spent hidden, so nothing fires in a burst on emerging', () => {
    const cfg = sandRatBrain;
    const burrow = phaseAttack(cfg, 1, 'burrow')!;
    const dive = run(cfg, fresh(cfg), 0, burrow.firstMs, 1).state;
    const remaining = dive.due.spit! - burrow.firstMs;
    const hiddenMs = burrow.travelMs + burrow.telegraphMs;
    const { log } = run(cfg, dive, burrow.firstMs + 100, burrow.firstMs + hiddenMs + 3000, 1);
    const emerge = only(log, 'emerge')[0]!;
    const next = only(log, 'spit').find((l) => l.at > emerge.at - 1)!;
    expect(only(log, 'spit').filter((l) => l.at < emerge.at)).toEqual([]);
    expect(next.at).toBeGreaterThanOrEqual(emerge.at + remaining - 100);
  });
});

describe('sand rat brain', () => {
  const cfg = sandRatBrain;
  const burrow = (phase: 1 | 2) => phaseAttack(cfg, phase, 'burrow')!;

  it('burrows, travels hidden, telegraphs the emergence then emerges', () => {
    const attack = burrow(1);
    const { log, state } = run(cfg, fresh(cfg), 0, attack.firstMs + attack.travelMs + attack.telegraphMs + 200, 1);
    const dive = only(log, 'burrow')[0]!;
    const warn = only(log, 'telegraph')[0]!;
    const emerge = only(log, 'emerge')[0]!;
    expect(dive.at).toBe(attack.firstMs);
    expect(warn.at - dive.at).toBe(attack.travelMs);
    expect(emerge.at - warn.at).toBe(attack.telegraphMs);
    expect(warn.action).toMatchObject({ type: 'telegraph', radius: attack.radius, durationMs: attack.telegraphMs });
    expect(state.mode).toBe('chase');
    expect(state.due.burrow).toBe(emerge.at + attack.cooldownMs);
  });

  it('is hidden between the dive and the emergence', () => {
    const attack = burrow(1);
    const start = run(cfg, fresh(cfg), 0, attack.firstMs, 1).state;
    expect(start.mode).toBe('burrowed');
    expect(stepBoss(cfg, start, attack.firstMs + attack.travelMs, 1).state.mode).toBe('rising');
  });

  it('holds timed attacks while hidden and fires them afterwards', () => {
    const { log } = run(cfg, fresh(cfg), 0, 30000, 1);
    const windows = only(log, 'burrow').map((b) => [b.at, only(log, 'emerge').find((e) => e.at > b.at)?.at ?? Infinity] as const);
    for (const spit of only(log, 'spit')) {
      for (const [from, to] of windows) expect(spit.at <= from || spit.at >= to).toBe(true);
    }
    expect(only(log, 'spit').length).toBeGreaterThanOrEqual(4);
  });

  it('spits a spread volley in phase 1 and a bigger one in phase 2', () => {
    const one = phaseAttack(cfg, 1, 'spit')!;
    const two = phaseAttack(cfg, 2, 'spit')!;
    expect(one.count).toBe(3);
    expect(two.count).toBeGreaterThan(one.count);
    const first = only(run(cfg, fresh(cfg), 0, 8000, 1).log, 'spit')[0]!;
    expect(first.action).toMatchObject({ type: 'spit', count: 3 });
  });

  it('summons scorpions only in phase 2', () => {
    expect(phaseAttack(cfg, 1, 'summon')).toBeUndefined();
    const { log } = run(cfg, fresh(cfg), 0, 30000, 0.3);
    const summons = only(log, 'summon');
    expect(summons.length).toBeGreaterThanOrEqual(2);
    expect(summons.every((s) => s.action.type === 'summon' && s.action.minion === 'scorpion')).toBe(true);
  });

  it('burrows more often and moves faster in phase 2', () => {
    expect(burrow(2).cooldownMs).toBeLessThan(burrow(1).cooldownMs);
    expect(cfg.phases[2].speedMultiplier).toBeGreaterThan(cfg.phases[1].speedMultiplier);
  });
});
