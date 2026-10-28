import Phaser from 'phaser';
import { SewerFrame, Tex } from '../../content/assetKeys';
import { clampIntoRect, nearestChannel } from '../../logic/channel';
import type { Rect } from '../../logic/geometry';
import { newLurk, stepLurk, type LurkTuning } from '../../logic/gatorLurk';
import { leapLaneLength, newShark, sharkTargetable, stepShark, type SharkTuning } from '../../logic/shark';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { groundEffects } from './ground';
import { directionTo, distanceTo, goToward, stand } from './steer';
import type { BehaviourFactory } from './types';

const TUNING: SharkTuning = { underMinMs: 1500, leapRange: 110, riseMs: 600, leapMs: 440, leapSpeed: 250, exposedMs: 1600 };
const LURK: LurkTuning = { outOfRangeMs: 3000, surfacedMs: 2500 };
const CHANNEL_REACH = 220;
const REPICK_MS = 400;
const BANK_INSET = 5;
const RETREAT_SPEED = 1.1;
const MUD = 0x4a7a3a;
const BUBBLE = 0xcfeec0;
const EYE = 0xfff070;

/**
 * Hides in a sludge channel with only its bright eyes showing, swimming along it to stay near you, and when you are within 110px it
 * warns with a red lane, lunges out and lies exposed before crawling back in. If nobody comes near for a while it surfaces by itself so
 * ranged heroes can shoot it. With no channel in the room it swims on the floor like the sand shark.
 */
export const gator: BehaviourFactory = (host, world) => {
  const ground = groundEffects(host.scene, host.clock);
  let channel: Rect | undefined = nearestChannel(world.channels?.() ?? [], host, CHANNEL_REACH);
  let state = newShark(host.clock.now);
  let lurk = newLurk();
  let nextPickAt = 0;
  let surfaced = false;
  let dir = { x: 1, y: 0 };
  let lane: Phaser.GameObjects.Rectangle | undefined;
  const ripple = host.scene.add.image(host.x, host.y, Tex.sewer, SewerFrame.gator).setDepth(4).setCrop(2, 3, 14, 5).setTint(0x1e3a28).setAlpha(0.8).setVisible(false);
  const ring = host.scene.add.ellipse(host.x, host.y, 24, 11).setStrokeStyle(1, BUBBLE, 0.7).setDepth(3).setVisible(false);
  const glow = [0, 1].map(() => host.scene.add.rectangle(host.x, host.y, 6, 6, EYE, 0.35).setDepth(5).setVisible(false));
  const eyes = [0, 1].map(() => host.scene.add.rectangle(host.x, host.y, 3, 3, EYE).setDepth(5).setVisible(false));
  const bubbles = host.scene.add
    .particles(0, 0, Tex.puff, { follow: host, frequency: 260, lifespan: 600, speed: { min: 3, max: 12 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: BUBBLE, emitting: false })
    .setDepth(4);
  const dust = host.scene.add
    .particles(0, 0, Tex.puff, { follow: host, frequency: 60, lifespan: 450, speed: { min: 3, max: 16 }, scale: { start: 1.1, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: MUD, emitting: false })
    .setDepth(4);
  const marks = [ripple, ring, ...glow, ...eyes];
  const showMarks = (on: boolean): void => marks.forEach((m) => m.setVisible(on));

  const snapIntoChannel = (): void => {
    if (!channel) return;
    const p = clampIntoRect(channel, host, BANK_INSET);
    host.setPosition(p.x, p.y);
    (host.body as Phaser.Physics.Arcade.Body).reset(p.x, p.y);
  };
  const splash = (x: number, y: number, count: number): void => {
    const emitter = host.scene.add.particles(x, y, Tex.puff, { speed: { min: 30, max: 90 }, lifespan: 420, scale: { start: 1.4, end: 0 }, tint: MUD, emitting: false });
    emitter.setDepth(8).explode(count);
    ground.expire(520, emitter);
  };
  const submerge = (): void => {
    surfaced = false;
    snapIntoChannel();
    host.hide(true);
    host.setFrame(SewerFrame.gator);
    showMarks(true);
    if (channel) bubbles.start();
    else dust.start();
    splash(host.x, host.y, 12);
    playSfx(host.scene, 'splash', { volume: 0.7 });
  };
  const surface = (): void => {
    host.hide(false);
    showMarks(false);
    dust.stop();
    bubbles.stop();
    splash(host.x, host.y, 20);
  };
  const clearLane = (): void => {
    lane?.destroy();
    lane = undefined;
  };
  const cleanup = (): void => {
    clearLane();
    for (const m of marks) m.destroy();
    bubbles.destroy();
    dust.destroy();
  };
  snapIntoChannel();
  submerge();

  return {
    get untargetable() {
      return !surfaced && !sharkTargetable(state.phase);
    },
    get phased() {
      return !surfaced && !sharkTargetable(state.phase);
    },
    act(time) {
      const distance = host.armed ? distanceTo(host, host.target) : Infinity;
      const lurking = stepLurk(lurk, time, distance <= TUNING.leapRange, LURK, state.phase === 'under');
      lurk = lurking.state;
      if (lurking.event === 'surface') {
        surfaced = true;
        surface();
        host.setFrame(SewerFrame.gator);
        playSfx(host.scene, 'splash');
      } else if (lurking.event === 'dive') {
        channel = nearestChannel(world.channels?.() ?? [], host, CHANNEL_REACH) ?? channel;
        submerge();
        state = newShark(time);
      }
      if (surfaced) {
        stand(host);
        host.setFlipX(host.target.x < host.x);
        return;
      }
      const step = stepShark(state, time, distance, TUNING);
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
        playSfx(host.scene, 'snap');
        host.setFrame(SewerFrame.gatorJaws);
        host.setFlipX(dir.x < 0);
      }
      if (step.event === 'expose') host.setFrame(SewerFrame.gator);
      if (step.event === 'dive') {
        channel = nearestChannel(world.channels?.() ?? [], host, CHANNEL_REACH) ?? channel;
        submerge();
      }
      if (state.phase === 'under') {
        // Swim to whichever channel segment lies nearest the player, so a gator is never stranded far from the fight.
        if (time >= nextPickAt) {
          nextPickAt = time + REPICK_MS;
          channel = nearestChannel(world.channels?.() ?? [], host.target, Infinity) ?? channel;
        }
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
      if (!surfaced && !sharkTargetable(state.phase)) host.setAlpha(0);
      if (!ripple.visible) return;
      const bob = Math.sin(time / 120) * 0.8;
      const sign = host.flipX ? -1 : 1;
      const pulse = feel.reduced ? 0.4 : 0.3 + 0.2 * Math.sin(time / 150);
      ripple.setPosition(host.x, host.y + 2 + bob).setFlipX(host.flipX);
      ring.setPosition(host.x, host.y + 3).setScale(feel.reduced ? 1 : 1 + 0.08 * Math.sin(time / 260));
      const spots = [host.x + sign * 4.5, host.x + sign * 0.5];
      eyes.forEach((eye, i) => eye.setPosition(spots[i]!, host.y - 1.5 + bob));
      glow.forEach((g, i) => g.setPosition(spots[i]!, host.y - 1.5 + bob).setAlpha(pulse));
    },
    onDeath: cleanup,
    destroy: cleanup,
  };
};
