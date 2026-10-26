import Phaser from 'phaser';
import { newOrbit, orbitPoint, diveLaneLength, stepOrbit, type OrbitTuning } from '../../logic/orbitDive';
import { playSfx } from '../../systems/sfx';
import { distanceTo, goToward, stand } from './steer';
import type { BehaviourFactory } from './types';

const TUNING: OrbitTuning = { radius: 58, angularSpeed: 2.2, orbitMs: 2200, warnMs: 450, diveMs: 420, diveSpeed: 235, recoverMs: 900 };
const CATCH_UP = 1.8;
const WARN_TINT = 0xffffff;

/** Circles the player at a fixed radius, flashes a warning lane, then dives straight through. */
export const wisp: BehaviourFactory = (host) => {
  const spin = Math.random() < 0.5 ? 1 : -1;
  const tuning = { ...TUNING, angularSpeed: TUNING.angularSpeed * spin };
  let state = newOrbit(host.clock.now + Math.random() * 800, tuning, Math.random() * Math.PI * 2);
  let last = host.clock.now;
  let lane: Phaser.GameObjects.Rectangle | undefined;

  const clearLane = (): void => {
    lane?.destroy();
    lane = undefined;
  };

  return {
    act(time) {
      const dt = Math.min(100, time - last);
      last = time;
      const step = stepOrbit(state, time, dt, host, host.target, tuning);
      state = step.state;
      if (step.event === 'warn') {
        const length = diveLaneLength(tuning);
        const angle = Math.atan2(state.dive.y, state.dive.x);
        lane = host.scene.add.rectangle(host.x + state.dive.x * length / 2, host.y + state.dive.y * length / 2, length, 8, 0x8fe8ff, 0.3).setRotation(angle).setDepth(3);
        host.forcedTint = WARN_TINT;
        host.applyBaseTint();
        playSfx(host.scene, 'enemyShot', { rate: 1.4 });
      }
      if (step.event === 'dive') {
        clearLane();
        host.forcedTint = null;
        host.applyBaseTint();
      }
      const speed = host.def.speed * host.speedFactor;
      if (state.phase === 'orbit') goToward(host, orbitPoint(state.angle, host.target, tuning.radius), speed * CATCH_UP);
      else if (state.phase === 'dive') host.setVelocity(state.dive.x * tuning.diveSpeed * host.speedFactor, state.dive.y * tuning.diveSpeed * host.speedFactor);
      else stand(host);
      if (state.phase === 'orbit' && distanceTo(host, host.target) > 400) goToward(host, host.target, speed);
    },
    onDeath: clearLane,
    destroy: clearLane,
  };
};
