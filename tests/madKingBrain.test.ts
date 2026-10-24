import { describe, expect, it } from 'vitest';
import { madKingBrain, sandRatBrain, stoneGuardianBrain } from '../src/content/bosses';
import { newBossState, phaseAttack, stepBoss, summonCount, type BossAction, type BossBrainConfig, type BossState } from '../src/logic/bossBrain';

type Logged = { at: number; action: BossAction };

function run(config: BossBrainConfig, state: BossState, from: number, to: number, hpRatio: number) {
  const log: Logged[] = [];
  let current = state;
  for (let now = from; now <= to; now += 50) {
    const step = stepBoss(config, current, now, hpRatio);
    current = step.state;
    for (const action of step.actions) log.push({ at: now, action });
  }
  return { state: current, log };
}

const only = (log: Logged[], type: string) => log.filter((l) => l.action.type === type);
const fresh = (cfg: BossBrainConfig) => newBossState(cfg, 0);

describe('mad king brain', () => {
  const cfg = madKingBrain;

  it('lunges: telegraphs a line, dashes after the windup and recovers after the dash', () => {
    const single: BossBrainConfig = {
      phaseTwoAt: 0.5,
      phases: { 1: { speedMultiplier: 1, attacks: [{ kind: 'lunge', firstMs: 4000, cooldownMs: 5000, telegraphMs: 700, dashMs: 400, dashSpeed: 340, width: 18 }] }, 2: { speedMultiplier: 1, attacks: [] } },
    };
    const lunge = phaseAttack(single, 1, 'lunge')!;
    const { log, state } = run(single, fresh(single), 0, lunge.firstMs + lunge.telegraphMs + lunge.dashMs + 100, 1);
    const line = only(log, 'telegraphLine')[0]!;
    const dash = only(log, 'lunge')[0]!;
    const end = only(log, 'lungeEnd')[0]!;
    expect(line.at).toBe(lunge.firstMs);
    expect(line.action).toMatchObject({ length: (lunge.dashSpeed * lunge.dashMs) / 1000, durationMs: lunge.telegraphMs });
    expect(dash.at - line.at).toBe(lunge.telegraphMs);
    expect(dash.action).toMatchObject({ speed: lunge.dashSpeed, dashMs: lunge.dashMs });
    expect(end.at - dash.at).toBe(lunge.dashMs);
    expect(state.mode).toBe('chase');
    expect(state.due.lunge).toBe(end.at + lunge.cooldownMs);
  });

  it('lunge combos: chained lunges re-aim with a shorter warning and only the last one starts the cooldown', () => {
    const lunge = phaseAttack(cfg, 1, 'lunge')!;
    expect(lunge.lunges).toBeGreaterThanOrEqual(2);
    expect(lunge.lunges).toBeLessThanOrEqual(3);
    const chainMs = lunge.chainTelegraphMs!;
    expect(chainMs).toBeGreaterThanOrEqual(450);
    expect(chainMs).toBeLessThan(lunge.telegraphMs);
    const total = lunge.telegraphMs + lunge.dashMs + (lunge.lunges! - 1) * (chainMs + lunge.dashMs);
    const { log, state } = run(cfg, fresh(cfg), 0, lunge.firstMs + total + 50, 1);
    const lines = only(log, 'telegraphLine').filter((l) => l.at >= lunge.firstMs);
    const dashes = only(log, 'lunge');
    expect(lines).toHaveLength(lunge.lunges!);
    expect(dashes).toHaveLength(lunge.lunges!);
    expect(dashes[1]!.at - lines[1]!.at).toBe(chainMs);
    expect(lines[1]!.at).toBe(only(log, 'lungeEnd')[0]!.at);
    expect(state.mode).toBe('chase');
    expect(state.due.lunge).toBe(only(log, 'lungeEnd')[lunge.lunges! - 1]!.at + lunge.cooldownMs);
  });

  it('phase 1 is a bullet hell: dense rings, double spirals, and combos; no teleport or seekers yet', () => {
    expect(phaseAttack(cfg, 1, 'burst')!.count).toBeGreaterThanOrEqual(16);
    expect(phaseAttack(cfg, 1, 'burst')!.everyMs).toBeLessThanOrEqual(4000);
    expect(phaseAttack(cfg, 1, 'spiral')!.arms).toBe(2);
    expect(phaseAttack(cfg, 1, 'teleport')).toBeUndefined();
    expect(phaseAttack(cfg, 1, 'seek')).toBeUndefined();
  });

  it('phase 2 swaps to seeking bullets with fewer straight ones, and keeps teleport and lunges', () => {
    const straightPerSecond = (phase: 1 | 2): number =>
      cfg.phases[phase].attacks.reduce((sum, a) => sum + (a.kind === 'burst' || a.kind === 'spiral' ? (a.count * (a.kind === 'spiral' ? (a.arms ?? 1) : 1) * 1000) / a.everyMs : 0), 0);
    const seek = phaseAttack(cfg, 2, 'seek')!;
    expect(seek.count).toBeGreaterThanOrEqual(5);
    expect(seek.turnRate).toBeGreaterThan(0.8);
    expect(seek.turnRate).toBeLessThan(2);
    expect(straightPerSecond(2)).toBeLessThan(straightPerSecond(1));
    expect(phaseAttack(cfg, 2, 'teleport')).toBeDefined();
    expect(phaseAttack(cfg, 2, 'lunge')!.cooldownMs).toBeLessThan(phaseAttack(cfg, 1, 'lunge')!.cooldownMs);
  });

  it('seek volleys fire on their cadence once phase 2 starts', () => {
    const seek = phaseAttack(cfg, 2, 'seek')!;
    const { log } = run(cfg, fresh(cfg), 0, 30000, 0.3);
    const volleys = only(log, 'seek');
    expect(volleys.length).toBeGreaterThanOrEqual(4);
    expect(volleys[0]!.action).toMatchObject({ count: seek.count, turnRate: seek.turnRate, ms: seek.lifeMs });
  });

  it('summons palace guards in both phases', () => {
    for (const phase of [1, 2] as const) expect(phaseAttack(cfg, phase, 'summon')!.minion).toBe('palaceGuard');
  });

  it('teleport hides, warns at the destination, then appears; timed attacks wait for it', () => {
    const phase2 = run(cfg, fresh(cfg), 0, 100, 0.3).state;
    const teleport = phaseAttack(cfg, 2, 'teleport')!;
    const { log } = run(cfg, phase2, 150, 20000, 0.3);
    const vanish = only(log, 'vanish')[0]!;
    const warn = only(log, 'telegraph').find((l) => l.at > vanish.at)!;
    const appear = only(log, 'appear')[0]!;
    expect(warn.at - vanish.at).toBe(teleport.vanishMs);
    expect(appear.at - warn.at).toBe(teleport.telegraphMs);
    for (const type of ['seek', 'burst', 'summon']) {
      expect(only(log, type).filter((l) => l.at > vanish.at && l.at < appear.at), type).toEqual([]);
    }
    expect(only(log, 'seek').length).toBeGreaterThanOrEqual(2);
  });

  it('is untargetable only while vanished', () => {
    const phase2 = run(cfg, fresh(cfg), 0, 100, 0.3).state;
    const teleport = phaseAttack(cfg, 2, 'teleport')!;
    const hiding = run(cfg, phase2, 150, teleport.firstMs + 100, 0.3).state;
    expect(['burrowed', 'rising']).toContain(hiding.mode);
  });

  it('does not push timed attacks into a burst after reappearing', () => {
    const phase2 = run(cfg, fresh(cfg), 0, 100, 0.3).state;
    const { log } = run(cfg, phase2, 150, 20000, 0.3);
    const appear = only(log, 'appear')[0]!;
    const after = log.filter((l) => l.at >= appear.at && l.at <= appear.at + 50 && ['seek', 'burst', 'summon', 'lunge'].includes(l.action.type));
    expect(after.length).toBeLessThanOrEqual(1);
  });
});

