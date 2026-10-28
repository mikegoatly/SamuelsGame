import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Rect } from '../logic/geometry';
import { QUICKSAND_SLOW, speedFactorAt } from '../logic/hazards';
import { cycleIndex } from '../logic/grateEyes';
import type { GameClock } from './GameClock';
import { puff, smokeEmitter, type Emitter } from './hazards/emitters';
import { liveEnemies } from './skills/targets';
import { playSfx } from './sfx';

const DRIP_MS = 4300;
const SLUDGE = 0x6fe0a8;

/**
 * The sewer's wet ground: ordinary monsters crawl at the same half speed as the player (the player's own slowdown lives in `Player.slowZones`),
 * wading in makes a squelch and a little splash, and a drip echoes now and then. Bosses ignore the sludge.
 */
export class ChannelSystem {
  private readonly splash: Emitter;
  private wasIn = false;
  private drip: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemies: Phaser.Physics.Arcade.Group,
    private readonly clock: GameClock,
    private readonly zones: readonly Rect[],
  ) {
    this.splash = smokeEmitter(scene, 3, { speed: { min: 12, max: 40 }, lifespan: 420, scale: { start: 0.05, end: 0.14 }, alpha: { start: 0.6, end: 0 }, gravityY: 40, blendMode: Phaser.BlendModes.NORMAL });
    this.drip = cycleIndex(clock.now, DRIP_MS, 0);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      this.splash.destroy();
    });
  }

  private update(): void {
    for (const enemy of liveEnemies(this.enemies)) enemy.terrainSlow = enemy.def.boss ? 1 : speedFactorAt(enemy, this.zones);
    const inside = !this.player.dead && speedFactorAt(this.player, this.zones) === QUICKSAND_SLOW;
    if (inside && !this.wasIn) {
      playSfx(this.scene, 'squelch');
      puff(this.splash, this.player.x, this.player.y + 4, SLUDGE, 5);
    }
    this.wasIn = inside;
    const drip = cycleIndex(this.clock.now, DRIP_MS, 0);
    if (drip !== this.drip) {
      this.drip = drip;
      playSfx(this.scene, 'drip');
    }
  }
}
