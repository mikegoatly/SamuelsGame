import { describe, expect, it } from 'vitest';
import { madKingBrain, motherSludgeBrain, sandRatBrain, stoneGuardianBrain } from '../src/content/bosses';
import type { BossMode } from '../src/logic/bossBrain';
import { COPY_IDS, COPY_MS, copyBrain, CopyCycle, FAKE, FakeTracker, fakeBrain, fakesMayFire, mtPhase, SWITCH_MS, type CycleEvent, type MtPhase } from '../src/logic/missingTexture';
import { sequenceRng } from './builders';

const BRAINS = { stoneGuardian: stoneGuardianBrain, sandRat: sandRatBrain, madKing: madKingBrain, motherSludge: motherSludgeBrain };
const kinds = (config: ReturnType<typeof copyBrain>): string[] => config.phases[1].attacks.map((a) => a.kind);

describe('mtPhase', () => {
  it.each([
    [1, 1],
    [0.51, 1],
    [0.5, 1],
    [0.499, 2],
    [0.2, 2],
    [0.199, 3],
    [0.01, 3],
    [0, 3],
  ])('health %f -> phase %i', (ratio, phase) => {
    expect(mtPhase(ratio)).toBe(phase);
  });
});

describe('copyBrain', () => {
  it.each(COPY_IDS.flatMap((id) => ([1, 2, 3] as const).map((phase) => [id, phase] as const)))('%s in phase %i has its own attacks and no summons', (id, phase) => {
    const source = BRAINS[id].phases[phase === 3 ? 2 : 1];
    const expected = source.attacks.filter((a) => a.kind !== 'summon');
    const brain = copyBrain(id, phase);
    expect(brain.phases[1].attacks).toEqual(expected);
    expect(brain.phases[2].attacks).toEqual(expected);
    expect(brain.phases[1].speedMultiplier).toBe(source.speedMultiplier);
    expect(kinds(brain)).not.toContain('summon');
  });

  it('never switches phase inside the copy (the copy cycle owns phases)', () => {
    for (const id of COPY_IDS) expect(copyBrain(id, 2).phaseTwoAt).toBe(0);
  });

  it('phases 1 and 2 (the fakes) use the first-phase set, only phase 3 the second', () => {
    expect(kinds(copyBrain('madKing', 1))).toEqual(['lunge', 'burst', 'spiral']);
    expect(kinds(copyBrain('madKing', 2))).toEqual(['lunge', 'burst', 'spiral']);
    expect(kinds(copyBrain('madKing', 3))).toEqual(['lunge', 'teleport', 'seek', 'burst']);
    expect(kinds(copyBrain('sandRat', 3))).toEqual(['burrow', 'spit']);
  });

  it('has Mother Sludge: her hop and windup spit, without the blob summons', () => {
    expect(COPY_IDS).toContain('motherSludge');
    expect(kinds(copyBrain('motherSludge', 1))).toEqual(['hop', 'spit']);
  });
});

describe('fakeBrain', () => {
  it.each(COPY_IDS.flatMap((id) => ([2, 3] as const).map((phase) => [id, phase] as const)))('%s fake keeps projectile attacks only', (id, phase) => {
    const attacks = fakeBrain(id, phase).phases[1].attacks;
    expect(attacks.length).toBeGreaterThan(0);
    for (const attack of attacks) expect(['burst', 'spit', 'spiral', 'seek']).toContain(attack.kind);
  });

  it('drops slams, hops, burrows, lunges and teleports; in phase 2 they use the first-phase set', () => {
    expect(kinds(fakeBrain('stoneGuardian', 2))).toEqual(['burst']);
    expect(kinds(fakeBrain('sandRat', 2))).toEqual(['spit']);
    expect(kinds(fakeBrain('madKing', 2))).toEqual(['burst', 'spiral']);
    expect(kinds(fakeBrain('madKing', 3))).toEqual(['seek', 'burst']);
    expect(kinds(fakeBrain('motherSludge', 2))).toEqual(['spit']);
  });
});

