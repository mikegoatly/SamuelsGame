import Phaser from 'phaser';
import { ControlFrame, FONT, Frame, Tex } from '../content/assetKeys';
import { items } from '../content/items';
import { getWeapon, knownWeapons } from '../content/weapons';
import type { Player } from '../entities/Player';
import type { PlayerProgress } from '../logic/progression';
import type { CharmId, Charms } from '../logic/stats';
import type { FireballSystem } from '../systems/FireballSystem';
import type { GameEvents } from '../systems/GameEvents';
import type { LootSystem } from '../systems/LootSystem';
import type { ProgressionSystem } from '../systems/ProgressionSystem';
import type { LevelDirector } from '../systems/LevelDirector';
import { MUTE_EVENT } from '../systems/audioSettings';
import { saveSystem } from '../systems/SaveSystem';
import { TouchControlsView } from '../ui/TouchControlsView';

export interface HudData {
  events: GameEvents;
  progression: ProgressionSystem;
  player: Player;
  director: LevelDirector;
  loot: LootSystem;
  fireball: FireballSystem;
  roomTotal?: number;
}

const BAR_X = 10;
const BAR_WIDTH = 140;
const FULLSCREEN_SIZE = 28;
const FULLSCREEN_MARGIN = 8;
const PAUSE_Y = 58;
const CHARM_ITEMS: Record<CharmId, string> = { power: 'charmOfPower', swiftness: 'charmOfSwiftness', vitality: 'charmOfVitality' };

export class HudScene extends Phaser.Scene {
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private muteText!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.Text;
  private boss: { hp: number; max: number } | null = null;
  private hp = { value: 1, max: 1 };
  private fullscreenButton!: Phaser.GameObjects.Image;
  private pauseButton!: Phaser.GameObjects.Container;
  private coinText!: Phaser.GameObjects.Text;
  private charmIcons!: Phaser.GameObjects.Container;
  private touchView!: TouchControlsView;
  private fireball!: FireballSystem;
  private fireIcon!: Phaser.GameObjects.Image;
  private fireBar!: Phaser.GameObjects.Graphics;
  private fireText!: Phaser.GameObjects.Text;
  private xpRatio = 0;
  private weaponIcon!: Phaser.GameObjects.Image;
  private weaponText!: Phaser.GameObjects.Text;

  constructor() {
    super('Hud');
  }

