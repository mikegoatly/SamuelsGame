import type Phaser from 'phaser';
import { withMuted } from '../logic/save';
import { saveSystem } from './SaveSystem';

export const MUTE_EVENT = 'mute-changed';

export function applySavedMute(game: Phaser.Game): void {
  game.sound.mute = saveSystem.data.settings.muted;
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
