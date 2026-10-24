import Phaser from 'phaser';
import { fadeStep, planCrossfade } from '../logic/musicFade';
import { volumeGain } from '../logic/volume';
import { saveSystem } from './SaveSystem';

type Sound = Phaser.Sound.BaseSound & { volume: number };

interface Track {
  key: string;
  sound: Sound;
  /** Fraction of the user's music volume this track is heading to (1 = playing, 0 = fading out). */
  target: number;
  level: number;
}

const FADE_MS = 1500;
const BASE_VOLUME = 0.6;
export const MUSIC_VOLUME_EVENT = 'music-volume-changed';

/** One looping background track at a time, crossfading to the next. Lives on the game (not a scene), so menus can share a track. */
export class MusicPlayer {
  private tracks: Track[] = [];

  constructor(private readonly game: Phaser.Game) {
    game.events.on(Phaser.Core.Events.PRE_STEP, this.step, this);
    game.events.on(MUSIC_VOLUME_EVENT, this.step.bind(this, 0, 0));
  }

  get playing(): string | undefined {
    return this.tracks.find((t) => t.target > 0)?.key;
  }

  /** Starts `key` straight away (replacing anything playing). */
  play(key: string): void {
    this.stop();
    this.add(key, 1);
  }

  /** Fades to `key`; does nothing if it already is the current track. */
  crossfadeTo(key: string): void {
    const plan = planCrossfade(this.tracks, key);
    if (plan.action === 'none') return;
    for (const track of this.tracks) track.target = 0;
    if (plan.action === 'revive') this.tracks[plan.index]!.target = 1;
    else this.add(key, 0);
  }

  fadeOut(): void {
    for (const track of this.tracks) track.target = 0;
  }

  stop(): void {
    for (const track of [...this.tracks]) this.release(track);
  }

  private add(key: string, level: number): void {
    const sound = this.game.sound.add(key, { loop: true, volume: 0 }) as Sound;
    const track: Track = { key, sound, target: 1, level };
    this.tracks.push(track);
    sound.volume = this.ceiling() * level;
    sound.play();
  }

  private ceiling(): number {
    return BASE_VOLUME * volumeGain(saveSystem.data.settings.musicVolume);
  }

  private step(_time: number, delta: number): void {
    const max = this.ceiling();
    for (const track of [...this.tracks]) {
      track.level = fadeStep(track.level, track.target, delta, FADE_MS);
      if (!track.sound.pendingRemove) track.sound.volume = max * track.level;
      if (track.target === 0 && track.level === 0) this.release(track);
    }
  }

  private release(track: Track): void {
    this.tracks = this.tracks.filter((t) => t !== track);
    // Phaser 3.90 has no locked-action queue (play() starts a source on the suspended context), so stop/destroy are safe; just guard double-destroy.
    if (track.sound.pendingRemove) return;
    track.sound.stop();
    track.sound.destroy();
  }
}

let shared: MusicPlayer | undefined;

export function musicOf(game: Phaser.Game): MusicPlayer {
  shared ??= new MusicPlayer(game);
  return shared;
}