const begun = (rng: () => number): CopyCycle => {
  const cycle = new CopyCycle(rng);
  cycle.update(0, 'chase', 1);
  return cycle;
};

describe('CopyCycle', () => {
  const run = (cycle: CopyCycle, from: number, to: number, mode: BossMode = 'chase', phase: MtPhase = 1): CycleEvent[] => {
    const out: CycleEvent[] = [];
    for (let now = from; now <= to; now += 100) out.push(...cycle.update(now, mode, phase));
    return out;
  };
  const target = (event: CycleEvent | undefined): string => (event as { to: string }).to;

  it('starts on a copy at once', () => {
    expect(COPY_IDS).toContain(begun(sequenceRng(0)).copy);
  });

  it.each([
    [1, COPY_MS[1]],
    [2, COPY_MS[2]],
    [3, COPY_MS[3]],
  ] as const)('in phase %i it copies for %i ms, then switches', (phase, ms) => {
    const cycle = begun(sequenceRng(0.1));
    expect(run(cycle, 0, ms - 100, 'chase', phase)).toEqual([]);
    expect(run(cycle, ms, ms, 'chase', phase)).toEqual([expect.objectContaining({ type: 'switch-start' })]);
  });

  it('copies for 8 seconds in phase 1 and 6 after', () => {
    expect([COPY_MS[1], COPY_MS[2], COPY_MS[3]]).toEqual([8000, 6000, 6000]);
    expect(SWITCH_MS).toBe(1000);
  });

  it('takes a second to switch, then reports the new copy', () => {
    const cycle = begun(sequenceRng(0.1));
    const [start] = run(cycle, COPY_MS[1], COPY_MS[1]);
    expect(start).toMatchObject({ type: 'switch-start' });
    expect(cycle.switching).toBe(true);
    expect(run(cycle, COPY_MS[1] + 100, COPY_MS[1] + SWITCH_MS - 100)).toEqual([]);
    expect(run(cycle, COPY_MS[1] + SWITCH_MS, COPY_MS[1] + SWITCH_MS)).toEqual([{ type: 'switch-end', copy: target(start) }]);
    expect(cycle.switching).toBe(false);
    expect(cycle.copy).toBe(target(start));
  });

  it.each(['telegraph', 'dash', 'burrowed', 'rising', 'leap'] as const)('waits while the boss is %s and switches once it is chasing again', (mode) => {
    const cycle = begun(sequenceRng(0.1));
    expect(run(cycle, COPY_MS[1], COPY_MS[1] + 3000, mode)).toEqual([]);
    expect(cycle.switching).toBe(false);
    expect(run(cycle, COPY_MS[1] + 3100, COPY_MS[1] + 3100)).toEqual([expect.objectContaining({ type: 'switch-start' })]);
  });

  it('never picks the same copy twice in a row, whatever the rolls', () => {
    for (const roll of [0, 0.34, 0.5, 0.67, 0.99]) {
      const cycle = begun(() => roll);
      let last = cycle.copy;
      let now = 0;
      for (let i = 0; i < 12; i++) {
        now += COPY_MS[1] + 100;
        const [start] = cycle.update(now, 'chase', 1);
        expect(target(start)).not.toBe(last);
        now += SWITCH_MS;
        cycle.update(now, 'chase', 1);
        last = cycle.copy;
      }
    }
  });

  it('visits every copy over time', () => {
    const cycle = begun(Math.random);
    const seen = new Set([cycle.copy]);
    let now = 0;
    for (let i = 0; i < 60; i++) {
      now += COPY_MS[1] + 100;
      cycle.update(now, 'chase', 1);
      now += SWITCH_MS;
      cycle.update(now, 'chase', 1);
      seen.add(cycle.copy);
    }
    expect(seen.size).toBe(COPY_IDS.length);
  });

  it('restarts the copy timer after a switch', () => {
    const cycle = begun(sequenceRng(0.1));
    cycle.update(COPY_MS[1], 'chase', 1);
    cycle.update(COPY_MS[1] + SWITCH_MS, 'chase', 1);
    expect(cycle.update(COPY_MS[1] + SWITCH_MS + COPY_MS[1] - 100, 'chase', 1)).toEqual([]);
  });

  it('keys the attack set by copy and phase set: phases 1 and 2 share one, phase 3 has its own', () => {
    const cycle = begun(sequenceRng(0.1));
    expect(cycle.attackKey(2)).toBe(cycle.attackKey(1));
    expect(cycle.attackKey(3)).not.toBe(cycle.attackKey(2));
  });

  it('starts the first copy window at the first update (when the boss is armed), not at construction', () => {
    const cycle = new CopyCycle(sequenceRng(0.1));
    expect(cycle.update(5000, 'chase', 1)).toEqual([]);
    expect(cycle.update(5000 + COPY_MS[1] - 100, 'chase', 1)).toEqual([]);
    expect(cycle.update(5000 + COPY_MS[1], 'chase', 1)).toEqual([expect.objectContaining({ type: 'switch-start' })]);
  });
});

