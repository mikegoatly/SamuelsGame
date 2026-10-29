import { describe, expect, it } from 'vitest';
import { accessories, crownFor, getAccessory } from '../src/content/accessories';
import { levels } from '../src/content/levels';

describe('accessories', () => {
  it('has unique ids and frames', () => {
    expect(new Set(accessories.map((a) => a.id)).size).toBe(accessories.length);
    expect(new Set(accessories.map((a) => a.frame)).size).toBe(accessories.length);
  });

  it.each([
    ['ruins', 'Stone Crown', 0],
    ['desert', 'Sun Crown', 1],
    ['palace', 'Royal Crown', 2],
    ['sewer', 'Sludge Crown', 4],
    ['mines', 'Crystal Crown', 5],
  ])('%s awards the %s on frame %i', (levelId, name, frame) => {
    const crown = crownFor(levelId)!;
    expect(crown.name).toBe(name);
    expect(crown.frame).toBe(frame);
    expect(crown.slot).toBe('head');
    expect(getAccessory(crown.id)).toBe(crown);
  });

  it('every reward points at a real, playable level and each level has at most one crown', () => {
    const rewards = accessories.flatMap((a) => (a.heroicRewardFor ? [a.heroicRewardFor] : []));
    expect(new Set(rewards).size).toBe(rewards.length);
    // TODO(C3): drop 'mines' from this list once the Crystal Mines level (C2, src/content/levels/mines.ts) is registered.
    const notYetRegistered = ['mines'];
    for (const id of rewards.filter((r) => !notYetRegistered.includes(r))) expect(levels.some((l) => l.id === id), id).toBe(true);
  });

  it('the reserved Shadow Crown is on frame 3 and unreachable', () => {
    const shadow = accessories.find((a) => a.name === 'Shadow Crown')!;
    expect(shadow.frame).toBe(3);
    expect(shadow.heroicRewardFor).toBeUndefined();
  });

  it('unknown ids and levels give nothing', () => {
    expect(getAccessory('ghost')).toBeUndefined();
    expect(crownFor('arena')).toBeUndefined();
  });
});
