import Phaser from 'phaser';

type Track = Phaser.Sound.BaseSound & { volume: number };

const FADE_MS = 1500;

/** One looping background track at a time, with a crossfade to the next. Phaser queues play() until audio is unlocked. */
export class MusicPlayer {
  private tracks: Track[] = [];
  private current?: Track;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly volume = 0.4,
  ) {}

  play(key: string): void {
    this.stop();
    this.current = this.start(key, this.volume);
  }

  crossfadeTo(key: string): void {
    const old = this.current;
    this.current = this.start(key, 0);
    this.fade(this.current, this.volume);
    if (old) this.fade(old, 0, () => this.release(old));
  }

  stop(): void {
    for (const track of [...this.tracks]) this.release(track);
    this.current = undefined;
  }

  private start(key: string, volume: number): Track {
    const track = this.scene.sound.add(key, { loop: true, volume }) as Track;
    this.tracks.push(track);
    track.play();
    return track;
  }

  private fade(track: Track, to: number, done?: () => void): void {
    this.scene.tweens.add({ targets: track, volume: to, duration: FADE_MS, onComplete: done });
  }

  private release(track: Track): void {
    this.tracks = this.tracks.filter((t) => t !== track);
    track.stop();
    track.destroy();
  }
}
