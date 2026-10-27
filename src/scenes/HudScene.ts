import Phaser from 'phaser';
import { ControlFrame, Frame, Tex } from '../content/assetKeys';
import { items } from '../content/items';
import { formatTime } from '../logic/format';
import { GEM_COLOURS, gemItemId, type Gems } from '../logic/gems';
import { getWeapon } from '../content/weapons';
import type { Player } from '../entities/Player';
import type { PlayerProgress } from '../logic/progression';
import type { SkillSystem } from '../systems/SkillSystem';
import type { GameEvents } from '../systems/GameEvents';
import type { LootSystem } from '../systems/LootSystem';
import type { ProgressionSystem } from '../systems/ProgressionSystem';
import type { LevelDirector } from '../systems/LevelDirector';
import { MUTE_EVENT } from '../systems/audioSettings';
import { saveSystem } from '../systems/SaveSystem';
import { BossIntro } from '../ui/BossIntro';
import { gameText } from '../ui/gameText';
import { DamageVignette } from '../ui/DamageVignette';
import { PotionSlot } from '../ui/PotionSlot';
import { SkillBar } from '../ui/SkillBar';
import { TouchControlsView } from '../ui/TouchControlsView';

export interface HudData {
  events: GameEvents;
  progression: ProgressionSystem;
  player: Player;
  director: LevelDirector;
  loot: LootSystem;
  skills: SkillSystem;
  roomTotal?: number;
  heroic?: boolean;
  /** Set for Heroic Survival: the saved best time (0 when none yet); swaps Room/Wave for a timer. */
  survivalBestMs?: number;
  bossName?: string;
}

const BAR_X = 10;
const BAR_WIDTH = 140;
const FULLSCREEN_SIZE = 28;
const FULLSCREEN_MARGIN = 8;
const PAUSE_Y = 58;
const WAVE_BAR = { width: 90, height: 6, y: 25 };
const SURVIVAL_BAR_Y = 56;
const TIMER_SIZE = 32;

export class HudScene extends Phaser.Scene {
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private heroicText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private bestText?: Phaser.GameObjects.Text;
  private bestMs = 0;
  private beatBest = false;
  private barY = WAVE_BAR.y;
  private muteText!: Phaser.GameObjects.Text;
  private waveBar!: Phaser.GameObjects.Graphics;
  private director!: LevelDirector;
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.Text;
  private boss: { hp: number; max: number } | null = null;
  private hp = { value: 1, max: 1 };
  private fullscreenButton!: Phaser.GameObjects.Image;
  private pauseButton!: Phaser.GameObjects.Container;
  private coinText!: Phaser.GameObjects.Text;
  private gemIcons!: Phaser.GameObjects.Container;
  private touchView!: TouchControlsView;
  private skillBar!: SkillBar;
  private potionSlot!: PotionSlot;
  private xpRatio = 0;
  private weaponIcon!: Phaser.GameObjects.Image;
  private weaponText!: Phaser.GameObjects.Text;
  private vignette!: DamageVignette;
  private intro!: BossIntro;

  constructor() {
    super('Hud');
  }

