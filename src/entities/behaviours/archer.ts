import type Phaser from 'phaser';
import { leadAim } from '../../logic/aim';
import { newArcher, stepArcher, type ArcherTuning } from '../../logic/archer';
import { pickBlinkPoint } from '../../logic/blink';
import { pickCover } from '../../logic/cover';
import { StuckWatch } from '../../logic/unstick';
import type { Point } from '../../logic/geometry';
import { rangedStance, spreadDirections } from '../../logic/enemyAi';
import { lineClear } from '../../logic/lineOfSight';
import { playSfx } from '../../systems/sfx';
import { directionTo, distanceTo, goToward, shootBolt, stand } from './steer';
import type { BehaviourFactory } from './types';

const TUNING: ArcherTuning = { shootMs: 2300, volleyEveryMs: 850, panicRange: 55, retreatMaxMs: 2400, hideMs: 1500 };
const NEAR = 105;
const FAR = 150;
const SHOT_RANGE = 280;
const COVER_REACHED = 7;
const FLEE_DISTANCE = 70;
const STRAFE_MS = 600;

/** Fires two-arrow volleys from a distance, then runs for the nearest spot the player cannot see, waits there, and peeks out to shoot again. */
export const archer: BehaviourFactory = (host) => {
  let state = newArcher(host.clock.now);
  let cover: Point | null = null;
  const stuck = new StuckWatch(350, 3);
  let strafeUntil = 0;
  let strafeSide: 1 | -1 = 1;
  const radius = (): number => host.bodyRadius();

  const coverSpot = (): Point | null => {
    const found = pickCover(host, host.target, host.isBlocked, Math.random, { minRange: 20, maxRange: 120, attempts: 40, bodyRadius: radius() });
    if (found) return found;
    const flee = pickBlinkPoint(host, host.target, FLEE_DISTANCE, Math.random, host.isBlocked, radius());
    return flee.x === host.x && flee.y === host.y ? null : flee;
  };

  const volley = (): void => {
    if (!lineClear(host, host.target, host.isBlocked)) return;
    const speed = host.def.shotSpeed ?? 105;
    const aim = leadAim(host, host.target, (host.target.body as Phaser.Physics.Arcade.Body).velocity, speed);
    for (const d of spreadDirections(aim.x, aim.y, 2, 0.22)) shootBolt(host, d, speed, SHOT_RANGE);
    playSfx(host.scene, 'enemyShot');
  };

  return {
    act(time) {
      const distance = distanceTo(host, host.target);
      const atCover = cover !== null && distanceTo(host, cover) < COVER_REACHED;
      const step = stepArcher(state, time, { distance: host.armed ? distance : Infinity, atCover }, TUNING);
      state = step.state;
      if (step.event === 'volley' && host.armed) volley();
      if (step.event === 'retreat') cover = coverSpot();
      const speed = host.def.speed * host.speedFactor;
      const moving = state.phase !== 'hide' && (state.phase === 'retreat' && cover !== null && !atCover);
      if (stuck.update(host.x, host.y, time, moving && host.armed) && time >= strafeUntil) {
        strafeUntil = time + STRAFE_MS;
        strafeSide = strafeSide === 1 ? -1 : 1;
        if (state.phase === 'retreat') cover = coverSpot();
      }
      if (time < strafeUntil) {
        const d = directionTo(host, host.target);
        host.setVelocity(-d.y * strafeSide * speed, d.x * strafeSide * speed);
      } else if (state.phase === 'retreat' && cover) goToward(host, cover, speed * 1.5);
      else if (state.phase === 'hide' || state.phase === 'retreat') stand(host);
      else {
        const stance = rangedStance(distance, NEAR, FAR);
        if (stance === 'approach' || !lineClear(host, host.target, host.isBlocked)) host.chase(time);
        else if (stance === 'retreat') {
          const d = directionTo(host, host.target);
          host.setVelocity(-d.x * speed, -d.y * speed);
        } else stand(host);
        host.setFlipX(host.target.x < host.x);
      }
    },
  };
};
