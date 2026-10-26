import { flankGoal } from '../../logic/pack';
import { goToward } from './steer';
import type { BehaviourFactory } from './types';

const OFFSET = 38;
const ENGAGE = 26;

/** Rats fan out to either side of the player and then close in together. */
export const rat: BehaviourFactory = (host) => {
  const side = Math.random() < 0.5 ? 1 : -1;
  return {
    act() {
      goToward(host, flankGoal(host, host.target, side, OFFSET, ENGAGE), host.def.speed * host.speedFactor);
    },
  };
};
