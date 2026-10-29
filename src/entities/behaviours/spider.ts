import { MinesFrame } from '../../content/assetKeys';
import { lineClear } from '../../logic/lineOfSight';
import { abortAim, actStale, aimLocked, aimProgress, breakTether, hook, lineCatches, newSpider, pullSpeed, SPIDER, stepSpider, TetherLock, type SpiderState } from '../../logic/spiderTether';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { claimPush, releasePush } from '../../systems/hazards/pushOwner';
import type { Player } from '../Player';
import { directionTo, distanceTo, goToward, stand } from './steer';
import type { BehaviourFactory } from './types';

const PLAYER_RADIUS = 6;
const HOLD_NEAR = 80;
const HOLD_FAR = 125;
const SILK = 0xe8d8ff;
const AIM = 0xff5a8a;
const MAX_PULL_MS = SPIDER.pullMs * 2;

/** One tether per player, shared by every spider in the scene. */
const locks = new WeakMap<Player, TetherLock>();
const lockOf = (player: Player): TetherLock => {
  let lock = locks.get(player);
  if (!lock) locks.set(player, (lock = new TetherLock()));
  return lock;
};

/**
 * Keeps a middle distance, rears up and aims a dotted line for 0.8s that stops following you 0.3s before it fires. A hit tethers you and reels you in over 0.6s for a bite;
 * a dash or a hit on the spider snaps the silk. 4s cooldown, and only one spider can hold you at a time. Everything lets go the instant the run ends.
 */
export const spider: BehaviourFactory = (host) => {
  const lock = lockOf(host.target);
  let state: SpiderState = newSpider(host.clock.now, 1200 + Math.random() * 800);
  let angle = 0;
  let locked = false;
  let lastHp = host.hp;
  let lastActAt = host.clock.now;
  const g = host.scene.add.graphics().setDepth(4.5);

  const release = (): void => {
    releasePush(host.target, host);
    if (lock.heldBy(host)) host.target.moveLocked = false;
    lock.release(host);
    g.clear();
    if (host.alive) host.setFrame(MinesFrame.spider);
  };
  const snap = (now: number): void => {
    state = breakTether(state, now);
    release();
  };
  const dropAim = (now: number): void => {
    state = abortAim(state, now);
    locked = false;
    g.clear();
    if (host.alive) host.setFrame(MinesFrame.spider);
  };
  const canHold = (): boolean => !host.target.dead && !host.target.actionsLocked && !feel.isLocked;
  const sees = (): boolean => host.armed && canHold() && lineClear(host, host.target, host.isBlocked);

  const drawAim = (now: number): void => {
    g.clear();
    const progress = aimProgress(state, now);
    const lockedNow = aimLocked(state, now);
    const length = Math.min(SPIDER.hookRange, distanceTo(host, host.target) + 30);
    const colour = lockedNow ? 0xffffff : AIM;
    g.lineStyle(lockedNow ? 2 : 1.5, colour, 0.5 + 0.5 * progress);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let d = 8; d < length; d += 9) g.lineBetween(host.x + dx * d, host.y + dy * d, host.x + dx * (d + 4), host.y + dy * (d + 4));
  };
  const drawTether = (): void => {
    g.clear();
    g.lineStyle(2, SILK, 0.9).lineBetween(host.x, host.y, host.target.x, host.target.y);
  };

  return {
    act(time) {
      lastActAt = time;
      const { target } = host;
      const distance = distanceTo(host, target);
      const free = !lock.held || lock.heldBy(host);
      const step = stepSpider(state, time, { distance: sees() ? distance : Infinity, playerFree: free }, SPIDER, locked);
      state = step.state;
      if (step.event === 'aim') {
        locked = false;
        host.setFrame(MinesFrame.spiderRear);
        playSfx(host.scene, 'enemyShot', { rate: 1.6, volume: 0.6 });
      }
      if (state.phase === 'aim') {
        if (!locked) angle = Math.atan2(target.y - host.y, target.x - host.x);
        if (step.event === 'lock') locked = true;
        if (!sees()) dropAim(time);
        else drawAim(time);
        stand(host);
        host.setFlipX(Math.cos(angle) < 0);
        return;
      }
      if (step.event === 'fire') {
        locked = false;
        g.clear();
        host.setFrame(MinesFrame.spider);
        playSfx(host.scene, 'thwip');
        const caught = sees() && !target.isDashing && lineCatches(host, angle, target, PLAYER_RADIUS) && lock.claim(host);
        if (caught) {
          state = hook(state, time);
          target.moveLocked = true;
          lastHp = host.hp;
        }
      }
      if (step.event === 'bite') {
        release();
        host.tryContact(target);
      }
      if (state.phase === 'pull') {
        stand(host);
        return;
      }
      const speed = host.def.speed * host.speedFactor;
      if (distance > HOLD_FAR) host.chase(time);
      else if (distance < HOLD_NEAR) {
        const d = directionTo(host, target);
        host.setVelocity(-d.x * speed, -d.y * speed);
      } else goToward(host, { x: host.x - Math.sin(time / 900), y: host.y + Math.cos(time / 900) }, speed * 0.5);
    },
    update() {
      if (state.phase === 'aim' && (host.stunned || actStale(host.clock.now, lastActAt))) dropAim(host.clock.now);
      if (state.phase !== 'pull') {
        lastHp = host.hp;
        return;
      }
      const now = host.clock.now;
      const { target } = host;
      const broken = !host.alive || !canHold() || target.isDashing || host.stunned || host.hp < lastHp || now - state.since > MAX_PULL_MS;
      if (broken) return snap(now);
      lastHp = host.hp;
      const remaining = SPIDER.pullMs - (now - state.since);
      const gap = distanceTo(host, target) || 1;
      const d = { x: (host.x - target.x) / gap, y: (host.y - target.y) / gap };
      const speed = pullSpeed(gap, remaining);
      claimPush(target, host, { x: d.x * speed, y: d.y * speed });
      drawTether();
    },
    onDeath: release,
    destroy() {
      release();
      g.destroy();
    },
  };
};
