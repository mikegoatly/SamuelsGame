import Phaser from 'phaser';
import { MinesFrame, Tex } from '../content/assetKeys';
import { MINES_TEXTURE, MINES_TINT } from '../content/minesTint';
import { feel } from '../systems/feel';
import { RogueFrame, SEWER_TINT } from '../content/sewerFrames';
import type { DecorSpec } from '../logic/tiledObjects';

const FRAME_MS = 240;

/** Cycles the sludge tiles through their four variants, each tile a step apart so the surface shimmers and drifts instead of blinking in unison. */
export function animateSludge(scene: Phaser.Scene, layer: Phaser.Tilemaps.TilemapLayer, firstGid: number): void {
  const frames = RogueFrame.sludge.map((f) => firstGid + f);
  const tiles: { tile: Phaser.Tilemaps.Tile; phase: number }[] = [];
  layer.forEachTile((tile) => {
    if (frames.includes(tile.index)) tiles.push({ tile, phase: Math.abs((tile.x * 73856093) ^ (tile.y * 19349663)) % frames.length });
  });
  let step = 0;
  const timer = scene.time.addEvent({
    delay: FRAME_MS,
    loop: true,
    callback: () => {
      step++;
      for (const { tile, phase } of tiles) tile.index = frames[(phase + step) % frames.length]!;
    },
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => timer.remove());
}

/** Moss, bones, drains and puddles: flat, non-solid decals under every actor. */
export function drawDecor(scene: Phaser.Scene, decor: readonly DecorSpec[]): void {
  const g = scene.add.graphics().setDepth(0.3);
  const glows: Phaser.GameObjects.Image[] = [];
  for (const d of decor) {
    if (d.kind === 'crystal') {
      glows.push(crystalGlow(scene, d));
    } else if (d.kind === 'moss' || d.kind === 'bones') {
      scene.add.image(d.x, d.y, Tex.rogue, d.frame).setTint(SEWER_TINT.decor).setDepth(0.35);
    } else if (d.kind === 'puddle') {
      g.fillStyle(0x1c3a36, 0.5).fillEllipse(d.x, d.y + 1, 13, 7);
      g.fillStyle(0x7fd0b8, 0.18).fillEllipse(d.x - 1, d.y, 7, 3);
    } else {
      g.fillStyle(0x0d1a1a, 0.9).fillCircle(d.x, d.y, 6);
      g.lineStyle(1, 0x56706c, 1).strokeCircle(d.x, d.y, 6);
      for (let i = -1; i <= 1; i++) g.lineStyle(1, 0x56706c, 1).lineBetween(d.x - 4, d.y + i * 2.5, d.x + 4, d.y + i * 2.5);
    }
  }
  breatheGlows(scene, glows);
}

/** One white soft-glow gradient, baked once and tinted per crystal. */
function glowTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(MINES_TEXTURE.glow)) return MINES_TEXTURE.glow;
  const size = 64;
  const canvas = scene.textures.createCanvas(MINES_TEXTURE.glow, size, size)!;
  const gradient = canvas.context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  canvas.context.fillStyle = gradient;
  canvas.context.fillRect(0, 0, size, size);
  canvas.refresh();
  return MINES_TEXTURE.glow;
}

const GLOW_ALPHA = 0.55;

/** A Crystal Mines cluster: the sprite over a tinted additive glow image from the shared texture. Returns the glow so one shared tween can breathe them all. */
function crystalGlow(scene: Phaser.Scene, d: DecorSpec): Phaser.GameObjects.Image {
  const colour = d.frame === MinesFrame.crystalViolet ? MINES_TINT.glowViolet : MINES_TINT.glowBlue;
  const glow = scene.add.image(d.x, d.y, glowTexture(scene)).setTint(colour).setBlendMode(Phaser.BlendModes.ADD).setDepth(0.32).setDisplaySize(44, 34).setAlpha(GLOW_ALPHA);
  scene.add.image(d.x, d.y, Tex.mines, d.frame).setDepth(0.35);
  return glow;
}

/** All crystal glows breathe from a single tween; they stay still in reduced mode and on touch devices (phones). */
function breatheGlows(scene: Phaser.Scene, glows: readonly Phaser.GameObjects.Image[]): void {
  if (glows.length === 0 || feel.reduced || scene.sys.game.device.input.touch) return;
  const counter = scene.tweens.addCounter({ from: 0, to: Math.PI * 2, duration: 3200, repeat: -1 });
  const update = (): void => {
    const phase = counter.getValue() ?? 0;
    glows.forEach((glow, i) => glow.setAlpha(GLOW_ALPHA * (0.7 + 0.3 * Math.sin(phase + i * 0.9))));
  };
  scene.events.on('update', update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off('update', update));
}
