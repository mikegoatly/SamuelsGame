import Phaser from 'phaser';
import type { PlayerProgress } from '../logic/progression';
import type { Gems } from '../logic/gems';

export interface GameEventMap {
  'xp-changed': [progress: PlayerProgress];
  'level-up': [level: number];
  'hp-changed': [hp: number, maxHp: number];
  'wave-started': [wave: number];
  'enemy-died': [level: number, x: number, y: number, lootTableId: string];
  'coins-changed': [total: number];
  'gems-changed': [gems: Gems];
  'room-started': [order: number, total: number];
  'room-cleared': [order: number, total: number];
  'boss-started': [];
  'boss-spawned': [name: string, hp: number, maxHp: number];
  'boss-hp': [hp: number, maxHp: number];
  'boss-died': [x: number, y: number];
  'pause-requested': [];
  'player-hurt': [];
  'player-died': [];
}

/** Small typed wrapper over a Phaser emitter, shared by the game and HUD scenes. */
export class GameEvents {
  private readonly emitter = new Phaser.Events.EventEmitter();

  on<K extends keyof GameEventMap>(event: K, listener: (...args: GameEventMap[K]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  emit<K extends keyof GameEventMap>(event: K, ...args: GameEventMap[K]): void {
    this.emitter.emit(event, ...args);
  }

  clear(): void {
    this.emitter.removeAllListeners();
  }
}
