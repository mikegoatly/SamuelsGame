import Phaser from 'phaser';
import { SewerFrame, Tex } from '../../content/assetKeys';
import { clampIntoRect, nearestChannel } from '../../logic/channel';
import type { Rect } from '../../logic/geometry';
import { leapLaneLength, newShark, sharkTargetable, stepShark, type SharkTuning } from '../../logic/shark';
import { playSfx } from '../../systems/sfx';
import { directionTo, distanceTo, goToward, stand } from './steer';
import type { BehaviourFactory } from './types';

const TUNING: SharkTuning = { underMinMs: 1500, leapRange: 74, riseMs: 600, leapMs: 330, leapSpeed: 245, exposedMs: 1100 };
const CHANNEL_REACH = 220;
const BANK_INSET = 5;
const RETREAT_SPEED = 1.1;
const MUD = 0x4a7a3a;
const EYE = 0xfad250;

/**
 * Hides in a sludge channel with only its eyes showing, swimming along it to stay near you, and when you are close to the bank it
 * warns with a red lane, lunges out and lies exposed before crawling back in. With no channel in the room it swims on the floor like the sand shark.
 */
export const gator: BehaviourFactory = (host, world) => {
  let channel: Rect | undefined = nearestChannel(world.channels?.() ?? [], host, CHANNEL_REACH);
  let state = newShark(host.clock.now);
  let dir = { x: 1, y: 0 };
  let lane: Phaser.GameObjects.Rectangle | undefined;
  const ripple = host.scene.add.image(host.x, host.y, Tex.sewer, SewerFrame.gator).setDepth(4).setCrop(2, 3, 14, 5).setTint(0x1e3a28).setAlpha(0.7).setVisible(false);
  const eyes = [0, 1].map(() => host.scene.add.rectangle(host.x, host.y, 2, 2, EYE).setDepth(5).setVisible(false));
  const dust = host.scene.add
    .particles(0, 0, Tex.puff, { follow: host, frequency: 60, lifespan: 450, speed: { min: 3, max: 16 }, scale: { start: 1.1, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: MUD, emitting: false })
    .setDepth(4);

  const snapIntoChannel = (): void => {
    if (!channel) return;
    const p = clampIntoRect(channel, host, BANK_INSET);
    host.setPosition(p.x, p.y);
    (host.body as Phaser.Physics.Arcade.Body).reset(p.x, p.y);
  };
  const splash = (x: number, y: number, count: number): void => {
    const emitter = host.scene.add.particles(x, y, Tex.puff, { speed: { min: 30, max: 90 }, lifespan: 420, scale: { start: 1.4, end: 0 }, tint: MUD, emitting: false });
    emitter.setDepth(8).explode(count);
    host.scene.time.delayedCall(520, () => emitter.destroy());
  };
  const submerge = (): void => {
    snapIntoChannel();
    host.hide(true);
    host.setFrame(SewerFrame.gator);
    ripple.setVisible(true);
    for (const eye of eyes) eye.setVisible(true);
    if (!channel) dust.start();
    splash(host.x, host.y, 12);
    playSfx(host.scene, 'splash', { volume: 0.7 });
  };
  const surface = (): void => {
    host.hide(false);
    ripple.setVisible(false);
    for (const eye of eyes) eye.setVisible(false);
    dust.stop();
    splash(host.x, host.y, 20);
    playSfx(host.scene, 'snap');
  };
  const clearLane = (): void => {
    lane?.destroy();
    lane = undefined;
  };
  const cleanup = (): void => {
    clearLane();
    ripple.destroy();
    for (const eye of eyes) eye.destroy();
    dust.destroy();
  };
  snapIntoChannel();
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
        host.setFlipX(dir.x < 0);
        playSfx(host.scene, 'enemyShot', { rate: 0.6 });
      }
      if (step.event === 'leap') {
        clearLane();
        surface();
        host.setFrame(SewerFrame.gatorJaws);
        host.setFlipX(dir.x < 0);
      }
      if (step.event === 'expose') host.setFrame(SewerFrame.gator);
      if (step.event === 'dive') {
        channel = nearestChannel(world.channels?.() ?? [], host, CHANNEL_REACH) ?? channel;
        submerge();
      }
      if (state.phase === 'under') {
        if (!channel) host.chase(time);
        else {
          const goal = clampIntoRect(channel, host.target, BANK_INSET);
          if (Math.hypot(goal.x - host.x, goal.y - host.y) < 2) stand(host);
          else goToward(host, goal, host.def.speed * host.speedFactor);
        }
      } else if (state.phase === 'leap') host.setVelocity(dir.x * TUNING.leapSpeed * host.speedFactor, dir.y * TUNING.leapSpeed * host.speedFactor);
      else if (state.phase === 'exposed' && channel) goToward(host, clampIntoRect(channel, host, BANK_INSET), host.def.speed * RETREAT_SPEED * host.speedFactor);
      else stand(host);
    },
    update(time) {
      if (!sharkTargetable(state.phase)) host.setAlpha(0);
      if (!ripple.visible) return;
      const bob = Math.sin(time / 120) * 0.8;
      ripple.setPosition(host.x, host.y + 2 + bob).setFlipX(host.flipX);
      const sign = host.flipX ? -1 : 1;
      eyes[0]!.setPosition(host.x + sign * 4, host.y - 1.5 + bob);
      eyes[1]!.setPosition(host.x + sign * 1, host.y - 1.5 + bob);
    },
    onDeath: cleanup,
    destroy: cleanup,
  };
};
