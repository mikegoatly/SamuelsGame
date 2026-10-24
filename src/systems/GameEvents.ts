import Phaser from 'phaser';
import type { PlayerProgress } from '../logic/progression';

export interface GameEventMap {
  'xp-changed': [progress: PlayerProgress];
  'level-up': [level: number];
  'hp-changed': [hp: number, maxHp: number];
  'wave-started': [wave: number];
  'enemy-died': [level: number, x: number, y: number];
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
