import Phaser from 'phaser';
import { MonsterFrame, Tex } from '../../content/assetKeys';
import { leapLaneLength, newShark, sharkTargetable, stepShark, type SharkTuning } from '../../logic/shark';
import { playSfx } from '../../systems/sfx';
import { directionTo, distanceTo, stand } from './steer';
import type { BehaviourFactory } from './types';

const TUNING: SharkTuning = { underMinMs: 1600, leapRange: 78, riseMs: 550, leapMs: 340, leapSpeed: 240, exposedMs: 1100 };
const SAND = 0xd8b070;

function sandBurst(host: { scene: Phaser.Scene }, x: number, y: number, count = 16): void {
  const emitter = host.scene.add.particles(x, y, Tex.puff, { speed: { min: 30, max: 100 }, lifespan: 450, scale: { start: 1.6, end: 0 }, tint: SAND, emitting: false });
  emitter.setDepth(8).explode(count);
  host.scene.time.delayedCall(550, () => emitter.destroy());
}

/** Swims under the sand as a fin leaving a dust trail (untargetable), pauses with a warning lane, then leaps out and lies exposed before diving again. */
export const shark: BehaviourFactory = (host, world) => {
  let state = newShark(host.clock.now);
  let dir = { x: 1, y: 0 };
  let lane: Phaser.GameObjects.Rectangle | undefined;
  const fin = host.scene.add.image(host.x, host.y, Tex.monsters, MonsterFrame.fin).setDepth(5).setVisible(false);
  const dust = host.scene.add
    .particles(0, 0, Tex.puff, { follow: host, frequency: 45, lifespan: 500, speed: { min: 3, max: 18 }, scale: { start: 1.3, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: SAND, emitting: false })
    .setDepth(4);

  const submerge = (): void => {
    host.hide(true);
    fin.setVisible(true);
    dust.start();
    sandBurst(host, host.x, host.y);
    playSfx(host.scene, 'burrow');
  };
  const surface = (): void => {
    const spot = world.clearSpot(host);
    if (spot.x !== host.x || spot.y !== host.y) {
      host.setPosition(spot.x, spot.y);
      (host.body as Phaser.Physics.Arcade.Body).reset(spot.x, spot.y);
    }
    host.hide(false);
    fin.setVisible(false);
    dust.stop();
    sandBurst(host, host.x, host.y, 24);
    playSfx(host.scene, 'slam', { volume: 0.7 });
  };
  const clearLane = (): void => {
    lane?.destroy();
    lane = undefined;
  };
  submerge();

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
        dir = directionTo(host, host.target);
        const length = leapLaneLength(TUNING);
        lane = host.scene.add.rectangle(host.x + (dir.x * length) / 2, host.y + (dir.y * length) / 2, length, 10, 0xff3a2a, 0.28).setRotation(Math.atan2(dir.y, dir.x)).setDepth(3);
        playSfx(host.scene, 'enemyShot', { rate: 0.6 });
      }
      if (step.event === 'leap') {
        clearLane();
        surface();
        host.setFlipX(dir.x < 0);
      }
      if (step.event === 'dive') submerge();
      if (state.phase === 'under') host.chase(time);
      else if (state.phase === 'leap') host.setVelocity(dir.x * TUNING.leapSpeed * host.speedFactor, dir.y * TUNING.leapSpeed * host.speedFactor);
      else stand(host);
    },
    update(time) {
      if (!sharkTargetable(state.phase)) host.setAlpha(0);
      if (!fin.visible) return;
      fin.setPosition(host.x, host.y + Math.sin(time / 90) * 1.2).setFlipX(host.flipX);
    },
    onDeath() {
      clearLane();
      fin.destroy();
      dust.destroy();
    },
    destroy() {
      clearLane();
      fin.destroy();
      dust.destroy();
    },
  };
};
