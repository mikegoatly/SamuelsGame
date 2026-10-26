import Phaser from 'phaser';
import type { ActiveHazardKind } from '../../logic/hazard/kinds';
import type { LevelObjects } from '../../logic/tiledObjects';
import { feel } from '../feel';
import type { GameEvents } from '../GameEvents';
import { arrowWall } from './ArrowWall';
import { crackedFloor } from './CrackedFloor';
import { firePit } from './FirePit';
import { flameJet } from './FlameJet';
import { gasVent } from './GasVent';
import { pendulum } from './Pendulum';
import { rubble } from './Rubble';
import { sandstorm } from './Sandstorm';
import type { Hazard, HazardFactory, HazardWorld } from './types';
import { windGust } from './WindGust';

const FACTORIES: Record<ActiveHazardKind, HazardFactory> = { crackedFloor, rubble, gasVent, firePit, wind: windGust, sandstorm, arrowWall, pendulum, flameJet };

/**
 * Builds every placed hazard from the map and runs them by room: dormant (drawn, no logic) until the player enters its room,
 * calm (harmless; fire pits keep burning) once the room is cleared, and halted for good when the run ends or the scene shuts down.
 */
export class HazardDirector {
  private readonly byRoom = new Map<number, Hazard[]>();
  private readonly awake = new Set<Hazard>();
  private halted = false;
  private last = 0;

  constructor(
    private readonly world: HazardWorld,
    level: LevelObjects,
    events: GameEvents,
  ) {
    for (const spec of level.active) {
      const hazard = FACTORIES[spec.kind](world, spec);
      this.byRoom.set(spec.room, [...(this.byRoom.get(spec.room) ?? []), hazard]);
    }
    const bossRoom = level.bossArena?.order;
    events.on('room-started', (order) => this.wake(order));
    events.on('room-cleared', (order) => this.calm(order));
    events.on('boss-started', () => bossRoom !== undefined && this.wake(bossRoom));
    events.on('boss-died', () => bossRoom !== undefined && this.calm(bossRoom));
    const { scene } = world;
    this.last = world.clock.now;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  get count(): number {
    return [...this.byRoom.values()].reduce((sum, list) => sum + list.length, 0);
  }

  private wake(order: number): void {
    if (this.halted) return;
    for (const hazard of this.byRoom.get(order) ?? []) {
      hazard.activate();
      this.awake.add(hazard);
    }
  }

  private calm(order: number): void {
    for (const hazard of this.byRoom.get(order) ?? []) hazard.calm();
  }

  private update(): void {
    if (this.halted) return;
    const { clock, player } = this.world;
    if (player.dead || feel.isLocked) {
      this.halt();
      return;
    }
    const now = clock.now;
    const dt = Math.min(100, now - this.last);
    this.last = now;
    for (const hazard of this.awake) hazard.update(now, dt);
  }

  /** The run is over: everything goes quiet without dealing another point of damage. */
  private halt(): void {
    this.halted = true;
    for (const list of this.byRoom.values()) for (const hazard of list) hazard.halt();
    this.awake.clear();
  }

  private shutdown(): void {
    this.world.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.halted = true;
    this.world.player.windPush = { x: 0, y: 0 };
    for (const list of this.byRoom.values()) for (const hazard of list) hazard.destroy();
    this.byRoom.clear();
    this.awake.clear();
  }
}
