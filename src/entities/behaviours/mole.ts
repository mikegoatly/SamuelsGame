import Phaser from 'phaser';
import { MinesFrame, Tex } from '../../content/assetKeys';
import { damageToPlayer } from '../../logic/combat';
import { newShark, sharkTargetable, stepShark, type SharkTuning } from '../../logic/shark';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { distanceTo, goToward, stand } from './steer';
import type { BehaviourFactory } from './types';

/** The mole's "leap" is a pop straight up where it stopped, so it does not move (speed 0); the rise is the dirt-mound warning. */
const TUNING: SharkTuning = { underMinMs: 1800, underMaxMs: 4000, leapRange: 120, riseMs: 800, leapMs: 300, leapSpeed: 0, exposedMs: 1900 };
const TRACK_SHARE = 0.55;
const TRACK_SPEED = 150;
const POP_RADIUS = 20;
const DIRT = 0x8a6a4a;
const WARN = 0xff3a2a;

/** Tunnels under the floor as a dirt mound (untargetable), then stops under you: the mound shakes with a red ring, and it pops up with a thump that hurts if you are still there. */
export const mole: BehaviourFactory = (host, world) => {
  let state = newShark(host.clock.now);
  const mound = host.scene.add.image(host.x, host.y, Tex.mines, MinesFrame.dirtMound).setDepth(4);
  const ring = host.scene.add.ellipse(host.x, host.y, POP_RADIUS * 2, POP_RADIUS * 1.4).setStrokeStyle(2, WARN, 0.9).setDepth(3).setVisible(false);
  const dust = host.scene.add
    .particles(0, 0, Tex.puff, { follow: host, frequency: 70, lifespan: 420, speed: { min: 3, max: 16 }, scale: { start: 1, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: DIRT, emitting: false })
    .setDepth(4);

  const burst = (count: number): void => {
    const emitter = host.scene.add.particles(host.x, host.y, Tex.puff, { speed: { min: 30, max: 100 }, lifespan: 450, scale: { start: 1.5, end: 0 }, tint: DIRT, emitting: false });
    emitter.setDepth(8).explode(count);
    host.scene.time.delayedCall(550, () => emitter.destroy());
  };
  const dive = (): void => {
    host.hide(true);
    mound.setVisible(true);
    dust.start();
    burst(12);
    playSfx(host.scene, 'burrow');
  };
  const pop = (): void => {
    const spot = world.clearSpot(host);
    if (spot.x !== host.x || spot.y !== host.y) {
      host.setPosition(spot.x, spot.y);
      (host.body as Phaser.Physics.Arcade.Body).reset(spot.x, spot.y);
    }
    host.hide(false);
    mound.setVisible(false);
    ring.setVisible(false);
    dust.stop();
    burst(22);
    playSfx(host.scene, 'crumble');
    feel.shake(80, 0.003);
    const { target } = host;
    if (host.armed && !target.dead && !feel.isLocked && Math.hypot(target.x - host.x, target.y - host.y) <= POP_RADIUS + 6) {
      target.takeDamage(damageToPlayer(host.def.baseDamage, host.level, target.level), host.x, host.y, 'melee');
    }
  };
  const cleanup = (): void => {
    mound.destroy();
    ring.destroy();
    dust.destroy();
  };
  dive();

  return {
    get untargetable() {
      return !sharkTargetable(state.phase);
    },
    get phased() {
      return !sharkTargetable(state.phase);
    },
    act(time) {
      const step = stepShark(state, time, host.armed ? distanceTo(host, host.target) : Infinity, TUNING);
      state = step.state;
      if (step.event === 'rise') {
        ring.setVisible(true);
        playSfx(host.scene, 'rumble', { volume: 0.6 });
      }
      if (step.event === 'leap') pop();
      if (step.event === 'dive') dive();
      if (state.phase === 'under') host.chase(time, host.def.speed, distanceTo(host, host.target) > TUNING.leapRange * 1.5);
      else if (state.phase === 'rise' && time - state.since < TUNING.riseMs * TRACK_SHARE) goToward(host, host.target, TRACK_SPEED * host.speedFactor);
      else stand(host);
      if (state.phase === 'exposed') host.setFlipX(host.target.x < host.x);
    },
    update(time) {
      if (!sharkTargetable(state.phase)) host.setAlpha(0);
      if (!mound.visible) return;
      const shake = state.phase === 'rise' ? Math.sin(time / 25) * 1.6 : 0;
      mound.setPosition(host.x + shake, host.y + 2);
      ring.setPosition(host.x, host.y + 2).setAlpha(feel.reduced ? 0.8 : 0.5 + 0.5 * Math.abs(Math.sin(time / 90)));
    },
    onDeath: cleanup,
    destroy: cleanup,
  };
};
