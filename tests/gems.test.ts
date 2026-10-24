import { describe, expect, it } from 'vitest';
import { items } from '../src/content/items';
import { CHARM_TO_GEM, GEM_COLOURS, gemItemId, noGems } from '../src/logic/gems';

describe('gems', () => {
  it('has three empty colours', () => {
    expect(noGems()).toEqual({ red: 0, green: 0, blue: 0 });
    expect(GEM_COLOURS).toEqual(['red', 'green', 'blue']);
  });

  it('maps charms 1:1 onto gems', () => {
    expect(CHARM_TO_GEM).toEqual({ power: 'red', swiftness: 'green', vitality: 'blue' });
  });

  it('has a gem item for each colour', () => {
    for (const colour of GEM_COLOURS) expect(items[gemItemId(colour)]?.kind).toBe('gem');
  });
});
