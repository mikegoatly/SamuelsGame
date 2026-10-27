import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import { ratingPips, type HeroDef } from '../content/heroes';
import { headOffset } from '../logic/accessoryWear';
import { gameText } from './gameText';
import type { MenuItem } from './MenuList';

const IDLE_FILL = 0x211d33;
const FOCUS_FILL = 0x3a3166;
const SELECTED_FILL = 0x4a4020;
const LOCKED_STROKE = 0x4a4660;
const SILHOUETTE = 0x15121f;
const PIP = 7;
const PIP_GAP = 2;
const STATS: readonly { label: string; read: (hero: HeroDef) => number }[] = [
  { label: 'HP', read: (hero) => hero.stats.maxHp },
  { label: 'SPD', read: (hero) => hero.stats.moveSpeed },
  { label: 'ATK', read: (hero) => hero.stats.attackRate },
];

/** One hero in the select grid: sprite (a dark silhouette while locked), name, stat pips. Selecting is up to the scene. */
export class HeroCard implements MenuItem {
  readonly area: Phaser.GameObjects.Rectangle;
  private focused = false;
  private selected = false;
  private readonly accent: number;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    readonly hero: HeroDef,
    readonly unlocked: boolean,
    private readonly onSelect: (hero: HeroDef) => void,
    private readonly onFocus: (hero: HeroDef) => void,
    crownFrame?: number,
  ) {
    this.accent = unlocked ? Phaser.Display.Color.HexStringToColor(hero.color).color : LOCKED_STROKE;
    this.area = scene.add.rectangle(x, y, width, height, IDLE_FILL).setStrokeStyle(2, this.accent);
    const top = y - height / 2;
    const left = x - width / 2;
    gameText(scene, x, top + 11, unlocked ? hero.className : '???', 16, { color: unlocked ? '#ffffff' : '#7878a0' }).setOrigin(0.5);
    const sprite = scene.add.image(left + 30, top + height - 30, Tex.tiles, hero.frame).setScale(3);
    if (!unlocked) sprite.setTint(SILHOUETTE);
    else if (hero.tint !== null) sprite.setTint(hero.tint);
    if (unlocked && crownFrame !== undefined) {
      const offset = headOffset(hero.id, false);
      scene.add.image(sprite.x + offset.x * 3, sprite.y + offset.y * 3, Tex.accessories, crownFrame).setScale(3);
    }
    if (unlocked) this.drawStats(left + 62, top + 29);
    else gameText(scene, left + 62, top + height - 30, 'Locked', 16, { color: '#7878a0' }).setOrigin(0, 0.5);
  }

  private drawStats(x: number, y: number): void {
    STATS.forEach(({ label, read }, row) => {
      const rowY = y + row * 15;
      gameText(this.scene, x, rowY, label, 16, { color: '#b0b0c8' }).setOrigin(0, 0.5);
      const pips = ratingPips(read(this.hero));
      for (let i = 0; i < 3; i++) {
        const color = i < pips ? this.accent : 0x3a3652;
        this.scene.add.rectangle(x + 30 + i * (PIP + PIP_GAP), rowY, PIP, PIP + 3, color).setOrigin(0, 0.5);
      }
    });
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.paint();
  }

  setFocused(focused: boolean): void {
    this.focused = focused;
    this.paint();
    if (focused) this.onFocus(this.hero);
  }

  activate(): void {
    if (this.unlocked) {
      this.onSelect(this.hero);
      return;
    }
    this.scene.tweens.add({ targets: this.area, x: this.area.x + 4, duration: 50, yoyo: true, repeat: 2 });
  }

  private paint(): void {
    const fill = this.focused ? FOCUS_FILL : this.selected ? SELECTED_FILL : IDLE_FILL;
    const stroke = this.focused ? 0xffffff : this.selected ? 0xffe066 : this.accent;
    this.area.setFillStyle(fill).setStrokeStyle(this.focused || this.selected ? 3 : 2, stroke);
  }
}
