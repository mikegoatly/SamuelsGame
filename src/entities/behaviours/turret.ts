import { ringDirections } from '../../logic/enemyAi';
import { newTurret, stepTurret, turretOffset, type TurretTuning } from '../../logic/turret';
import { playSfx } from '../../systems/sfx';
import { distanceTo, shootBolt, stand } from './steer';
import type { BehaviourFactory } from './types';

const TUNING: TurretTuning = { range: 170, warnMs: 500, cooldownMs: 2500, count: 8 };
const SPINE_TINT = 0xb8ff7a;
const SPINE_RANGE = 150;
const WARN_TINT = 0xffff90;

/** Rooted cactus: when the player is near it flashes, then sprays a ring of spines whose gaps rotate each volley. */
export const turret: BehaviourFactory = (host) => {
  let state = newTurret(host.clock.now + 600);
  host.setImmovable(true);
  return {
    act(time) {
      stand(host);
      const step = stepTurret(state, time, host.armed ? distanceTo(host, host.target) : Infinity, TUNING);
      state = step.state;
      if (step.event === 'warn') playSfx(host.scene, 'enemyShot', { rate: 1.3 });
      if (step.event === 'fire') {
        const speed = host.def.shotSpeed ?? 80;
        for (const d of ringDirections(TUNING.count, turretOffset(state.volley, TUNING.count))) shootBolt(host, d, speed, SPINE_RANGE, { tint: SPINE_TINT, scale: 0.8 });
        playSfx(host.scene, 'enemyShot', { rate: 0.9, volume: 1.4 });
      }
      host.forcedTint = state.phase === 'warn' && Math.floor(time / 80) % 2 === 0 ? WARN_TINT : null;
      host.applyBaseTint();
    },
  };
};
