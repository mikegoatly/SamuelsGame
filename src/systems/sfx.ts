import type Phaser from 'phaser';
import { SFX_DEFS, sfxKey, type SfxDef, type SfxId } from '../content/sfxDefs';
import { jitterRate, pickVariant } from '../logic/sfxPicker';
import { volumeGain } from '../logic/volume';
import { saveSystem } from './SaveSystem';

export interface SfxOptions {
  /** Multiplies the registry volume. */
  volume?: number;
  /** Multiplies the registry playback rate. */
  rate?: number;
  /** Seconds to wait before playing. */
  delay?: number;
}

const lastVariant = new Map<SfxId, number>();
const lastPlayed = new Map<SfxId, number>();

/** The one place gameplay and UI play effects: picks a non-repeating variant, jitters pitch and applies the sfx volume setting. */
export function playSfx(scene: Phaser.Scene, id: SfxId, options: SfxOptions = {}): void {
  const def: SfxDef = SFX_DEFS[id];
  const gain = volumeGain(saveSystem.data.settings.sfxVolume);
  if (gain === 0) return;
  const now = performance.now();
  if (def.minGapMs !== undefined && now - (lastPlayed.get(id) ?? -Infinity) < def.minGapMs) return;
  lastPlayed.set(id, now);
  const variant = pickVariant(def.files.length, Math.random, lastVariant.get(id));
  lastVariant.set(id, variant);
  scene.sound.play(sfxKey(id, variant), {
    volume: Math.min(1, def.volume * (options.volume ?? 1) * gain),
    rate: jitterRate((def.rate ?? 1) * (options.rate ?? 1), def.jitter ?? 0, Math.random),
    delay: options.delay,
  });
}
