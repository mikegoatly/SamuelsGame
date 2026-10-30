import { describe, expect, it } from 'vitest';
import { boltHit, isEncased, noShards, SCEPTER, scepterDpsFactor, shardsAt, sprayCanEncase, sprayHit, sprayTargets, type ShardState } from '../src/logic/scepter';

/** Bolts at `times`, from fresh. */
function hits(times: number[], start: ShardState = noShards()): { state: ShardState; events: string[] } {
  let state = start;
  const events: string[] = [];
  for (const t of times) {
    const step = boltHit(state, t);
    state = step.state;
    events.push(step.event);
  }
  return { state, events };
}

describe('boltHit', () => {
  it('each bolt adds a shard; the 4th encases and the next shatters', () => {
    const { events, state } = hits([100, 200, 300, 400, 500]);
    expect(events).toEqual(['shard', 'shard', 'shard', 'encase', 'shatter']);
    expect(shardsAt(state, 500)).toBe(0);
  });

  it('encasing freezes for 1.5s', () => {
    const { state } = hits([0, 10, 20, 30]);
    expect(SCEPTER.encaseMs).toBe(1500);
    expect(isEncased(state, 30)).toBe(true);
    expect(isEncased(state, 30 + SCEPTER.encaseMs - 1)).toBe(true);
    expect(isEncased(state, 30 + SCEPTER.encaseMs)).toBe(false);
  });

  it('a shatter ends the encasing at once', () => {
    const { state } = hits([0, 10, 20, 30, 40]);
    expect(isEncased(state, 41)).toBe(false);
  });

  it('a 4-shard monster that thawed still shatters on the next bolt (until the shards fade)', () => {
    const { state } = hits([0, 10, 20, 30]);
    expect(boltHit(state, 30 + SCEPTER.encaseMs + 100).event).toBe('shatter');
  });

  it('shards fade if the monster is not hit for a while', () => {
    const { state } = hits([0, 100, 200]);
    expect(shardsAt(state, 200 + SCEPTER.fadeMs - 1)).toBe(3);
    expect(shardsAt(state, 200 + SCEPTER.fadeMs)).toBe(0);
    expect(boltHit(state, 200 + SCEPTER.fadeMs).event).toBe('shard');
    expect(shardsAt(boltHit(state, 200 + SCEPTER.fadeMs).state, 200 + SCEPTER.fadeMs)).toBe(1);
  });

  it('every hit keeps the shards fresh', () => {
    const { state } = hits([0, SCEPTER.fadeMs - 1, 2 * SCEPTER.fadeMs - 2]);
    expect(shardsAt(state, 2 * SCEPTER.fadeMs - 2)).toBe(3);
  });
});

describe('sprayHit', () => {
  it('adds a shard but, without the twist, never encases', () => {
    let state = hits([0, 10, 20]).state;
    const step = sprayHit(state, 30, false);
    expect(step.event).toBe('shard');
    state = step.state;
    expect(shardsAt(state, 30)).toBe(3);
    expect(isEncased(state, 30)).toBe(false);
  });

  it('with the level 5 twist, spray shards can encase', () => {
    const step = sprayHit(hits([0, 10, 20]).state, 30, true);
    expect(step.event).toBe('encase');
    expect(isEncased(step.state, 31)).toBe(true);
  });

  it('never shatters (only bolts do), so chains cannot run forever', () => {
    const encased = hits([0, 10, 20, 30]).state;
    expect(sprayHit(encased, 40, true).event).toBe('none');
    expect(isEncased(sprayHit(encased, 40, true).state, 41)).toBe(true);
  });

  it('a fresh monster gets its first shard', () => {
    expect(shardsAt(sprayHit(noShards(), 0, false).state, 0)).toBe(1);
  });
});

describe('sprayTargets', () => {
  const others = [
    { x: 10, y: 0 },
    { x: 0, y: 30 },
    { x: 200, y: 0 },
    { x: -20, y: 0 },
    { x: 0, y: -40 },
    { x: 45, y: 0 },
  ];

  it('picks the nearest monsters inside the radius, up to the shard count', () => {
    const picked = sprayTargets({ x: 0, y: 0 }, others, 50, 3);
    expect(picked).toEqual([0, 3, 1]);
  });

  it('skips anything out of range', () => {
    expect(sprayTargets({ x: 0, y: 0 }, others, 50, 10)).not.toContain(2);
    expect(sprayTargets({ x: 0, y: 0 }, [], 50, 3)).toEqual([]);
  });
});

describe('scepterDpsFactor', () => {
  it('averages the shatter bonus over the 5-hit cycle', () => {
    expect(scepterDpsFactor()).toBeCloseTo(1 + SCEPTER.shatterBonus / (SCEPTER.shardsToEncase + 1));
  });
});

describe('sprayCanEncase', () => {
  it.each([
    ['twist, ordinary monster', true, { elite: false, boss: false }, true],
    ['twist, elite', true, { elite: true, boss: false }, false],
    ['twist, boss', true, { elite: false, boss: true }, false],
    ['no twist, ordinary monster', false, { elite: false, boss: false }, false],
  ])('%s', (_, twist, target, expected) => {
    expect(sprayCanEncase(twist, target)).toBe(expected);
  });
});
