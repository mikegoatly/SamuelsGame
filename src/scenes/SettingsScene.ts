import { changeSettings, MUTE_EVENT, toggleMute } from '../systems/audioSettings';
import { saveSystem } from '../systems/SaveSystem';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';
import { VolumeRow } from '../ui/VolumeRow';

export interface SettingsData {
  /** Scene to return to (the main menu, or the pause overlay when opened mid-game). */
  back: 'MainMenu' | 'Pause';
}

const ROW_WIDTH = 330;
const ROW_HEIGHT = 30;
const ROW_GAP = 6;

export class SettingsScene extends MenuScene {
  private returnTo: SettingsData['back'] = 'MainMenu';

  constructor() {
    super('Settings');
  }

  init(data?: Partial<SettingsData>): void {
    this.returnTo = data?.back ?? 'MainMenu';
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const { settings } = saveSystem.data;
    if (this.returnTo === 'Pause') this.add.rectangle(cx, height / 2, width, height, 0x14121c, 0.92);
    menuText(this, cx, 34, 'Settings', 28, '#b48cff');
    const top = 86;
    const rowY = (i: number): number => top + i * (ROW_HEIGHT + ROW_GAP);
    const music = new VolumeRow(this, cx, rowY(0), ROW_WIDTH, ROW_HEIGHT, 'Music', settings.musicVolume, (musicVolume) => changeSettings(this.game, { musicVolume }));
    const effects = new VolumeRow(this, cx, rowY(1), ROW_WIDTH, ROW_HEIGHT, 'Effects', settings.sfxVolume, (sfxVolume) => changeSettings(this.game, { sfxVolume }));
    const sound = new MenuButton(this, cx, rowY(2), ROW_WIDTH, ROW_HEIGHT, soundLabel(settings.muted), () => toggleMute(this.game));
    const refreshSound = (muted: boolean): void => sound.setLabel(soundLabel(muted));
    this.game.events.on(MUTE_EVENT, refreshSound);
    this.events.once('shutdown', () => this.game.events.off(MUTE_EVENT, refreshSound));
    const shake = new MenuButton(this, cx, rowY(3), ROW_WIDTH, ROW_HEIGHT, shakeLabel(settings.reduceShake), () => {
      const reduceShake = !saveSystem.data.settings.reduceShake;
      changeSettings(this.game, { reduceShake });
      shake.setLabel(shakeLabel(reduceShake));
    });
    const back = new MenuButton(this, cx, Math.min(height - 28, rowY(4) + 16), 140, 30, 'Back', () => this.goBack());
    this.menu = new MenuList(this, [music, effects, sound, shake, back], { onBack: () => this.goBack() });
  }

  private goBack(): void {
    this.scene.start(this.returnTo);
  }
}

const soundLabel = (muted: boolean): string => `Sound: ${muted ? 'Off' : 'On'}  (M)`;
const shakeLabel = (reduced: boolean): string => `Reduce shake / flashes: ${reduced ? 'On' : 'Off'}`;
