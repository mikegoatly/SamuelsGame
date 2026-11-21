import Phaser from 'phaser';
import { GlitchFrame, TILE_SIZE, Tex } from '../../content/assetKeys';
import type { Rect } from '../../logic/geometry';
import { Cooldowns } from '../../logic/hazard/victims';
import { safeExit } from '../../logic/hazard/crack';
import { bandPhase, FloorGlitchPlan, type Band, type Cell } from '../../logic/floorGlitch';
import { feel } from '../feel';
import { floorWarning } from './floorWarning';
import type { GameEvents } from '../GameEvents';
import { playSfx } from '../sfx';
import { hurtPlayer, PLAYER_RADIUS, playerAlive } from '../hazards/victims';
import type { SkillWorld } from '../skills/types';

const FALL_FRACTION = 0.1;
const EXIT_MARGIN = 9;
const SAFE_MS = 700;
const DEPTH = 2;
const FLICKER_MS = 90;
const half = TILE_SIZE / 2;

interface Drawn {
  band: Band;
  images: Phaser.GameObjects.Image[];
  rect: Rect;
}

/** Phase 3 of the Missing Texture fight: bands of arena floor (2 tiles thick) flicker into the missing-texture checker as a warning, drop out as dark pits, then re-form. The hero who is standing there when a band drops takes 10% of max HP and is put on the nearest safe floor; monsters are not affected. */
export class FloorGlitch {
  private plan?: FloorGlitchPlan;
  private drawn: Drawn[] = [];
  private gfx?: Phaser.GameObjects.Graphics;
  private readonly falls = new Cooldowns<unknown>();
  private running = false;

  constructor(
    private readonly world: SkillWorld,
    private readonly arena: Rect,
    _events: GameEvents,
    private readonly rng: () => number = Math.random,
  ) {
    world.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stop());
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const { scene, isSolid } = this.world;
    const a = this.arena;
    const cx0 = Math.ceil(a.x / TILE_SIZE);
    const cy0 = Math.ceil(a.y / TILE_SIZE);
    const grid = { cx0, cy0, cols: Math.floor((a.x + a.w) / TILE_SIZE) - cx0, rows: Math.floor((a.y + a.h) / TILE_SIZE) - cy0 };
    this.plan = new FloorGlitchPlan(grid, (cx, cy) => !isSolid(cx * TILE_SIZE + half, cy * TILE_SIZE + half), this.rng);
    this.gfx = scene.add.graphics().setDepth(DEPTH);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.world.scene.events?.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    for (const d of this.drawn) for (const image of d.images) image.destroy();
    this.drawn = [];
    this.gfx?.destroy();
    this.gfx = undefined;
    this.falls.clear();
    floorWarning.active = false;
  }

  private update(): void {
    const { clock, player } = this.world;
    const plan = this.plan;
    if (!plan || !this.gfx) return;
    const now = clock.now;
    const over = feel.isLocked || player.dead;
    const band = over ? null : plan.step(now);
    if (band) this.drawn.push(this.make(band));
    this.drawn = this.drawn.filter((d) => {
      if (plan.bands.includes(d.band)) return true;
      for (const image of d.images) image.destroy();
      return false;
    });
    this.paint(now);
    if (!over) this.dropPlayer(now);
  }

  private make(band: Band): Drawn {
    const images = band.cells.map((c) => this.world.scene.add.image(c.cx * TILE_SIZE + half, c.cy * TILE_SIZE + half, Tex.glitch, GlitchFrame.missingTexture).setDepth(DEPTH + 0.1));
    const xs = band.cells.map((c) => c.cx);
    const ys = band.cells.map((c) => c.cy);
    const x0 = Math.min(...xs) * TILE_SIZE;
    const y0 = Math.min(...ys) * TILE_SIZE;
    return { band, images, rect: { x: x0, y: y0, w: (Math.max(...xs) + 1) * TILE_SIZE - x0, h: (Math.max(...ys) + 1) * TILE_SIZE - y0 } };
  }

  private paint(now: number): void {
    const g = this.gfx!.clear();
    const steady = feel.reduced;
    let warning = false;
    for (const d of this.drawn) {
      const phase = bandPhase(d.band, now);
      const out = phase === 'out';
      warning ||= phase === 'warn';
      const lit = steady || Math.floor(now / FLICKER_MS) % 2 === 0;
      d.images.forEach((image) => image.setVisible(!out).setAlpha(phase === 'reform' ? 0.5 : lit ? 0.85 : 0.35));
      if (out) this.pit(g, d.band.cells);
    }
    floorWarning.active = warning;
  }

  /** A hole you can read at a glance: near-black floor with a faint deep checker, a lighter lip on the far wall of each edge, and a thick bright magenta rim around the whole band. */
  private pit(g: Phaser.GameObjects.Graphics, cells: readonly Cell[]): void {
    const has = new Set(cells.map((c) => `${c.cx},${c.cy}`));
    const T = TILE_SIZE;
    for (const { cx, cy } of cells) {
      const x = cx * T;
      const y = cy * T;
      g.fillStyle(0x030106, 1).fillRect(x, y, T, T);
      g.fillStyle(0x150a1c, 1);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) g.fillRect(x + i * 4, y + j * 4, 4, 4);
      if (!has.has(`${cx},${cy - 1}`)) g.fillStyle(0x3a1244, 1).fillRect(x, y, T, 4);
    }
    g.fillStyle(0xff4fd8, 1);
    for (const { cx, cy } of cells) {
      const x = cx * T;
      const y = cy * T;
      if (!has.has(`${cx},${cy - 1}`)) g.fillRect(x, y, T, 3);
      if (!has.has(`${cx},${cy + 1}`)) g.fillRect(x, y + T - 3, T, 3);
      if (!has.has(`${cx - 1},${cy}`)) g.fillRect(x, y, 3, T);
      if (!has.has(`${cx + 1},${cy}`)) g.fillRect(x + T - 3, y, 3, T);
    }
  }

  private isOut(x: number, y: number, now: number): boolean {
    const cx = Math.floor(x / TILE_SIZE);
    const cy = Math.floor(y / TILE_SIZE);
    return this.plan!.outCells(now).some((c: Cell) => c.cx === cx && c.cy === cy);
  }

  private dropPlayer(now: number): void {
    const { player, isSolid } = this.world;
    if (!playerAlive(this.world) || !this.isOut(player.x, player.y, now)) return;
    const hit = this.drawn.find((d) => d.band.cells.some((c) => c.cx === Math.floor(player.x / TILE_SIZE) && c.cy === Math.floor(player.y / TILE_SIZE)));
    if (!hit) return;
    this.falls.tryTake('player', now, 1200, () => {
      const hurt = hurtPlayer(this.world, FALL_FRACTION, player.x, player.y);
      if (!hurt && player.invulnerable) return false;
      const out = safeExit(hit.rect, player, EXIT_MARGIN, PLAYER_RADIUS, (x, y) => isSolid(x, y) || this.isOut(x, y, now));
      playSfx(this.world.scene, 'pitFall');
      feel.shake(110, 0.004);
      if (out) player.blinkTo(out.x, out.y, hurt ? SAFE_MS : 250);
      return true;
    });
  }
}
