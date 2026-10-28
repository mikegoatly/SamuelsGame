import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from './content/config';
import { CampScene } from './scenes/CampScene';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HeroSelectScene } from './scenes/HeroSelectScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { LoadoutScene } from './scenes/LoadoutScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LevelCompleteScene } from './scenes/LevelCompleteScene';
import { PauseScene } from './scenes/PauseScene';
import { HudScene } from './scenes/HudScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { ItemCardScene } from './scenes/ItemCardScene';
import { NoticeScene } from './scenes/NoticeScene';
import { SaveSlotsScene } from './scenes/SaveSlotsScene';
import { SettingsScene } from './scenes/SettingsScene';
import { SkillSwapScene } from './scenes/SkillSwapScene';
import { installDeviceTracker } from './systems/inputDevice';
import { applySavedMute, installMuteHotkey } from './systems/audioSettings';
import { exposeForDebug } from './debug';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: '#14121c',
  pixelArt: true,
  roundPixels: true,
  input: { gamepad: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, PreloadScene, MainMenuScene, HowToPlayScene, SettingsScene, SaveSlotsScene, LevelSelectScene, CampScene, HeroSelectScene, LoadoutScene, GameScene, HudScene, PauseScene, ItemCardScene, NoticeScene, SkillSwapScene, LevelCompleteScene, GameOverScene],
});

applySavedMute(game);
installMuteHotkey(game);
installDeviceTracker(game);
exposeForDebug(game);