describe('phase change in the middle of a sequence', () => {
  const lungeOnly: BossBrainConfig = {
    phaseTwoAt: 0.5,
    phases: {
      1: { speedMultiplier: 1, attacks: [{ kind: 'lunge', firstMs: 100, cooldownMs: 1000, telegraphMs: 500, dashMs: 300, dashSpeed: 300, width: 14 }] },
      2: { speedMultiplier: 1, attacks: [{ kind: 'spiral', firstMs: 100, everyMs: 1000, count: 10, turns: 1 }] },
    },
  };
  const burrowOnly: BossBrainConfig = {
    phaseTwoAt: 0.5,
    phases: {
      1: { speedMultiplier: 1, attacks: [{ kind: 'burrow', firstMs: 100, cooldownMs: 1000, travelMs: 500, telegraphMs: 400, radius: 40 }] },
      2: { speedMultiplier: 1, attacks: [{ kind: 'burst', firstMs: 100, everyMs: 1000, count: 6 }] },
    },
  };

  it('finishes a lunge started in phase 1 even though phase 2 has none', () => {
    const windup = run(lungeOnly, fresh(lungeOnly), 0, 200, 1).state;
    expect(windup.mode).toBe('telegraph');
    const { state, log } = run(lungeOnly, windup, 250, 1500, 0.2);
    expect(only(log, 'lunge')).toHaveLength(1);
    expect(only(log, 'lungeEnd')).toHaveLength(1);
    expect(state.mode).toBe('chase');
  });

  it('never leaves the boss hidden when phase 2 lost the hiding attack', () => {
    const hidden = run(burrowOnly, fresh(burrowOnly), 0, 200, 1).state;
    expect(hidden.mode).toBe('burrowed');
    const { state, log } = run(burrowOnly, hidden, 250, 2000, 0.2);
    expect(only(log, 'emerge')).toHaveLength(1);
    expect(state.mode).toBe('chase');
  });
});

