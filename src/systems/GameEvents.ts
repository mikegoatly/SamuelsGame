import Phaser from 'phaser';
import type { PlayerProgress } from '../logic/progression';
import type { Gems } from '../logic/gems';
import type { DamageSource } from '../logic/unlocks';

export interface GameEventMap {
  'xp-changed': [progress: PlayerProgress];
  'level-up': [level: number];
  'hp-changed': [hp: number, maxHp: number];
  'wave-started': [wave: number];
  'enemy-died': [level: number, x: number, y: number, lootTableId: string, boss: boolean, byAlly: boolean, elite: boolean, crescent: boolean];
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
  /** HP actually lost, by where it came from. */
  'player-damaged': [source: DamageSource, amount: number];
  /** A skill button tried to cast (even if it then fizzled). */
  'skill-attempt': [skillId: string];
  /** A potion (carried or picked up) actually healed. */
  'potion-used': [];
  'player-died': [];
  /** The hero caught fire or was put out. */
  'burning-changed': [burning: boolean];
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
