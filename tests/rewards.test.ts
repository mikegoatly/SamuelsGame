import { describe, expect, it } from 'vitest';
import { desert } from '../src/content/levels/desert';
import { ruins } from '../src/content/levels/ruins';
import { rewardOf } from '../src/content/rewards';

describe('rewardOf', () => {
  it('describes a weapon reward as acquired', () => {
    expect(rewardOf(ruins)).toMatchObject({ kind: 'weapon', id: 'brokenWand', headline: 'Broken Wand acquired!' });
  });

  it('describes a power reward as unlocked', () => {
    expect(rewardOf(desert)).toMatchObject({ kind: 'power', id: 'fireball', headline: 'Fireball unlocked!' });
  });

  it('is undefined for levels without a reward', () => {
    expect(rewardOf({})).toBeUndefined();
  });
});
