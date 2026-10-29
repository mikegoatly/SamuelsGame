import Phaser from 'phaser';
import { MUSIC_FILES } from '../content/assetKeys';
import { chooseSlot, musicUrl, trackGain } from '../logic/musicStream';
import { fadeStep, planCrossfade } from '../logic/musicFade';
import { volumeGain } from '../logic/volume';
import { saveSystem } from './SaveSystem';

type WebAudioSoundManager = Phaser.Sound.WebAudioSoundManager;

/** A pooled element. On WebAudio its source/gain nodes are created once and live as long as the element (iOS ignores element.volume). */
interface Slot {
  element: HTMLAudioElement;
  graph?: { source: MediaElementAudioSourceNode; gain: GainNode };
  track?: Track;
  primed: boolean;
}

interface Track {
  key: string;
  slot: Slot;
  /** Fraction of the user's music volume this track is heading to (1 = playing, 0 = fading out). */
  target: number;
  level: number;
}

/** Tiny silent wav, played muted inside a user gesture so iOS lets the element start later without one. */
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
const POOL_SIZE = 2;
const RETRY_MS = 1000;
const GESTURES = ['pointerdown', 'touchend', 'keydown'];
const FADE_MS = 1500;
const BASE_VOLUME = 0.6;
export const MUSIC_VOLUME_EVENT = 'music-volume-changed';

/** One looping background track at a time, crossfading to the next. Streams mp3s through a pool of two media elements so they are never decoded to PCM. Lives on the game (not a scene), so menus can share a track. */
export class MusicPlayer {
  private tracks: Track[] = [];
  private slots: Slot[] = [];
  private blurred = false;
  private hidden = false;
  private retryIn = RETRY_MS;
  private listening = true;

  constructor(private readonly game: Phaser.Game) {
    const events = game.events;
    events.on(Phaser.Core.Events.PRE_STEP, this.step, this);
    events.on(MUSIC_VOLUME_EVENT, this.step.bind(this, 0, 0));
    events.on(Phaser.Core.Events.BLUR, () => this.setSuspended('blurred', true));
    events.on(Phaser.Core.Events.FOCUS, () => this.setSuspended('blurred', false));
    events.on(Phaser.Core.Events.HIDDEN, () => this.setSuspended('hidden', true));
    events.on(Phaser.Core.Events.VISIBLE, () => this.setSuspended('hidden', false));
    game.sound.on(Phaser.Sound.Events.UNLOCKED, this.onGesture, this);
    for (const type of GESTURES) window.addEventListener(type, this.onGesture, { passive: true });
  }

  get playing(): string | undefined {
    return this.tracks.find((t) => t.target > 0)?.key;
  }

  /** Starts `key` straight away (replacing anything playing). */
  play(key: string): void {
    if (!MUSIC_FILES[key]) return this.unknown(key);
    this.stop();
    this.add(key, 1);
  }

  /** Fades to `key`; does nothing if it already is the current track. */
  crossfadeTo(key: string): void {
    if (!MUSIC_FILES[key]) return this.unknown(key);
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

  private unknown(key: string): void {
    if (import.meta.env.DEV) console.warn(`MusicPlayer: unknown music key "${key}"`);
  }

  private get suspended(): boolean {
    return this.blurred || this.hidden;
  }

  private webAudio(): WebAudioSoundManager | undefined {
    const manager = this.game.sound;
    return manager instanceof Phaser.Sound.WebAudioSoundManager ? manager : undefined;
  }

  private slot(index: number): Slot {
    const existing = this.slots[index];
    if (existing) return existing;
    const element = new Audio();
    element.loop = true;
    element.preload = 'auto';
    const slot: Slot = { element, primed: false };
    const web = this.webAudio();
    if (web) {
      const gain = web.context.createGain();
      gain.gain.value = 0;
      const source = web.context.createMediaElementSource(element);
      source.connect(gain);
      gain.connect(web.destination);
      slot.graph = { source, gain };
    }
    this.slots[index] = slot;
    return slot;
  }

  private add(key: string, level: number): void {
    const { slot: index, steal } = chooseSlot(Array.from({ length: POOL_SIZE }, (_, i) => this.slots[i]?.track));
    const slot = this.slot(index);
    if (steal && slot.track) this.release(slot.track);
    const track: Track = { key, slot, target: 1, level };
    slot.track = track;
    this.tracks.push(track);
    slot.element.muted = false;
    slot.element.src = musicUrl(import.meta.env.BASE_URL, MUSIC_FILES[key]!);
    this.apply(track, this.ceiling());
    this.start(track);
  }

  private start(track: Track): void {
    const { element } = track.slot;
    if (this.suspended || !element.paused) return;
    element.play().catch(() => undefined);
  }

  private readonly onGesture = (): void => {
    for (let i = 0; i < POOL_SIZE; i++) this.prime(this.slot(i));
    for (const track of this.tracks) this.start(track);
    const primed = this.slots.length === POOL_SIZE && this.slots.every((s) => s.primed);
    if (this.listening && primed && this.tracks.every((t) => !t.slot.element.paused)) {
      this.listening = false;
      for (const type of GESTURES) window.removeEventListener(type, this.onGesture);
    }
  };

  /** Plays the idle element silently then pauses it, so a gesture unlocks it for later src swaps. */
  private prime(slot: Slot): void {
    if (slot.primed || slot.track) return;
    const { element } = slot;
    element.muted = true;
    element.src = SILENCE;
    element
      .play()
      .then(() => {
        slot.primed = true;
        if (slot.track) return;
        element.pause();
        element.removeAttribute('src');
        element.muted = false;
      })
      .catch(() => undefined);
  }

  private setSuspended(flag: 'blurred' | 'hidden', value: boolean): void {
    if (flag === 'blurred' && !this.game.sound.pauseOnBlur) return;
    const was = this.suspended;
    this[flag] = value;
    if (this.suspended === was) return;
    for (const track of this.tracks) {
      if (this.suspended) track.slot.element.pause();
      else this.start(track);
    }
  }

  private ceiling(): number {
    return BASE_VOLUME * volumeGain(saveSystem.data.settings.musicVolume);
  }

  private apply(track: Track, ceiling: number): void {
    const { element, graph } = track.slot;
    const gain = trackGain(ceiling, track.level);
    if (graph) graph.gain.gain.value = gain;
    else {
      element.volume = gain;
      element.muted = this.game.sound.mute;
    }
  }

  private step(_time: number, delta: number): void {
    const max = this.ceiling();
    for (const track of [...this.tracks]) {
      track.level = fadeStep(track.level, track.target, delta, FADE_MS);
      this.apply(track, max);
      if (track.target === 0 && track.level === 0) this.release(track);
    }
    this.retryIn -= delta;
    if (this.retryIn > 0) return;
    this.retryIn = RETRY_MS;
    for (const track of this.tracks) this.start(track);
  }

  private release(track: Track): void {
    this.tracks = this.tracks.filter((t) => t !== track);
    const { slot } = track;
    if (slot.track === track) slot.track = undefined;
    if (slot.graph) slot.graph.gain.gain.value = 0;
    slot.element.pause();
    slot.element.removeAttribute('src');
  }
}

let shared: MusicPlayer | undefined;

export function musicOf(game: Phaser.Game): MusicPlayer {
  shared ??= new MusicPlayer(game);
  return shared;
}
