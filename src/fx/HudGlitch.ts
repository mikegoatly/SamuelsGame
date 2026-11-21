import type Phaser from 'phaser';
import { corruptText, TextGag } from '../logic/glitchText';

/** Set on the game registry by the GlitchFxSystem; the HUD reads it when it starts. */
export const GLITCH_HUD_KEY = 'glitchLevel';

export interface GagTarget {
  text: Phaser.GameObjects.Text;
  /** The level readout: sometimes shows NaN instead of noise. */
  level?: boolean;
}

interface Shown {
  target: GagTarget;
  original: string;
  shown: string;
}

/** The HUD lying to you: now and then, for ~0.2s, a few letters of a readout turn to noise or the level shows NaN. No flashing (the text just changes and changes back), and it stays readable. Time is HUD frame time, so pause freezes it. */
export class HudGlitch {
  private now = 0;
  private readonly gag: TextGag;
  private shown: Shown[] = [];

  constructor(
    private readonly targets: () => GagTarget[],
    private readonly rng: () => number = Math.random,
  ) {
    this.gag = new TextGag(rng);
  }

  update(deltaMs: number): void {
    this.now += deltaMs;
    const on = this.gag.on(this.now);
    if (on && this.shown.length === 0) this.start();
    else if (!on && this.shown.length > 0) this.end();
  }

  private start(): void {
    const pool = this.targets().filter((t) => t.text.active && t.text.text.length > 1);
    const count = Math.min(pool.length, 1 + Math.floor(this.rng() * 3));
    for (let i = 0; i < count; i++) {
      const target = pool.splice(Math.floor(this.rng() * pool.length), 1)[0]!;
      const original = target.text.text;
      const shown = target.level && this.rng() < 0.5 ? 'Lv NaN' : corruptText(original, this.rng);
      if (shown === original) continue;
      target.text.setText(shown);
      this.shown.push({ target, original, shown });
    }
  }

  private end(): void {
    for (const { target, original, shown } of this.shown) if (target.text.active && target.text.text === shown) target.text.setText(original);
    this.shown = [];
  }
}