describe('FakeTracker', () => {
  it('has two fakes that pop after three hits on the real boss, at half damage, and re-form after 12 seconds', () => {
    expect(FAKE).toMatchObject({ count: 2, popHits: 3, damageScale: 0.5, reformMs: 12000 });
  });

  it('is present only in phase 2', () => {
    const t = new FakeTracker();
    expect([t.present(1), t.present(2), t.present(3)]).toEqual([false, true, false]);
  });

  it('pops on the third hit, not before, and reports it once', () => {
    const t = new FakeTracker();
    expect([t.hit(0, 2, true), t.hit(10, 2, true), t.hit(20, 2, true), t.hit(30, 2, true)]).toEqual([false, false, true, false]);
    expect(t.present(2)).toBe(false);
  });

  it('re-forms after 12 seconds while still in phase 2, with a fresh hit counter', () => {
    const t = new FakeTracker();
    for (let i = 0; i < 3; i++) t.hit(1000, 2, true);
    expect(t.update(1000 + FAKE.reformMs - 1, 2)).toBe(false);
    expect(t.update(1000 + FAKE.reformMs, 2)).toBe(true);
    expect(t.present(2)).toBe(true);
    expect([t.hit(14000, 2, true), t.hit(14001, 2, true)]).toEqual([false, false]);
  });

  it('is gone for good once phase 3 starts, even if one had popped', () => {
    const t = new FakeTracker();
    for (let i = 0; i < 3; i++) t.hit(0, 2, true);
    t.update(1000, 3);
    expect(t.update(1000 + FAKE.reformMs * 2, 3)).toBe(false);
    expect([t.present(2), t.present(3)]).toEqual([false, false]);
  });

  it('ignores hits outside phase 2', () => {
    const t = new FakeTracker();
    expect([t.hit(0, 1, true), t.hit(1, 1, true), t.hit(2, 1, true), t.hit(3, 3, true)]).toEqual([false, false, false, false]);
  });
});

describe('hits before the fakes exist', () => {
  it('do not count towards the pop', () => {
    const t = new FakeTracker();
    expect([t.hit(0, 2, false), t.hit(1, 2, false), t.hit(2, 2, false), t.hit(3, 2, false)]).toEqual([false, false, false, false]);
    expect([t.hit(4, 2, true), t.hit(5, 2, true), t.hit(6, 2, true)]).toEqual([false, false, true]);
  });
});

describe('fakesMayFire', () => {
  it.each([
    [{ switching: false, locked: false, targetDead: false }, true],
    [{ switching: true, locked: false, targetDead: false }, false],
    [{ switching: false, locked: true, targetDead: false }, false],
    [{ switching: false, locked: false, targetDead: true }, false],
  ])('%j -> %s', (state, expected) => {
    expect(fakesMayFire(state)).toBe(expected);
  });
});
