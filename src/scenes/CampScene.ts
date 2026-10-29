import Phaser from 'phaser';
import { Music } from '../content/assetKeys';
import { shopOffers, upgradeOffers, type Offer } from '../content/campOffers';
import { gameText } from '../ui/gameText';
import { CampRow } from '../ui/CampRow';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';
import { TabBar } from '../ui/TabBar';
import { drawCounts, walletEntries } from '../ui/Wallet';
import { dragOffset, isDrag } from '../logic/listScroll';
import { celebrate } from '../systems/fx';
import { musicOf } from '../systems/MusicPlayer';
import { saveSystem } from '../systems/SaveSystem';
import { playSfx } from '../systems/sfx';

/** Menu index of the tab bar (after Back). */
const TAB_ITEM = 1;

export type CampTab = 'upgrades' | 'shop';

export interface CampData {
  tab?: CampTab;
}

const BUY_COOLDOWN_MS = 250;
const PAD_LB = 4;
const PAD_RB = 5;
const TAB_KEYS: Record<string, 1 | -1> = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };
const TABS: readonly CampTab[] = ['upgrades', 'shop'];
const LIST_TOP = 92;
const ROW_HEIGHT = 26;
const ROW_PITCH = 28;
const PANEL_HEIGHT = 74;
const BOTTOM_MARGIN = 6;
const MAX_WIDTH = 520;
const BUY_WIDTH = 88;
const BUY_HEIGHT = 30;
const BUY_LABEL: Record<CampTab, string> = { upgrades: 'Upgrade', shop: 'Buy' };
const EMPTY_HINT: Record<CampTab, string> = {
  upgrades: 'Nothing to upgrade yet.',
  shop: 'The shop is empty.',
};

/** Between levels: spend gold and gems on upgrades (weapons, skills) or buy skills, potions and a revive token. */
export class CampScene extends MenuScene {
  private tab: CampTab = 'upgrades';
  private offset = 0;
  /** Offer shown in the panel; the Upgrade/Buy button buys this one. */
  private selected = 0;
  private buyButton?: MenuButton;
  private offers: Offer[] = [];
  private rows: CampRow[] = [];
  private visibleRows = 4;
  private panel?: Phaser.GameObjects.Container;
  private arrows?: Phaser.GameObjects.Graphics;
  private wrap = 400;
  private lastBuyAt = -Infinity;
  private padBumpers = [false, false];
  private celebration?: { index: number; offer: Offer };
  private listBounds = new Phaser.Geom.Rectangle();
  private drag?: { pointerId: number; x: number; y: number; offset: number; scrolling: boolean };

  constructor() {
    super('Camp');
  }

  init(data: CampData): void {
    this.tab = data.tab ?? 'upgrades';
    this.offset = 0;
    this.selected = 0;
    this.celebration = undefined;
  }

