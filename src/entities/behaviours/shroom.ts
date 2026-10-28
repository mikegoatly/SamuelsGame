import { SewerFrame, Tex } from '../../content/assetKeys';
import { playSfx } from '../../systems/sfx';
import { mendAlly, nearestAlly, type MendTuning } from './mend';
import { directionTo, distanceTo, goToward, stand } from './steer';
import type { BehaviourFactory } from './types';

const MEND: MendTuning = { reach: 100, wardShare: 0.3, wardMs: 6000, healColour: 0x9be84a, wardColour: 0xd0f0a0 };
const CAST_EVERY_MS = 2600;
const NEAR = 95;
const STAY_WITHIN = 0.7;
const PUFF_MS = 450;
const SPORE = 0xc8f08a;

/** Hangs back and puffs spores that heal or shield the monsters near it. Never attacks, so the way to beat it is to catch it first. */
export const shroom: BehaviourFactory = (host, world) => {
  let readyAt = host.clock.now + 1200;
  let puffUntil = 0;

  const spores = (): void => {
    const emitter = host.scene.add.particles(host.x, host.y - 4, Tex.puff, { speed: { min: 15, max: 45 }, lifespan: 500, scale: { start: 0.9, end: 0 }, tint: SPORE, emitting: false });
    emitter.setDepth(8).explode(10);
    host.scene.time.delayedCall(600, () => emitter.destroy());
  };

  return {
    act() {
      const now = host.clock.now;
      const speed = host.def.speed * host.speedFactor;
      const ally = nearestAlly(host, world);
      if (distanceTo(host, host.target) < NEAR) {
        const d = directionTo(host, host.target);
        host.setVelocity(-d.x * speed, -d.y * speed);
      } else if (ally && distanceTo(host, ally) > MEND.reach * STAY_WITHIN) goToward(host, ally, speed);
      else stand(host);
      host.setFlipX(host.target.x < host.x);
      if (!host.armed || now < readyAt || !mendAlly(host, world, MEND)) return;
      readyAt = now + CAST_EVERY_MS;
      puffUntil = now + PUFF_MS;
      spores();
      playSfx(host.scene, 'squelch', { rate: 1.4 });
    },
    update() {
      host.setFrame(host.clock.now < puffUntil ? SewerFrame.mushroomPuff : SewerFrame.mushroom);
    },
  };
};
