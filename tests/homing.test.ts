import { describe, expect, it } from 'vitest';
import { homingHeading, homingStep } from '../src/logic/homing';
import { expectClose } from './builders';

const tuning = { turnRate: 1, ms: 3000 };

describe('homingHeading', () => {
  it('turns toward the target by at most turnRate * dt', () => {
    expectClose(homingHeading(0, Math.PI / 2, tuning, 500, 0), 0.5);
    expectClose(homingHeading(0, -Math.PI / 2, tuning, 500, 0), -0.5);
  });

  it('snaps onto the target when it is within the turn budget', () => {
    expectClose(homingHeading(0, 0.1, tuning, 500, 0), 0.1);
  });

  it('turns the short way round the circle', () => {
    expect(homingHeading(3, -3, tuning, 100, 0)).toBeGreaterThan(3);
  });

  it('stops steering once its lifetime is over', () => {
    expectClose(homingHeading(0.3, 2, tuning, 100, 3000), 0.3);
  });
});

describe('homingStep', () => {
  const pursue = (playerSpeed: number): number => {
    let heading = Math.PI / 2;
    const bolt = { x: 0, y: 0 };
    const player = { x: 0, y: 80 };
    let closest = Infinity;
    for (let age = 0; age < 3000; age += 20) {
      heading = homingStep(heading, bolt, player, { turnRate: 1.6, ms: 3000 }, 20, age);
      bolt.x += Math.cos(heading) * 90 * 0.02;
      bolt.y += Math.sin(heading) * 90 * 0.02;
      player.x += playerSpeed * 0.02;
      closest = Math.min(closest, Math.hypot(player.x - bolt.x, player.y - bolt.y));
    }
    return closest;
  };

  it('a bolt chasing a player who runs sideways at full speed never catches up', () => {
    expect(pursue(110)).toBeGreaterThan(40);
  });

  it('a standing player is hit', () => {
    expect(pursue(0)).toBeLessThan(4);
  });
});

describe('homing without a target', () => {
  it('flies straight when the target is gone', () => {
    expectClose(homingStep(0.7, { x: 0, y: 0 }, null, tuning, 500, 0), 0.7);
  });
});
