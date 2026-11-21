import Phaser from 'phaser';
import { GLITCH_PIPELINE, GlitchPipeline } from '../../fx/GlitchPipeline';
import { GLITCH_HUD_KEY } from '../../fx/HudGlitch';
import { GlitchBursts, TELEGRAPH_LEAD_MS } from '../../logic/glitchBursts';
import { feel } from '../feel';
import type { GameEvents } from '../GameEvents';
import type { SkillWorld } from '../skills/types';
import { CleanCamera } from './CleanCamera';
import { CorruptTiles } from './CorruptTiles';
import { MonsterGlitch } from './MonsterGlitch';

const SPLIT_PX = 4;
const SPLIT_PX_REDUCED = 2;
const { Events } = Phaser.Scenes;

/**
 * The Glitch level's look: scanlines always, RGB split and tear bands in bursts (about a quarter of the time), corrupt floor tiles,
 * glitchy monsters, and a flag for the HUD text gag. The hero and the hero's bolts are drawn by a second, effect-free camera (CleanCamera)
 * so they never glitch. On the Canvas renderer the screen effect is skipped; everything else still runs.
 */
export class GlitchFxSystem {
  private readonly bursts: GlitchBursts;
  private readonly tiles: CorruptTiles;
  private readonly monsters: MonsterGlitch;
  private pipeline?: GlitchPipeline;
  private clean?: CleanCamera;
  private wasActive = false;

  constructor(
    private readonly world: SkillWorld,
    events: GameEvents,
    rng: () => number = Math.random,
  ) {
    const { scene, player, isSolid } = world;
    this.bursts = new GlitchBursts(rng);
    this.tiles = new CorruptTiles(scene, rng, isSolid, player);
    this.monsters = new MonsterGlitch(world, rng, (lead) => this.announce(lead));
    scene.registry.set(GLITCH_HUD_KEY, true);

    const main = scene.cameras.main;
    if (scene.game.renderer.type === Phaser.WEBGL) {
      try {
        const renderer = scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
        renderer.pipelines.addPostPipeline(GLITCH_PIPELINE, GlitchPipeline);
        main.setPostPipeline(GLITCH_PIPELINE);
        this.pipeline = main.getPostPipeline(GLITCH_PIPELINE) as GlitchPipeline;
        this.clean = new CleanCamera(scene, main, player);
      } catch (error) {
        console.warn('GlitchFx: screen effect unavailable, continuing without it', error);
        this.clean?.destroy();
        this.clean = undefined;
        this.pipeline = undefined;
        main.resetPostPipeline(true);
      }
    }

    const onWave = (): void => this.announce(0);
    events.on('wave-started', onWave);
    events.on('room-started', onWave);
    const onPause = (): void => {
      if (this.pipeline) this.pipeline.burst = 0;
    };
    scene.events.on(Events.PAUSE, onPause);
    scene.events.on(Events.UPDATE, this.update, this);
    scene.events.on(Events.PRE_RENDER, this.nudge, this);
    scene.events.on(Events.RENDER, this.restore, this);
    scene.events.once(Events.SHUTDOWN, () => {
      scene.events.off(Events.PAUSE, onPause);
      scene.events.off(Events.UPDATE, this.update, this);
      scene.events.off(Events.PRE_RENDER, this.nudge, this);
      scene.events.off(Events.RENDER, this.restore, this);
      this.monsters.restore();
      this.monsters.destroy();
      this.tiles.destroy();
      this.clean?.destroy();
      scene.cameras?.main?.resetPostPipeline(true);
      scene.registry.set(GLITCH_HUD_KEY, false);
    });
  }

  /** A burst starts `leadMs` from now, so the glitching warns of what is about to happen (a wave, a teleport). */
  announce(leadMs: number = TELEGRAPH_LEAD_MS): void {
    this.bursts.request(this.world.clock.now, leadMs);
  }

  private update(): void {
    const now = this.world.clock.now;
    const active = this.bursts.active(now);
    if (active && !this.wasActive && !feel.isLocked && !this.world.player.dead) this.tiles.burst(now);
    this.wasActive = active;
    if (this.pipeline) {
      const reduced = feel.reduced;
      this.pipeline.burst = this.bursts.intensity(now);
      this.pipeline.split = reduced ? SPLIT_PX_REDUCED : SPLIT_PX;
      this.pipeline.tear = reduced ? 0 : 1;
      this.pipeline.time = (now / 1000) % 1000;
    }
    this.tiles.update(now);
    this.monsters.update();
  }

  private nudge(): void {
    this.monsters.nudge(this.world.clock.now);
  }

  private restore(): void {
    this.monsters.restore();
  }
}
