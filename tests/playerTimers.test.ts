import { describe, expect, it } from 'vitest';
import { PlayerTimers } from '../src/logic/playerTimers';

const timers = () => new PlayerTimers({ dashMs: 150, dashCooldownMs: 800, iframesMs: 600, knockbackMs: 120 });

describe('PlayerTimers', () => {
  it('dash is allowed once, then locked for the cooldown, and dashing lasts dashMs', () => {
    const t = timers();
    expect(t.tryDash(1000)).toBe(true);
    expect(t.isDashing(1100)).toBe(true);
    expect(t.isDashing(1150)).toBe(false);
    expect(t.tryDash(1500)).toBe(false);
    expect(t.tryDash(1800)).toBe(true);
  });

  it('hurt grants i-frames and knockback windows', () => {
    const t = timers();
    expect(t.invulnerable(0)).toBe(false);
    t.hurt(500);
    expect(t.invulnerable(1099)).toBe(true);
    expect(t.invulnerable(1100)).toBe(false);
    expect(t.inKnockback(619)).toBe(true);
    expect(t.inKnockback(620)).toBe(false);
  });

  it('dashing is invulnerable', () => {
    const t = timers();
    t.tryDash(0);
    expect(t.invulnerable(100)).toBe(true);
  });

  it('fire respects the rate and only advances on success', () => {
    const t = timers();
    expect(t.tryFire(0, 300)).toBe(true);
    expect(t.tryFire(299, 300)).toBe(false);
    expect(t.tryFire(300, 300)).toBe(true);
  });

  it('a clock that stands still (paused game) neither expires i-frames nor unlocks the dash', () => {
    const t = timers();
    t.hurt(1000);
    t.tryDash(1000);
    for (let i = 0; i < 3; i++) {
      expect(t.invulnerable(1100)).toBe(true);
      expect(t.tryDash(1100)).toBe(false);
    }
  });

  it('granted invulnerability lasts its duration without the hurt blink, and never shortens a longer one', () => {
    const t = timers();
    t.grantInvulnerability(1000, 400);
    expect(t.invulnerable(1399)).toBe(true);
    expect(t.invulnerable(1400)).toBe(false);
    expect(t.blinking(1100)).toBe(false);
    t.hurt(1000);
    t.grantInvulnerability(1000, 100);
    expect(t.invulnerable(1500)).toBe(true);
  });

  it('reports whether a shot is ready without spending it', () => {
    const t = timers();
    expect(t.canFire(0)).toBe(true);
    t.tryFire(0, 300);
    expect(t.canFire(100)).toBe(false);
    expect(t.canFire(300)).toBe(true);
    expect(t.canFire(300)).toBe(true);
  });
});
