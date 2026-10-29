import { describe, expect, it } from 'vitest';
import { bertBrain } from '../src/content/bert';
import { bertCrash, bertPhase, bertRollEnded, newBertState, stepBert, type BertAction, type BertState } from '../src/logic/bertBrain';

const STEP = 50;

interface Run {
  state: BertState;
  log: { at: number; action: BertAction }[];
  now: number;
}

/** Steps the brain from `run.now` for `ms` at a fixed health ratio, recording every action. */
function advance(run: Run, ms: number, hpRatio: number, onAction?: (a: BertAction, run: Run) => void): Run {
  const end = run.now + ms;
  while (run.now < end) {
    run.now += STEP;
    const step = stepBert(bertBrain, run.state, run.now, hpRatio);
    run.state = step.state;
    for (const action of step.actions) {
      run.log.push({ at: run.now, action });
      onAction?.(action, run);
    }
  }
  return run;
}

const aRun = (): Run => ({ state: newBertState(bertBrain, 0), log: [], now: 0 });
const types = (run: Run): string[] => run.log.map((l) => l.action.type);

describe('phases', () => {
  it.each([
    [1, 1],
    [0.7, 1],
    [0.6, 2],
    [0.4, 2],
    [0.25, 3],
    [0.01, 3],
  ])('at %d of his health he is in phase %i', (ratio, phase) => {
    expect(bertPhase(bertBrain, ratio)).toBe(phase);
  });

  it('announces each phase change once and never goes back', () => {
    const run = aRun();
    advance(run, 1000, 1);
    advance(run, 1000, 0.5);
    advance(run, 1000, 0.1);
    advance(run, 1000, 0.5);
    expect(run.log.filter((l) => l.action.type === 'phase').map((l) => (l.action as { phase: number }).phase)).toEqual([2, 3]);
    expect(run.state.phase).toBe(3);
  });
});

describe('phase 1: armoured', () => {
  it('slams with a telegraph first and tosses crystals, but never rolls or fires the laser', () => {
    const run = advance(aRun(), 30_000, 1);
    expect(types(run)).toContain('slamTelegraph');
    expect(types(run)).toContain('slam');
    expect(types(run)).toContain('tossTelegraph');
    expect(types(run)).toContain('toss');
    expect(types(run)).not.toContain('rollStart');
    expect(types(run)).not.toContain('laserFire');
  });

  it('every slam and toss is warned about first, for long enough to read', () => {
    const run = advance(aRun(), 30_000, 1);
    for (const [warn, strike] of [['slamTelegraph', 'slam'], ['tossTelegraph', 'toss']] as const) {
      const warned = run.log.filter((l) => l.action.type === warn);
      const struck = run.log.filter((l) => l.action.type === strike);
      expect(struck.length).toBeGreaterThan(0);
      warned.forEach((w, i) => {
        const gap = struck[i]!.at - w.at;
        expect(gap).toBeGreaterThanOrEqual(800);
        expect((w.action as { ms: number }).ms).toBeGreaterThanOrEqual(800);
      });
    }
  });

  it('does only one thing at a time', () => {
    const run = aRun();
    let busy = 0;
    advance(run, 30_000, 1, (a) => {
      if (a.type === 'slamTelegraph' || a.type === 'tossTelegraph') busy++;
      if (a.type === 'slam' || a.type === 'toss') busy--;
      expect(busy).toBeLessThanOrEqual(1);
    });
  });
});

describe('phase 2: rolling', () => {
  it('warns, then rolls, and the roll ends after the runtime reports its bounces', () => {
    const run = aRun();
    advance(run, 500, 0.5);
    advance(run, 20_000, 0.5, (a, r) => {
      if (a.type === 'rollStart') r.state = bertRollEnded(r.state, r.now, bertBrain.uncurlMs).state;
    });
    expect(types(run)).toContain('rollTelegraph');
    expect(types(run)).toContain('rollStart');
    const telegraph = run.log.find((l) => l.action.type === 'rollTelegraph')!;
    const start = run.log.find((l) => l.action.type === 'rollStart')!;
    expect(start.at - telegraph.at).toBeGreaterThanOrEqual(900);
  });

  it('a roll that is never reported finished still ends on its own (he does not roll forever)', () => {
    const run = advance(aRun(), 40_000, 0.5);
    expect(types(run)).toContain('rollEnd');
  });

  it('a pillar crash stuns him for the given time, then he is back on his feet', () => {
    const run = aRun();
    advance(run, 500, 0.5);
    advance(run, 20_000, 0.5, (a, r) => {
      if (a.type === 'rollStart') {
        r.now += 600;
        const crash = bertCrash(r.state, r.now, 3000);
        r.state = crash.state;
        r.log.push(...crash.actions.map((action) => ({ at: r.now, action })));
      }
    });
    const stun = run.log.find((l) => l.action.type === 'stun')!;
    const wake = run.log.find((l) => l.action.type === 'stunEnd')!;
    expect(stun.action).toEqual({ type: 'stun', ms: 3000 });
    expect(wake.at - stun.at).toBeGreaterThanOrEqual(3000);
    expect(wake.at - stun.at).toBeLessThanOrEqual(3100);
  });

  it('crashing while not rolling does nothing', () => {
    const state = newBertState(bertBrain, 0);
    const crash = bertCrash(state, 100, 3000);
    expect(crash.actions).toEqual([]);
    expect(crash.state).toEqual(state);
  });

  it('leaves a breather after an uncurl or a stun before the next attack', () => {
    const run = aRun();
    advance(run, 500, 0.5);
    advance(run, 20_000, 0.5, (a, r) => {
      if (a.type !== 'rollStart') return;
      const ended = bertRollEnded(r.state, r.now, bertBrain.uncurlMs);
      r.state = ended.state;
      r.log.push(...ended.actions.map((action) => ({ at: r.now, action })));
    });
    const ends = run.log.filter((l) => l.action.type === 'rollEnd');
    expect(ends.length).toBeGreaterThan(1);
    for (const end of ends.slice(0, -1)) {
      const next = run.log.find((l) => l.at > end.at && ['slamTelegraph', 'rollTelegraph'].includes(l.action.type));
      expect(next!.at - end.at).toBeGreaterThanOrEqual(1000);
    }
  });
});

describe('phase 3: laser', () => {
  it('draws the line first, then fires it, and still rolls now and then', () => {
    const run = advance(aRun(), 60_000, 0.1);
    const telegraph = run.log.find((l) => l.action.type === 'laserTelegraph')!;
    const fire = run.log.find((l) => l.action.type === 'laserFire')!;
    expect(fire.at - telegraph.at).toBeGreaterThanOrEqual(1000);
    expect(types(run)).toContain('laserEnd');
    expect(types(run)).toContain('rollTelegraph');
  });

  it('fires every volley after its own warning', () => {
    const run = advance(aRun(), 60_000, 0.1);
    const warned = run.log.filter((l) => l.action.type === 'laserTelegraph').length;
    const fired = run.log.filter((l) => l.action.type === 'laserFire').length;
    expect(Math.abs(warned - fired)).toBeLessThanOrEqual(1);
    expect(fired).toBeGreaterThan(2);
  });
});

describe('a phase change in the middle of a warning', () => {
  it('cancels the warning instead of striking after it', () => {
    const run = aRun();
    advance(run, 3300, 1);
    expect(types(run)).toContain('slamTelegraph');
    expect(types(run)).not.toContain('slam');
    advance(run, 100, 0.5);
    expect(types(run)).toContain('cancel');
    expect(types(run)).not.toContain('slam');
  });
});
