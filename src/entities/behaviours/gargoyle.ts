import { shouldWake } from '../../logic/clear';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { distanceTo, stand } from './steer';
import type { BehaviourFactory } from './types';

const WAKE_RANGE = 66;
const STIR_MS = 600;
const STONE_TINT = 0x7c8294;

type Phase = 'dormant' | 'stirring' | 'awake';

/** A statue that does not move or take hits until the player walks near (or the rest of the room is dead), then shakes loose and attacks. */
export const gargoyle: BehaviourFactory = (host) => {
  let phase: Phase = 'dormant';
  let awakeAt = 0;
  host.setImmovable(true);
  host.forcedTint = STONE_TINT;
  host.applyBaseTint();

  const wake = (): void => {
    if (phase !== 'dormant') return;
    phase = 'stirring';
    awakeAt = host.clock.now + STIR_MS;
    host.puff();
    feel.shake(160, 0.006);
    playSfx(host.scene, 'stoneWake');
  };

  return {
    get untargetable() {
      return phase !== 'awake';
    },
    get ignoredForClear() {
      return phase === 'dormant';
    },
    wake,
    act(time) {
      if (phase === 'awake') return host.chase(time, host.def.speed * (1 + 0.35 * Math.sin(time / 700)));
      stand(host);
      if (phase === 'stirring') {
        host.setX(host.x + (Math.floor(time / 40) % 2 === 0 ? 0.4 : -0.4));
        if (time >= awakeAt) {
          phase = 'awake';
          host.setImmovable(false);
          host.forcedTint = null;
          host.applyBaseTint();
        }
      }
    },
    update() {
      if (phase === 'dormant' && host.armed && shouldWake(distanceTo(host, host.target), WAKE_RANGE)) wake();
    },
  };
};
