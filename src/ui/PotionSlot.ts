import Phaser from 'phaser';
import { Frame, Tex } from '../content/assetKeys';
import { potionGlyph } from '../content/inputGlyphs';
import { saveSystem } from '../systems/SaveSystem';
import { lastInputDevice } from '../systems/inputDevice';
import { gameText } from './gameText';

const SLOT = 32;
const SKILL_BAR_HALF_WIDTH = 56;
const MARGIN_BOTTOM = 8;

/** Carry-in potion readout beside the skill bar: icon, count and the glyph for the drink control of the device used last. */
export class PotionSlot {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly glyph: Phaser.GameObjects.Image;
  private readonly count: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.frame = scene.add.graphics().setDepth(50);
    this.icon = scene.add.image(0, 0, Tex.tiles, Frame.potionSmall).setDepth(51).setDisplaySize(SLOT - 6, SLOT - 6);
    this.glyph = scene.add.image(0, 0, Tex.prompts, 0).setDepth(51);
    this.count = gameText(scene, 0, 0, '', 16, { color: '#ffffff' }).setOrigin(1, 1).setDepth(52);
  }

  update(): void {
    const { width, height } = this.scene.scale;
    const carried = saveSystem.data.potions;
    const cx = Math.round(width / 2 + SKILL_BAR_HALF_WIDTH + SLOT / 2 + 8);
    const top = height - MARGIN_BOTTOM - 16 - 2 - SLOT;
    this.frame.clear().fillStyle(0x14121c, carried > 0 ? 0.7 : 0.45).fillRect(cx - SLOT / 2, top, SLOT, SLOT);
    this.frame.lineStyle(2, 0xff8a8a, carried > 0 ? 0.9 : 0.3).strokeRect(cx - SLOT / 2, top, SLOT, SLOT);
    this.icon.setPosition(cx, top + SLOT / 2).setAlpha(carried > 0 ? 1 : 0.35);
    this.count.setText(`x${carried}`).setPosition(cx + SLOT / 2 - 2, top + SLOT - 1);
    this.glyph.setFrame(potionGlyph(lastInputDevice())).setPosition(cx, top + SLOT + 10).setAlpha(carried > 0 ? 1 : 0.3);
  }
}