describe('hidden time pushes every other timer back', () => {
  it('mad king: the lunge due time is shifted by the time spent teleporting', () => {
    const phase2 = run(madKingBrain, fresh(madKingBrain), 0, 100, 0.3).state;
    const teleport = phaseAttack(madKingBrain, 2, 'teleport')!;
    const vanishAt = teleport.firstMs;
    const hiding = run(madKingBrain, phase2, 150, vanishAt, 0.3).state;
    expect(hiding.active).toBe('teleport');
    const dueBefore = hiding.due.lunge!;
    const after = run(madKingBrain, hiding, vanishAt + 50, vanishAt + teleport.vanishMs + teleport.telegraphMs, 0.3);
    const appear = only(after.log, 'appear')[0]!;
    const hiddenFor = appear.at - vanishAt;
    expect(only(after.log, 'lunge')).toEqual([]);
    expect(Math.max(dueBefore + hiddenFor - 50, 0)).toBeLessThanOrEqual(after.state.due.lunge! + 50);
    expect(after.state.due.lunge!).toBeGreaterThanOrEqual(dueBefore + hiddenFor - 50);
  });

  it('sand rat style: a slam due while burrowed is pushed back by the hidden time (slam included)', () => {
    const cfg: BossBrainConfig = {
      phaseTwoAt: 0.5,
      phases: {
        1: {
          speedMultiplier: 1,
          attacks: [
            { kind: 'burrow', firstMs: 100, cooldownMs: 9000, travelMs: 500, telegraphMs: 400, radius: 40 },
            { kind: 'slam', firstMs: 5000, cooldownMs: 3000, telegraphMs: 500, radius: 50 },
          ],
        },
        2: { speedMultiplier: 1, attacks: [] },
      },
    };
    const hidden = run(cfg, fresh(cfg), 0, 200, 1).state;
    expect(hidden.mode).toBe('burrowed');
    const after = run(cfg, hidden, 250, 1200, 1);
    expect(after.state.mode).toBe('chase');
    expect(after.state.due.slam!).toBeGreaterThanOrEqual(5000 + (only(after.log, 'emerge')[0]!.at - 100) - 50);
    for (const kind of [sandRatBrain, stoneGuardianBrain]) expect(kind.phases[1].attacks.length).toBeGreaterThan(0);
  });
});

describe('minion caps', () => {
  it('summonCount never exceeds the cap given what is alive', () => {
    expect(summonCount(2, 4, 0)).toBe(2);
    expect(summonCount(2, 4, 3)).toBe(1);
    expect(summonCount(2, 4, 4)).toBe(0);
    expect(summonCount(2, 3, 9)).toBe(0);
  });

  it('every boss summon is capped in its config', () => {
    for (const brain of [stoneGuardianBrain, sandRatBrain, madKingBrain]) {
      for (const phase of [1, 2] as const) {
        for (const attack of brain.phases[phase].attacks) if (attack.kind === 'summon') expect(attack.maxAlive, attack.minion).toBeGreaterThan(0);
      }
    }
    expect(phaseAttack(madKingBrain, 2, 'summon')!.maxAlive).toBe(3);
    expect(phaseAttack(stoneGuardianBrain, 2, 'summon')!.maxAlive).toBe(4);
    expect(phaseAttack(sandRatBrain, 2, 'summon')!.maxAlive).toBe(4);
  });
});
