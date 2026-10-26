import { playSfx } from '../../systems/sfx';
import { floatText } from '../../systems/floatText';
import type { Enemy } from '../Enemy';
import { directionTo, distanceTo, goToward } from './steer';
import type { BehaviourFactory } from './types';

const LEASH = 150;
const RALLY_EVERY_MS = 6500;
const RALLY_MS = 1600;
const RALLY_SPEED = 1.6;
const FLEE_SPEED = 1.25;
const FLEE_MS = 4200;

const masters = new WeakMap<Enemy, Enemy>();
const squads = new WeakMap<Enemy, Enemy[]>();
const rallyUntil = new WeakMap<Enemy, number>();

/** Puts `hound` under `master`'s command. */
export function assignHound(master: Enemy, hound: Enemy): void {
  masters.set(hound, master);
  squads.set(master, [...(squads.get(master) ?? []), hound]);
}

/** The houndmaster himself plods after the player and, every few seconds, howls to send the pack into a frenzy. */
export const houndmaster: BehaviourFactory = (host) => {
  let nextRally = host.clock.now + 3500;
  return {
    act(time) {
      host.chase(time);
      if (!host.armed || time < nextRally) return;
      nextRally = time + RALLY_EVERY_MS;
      for (const hound of squads.get(host) ?? []) if (hound.alive) rallyUntil.set(hound, time + RALLY_MS);
      floatText(host.scene, host.x, host.y - host.displayHeight / 2 - 6, 'Fetch!', '#ffb060', 9, 12, 700);
      playSfx(host.scene, 'howl');
    },
  };
};

/** Hounds hunt the player but stay within a leash of their master; once he falls they flee and vanish, and no longer hold up the room. */
export const hound: BehaviourFactory = (host) => {
  let fledAt: number | null = null;
  return {
    get ignoredForClear() {
      const master = masters.get(host);
      return fledAt !== null || (master !== undefined && !master.alive);
    },
    act(time) {
      const master = masters.get(host);
      if (master && !master.alive && fledAt === null) {
        fledAt = time;
        floatText(host.scene, host.x, host.y - host.displayHeight / 2 - 6, '!', '#ffffff', 10, 10, 500);
      }
      const speed = host.def.speed * host.speedFactor;
      if (fledAt !== null) {
        if (time - fledAt > FLEE_MS) return host.dismiss();
        const away = directionTo(host, host.target);
        return host.setVelocity(-away.x * speed * FLEE_SPEED, -away.y * speed * FLEE_SPEED);
      }
      if (master && distanceTo(host, master) > LEASH) return goToward(host, master, speed);
      host.chase(time, host.def.speed * ((rallyUntil.get(host) ?? 0) > time ? RALLY_SPEED : 1));
    },
  };
};
