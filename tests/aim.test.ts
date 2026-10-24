import { describe, expect, it } from 'vitest';
import { leadAim, spiralVolley } from '../src/logic/aim';
import { expectClose } from './builders';

describe('leadAim', () => {
  const shooter = { x: 0, y: 0 };

  it('aims straight at a stationary target', () => {
    const d = leadAim(shooter, { x: 100, y: 0 }, { x: 0, y: 0 }, 100);
    expectClose(d.x, 1);
    expectClose(d.y, 0);
  });

  it('leads a target moving across the line of fire so the bolt meets it', () => {
    const target = { x: 100, y: 0 };
    const velocity = { x: 0, y: 40 };
    const speed = 120;
    const d = leadAim(shooter, target, velocity, speed);
    expect(d.y).toBeGreaterThan(0);
    const t = target.x / (d.x * speed);
    expectClose(d.y * speed * t, velocity.y * t);
  });

  it('leads less far with faster bolts', () => {
    const slow = leadAim(shooter, { x: 100, y: 0 }, { x: 0, y: 40 }, 80);
    const fast = leadAim(shooter, { x: 100, y: 0 }, { x: 0, y: 40 }, 300);
    expect(slow.y).toBeGreaterThan(fast.y);
  });

  it('falls back to a direct shot when the target outruns the bolt or the shooter overlaps it', () => {
    const away = leadAim(shooter, { x: 100, y: 0 }, { x: 200, y: 0 }, 100);
    expectClose(away.x, 1);
    expectClose(away.y, 0);
    const same = leadAim(shooter, shooter, { x: 5, y: 5 }, 100);
    expectClose(Math.hypot(same.x, same.y), 1);
  });
});

describe('spiralVolley', () => {
  it('fires `count` unit directions, faster toward the end of the spiral', () => {
    const volley = spiralVolley(12, 1, 0, 60);
    expect(volley).toHaveLength(12);
    for (const b of volley) expectClose(Math.hypot(b.x, b.y), 1);
    expect(volley[11]!.speed).toBeGreaterThan(volley[0]!.speed);
    expectClose(volley[0]!.x, 1);
  });

  it('rotates the whole pattern by the spin offset', () => {
    const a = spiralVolley(8, 2, 0, 60)[3]!;
    const b = spiralVolley(8, 2, Math.PI / 2, 60)[3]!;
    expectClose(Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x), Math.PI / 2);
  });
});
