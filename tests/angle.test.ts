import { describe, it } from 'vitest';
import { angleDiff, steerToward } from '../src/logic/angle';
import { expectClose } from './builders';

describe('angleDiff', () => {
  it('is the shortest signed difference, wrapping at pi', () => {
    expectClose(angleDiff(0.5, 0.2), 0.3);
    expectClose(angleDiff(-Math.PI + 0.1, Math.PI - 0.1), 0.2);
    expectClose(angleDiff(Math.PI - 0.1, -Math.PI + 0.1), -0.2);
  });
});

describe('steerToward', () => {
  it('turns by at most maxTurn toward the target angle', () => {
    expectClose(steerToward(0, 1, 0.25), 0.25);
    expectClose(steerToward(0, -1, 0.25), -0.25);
  });

  it('snaps to the target when within reach, and takes the short way round the wrap', () => {
    expectClose(steerToward(0, 0.1, 0.25), 0.1);
    const turned = steerToward(Math.PI - 0.1, -Math.PI + 0.1, 0.05);
    expectClose(angleDiff(turned, Math.PI - 0.05), 0);
  });
});
