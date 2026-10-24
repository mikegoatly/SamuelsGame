import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from './content/config';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PauseScene } from './scenes/PauseScene';
import { HudScene } from './scenes/HudScene';
import { PreloadScene } from './scenes/PreloadScene';


new Phaser.Game({
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
  scene: [BootScene, PreloadScene, MainMenuScene, LevelSelectScene, GameScene, HudScene, PauseScene, GameOverScene],
});
