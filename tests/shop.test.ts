import { describe, expect, it } from 'vitest';
import { SHOP_STOCK_SIZE, shopStock, skillPrice } from '../src/logic/shop';

const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

describe('shopStock', () => {
  it('is stable for the same rotation', () => {
    expect(shopStock(3, ids, [])).toEqual(shopStock(3, ids, []));
  });

  it('offers three distinct skills', () => {
    const stock = shopStock(0, ids, []);
    expect(stock).toHaveLength(SHOP_STOCK_SIZE);
    expect(new Set(stock).size).toBe(SHOP_STOCK_SIZE);
  });

  it('rotates between level clears', () => {
    const seen = new Set(Array.from({ length: 8 }, (_, r) => shopStock(r, ids, []).join()));
    expect(seen.size).toBeGreaterThan(3);
  });

  it('never offers owned skills', () => {
    for (let r = 0; r < 20; r++) expect(shopStock(r, ids, ['a', 'b', 'c']).some((id) => ['a', 'b', 'c'].includes(id))).toBe(false);
  });

  it('keeps the remaining offers in place when one is bought', () => {
    for (let r = 0; r < 20; r++) {
      const before = shopStock(r, ids, []);
      const after = shopStock(r, ids, [before[0]!]);
      expect(after.slice(0, 2)).toEqual(before.slice(1, 3));
      expect(after).toHaveLength(3);
    }
  });

  it('shrinks when fewer skills remain and is empty when all are owned', () => {
    expect(shopStock(1, ids, ids.slice(0, 5))).toHaveLength(2);
    expect(shopStock(1, ids, ids)).toEqual([]);
  });
});

describe('skillPrice', () => {
  it.each([
    [1, 150],
    [2, 250],
    [3, 400],
  ] as const)('tier %d costs %d', (tier, price) => {
    expect(skillPrice(tier)).toBe(price);
  });
});
