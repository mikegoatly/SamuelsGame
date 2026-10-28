import { SewerFrame } from '../../content/assetKeys';
import { newFuse, stepFuse, type FuseState } from '../../logic/fuse';
import { newHop, stepHop } from '../../logic/hop';
import { HOP, PUFF } from '../../logic/toad';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { groundEffects } from './ground';
import { distanceTo, stand } from './steer';
import type { BehaviourFactory } from './types';

const FLASH_TINT = 0xff3a2a;
const CALM_TINT = 0xe8a090;
const FLASH_MS = 90;
const SWELL = 0.55;

/** Hops towards you in short leaps; up close it sits, swells and flashes red, then pops into a small poison cloud (it pops when killed too, wherever it is). */
export const toad: BehaviourFactory = (host) => {
  let fuse: FuseState = newFuse();
  let hop = newHop(host.clock.now, 250 + Math.random() * 350);
  const baseScale = host.scaleX;

  return {
    act(time) {
      const now = host.clock.now;
      const fuseStep = stepFuse(fuse, now, host.armed ? distanceTo(host, host.target) : Infinity, PUFF);
      fuse = fuseStep.state;
      if (fuseStep.event === 'lit') playSfx(host.scene, 'croak', { rate: 0.8 });
      if (fuseStep.event === 'boom') {
        host.suicide();
        return;
      }
      if (fuse.phase === 'lit') {
        stand(host);
        host.setFrame(SewerFrame.toadSit);
        const progress = Math.min(1, (now - fuse.litAt) / PUFF.fuseMs);
        host.setScale(baseScale * (1 + SWELL * progress));
        host.forcedTint = feel.reduced || Math.floor((now - fuse.litAt) / FLASH_MS) % 2 === 0 ? FLASH_TINT : CALM_TINT;
        host.applyBaseTint();
        return;
      }
      const hopStep = stepHop(hop, now, HOP);
      hop = hopStep.state;
      if (hopStep.event === 'leap' && Math.random() < 0.3) playSfx(host.scene, 'croak', { volume: 0.6 });
      if (hop.phase === 'leap') {
        host.setFrame(SewerFrame.toadLeap);
        host.chase(time, HOP.speed);
      } else {
        host.setFrame(SewerFrame.toadSit);
        stand(host);
      }
    },
    onDeath() {
      if (host.target.dead || feel.isLocked) return;
      groundEffects(host.scene, host.clock).cloud(host.target, host.x, host.y, host.def.blastDamage ?? 6, host.level);
      playSfx(host.scene, 'poison');
    },
  };
};
