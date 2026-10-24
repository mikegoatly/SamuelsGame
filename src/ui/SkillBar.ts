import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import { skillGlyph } from '../content/inputGlyphs';
import { getSkill } from '../content/skills';
import { SLOT_COUNT } from '../logic/loadout';
import { lastInputDevice } from '../systems/inputDevice';
import type { SkillSystem } from '../systems/SkillSystem';

const SLOT = 32;
const GAP = 8;
const MARGIN_BOTTOM = 8;
const EMPTY_STROKE = 0x5a5280;
const COOLING_TINT = 0x6a6a80;

interface SlotView {
  icon: Phaser.GameObjects.Image;
  glyph: Phaser.GameObjects.Image;
}

/** Bottom-centre skill bar: icon, radial cooldown sweep and the glyph for the control of the device used last. */
export class SkillBar {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly slots: SlotView[];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly skills: SkillSystem,
  ) {
    this.graphics = scene.add.graphics().setDepth(50);
    this.slots = Array.from({ length: SLOT_COUNT }, () => ({
      icon: scene.add.image(0, 0, Tex.tiles, 0).setDepth(51).setVisible(false),
      glyph: scene.add.image(0, 0, Tex.prompts, 0).setDepth(51),
    }));
  }

  update(): void {
    const { width, height } = this.scene.scale;
    const device = lastInputDevice();
    const top = height - MARGIN_BOTTOM - 16 - 2 - SLOT;
    this.graphics.clear();
    this.slots.forEach((view, i) => {
      const x = Math.round(width / 2 + (i - (SLOT_COUNT - 1) / 2) * (SLOT + GAP));
      const status = this.skills.statuses[i]!;
      const skill = status.skillId ? getSkill(status.skillId) : undefined;
      const cx = x;
      const cy = top + SLOT / 2;
      this.graphics.fillStyle(0x14121c, skill ? 0.7 : 0.45).fillRect(x - SLOT / 2, top, SLOT, SLOT);
      this.graphics.lineStyle(2, skill ? skill.color : EMPTY_STROKE, skill ? (status.ready ? 1 : 0.5) : 0.35).strokeRect(x - SLOT / 2, top, SLOT, SLOT);
      view.icon.setVisible(skill !== undefined);
      if (skill) {
        view.icon.setTexture(skill.icon).setPosition(cx, cy).setDisplaySize(SLOT - 4, SLOT - 4);
        if (status.ready) view.icon.clearTint();
        else view.icon.setTint(COOLING_TINT);
        if (!status.ready) {
          const start = -Math.PI / 2 + status.fraction * Math.PI * 2;
          this.graphics.fillStyle(0x000000, 0.6).slice(cx, cy, SLOT / 2 - 1, start, -Math.PI / 2 + Math.PI * 2, false).fillPath();
        }
      }
      view.glyph.setFrame(skillGlyph(device, i)).setPosition(cx, top + SLOT + 2 + 8).setAlpha(skill ? (status.ready ? 1 : 0.55) : 0.3);
    });
  }
}