  override create(): void {
    musicOf(this.game).crossfadeTo(Music.menu);
    super.create();
    const onWheel = (_pointer: unknown, _over: unknown, _dx: number, dy: number): void => this.nudgeFocus(Math.sign(dy));
    const onKey = (event: KeyboardEvent): void => {
      const step = TAB_KEYS[event.code];
      if (step && this.menu && this.menu.focusIndex !== TAB_ITEM) this.stepTab(step);
    };
    const onDown = (pointer: Phaser.Input.Pointer): void => this.startDrag(pointer);
    const onMove = (pointer: Phaser.Input.Pointer): void => this.moveDrag(pointer);
    const onUp = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.id === this.drag?.pointerId) this.drag = undefined;
    };
    this.input.on('wheel', onWheel);
    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    this.input.on('pointerupoutside', onUp);
    this.input.keyboard?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('wheel', onWheel);
      this.input.off('pointerdown', onDown);
      this.input.off('pointermove', onMove);
      this.input.off('pointerup', onUp);
      this.input.off('pointerupoutside', onUp);
      this.input.keyboard?.off('keydown', onKey);
    });
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const save = saveSystem.data;
    const listWidth = Math.min(MAX_WIDTH, width - 24);
    this.wrap = listWidth - 20 - BUY_WIDTH - 8;
    menuText(this, cx, 16, 'Camp', 24, '#b48cff');
    drawCounts(this, cx, 42, walletEntries(save.coins, save.gems));
    const back = new MenuButton(this, 56, 18, 88, 24, 'Back', () => this.goBack());
    const tabs = new TabBar(this, cx, 66, Math.min(320, listWidth), 24, ['Upgrades', 'Shop'], TABS.indexOf(this.tab) as 0 | 1, (index) => this.switchTab(TABS[index]!));

    this.offers = this.tab === 'upgrades' ? upgradeOffers(save) : shopOffers(save);
    const panelY = height - BOTTOM_MARGIN - PANEL_HEIGHT / 2;
    this.visibleRows = Math.max(2, Math.floor((panelY - PANEL_HEIGHT / 2 - 8 - LIST_TOP + (ROW_PITCH - ROW_HEIGHT) / 2) / ROW_PITCH));
    this.rows = this.offers.map((offer, i) => new CampRow(this, cx, listWidth, ROW_HEIGHT, offer.view, () => this.attempt(i), () => this.focusRow(i)));
    if (this.offers.length === 0) menuText(this, cx, LIST_TOP + 20, EMPTY_HINT[this.tab], 16, '#9a9ab8');
    this.add.rectangle(cx, panelY, listWidth, PANEL_HEIGHT, 0x201c33).setStrokeStyle(2, 0x4a4468);
    this.panel = this.add.container(cx - listWidth / 2 + 10, panelY - PANEL_HEIGHT / 2 + 6);
    this.buyButton = this.offers.length > 0
      ? new MenuButton(this, cx + listWidth / 2 - 10 - BUY_WIDTH / 2, panelY, BUY_WIDTH, BUY_HEIGHT, BUY_LABEL[this.tab], () => this.attempt(this.selected))
      : undefined;
    this.arrows = this.add.graphics();
    this.rowsX = cx + listWidth / 2 - 8;
    this.listBounds.setTo(cx - listWidth / 2, LIST_TOP - 14, listWidth, this.visibleRows * ROW_PITCH + 24);
    this.drag = undefined;

    const items = this.buyButton ? [back, tabs, ...this.rows, this.buyButton] : [back, tabs];
    this.menu = new MenuList(this, items, { initialFocus: TAB_ITEM, onBack: () => this.goBack(), focusOnHover: false });
    this.layoutRows();
    this.select(Math.min(this.selected, this.offers.length - 1));
    this.finishCelebration();
  }

  private rowsX = 0;

  /** Keeps the focused row inside the visible window and shows it in the panel. */
  private focusRow(index: number): void {
    if (index < this.offset) this.offset = index;
    else if (index >= this.offset + this.visibleRows) this.offset = index - this.visibleRows + 1;
    this.layoutRows();
    this.select(index);
  }

  private select(index: number): void {
    this.selected = Math.max(0, index);
    this.rows.forEach((row, i) => row.setSelected(i === this.selected));
    const offer = this.offers[this.selected];
    this.showPanel(offer);
    this.buyButton?.setEnabled(offer?.buy(saveSystem.data).ok ?? false);
  }

  private layoutRows(): void {
    this.rows.forEach((row, i) => row.place(i >= this.offset && i < this.offset + this.visibleRows ? LIST_TOP + (i - this.offset) * ROW_PITCH + ROW_HEIGHT / 2 : null));
    const arrows = this.arrows?.clear();
    if (!arrows) return;
    const x = this.rowsX;
    arrows.fillStyle(0xb48cff, 1);
    if (this.offset > 0) arrows.fillTriangle(x, LIST_TOP - 10, x - 5, LIST_TOP - 3, x + 5, LIST_TOP - 3);
    if (this.offset + this.visibleRows < this.rows.length) {
      const y = LIST_TOP + this.visibleRows * ROW_PITCH + 2;
      arrows.fillTriangle(x, y + 7, x - 5, y, x + 5, y);
    }
  }

  private nudgeFocus(step: number): void {
    const menu = this.menu;
    if (!menu || step === 0 || menu.focusIndex < 2 || menu.focusIndex > this.rows.length + 1) return;
    const next = Phaser.Math.Clamp(menu.focusIndex + step, 2, this.rows.length + 1);
    menu.setFocus(next);
  }

  /** Touch (or mouse) drag on the list scrolls it without changing the selection. */
  private startDrag(pointer: Phaser.Input.Pointer): void {
    if (this.drag || this.rows.length <= this.visibleRows || !this.listBounds.contains(pointer.x, pointer.y)) return;
    this.drag = { pointerId: pointer.id, x: pointer.x, y: pointer.y, offset: this.offset, scrolling: false };
  }

  private moveDrag(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag || pointer.id !== drag.pointerId || !pointer.isDown) return;
    const dy = pointer.y - drag.y;
    if (!drag.scrolling && !isDrag(pointer.x - drag.x, dy)) return;
    if (!drag.scrolling) this.menu?.cancelPress();
    drag.scrolling = true;
    const next = dragOffset(drag.offset, dy, ROW_PITCH, this.rows.length - this.visibleRows);
    if (next === this.offset) return;
    this.offset = next;
    this.layoutRows();
  }

  private showPanel(offer: Offer | undefined): void {
    const panel = this.panel;
    if (!panel) return;
    panel.removeAll(true);
    if (!offer) return;
    const title = gameText(this, 0, 0, offer.title, 16, { color: '#ffe066' }).setOrigin(0, 0);
    const body = gameText(this, 0, 18, offer.lines.join(' '), 16, { color: '#d8d8e8' }).setOrigin(0, 0).setWordWrapWidth(this.wrap);
    const note = gameText(this, 0, 18 + body.height + 2, offer.note.text, 16, { color: offer.note.color }).setOrigin(0, 0).setWordWrapWidth(this.wrap);
    panel.add([title, body, note]);
  }

  private attempt(index: number): void {
    const offer = this.offers[index];
    if (!offer || this.time.now - this.lastBuyAt < BUY_COOLDOWN_MS) return;
    const result = offer.buy(saveSystem.data);
    if (!result.ok) {
      playSfx(this, 'uiBack');
      this.shakePanel();
      return;
    }
    this.lastBuyAt = this.time.now;
    saveSystem.update(() => result.save);
    playSfx(this, 'levelUp');
    playSfx(this, 'coin');
    this.celebration = { index, offer };
    this.rebuild();
  }

  /** After a purchase the scene rebuilds from the save; the burst and text play on the fresh row. */
  private finishCelebration(): void {
    const done = this.celebration;
    this.celebration = undefined;
    const row = done ? this.rows[done.index] : undefined;
    if (!done || !row) return;
    const y = row.y;
    celebrate(this, row.x + 40, y, done.offer.success.tint);
    const label = menuText(this, row.x, y, done.offer.success.text, 16, '#ffe066').setDepth(210);
    this.tweens.add({ targets: label, y: y - 26, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }

  private shakePanel(): void {
    const panel = this.panel;
    if (!panel) return;
    const x = panel.x;
    this.tweens.add({ targets: panel, x: { from: x - 4, to: x }, duration: 140, ease: 'Bounce.easeOut' });
  }

  override update(time = 0, delta = 0): void {
    super.update(time, delta);
    const pad = this.input.gamepad?.gamepads.find((p) => p?.connected);
    const now = [pad?.buttons[PAD_LB]?.pressed ?? false, pad?.buttons[PAD_RB]?.pressed ?? false];
    if (now[0] && !this.padBumpers[0]) this.stepTab(-1);
    if (now[1] && !this.padBumpers[1]) this.stepTab(1);
    this.padBumpers = now;
  }

  private stepTab(step: 1 | -1): void {
    this.switchTab(TABS[Phaser.Math.Clamp(TABS.indexOf(this.tab) + step, 0, TABS.length - 1)]!);
  }

  private switchTab(tab: CampTab): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.offset = 0;
    playSfx(this, 'uiMove');
    this.rebuild();
  }

  private goBack(): void {
    this.scene.start('LevelSelect');
  }
}
