import type Phaser from 'phaser';
import { withMuted, withSettings, type Settings } from '../logic/save';
import { MUSIC_VOLUME_EVENT } from './MusicPlayer';
import { saveSystem } from './SaveSystem';
import { feel } from './feel';

export const MUTE_EVENT = 'mute-changed';

export function applySavedMute(game: Phaser.Game): void {
  game.sound.mute = saveSystem.data.settings.muted;
  feel.setReduced(saveSystem.data.settings.reduceShake);
}

/** Switches save slot (settings carry over) and re-applies them to the running game. */
export function switchSaveSlot(game: Phaser.Game, slot: number): boolean {
  if (!saveSystem.switchTo(slot)) return false;
  applySavedMute(game);
  game.events.emit(MUTE_EVENT, saveSystem.data.settings.muted);
  game.events.emit(MUSIC_VOLUME_EVENT);
  return true;
}

export function toggleMute(game: Phaser.Game): boolean {
  const muted = !saveSystem.data.settings.muted;
  saveSystem.update((save) => withMuted(save, muted));
  game.sound.mute = muted;
  game.events.emit(MUTE_EVENT, muted);
  return muted;
}

/** M toggles sound anywhere in the game (and the choice is saved). */
export function installMuteHotkey(game: Phaser.Game): void {
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) toggleMute(game);
  });
}

/** Persists a settings change and tells running systems (music volume, shake budget). */
export function changeSettings(game: Phaser.Game, change: Partial<Settings>): void {
  const settings = saveSystem.update((save) => withSettings(save, change)).settings;
  feel.setReduced(settings.reduceShake);
  game.events.emit(MUSIC_VOLUME_EVENT);
}
