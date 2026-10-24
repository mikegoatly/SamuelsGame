import Phaser from 'phaser';
import { CAMERA_ZOOM } from '../content/config';
import { FONT } from '../content/assetKeys';
import { FONT_NATIVE_SIZE, snapFontSize, textStroke } from '../logic/textSize';

export interface TextOptions {
  color?: string;
  stroke?: string;
  /** True for text placed in the zoomed world camera: rendered at zoom resolution so it lands on whole screen pixels. */
  world?: boolean;
}

export const OUTLINE_COLOR = '#14121c';

/** The one place text is created: sizes snap to the pixel font's grid, stroke is whole pixels, positions are rounded. */
export function gameText(scene: Phaser.Scene, x: number, y: number, value: string, size: number, options: TextOptions = {}): Phaser.GameObjects.Text {
  const native = options.world ? FONT_NATIVE_SIZE / CAMERA_ZOOM : FONT_NATIVE_SIZE;
  const snapped = snapFontSize(size, native);
  return scene.add
    .text(Math.round(x), Math.round(y), value, {
      fontFamily: FONT,
      fontSize: `${snapped}px`,
      color: options.color ?? '#ffffff',
      stroke: options.stroke ?? OUTLINE_COLOR,
      strokeThickness: textStroke(snapped, native),
    })
    .setResolution(options.world ? CAMERA_ZOOM : 1);
}
