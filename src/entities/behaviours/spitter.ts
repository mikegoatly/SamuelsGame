import Phaser from 'phaser';
import { SewerFrame, TILE_SIZE, Tex } from '../../content/assetKeys';
import { damageToPlayer } from '../../logic/combat';
import type { Point } from '../../logic/geometry';
import { landingPoint, lobArcHeight } from '../../logic/lob';
import { lobPosition, lobProgress } from '../../logic/sludge';
import { newTurret, stepTurret, type TurretTuning } from '../../logic/turret';
import { wallMountSpot } from '../../logic/wallMount';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { distanceTo, stand } from './steer';
import type { BehaviourFactory } from './types';

const TUNING: TurretTuning = { range: 190, warnMs: 800, cooldownMs: 2300, count: 1 };
const MIN_LOB = 28;
const MAX_LOB = 200;
const SPLASH_RADIUS = 20;
const MOUNT_SEARCH_TILES = 8;
const MOUNT_NUDGE = 4;
const FIRING_MS = 260;
const TELEGRAPH = 0xff3a2a;

interface Flight {
  from: Point;
  to: Point;
  startedAt: number;
  glob: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Arc;
  fill: Phaser.GameObjects.Arc;
}

/** Sits in a pipe on the wall edge; lobs a goo glob in an arc at where you stand, a red circle showing the landing spot for 0.8s. Stop it by killing the spitter. */
export const spitter: BehaviourFactory = (host) => {
  const mount = wallMountSpot(host, (x, y) => host.isBlocked(x, y), TILE_SIZE, MOUNT_SEARCH_TILES);
  if (mount) {
    const x = mount.x - mount.facing.x * MOUNT_NUDGE;
    const y = mount.y - mount.facing.y * MOUNT_NUDGE;
    host.setPosition(x, y);
    (host.body as Phaser.Physics.Arcade.Body).reset(x, y);
  }
  host.setImmovable(true);
  let state = newTurret(host.clock.now + 900);
  let flight: Flight | undefined;
  let firingUntil = 0;

  const clearFlight = (): void => {
    if (!flight) return;
    flight.glob.destroy();
    flight.shadow.destroy();
    flight.ring.destroy();
    flight.fill.destroy();
    flight = undefined;
  };

  const launch = (now: number): void => {
    const to = landingPoint(host, host.target, MIN_LOB, MAX_LOB);
    const from = { x: host.x, y: host.y };
    flight = {
      from,
      to,
      startedAt: now,
      glob: host.scene.add.image(from.x, from.y, Tex.sewer, SewerFrame.glob).setDepth(7),
      shadow: host.scene.add.ellipse(from.x, from.y, 8, 4, 0x000000, 0.3).setDepth(3),
      ring: host.scene.add.circle(to.x, to.y, SPLASH_RADIUS, TELEGRAPH, 0.14).setStrokeStyle(2, 0xff6a4a, 0.9).setDepth(3),
      fill: host.scene.add.circle(to.x, to.y, SPLASH_RADIUS, TELEGRAPH, 0.38).setDepth(3).setScale(0.05),
    };
    firingUntil = now + FIRING_MS;
    playSfx(host.scene, 'enemyShot', { rate: 0.6 });
  };

  const land = (): void => {
    if (!flight) return;
    const { to } = flight;
    clearFlight();
    const splash = host.scene.add.image(to.x, to.y, Tex.sewer, SewerFrame.splash).setDepth(6).setScale(1.6);
    host.scene.tweens.add({ targets: splash, alpha: 0, scale: 2.2, duration: 260, onComplete: () => splash.destroy() });
    playSfx(host.scene, 'splash');
    const { target } = host;
    if (target.dead || feel.isLocked || Math.hypot(target.x - to.x, target.y - to.y) > SPLASH_RADIUS + 4) return;
    target.takeDamage(damageToPlayer(host.def.baseDamage, host.level, target.level), to.x, to.y, 'ranged');
  };

  return {
    act(time) {
      stand(host);
      const step = stepTurret(state, time, host.armed ? distanceTo(host, host.target) : Infinity, TUNING);
      state = step.state;
      if (step.event === 'warn') launch(time);
    },
    update() {
      const now = host.clock.now;
      host.setFrame(now < firingUntil ? SewerFrame.spitterFiring : SewerFrame.spitter);
      if (!flight) return;
      const t = lobProgress(now - flight.startedAt, TUNING.warnMs);
      const at = lobPosition(flight.from, flight.to, t, 0);
      const lift = lobArcHeight(t);
      flight.glob.setPosition(at.x, at.y - lift - 4);
      flight.shadow.setPosition(at.x, at.y).setScale(1 - lift / 60);
      flight.fill.setScale(Math.max(0.05, t));
      if (t >= 1) land();
    },
    onDeath: clearFlight,
    destroy: clearFlight,
  };
};
