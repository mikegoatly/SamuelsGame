import { rangedStance } from '../../logic/enemyAi';
import { playSfx } from '../../systems/sfx';
import { mendAlly, type MendTuning } from './mend';
import { directionTo, distanceTo, shootBolt, stand } from './steer';
import type { BehaviourFactory } from './types';

const CAST_EVERY_MS = 2300;
const NEAR = 110;
const FAR = 160;
const MEND: MendTuning = { reach: 95, wardShare: 0.35, wardMs: 7000, healColour: 0x7dffb0, wardColour: 0x7aa8ff };

/** Hangs back and mends its pack: heals the most hurt ally in reach, otherwise shields the nearest unshielded one. Kill it first. */
export const priest: BehaviourFactory = (host, world) => {
  let readyAt = host.clock.now + 1500;
  let nextBolt = host.clock.now + 2500;

  const cast = (time: number): void => {
    if (mendAlly(host, world, MEND)) readyAt = time + CAST_EVERY_MS;
  };

  return {
    act(time) {
      const distance = distanceTo(host, host.target);
      const stance = rangedStance(distance, NEAR, FAR);
      const speed = host.def.speed * host.speedFactor;
      if (stance === 'approach') host.chase(time);
      else if (stance === 'retreat') {
        const d = directionTo(host, host.target);
        host.setVelocity(-d.x * speed, -d.y * speed);
      } else stand(host);
      host.setFlipX(host.target.x < host.x);
      if (!host.armed) return;
      if (time >= readyAt) cast(time);
      if (time >= nextBolt && distance < 220) {
        nextBolt = time + 3400;
        shootBolt(host, directionTo(host, host.target), host.def.shotSpeed ?? 70, 250, { tint: 0xf0e090 });
        playSfx(host.scene, 'enemyShot', { rate: 0.8 });
      }
    },
  };
};