  create(data: HudData): void {
    const { events, progression, player, director, loot, fireball, roomTotal } = data;
    this.fireball = fireball;
    this.bars = this.add.graphics();
    this.levelText = this.makeText(BAR_X, 4, '#ffffff', 16);
    this.hpText = this.makeText(BAR_X + 4, 27, '#ffffff', 8);
    this.waveText = this.makeText(0, 4, '#d8d8e8', 16).setOrigin(1, 0);
    this.bossBar = this.add.graphics();
    this.bossName = this.makeText(0, 4, '#ffd0a0', 12).setOrigin(0.5, 0).setVisible(false);
    this.muteText = this.makeText(BAR_X, 0, '#b0b0c8', 10).setOrigin(0, 1).setText('Sound off (M)').setVisible(saveSystem.data.settings.muted);
    this.createFullscreenButton();
    this.createPauseButton(events);
    this.add.image(BAR_X + 5, 55, Tex.tiles, Frame.coin).setTint(0xffd84a);
    this.coinText = this.makeText(BAR_X + 16, 49, '#ffe066', 10);
    this.charmIcons = this.add.container(BAR_X, 70);
    this.showCoins(loot.totalCoins);
    this.showCharms(saveSystem.data.charms);
    this.touchView = new TouchControlsView(this);
    this.createFireballIndicator();
    this.createWeaponIndicator(player.weapon.id);
    this.layout();
    const onMute = (muted: boolean): void => void this.muteText.setVisible(muted);
    this.scale.on('resize', this.layout, this);
    this.game.events.on(MUTE_EVENT, onMute);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      this.game.events.off(MUTE_EVENT, onMute);
    });

    this.waveText.setText(roomTotal ? `Room 1/${roomTotal}` : `Wave ${director.progressLabel().replace('wave ', '')}`);
    this.hp = { value: player.hp, max: player.maxHp };
    this.showProgress(progression.progress, progression.xpForNextLevel);

    events.on('weapon-changed', (id) => this.showWeapon(id));
    events.on('hp-changed', (value, max) => {
      this.hp = { value, max };
      this.drawBars();
    });
    events.on('xp-changed', (progress) => this.showProgress(progress, progression.xpForNextLevel));
    events.on('coins-changed', (total) => this.showCoins(total));
    events.on('charms-changed', (charms) => this.showCharms(charms));
    events.on('wave-started', (wave) => this.waveText.setText(`Wave ${wave}`));
    events.on('room-started', (order, total) => this.waveText.setText(`Room ${order}/${total}`));
    events.on('boss-started', () => this.waveText.setText('Boss'));
    events.on('boss-spawned', (name, hp, max) => this.showBoss(name, hp, max));
    events.on('boss-hp', (hp, max) => {
      this.boss = { hp, max };
      this.drawBossBar();
    });
    events.on('boss-died', () => {
      this.boss = null;
      this.bossName.setVisible(false);
      this.drawBossBar();
    });
  }

  update(): void {
    this.touchView.update();
    this.drawFireball();
  }

  private createFireballIndicator(): void {
    this.fireIcon = this.add.image(BAR_X + 6, 0, Tex.fireball).setVisible(false);
    this.fireBar = this.add.graphics();
    this.fireText = this.makeText(BAR_X + 16, 0, '#ffb060', 8).setOrigin(0, 0.5).setText('Fireball').setVisible(false);
  }

  /** Bottom-left slot showing the equipped weapon; Q / wheel / Y / swap button cycle it. */
  private createWeaponIndicator(weaponId: string): void {
    this.weaponIcon = this.add.image(BAR_X + 8, 0, Tex.tiles, Frame.wand).setScale(1.5);
    this.weaponText = this.makeText(BAR_X + 22, 0, '#e8e8f8', 8).setOrigin(0, 0.5);
    this.showWeapon(weaponId);
  }

  private showWeapon(id: string): void {
    const weapon = getWeapon(id);
    this.weaponIcon.setFrame(weapon.frame);
    if (weapon.tint === null) this.weaponIcon.clearTint();
    else this.weaponIcon.setTint(weapon.tint);
    const many = knownWeapons(saveSystem.data.weapons.owned).length > 1;
    this.weaponText.setText(many ? `${weapon.name} (Q)` : weapon.name);
  }

  /** Bottom-left cooldown bar, shown once the power is unlocked and a wand-type weapon is equipped. */
  private drawFireball(): void {
    const status = this.fireball.current;
    const y = this.scale.height - 30;
    this.weaponIcon.setPosition(BAR_X + 8, y - 24);
    this.weaponText.setPosition(BAR_X + 22, y - 24);
    this.fireIcon.setVisible(status.unlocked).setPosition(BAR_X + 6, y).setAlpha(status.available ? (status.ready ? 1 : 0.5) : 0.25);
    this.fireText
      .setVisible(status.unlocked)
      .setPosition(BAR_X + 16, y - 7)
      .setText(status.available ? 'Fireball' : 'Fireball (wand)')
      .setColor(status.available ? (status.ready ? '#ffb060' : '#9a9ab8') : '#6a6a80');
    this.fireBar.clear();
    if (!status.available) return;
    this.fireBar.fillStyle(0x14121c, 0.85).fillRect(BAR_X + 15, y - 1, 52, 6);
    this.fireBar.fillStyle(status.ready ? 0xff9030 : 0x8a5a30, 1).fillRect(BAR_X + 16, y, Math.round(50 * status.fraction), 4);
  }

  private layout(): void {
    const half = FULLSCREEN_SIZE / 2;
    this.fullscreenButton.setPosition(this.scale.width - FULLSCREEN_MARGIN - half, FULLSCREEN_MARGIN + half);
    this.waveText.setX(this.fullscreenButton.x - half - 6);
    this.pauseButton.setPosition(this.fullscreenButton.x, PAUSE_Y);
    this.muteText.setY(this.scale.height - 6);
    this.drawBossBar();
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

  private showCharms(charms: Charms): void {
    this.charmIcons.removeAll(true);
    let x = 0;
    for (const id of Object.keys(CHARM_ITEMS) as CharmId[]) {
      if (charms[id] <= 0) continue;
      const item = items[CHARM_ITEMS[id]]!;
      const icon = this.add.image(x + 5, 0, Tex.tiles, item.frame).setTint(item.tint ?? 0xffffff);
      const count = this.makeText(x + 13, -5, '#ffffff', 8).setText(`x${charms[id]}`);
      this.charmIcons.add([icon, count]);
      x += 34;
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