  create(data: HudData): void {
    // Phaser reuses this scene instance, so per-run state from a previous run (survival timer, bar position) must not carry over.
    this.timerText = this.bestText = this.heroicText = undefined;
    this.bestMs = 0;
    this.beatBest = false;
    this.barY = WAVE_BAR.y;
    this.boss = null;
    const { events, progression, player, director, loot, skills, roomTotal, heroic, bossName } = data;
    this.skillBar = new SkillBar(this, skills);
    this.potionSlot = new PotionSlot(this);
    this.vignette = new DamageVignette(this);
    const intro = (this.intro = new BossIntro(this));
    this.bars = this.add.graphics();
    this.levelText = this.makeText(BAR_X, 4, '#ffffff', 16);
    this.hpText = this.makeText(BAR_X + 5, 27, '#ffffff', 16).setOrigin(0, 0.5);
    this.waveText = this.makeText(0, 4, '#d8d8e8', 16).setOrigin(1, 0);
    this.waveBar = this.add.graphics();
    this.director = director;
    if (data.survivalBestMs !== undefined) this.createSurvivalTimer(data.survivalBestMs);
    if (heroic) this.heroicText = this.makeText(0, 34, '#ffd84a', 16).setOrigin(1, 0).setText('Heroic');
    this.bossBar = this.add.graphics();
    this.bossName = this.makeText(0, 4, '#ffd0a0', 12).setOrigin(0.5, 0).setVisible(false);
    this.muteText = this.makeText(BAR_X, 0, '#b0b0c8', 10).setOrigin(0, 1).setText('Sound off (M)').setVisible(saveSystem.data.settings.muted);
    this.createFullscreenButton();
    this.createPauseButton(events);
    this.add.image(BAR_X + 5, 58, Tex.tiles, Frame.coin).setTint(0xffd84a);
    this.coinText = this.makeText(BAR_X + 16, 58, '#ffe066', 16).setOrigin(0, 0.5);
    this.gemIcons = this.add.container(BAR_X, 78);
    this.showCoins(loot.totalCoins);
    this.showGems(saveSystem.data.gems);
    this.touchView = new TouchControlsView(this);
    this.createWeaponIndicator(player.weapon.id);
    this.layout();
    const onMute = (muted: boolean): void => void this.muteText.setVisible(muted);
    this.scale.on('resize', this.layout, this);
    this.game.events.on(MUTE_EVENT, onMute);
    const onPause = (): void => this.vignette.setPaused(true);
    const onResume = (): void => this.vignette.setPaused(false);
    this.events.on(Phaser.Scenes.Events.PAUSE, onPause);
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, onPause);
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      intro.cancel();
      this.scale.off('resize', this.layout, this);
      this.game.events.off(MUTE_EVENT, onMute);
    });

    this.waveText.setText(roomTotal ? `Room 1/${roomTotal}` : `Wave ${director.progressLabel().replace('wave ', '')}`);
    this.hp = { value: player.hp, max: player.maxHp };
    this.showProgress(progression.progress, progression.xpForNextLevel);

    events.on('hp-changed', (value, max) => {
      this.hp = { value, max };
      this.drawBars();
    });
    events.on('xp-changed', (progress) => this.showProgress(progress, progression.xpForNextLevel));
    events.on('coins-changed', (total) => this.showCoins(total));
    events.on('gems-changed', (gems) => this.showGems(gems));
    events.on('wave-started', (wave) => !roomTotal && this.waveText.setText(`Wave ${wave}`));
    events.on('room-started', (order, total) => this.waveText.setText(`Room ${order}/${total}`));
    events.on('boss-started', () => {
      this.waveText.setText('Boss');
      if (bossName) intro.play(bossName);
    });
    events.on('player-hurt', () => this.vignette.hurt());
    events.on('boss-spawned', (name, hp, max) => this.showBoss(name, hp, max));
    events.on('boss-hp', (hp, max) => {
      this.boss = { hp, max };
      this.drawBossBar();
    });
    events.on('player-died', () => intro.cancel());
    events.on('boss-died', () => {
      intro.cancel();
      this.boss = null;
      this.bossName.setVisible(false);
      this.drawBossBar();
    });
  }

  update(_time: number, delta: number): void {
    this.vignette.update(delta, this.hp.value / this.hp.max, saveSystem.data.settings.reduceShake);
    this.touchView.update();
    this.drawWaveBar();
    this.showSurvivalTime();
    this.skillBar.update();
    this.potionSlot.update();
  }

  /** Bottom-left readout of the basic weapon picked on the loadout screen. */
  private createWeaponIndicator(weaponId: string): void {
    const weapon = getWeapon(weaponId);
    this.weaponIcon = this.add.image(BAR_X + 8, 0, Tex.tiles, weapon.frame).setScale(1.5);
    if (weapon.tint !== null) this.weaponIcon.setTint(weapon.tint);
    this.weaponText = this.makeText(BAR_X + 22, 0, '#e8e8f8', 16).setOrigin(0, 0.5).setText(weapon.name);
  }

  private layout(): void {
    const half = FULLSCREEN_SIZE / 2;
    this.fullscreenButton.setPosition(this.scale.width - FULLSCREEN_MARGIN - half, FULLSCREEN_MARGIN + half);
    this.waveText.setX(this.fullscreenButton.x - half - 6);
    this.heroicText?.setX(this.waveText.x);
    this.timerText?.setX(this.waveText.x);
    this.bestText?.setX(this.waveText.x);
    this.pauseButton.setPosition(this.fullscreenButton.x, PAUSE_Y);
    this.muteText.setY(this.scale.height - 6);
    this.weaponIcon.setPosition(BAR_X + 8, this.scale.height - 30);
    this.weaponText.setPosition(BAR_X + 22, this.scale.height - 30);
    this.vignette.resize(this.scale.width, this.scale.height);
    this.intro?.layout();
    this.drawBossBar();
  }

  /** Heroic Survival: a big m:ss timer and the best time replace Room/Wave. */
  private createSurvivalTimer(bestMs: number): void {
    this.bestMs = bestMs;
    this.waveText.setVisible(false);
    this.barY = SURVIVAL_BAR_Y;
    this.timerText = this.makeText(0, 2, '#ffe066', TIMER_SIZE).setOrigin(1, 0).setText('0:00');
    this.bestText = this.makeText(0, 36, '#b0b0c8', 16).setOrigin(1, 0).setText(bestMs > 0 ? `Best ${formatTime(bestMs)}` : 'First try!');
  }

  private showSurvivalTime(): void {
    const elapsed = this.director.elapsedMs;
    if (!this.timerText || elapsed === undefined) return;
    const text = formatTime(elapsed);
    if (text !== this.timerText.text) this.timerText.setText(text);
    const record = this.bestMs > 0 && elapsed > this.bestMs;
    if (record !== this.beatBest) {
      this.beatBest = record;
      this.timerText.setColor(record ? '#7dffb0' : '#ffe066');
    }
  }

  /** Countdown to the next wave, right-aligned under the room/wave text; hidden when none is pending. */
  private drawWaveBar(): void {
    const progress = this.director.nextWaveProgress;
    this.waveBar.clear();
    if (progress === undefined) return;
    const { width, height } = WAVE_BAR;
    const y = this.barY;
    const x = this.waveText.x - width;
    this.waveBar.fillStyle(0x14121c, 0.85).fillRect(x - 1, y - 1, width + 2, height + 2);
    this.waveBar.fillStyle(0xffb04a, 1).fillRect(x, y, Math.round(width * Phaser.Math.Clamp(progress, 0, 1)), height);
  }

  private showBoss(name: string, hp: number, max: number): void {
    this.boss = { hp, max };
    this.bossName.setText(name).setVisible(true);
    this.drawBossBar();
  }

  private drawBossBar(): void {
    this.bossBar.clear();
    if (!this.boss) return;
    const width = Math.min(260, this.scale.width * 0.42);
    const x = this.scale.width / 2 - width / 2;
    const y = 22;
    this.bossName.setPosition(this.scale.width / 2, 4);
    this.bossBar.fillStyle(0x14121c, 0.9).fillRect(x - 2, y - 2, width + 4, 12 + 4);
    this.bossBar.fillStyle(0x5a2a2a, 1).fillRect(x, y, width, 12);
    this.bossBar.fillStyle(0xe0503c, 1).fillRect(x, y, Math.round(width * Phaser.Math.Clamp(this.boss.hp / this.boss.max, 0, 1)), 12);
    this.bossBar.fillStyle(0xffffff, 0.25).fillRect(x + width / 2 - 1, y, 2, 12);
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

  private createPauseButton(events: GameEvents): void {
    const bg = this.add.circle(0, 0, FULLSCREEN_SIZE / 2, 0x14121c, 0.6).setStrokeStyle(2, 0xd8d8e8, 0.8);
    const bars = this.add.graphics().fillStyle(0xd8d8e8, 1).fillRect(-5, -6, 3, 12).fillRect(2, -6, 3, 12);
    this.pauseButton = this.add.container(0, PAUSE_Y, [bg, bars]).setAlpha(0.7);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => events.emit('pause-requested'));
  }

  private showCoins(total: number): void {
    this.coinText.setText(String(total));
  }

  private showGems(gems: Gems): void {
    this.gemIcons.removeAll(true);
    let x = 0;
    for (const id of GEM_COLOURS) {
      if (gems[id] <= 0) continue;
      const item = items[gemItemId(id)]!;
      const icon = this.add.image(x + 5, 0, Tex.tiles, item.frame).setTint(item.tint ?? 0xffffff);
      const count = this.makeText(x + 13, 0, '#ffffff', 16).setOrigin(0, 0.5).setText(`x${gems[id]}`);
      this.gemIcons.add([icon, count]);
      x += 40;
    }
  }

  private showProgress(progress: PlayerProgress, needed: number): void {
    this.levelText.setText(`Lv ${progress.level}`);
    this.xpRatio = progress.xp / needed;
    this.drawBars();
  }

  private drawBars(): void {
    this.hpText.setText(`${this.hp.value}/${this.hp.max}`);
    this.bars.clear();
    this.drawBar(19, this.hp.value / this.hp.max, 0xd94c4c, 16);
    this.drawBar(39, this.xpRatio, 0x7a5cff, 5);
  }

  private drawBar(y: number, ratio: number, color: number, height: number): void {
    this.bars.fillStyle(0x14121c, 0.85).fillRect(BAR_X - 1, y - 1, BAR_WIDTH + 2, height + 2);
    const width = Math.round(BAR_WIDTH * Phaser.Math.Clamp(ratio, 0, 1));
    this.bars.fillStyle(color, 1).fillRect(BAR_X, y, width, height);
  }

  private makeText(x: number, y: number, color: string, size: number): Phaser.GameObjects.Text {
    return gameText(this, x, y, '', size, { color });
  }
}
