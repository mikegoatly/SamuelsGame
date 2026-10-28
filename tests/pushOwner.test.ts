import { describe, expect, it } from 'vitest';
import { claimPush, releasePush } from '../src/systems/hazards/pushOwner';

describe('push ownership', () => {
  it('only the hazard that set the push can clear it', () => {
    const player = { windPush: { x: 0, y: 0 } };
    const a = {};
    const b = {};
    claimPush(player, a, { x: 5, y: 0 });
    releasePush(player, b);
    expect(player.windPush).toEqual({ x: 5, y: 0 });
    claimPush(player, b, { x: 0, y: 7 });
    releasePush(player, a);
    expect(player.windPush).toEqual({ x: 0, y: 7 });
    releasePush(player, b);
    expect(player.windPush).toEqual({ x: 0, y: 0 });
  });
});
