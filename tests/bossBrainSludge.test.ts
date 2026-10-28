import { describe, expect, it } from 'vitest';
import { motherSludgeBrain, sludgeletBrain, sludgelingBrain } from '../src/content/bosses';
import { newBossState, phaseAttack, stepBoss, type BossAction, type BossBrainConfig, type BossState } from '../src/logic/bossBrain';

type Logged = { at: number; action: BossAction };

function run(config: BossBrainConfig, state: BossState, from: number, to: number) {
  const log: Logged[] = [];
  let current = state;
  for (let now = from; now <= to; now += 50) {
    const step = stepBoss(config, current, now, 1);
    current = step.state;
    for (const action of step.actions) log.push({ at: now, action });
  }
  return { state: current, log };
}

const only = (log: Logged[], type: string) => log.filter((l) => l.action.type === type);

describe('hop-slam', () => {
  const cfg = motherSludgeBrain;
  const hop = phaseAttack(cfg, 1, 'hop')!;

  it('shows the landing circle, leaves the ground for the last flightMs, then lands exactly telegraphMs after the warning', () => {
    const { log } = run(cfg, newBossState(cfg, 0), 0, hop.firstMs + hop.telegraphMs + 100);
    const warn = only(log, 'hopTelegraph')[0]!;
    const launch = only(log, 'hopLaunch')[0]!;
    const land = only(log, 'land')[0]!;
    expect(warn.at).toBe(hop.firstMs);
    expect(warn.action).toMatchObject({ radius: hop.radius, durationMs: hop.telegraphMs, flightMs: hop.flightMs });
    expect(launch.at - warn.at).toBe(hop.telegraphMs - hop.flightMs);
    expect(land.at - warn.at).toBe(hop.telegraphMs);
    expect(land.action).toMatchObject({ radius: hop.radius });
  });

  it('is airborne between launch and landing, and walking again after', () => {
    const cfg2 = cfg;
    let state = newBossState(cfg2, 0);
    const modes = new Map<number, string>();
    for (let now = 0; now <= hopEnd(); now += 50) {
      state = stepBoss(cfg2, state, now, 1).state;
      modes.set(now, state.mode);
    }
    expect(modes.get(hop.firstMs + 100)).toBe('telegraph');
    expect(modes.get(hop.firstMs + hop.telegraphMs - 100)).toBe('leap');
    expect(modes.get(hop.firstMs + hop.telegraphMs + 100)).toBe('chase');
    function hopEnd() {
      return hop.firstMs + hop.telegraphMs + 200;
    }
  });

  it('waits out the cooldown before the next hop, and no landing is ever missing a warning', () => {
    const { log } = run(cfg, newBossState(cfg, 0), 0, 60_000);
    const warns = only(log, 'hopTelegraph');
    expect(warns.length).toBeGreaterThan(5);
    expect(only(log, 'land')).toHaveLength(warns.length);
    expect(only(log, 'hopLaunch')).toHaveLength(warns.length);
    for (let i = 1; i < warns.length; i++) expect(warns[i]!.at - warns[i - 1]!.at).toBeGreaterThanOrEqual(hop.telegraphMs + hop.cooldownMs - 50);
  });
});

describe('spit with a windup', () => {
  const cfg = motherSludgeBrain;
  const spit = phaseAttack(cfg, 1, 'spit')!;

  it('warns with the fan, then fires the same fan windupMs later', () => {
    const { log } = run(cfg, newBossState(cfg, 0), 0, spit.firstMs + spit.windupMs! + 100);
    const warn = only(log, 'telegraphFan')[0]!;
    const fire = only(log, 'spit')[0]!;
    expect(warn.at).toBe(spit.firstMs);
    expect(warn.action).toMatchObject({ count: spit.count, arc: spit.arc, durationMs: spit.windupMs });
    expect(fire.at - warn.at).toBe(spit.windupMs);
    expect(fire.action).toMatchObject({ count: spit.count, arc: spit.arc });
  });

  it('never fires without a warning first', () => {
    const { log } = run(cfg, newBossState(cfg, 0), 0, 90_000);
    expect(only(log, 'spit').length).toBe(only(log, 'telegraphFan').length);
    for (const shot of only(log, 'spit')) expect(log.some((l) => l.action.type === 'telegraphFan' && l.at === shot.at - spit.windupMs!)).toBe(true);
  });

  it('a spit without a windup still fires on its timer (the sand rat)', () => {
    const plain: BossBrainConfig = { phaseTwoAt: 0, phases: { 1: { speedMultiplier: 1, attacks: [{ kind: 'spit', firstMs: 1000, everyMs: 2000, count: 3, arc: 0.5 }] }, 2: { speedMultiplier: 1, attacks: [] } } };
    const { log } = run(plain, newBossState(plain, 0), 0, 5000);
    expect(only(log, 'spit').map((l) => l.at)).toEqual([1000, 3000, 5000]);
    expect(only(log, 'telegraphFan')).toHaveLength(0);
  });
});

describe('the mother alone summons blobs', () => {
  it('two Sludge Blobs every 20s, capped, and the pieces never summon', () => {
    const summon = phaseAttack(motherSludgeBrain, 1, 'summon')!;
    expect(summon).toMatchObject({ minion: 'sludgeBlob', count: 2, everyMs: 20_000 });
    expect(summon.maxAlive).toBeLessThanOrEqual(4);
    for (const cfg of [sludgelingBrain, sludgeletBrain]) expect(phaseAttack(cfg, 1, 'summon')).toBeUndefined();
  });

  it('smaller pieces hop faster and spit fewer globs', () => {
    const hop = (c: BossBrainConfig) => phaseAttack(c, 1, 'hop')!;
    const spit = (c: BossBrainConfig) => phaseAttack(c, 1, 'spit')!;
    expect(hop(sludgelingBrain).telegraphMs).toBeLessThan(hop(motherSludgeBrain).telegraphMs);
    expect(hop(sludgeletBrain).telegraphMs).toBeLessThan(hop(sludgelingBrain).telegraphMs);
    expect(hop(sludgelingBrain).radius).toBeLessThan(hop(motherSludgeBrain).radius);
    expect(spit(sludgelingBrain).count).toBeLessThan(spit(motherSludgeBrain).count);
    expect(spit(motherSludgeBrain).count).toBeGreaterThanOrEqual(3);
    expect(spit(motherSludgeBrain).count).toBeLessThanOrEqual(5);
  });
});
