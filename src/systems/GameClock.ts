import Phaser from 'phaser';

/** Milliseconds of un-paused play: sums scene update deltas, so pausing never advances cooldowns or the run timer. */
export class GameClock {
  now = 0;

  constructor(scene: Phaser.Scene) {
    const tick = (_time: number, delta: number): void => void (this.now += delta);
    scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, tick));
  }
}
