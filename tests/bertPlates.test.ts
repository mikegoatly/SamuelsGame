import { describe, expect, it } from 'vitest';
import type { BertMode } from '../src/logic/bertBrain';
import { BERT_PLATES, brokenPlates, damageAfterArmour, dropPlates, type Plates, newPlates, plateSideOf, speedWithPlates, strikePlates, type PlateSide } from '../src/logic/bertPlates';

describe('plateSideOf (the hit direction is the vector from Bert to the attacker, screen coordinates)', () => {
  it.each<[string, number, number, PlateSide]>([
    ['below him', 0, 30, 'front'],
    ['above him', 0, -30, 'back'],
    ['to his screen-left', -30, 0, 'left'],
    ['to his screen-right', 30, 0, 'right'],
    ['down-left, more down', -10, 20, 'front'],
    ['down-left, more left', -20, 10, 'left'],
    ['an exact diagonal counts as front or back', 10, -10, 'back'],
  ])('%s is the %s plate', (_, dx, dy, side) => {
    expect(plateSideOf(dx, dy)).toBe(side);
  });

  it('on top of him still picks a side', () => {
    expect(plateSideOf(0, 0)).toBe('front');
  });
});

describe('strikePlates', () => {
  const MAX_HP = 1000;

  it('starts with four whole plates', () => {
    const plates = newPlates(MAX_HP);
    expect(brokenPlates(plates)).toBe(0);
    expect(Object.keys(plates.hp).sort()).toEqual([...BERT_PLATES].sort());
  });

  it('a bare side takes the full damage', () => {
    const bare = dropPlates(newPlates(MAX_HP));
    expect(strikePlates(bare, 'front', 40).bertDamage).toBe(40);
  });

  it('a plated side takes reduced damage and the plate soaks the whole blow', () => {
    const plates = newPlates(MAX_HP);
    const hit = strikePlates(plates, 'left', 40);
    expect(hit.bertDamage).toBeLessThan(40);
    expect(hit.bertDamage).toBeGreaterThanOrEqual(1);
    expect(hit.plates.hp.left).toBe(plates.hp.left - 40);
    expect(hit.plates.hp.right).toBe(plates.hp.right);
    expect(hit.broke).toBe(false);
  });

  it('is pure: the old plates are untouched', () => {
    const plates = newPlates(MAX_HP);
    const before = plates.hp.back;
    strikePlates(plates, 'back', 99);
    expect(plates.hp.back).toBe(before);
  });

  it('the plate breaks when its health runs out, reports it once, and the side is bare after', () => {
    let plates = newPlates(MAX_HP);
    let broke = 0;
    for (let i = 0; i < 200; i++) {
      const hit = strikePlates(plates, 'front', 25);
      plates = hit.plates;
      if (hit.broke) broke++;
    }
    expect(broke).toBe(1);
    expect(plates.hp.front).toBe(0);
    expect(brokenPlates(plates)).toBe(1);
    expect(strikePlates(plates, 'front', 25).bertDamage).toBe(25);
  });

  it('breaking all four plates is within a sensible share of his health', () => {
    const total = Object.values(newPlates(MAX_HP).hp).reduce((a, b) => a + b, 0);
    expect(total / MAX_HP).toBeGreaterThanOrEqual(0.1);
    expect(total / MAX_HP).toBeLessThanOrEqual(0.3);
  });
});

describe('speedWithPlates', () => {
  it('each broken plate makes him a little faster', () => {
    const speeds = [0, 1, 2, 3, 4].map(speedWithPlates);
    expect(speeds[0]).toBe(1);
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]).toBeGreaterThan(speeds[i - 1]!);
    expect(speeds[4]).toBeLessThanOrEqual(1.6);
  });
});

describe('dropPlates', () => {
  it('knocks every plate off', () => {
    expect(brokenPlates(dropPlates(newPlates(500)))).toBe(4);
  });
});

describe('damageAfterArmour', () => {
  const whole = (): Plates => newPlates(1000);
  const brokenOne = (): Plates => strikePlates({ hp: { ...whole().hp, front: 1 } }, 'front', 5).plates;
  const bare = (): Plates => dropPlates(whole());
  const AMOUNT = 40;

  it.each<[string, BertMode, 'whole' | 'one' | 'bare', PlateSide | null, number]>([
    ['walking, whole plate hit on its side', 'walk', 'whole', 'left', 10],
    ['walking, bare side of a part-broken Bert', 'walk', 'one', 'front', 40],
    ['walking, other side of a part-broken Bert', 'walk', 'one', 'back', 10],
    ['walking, no plates left', 'walk', 'bare', 'right', 40],
    ['slamming, whole plate', 'slam', 'whole', 'back', 10],
    ['a damage tick with a plate left', 'walk', 'whole', null, 20],
    ['a damage tick with one plate broken', 'walk', 'one', null, 20],
    ['a damage tick with no plates', 'walk', 'bare', null, 40],
    ['rolling ball, a blow', 'rolling', 'bare', 'left', 20],
    ['rolling ball, a tick', 'rolling', 'whole', null, 20],
    ['curling up, a blow', 'rollWindup', 'whole', 'front', 20],
    ['dazed, a blow on a bare side', 'stunned', 'bare', 'left', 80],
    ['dazed, a blow on a plate (plates are ignored)', 'stunned', 'whole', 'front', 80],
    ['dazed, a tick', 'stunned', 'whole', null, 80],
  ])('%s', (_, mode, state, side, expected) => {
    const plates = { whole, one: brokenOne, bare }[state]();
    expect(damageAfterArmour(mode, plates, side, AMOUNT).damage).toBe(expected);
  });

  it('only a blow on a whole plate wears the plate down; ticks and other modes leave plates alone', () => {
    const plates = whole();
    expect(damageAfterArmour('walk', plates, 'left', AMOUNT).plates.hp.left).toBe(plates.hp.left - AMOUNT);
    expect(damageAfterArmour('walk', plates, null, AMOUNT).plates).toBe(plates);
    expect(damageAfterArmour('rolling', plates, 'left', AMOUNT).plates).toBe(plates);
    expect(damageAfterArmour('stunned', plates, 'left', AMOUNT).plates).toBe(plates);
  });

  it('reports the plate that broke', () => {
    const almost = { hp: { ...whole().hp, left: 3 } };
    const hit = damageAfterArmour('walk', almost, 'left', AMOUNT);
    expect(hit.broke).toBe(true);
    expect(hit.plated).toBe(true);
    expect(damageAfterArmour('walk', bare(), 'left', AMOUNT).plated).toBe(false);
  });

  it('never rounds a hit to nothing', () => {
    expect(damageAfterArmour('walk', whole(), 'left', 1).damage).toBe(1);
    expect(damageAfterArmour('rolling', whole(), null, 1).damage).toBe(1);
  });
});
