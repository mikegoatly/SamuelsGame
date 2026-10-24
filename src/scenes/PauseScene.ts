import { MUTE_EVENT, toggleMute } from '../systems/audioSettings';
import { saveSystem } from '../systems/SaveSystem';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';
import type { GameScene } from './GameScene';

export class PauseScene extends MenuScene {
  constructor() {
    super('Pause');
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const game = this.scene.get('Game') as GameScene;
    this.add.rectangle(cx, height / 2, width, height, 0x14121c, 0.7);
    menuText(this, cx, height * 0.28, 'Paused', 32, '#b48cff');
    const resume = new MenuButton(this, cx, height * 0.5, 200, 34, 'Resume', () => game.resumeGame());
    const sound = new MenuButton(this, cx, height * 0.5 + 44, 200, 34, soundLabel(saveSystem.data.settings.muted), () => toggleMute(this.game));
    const refresh = (muted: boolean): void => sound.setLabel(soundLabel(muted));
    this.game.events.on(MUTE_EVENT, refresh);
    this.events.once('shutdown', () => this.game.events.off(MUTE_EVENT, refresh));
    const quit = new MenuButton(this, cx, height * 0.5 + 88, 200, 34, 'Quit to level select', () => game.quitToLevelSelect());
    this.menu = new MenuList(this, [resume, sound, quit], { onBack: () => game.resumeGame() });
  }
}

const soundLabel = (muted: boolean): string => `Sound: ${muted ? 'Off' : 'On'}  (M)`;
