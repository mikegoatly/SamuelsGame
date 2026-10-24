import Phaser from 'phaser';
import { ControlFrame, FONT, Tex } from '../content/assetKeys';
import type { Player } from '../entities/Player';
import type { PlayerProgress } from '../logic/progression';
import type { GameEvents } from '../systems/GameEvents';
import type { ProgressionSystem } from '../systems/ProgressionSystem';
import type { SpawnSystem } from '../systems/SpawnSystem';
import { TouchControlsView } from '../ui/TouchControlsView';

export interface HudData {
  events: GameEvents;
  progression: ProgressionSystem;
  player: Player;
  spawner: SpawnSystem;
}

const BAR_X = 10;
const BAR_WIDTH = 140;
const FULLSCREEN_SIZE = 28;
const FULLSCREEN_MARGIN = 8;

export class HudScene extends Phaser.Scene {
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private hp = { value: 1, max: 1 };
  private fullscreenButton!: Phaser.GameObjects.Image;
  private touchView!: TouchControlsView;
  private xpRatio = 0;

  constructor() {
    super('Hud');
  }

  create(data: HudData): void {
    const { events, progression, player, spawner } = data;
    this.bars = this.add.graphics();
    this.levelText = this.makeText(BAR_X, 4, '#ffffff', 16);
    this.hpText = this.makeText(BAR_X + 4, 27, '#ffffff', 8);
    this.waveText = this.makeText(0, 4, '#d8d8e8', 16).setOrigin(1, 0);
    this.createFullscreenButton();
    this.touchView = new TouchControlsView(this);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.layout, this));

    this.waveText.setText(`Wave ${spawner.wave}`);
    this.hp = { value: player.hp, max: player.maxHp };
    this.showProgress(progression.progress, progression.xpForNextLevel);

    events.on('hp-changed', (value, max) => {
      this.hp = { value, max };
      this.drawBars();
    });
    events.on('xp-changed', (progress) => this.showProgress(progress, progression.xpForNextLevel));
    events.on('wave-started', (wave) => this.waveText.setText(`Wave ${wave}`));
  }

  update(): void {
    this.touchView.update();
  }

  private layout(): void {
    const half = FULLSCREEN_SIZE / 2;
    this.fullscreenButton.setPosition(this.scale.width - FULLSCREEN_MARGIN - half, FULLSCREEN_MARGIN + half);
    this.waveText.setX(this.fullscreenButton.x - half - 6);
  }

  private createFullscreenButton(): void {
    this.fullscreenButton = this.add
      .image(0, 0, Tex.controls, ControlFrame.fullscreen)
      .setDisplaySize(FULLSCREEN_SIZE, FULLSCREEN_SIZE)
      .setAlpha(0.6)
      .setVisible(this.scale.fullscreen.available)
      .setInteractive({ useHandCursor: true });
    this.fullscreenButton.on('pointerdown', () => {
      try {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      } catch {
        /* unsupported */
      }
    });
  }

  private showProgress(progress: PlayerProgress, needed: number): void {
    this.levelText.setText(`Lv ${progress.level}`);
    this.xpRatio = progress.xp / needed;
    this.drawBars();
  }

  private drawBars(): void {
    this.hpText.setText(`${this.hp.value}/${this.hp.max}`);
    this.bars.clear();
    this.drawBar(24, this.hp.value / this.hp.max, 0xd94c4c, 12);
    this.drawBar(40, this.xpRatio, 0x7a5cff, 5);
  }

  private drawBar(y: number, ratio: number, color: number, height: number): void {
    this.bars.fillStyle(0x14121c, 0.85).fillRect(BAR_X - 1, y - 1, BAR_WIDTH + 2, height + 2);
    const width = Math.round(BAR_WIDTH * Phaser.Math.Clamp(ratio, 0, 1));
    this.bars.fillStyle(color, 1).fillRect(BAR_X, y, width, height);
  }

  private makeText(x: number, y: number, color: string, size: number): Phaser.GameObjects.Text {
    return this.add.text(x, y, '', {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      stroke: '#14121c',
      strokeThickness: 3,
    });
  }
}
