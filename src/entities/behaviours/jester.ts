import Phaser from 'phaser';
import { newBlinkState, pickBlinkPoint, stepBlink, type BlinkTuning } from '../../logic/blink';
import { newBomb, stepBomb, type Bomb } from '../../logic/bomb';
import { rangedStance } from '../../logic/enemyAi';
import { lineClear } from '../../logic/lineOfSight';
import { playSfx } from '../../systems/sfx';
import { sparkBurst } from '../../systems/skills/skillFx';
import { detonate } from './blast';
import { directionTo, distanceTo, stand } from './steer';
import type { BehaviourFactory } from './types';

const BLINK: BlinkTuning = { triggerRange: 58, distance: 90, vanishMs: 300, castDelayMs: 250, cooldownMs: 4200 };
const THROW_EVERY_MS = 3000;
const BOMB_SPEED = 90;
const BOMB_FUSE_MS = 1900;
const BOMB_RADIUS = 30;
const TOUCH_RADIUS = 9;
const CONFETTI = [0xff70d0, 0xffe066, 0x70e8ff, 0x7dffb0, 0xb48cff];
const NEAR = 85;
const FAR = 135;

interface Live {
  bomb: Bomb;
  body: Phaser.GameObjects.Arc;
}

function confetti(scene: Phaser.Scene, x: number, y: number): void {
  CONFETTI.forEach((tint, i) => scene.time.delayedCall(i * 25, () => sparkBurst(scene, x, y, tint, 4, 70)));
  playSfx(scene, 'confetti');
}

/** Keeps a middle distance lobbing bouncing bombs that go off on a fuse or on touch, and vanishes in confetti when pressed. */
export const jester: BehaviourFactory = (host, world) => {
  const bombs: Live[] = [];
  let blink = newBlinkState();
  let nextThrow = host.clock.now + 1500;
  let last = host.clock.now;

  const throwBomb = (): void => {
    const bomb = newBomb(host, host.target, BOMB_SPEED, BOMB_FUSE_MS);
    bombs.push({ bomb, body: host.scene.add.circle(host.x, host.y, 3.5, 0x2a2438).setStrokeStyle(1, 0xff5a3a).setDepth(6) });
    playSfx(host.scene, 'fuse');
  };

  const explode = (live: Live): void => {
    detonate(host.scene, world, host.target, { x: live.bomb.x, y: live.bomb.y, radius: BOMB_RADIUS, base: host.def.blastDamage ?? 16, level: host.level, except: host });
    live.body.destroy();
  };

  const stepBombs = (delta: number, now: number): void => {
    for (let i = bombs.length - 1; i >= 0; i--) {
      const live = bombs[i]!;
      const step = stepBomb(live.bomb, delta, host.isBlocked);
      live.bomb = step.bomb;
      live.body.setPosition(step.bomb.x, step.bomb.y).setFillStyle(Math.floor(now / 110) % 2 === 0 ? 0x2a2438 : 0xff5a3a);
      const touched = Math.hypot(host.target.x - step.bomb.x, host.target.y - step.bomb.y) <= TOUCH_RADIUS && host.armed;
      if (step.bounced) playSfx(host.scene, 'enemyShot', { rate: 1.6, volume: 0.6 });
      if (step.exploded || touched) {
        bombs.splice(i, 1);
        explode(live);
      }
    }
  };

  const clearBombs = (): void => {
    for (const live of bombs) live.body.destroy();
    bombs.length = 0;
  };

  return {
    get untargetable() {
      return blink.phase === 'vanish';
    },
    act(time) {
      const distance = distanceTo(host, host.target);
      const step = stepBlink(blink, time, host.armed ? distance : Infinity, BLINK);
      blink = step.state;
      if (step.event === 'vanish') {
        confetti(host.scene, host.x, host.y);
        host.conceal(true);
      } else if (step.event === 'appear') {
        const spot = pickBlinkPoint(host, host.target, BLINK.distance, Math.random, host.isBlocked, host.bodyRadius());
        host.setPosition(spot.x, spot.y);
        (host.body as Phaser.Physics.Arcade.Body).reset(spot.x, spot.y);
        host.conceal(false);
        confetti(host.scene, spot.x, spot.y);
      } else if (step.event === 'cast') throwBomb();
      if (blink.phase === 'vanish') return stand(host);
      const stance = rangedStance(distance, NEAR, FAR);
      const speed = host.def.speed * host.speedFactor;
      if (stance === 'approach') host.chase(time);
      else if (stance === 'retreat') {
        const d = directionTo(host, host.target);
        host.setVelocity(-d.x * speed, -d.y * speed);
      } else stand(host);
      host.setFlipX(host.target.x < host.x);
      if (host.armed && time >= nextThrow && distance < 210 && lineClear(host, host.target, host.isBlocked)) {
        nextThrow = time + THROW_EVERY_MS;
        throwBomb();
      }
    },
    update(time) {
      const delta = Math.min(100, time - last);
      last = time;
      stepBombs(delta, time);
    },
    onDeath: clearBombs,
    destroy: clearBombs,
  };
};
