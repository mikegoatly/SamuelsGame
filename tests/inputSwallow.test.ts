import { describe, expect, it } from 'vitest';
import { InputSwallow } from '../src/logic/inputSwallow';

describe('InputSwallow', () => {
  it('passes input through when not armed', () => {
    expect(new InputSwallow().suppress(true)).toBe(false);
  });

  it('suppresses until buttons stay released for a few frames', () => {
    const swallow = new InputSwallow();
    swallow.arm();
    expect(swallow.suppress(true)).toBe(true);
    expect(swallow.suppress(false)).toBe(true);
    expect(swallow.suppress(true)).toBe(true);
    expect(swallow.suppress(false)).toBe(true);
    expect(swallow.suppress(false)).toBe(true);
    expect(swallow.suppress(false)).toBe(true);
    expect(swallow.suppress(true)).toBe(false);
  });
});
