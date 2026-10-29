import Phaser from 'phaser';
import { MinesFrame, Tex } from '../../content/assetKeys';
import type { PebbleSkill } from '../../content/skills';
import type { EnemyProjectile } from '../../entities/EnemyProjectile';
import { PEBBLE_ORBIT_RADIUS, blockShot, newPebble, orbitAngle, orbitPoint, pebbleReady, pebbleToBlock, type Pebble } from '../../logic/pebble';
import { playSfx } from '../sfx';
import { ringBurst, sparkBurst } from './skillFx';
import type { CastCall, SkillCaster, SkillWorld } from './types';

const ORBIT_PERIOD_MS = 2400;
const BLOCK_FLASH_MS = 280;
const SPARK = 0xffe066;
const FLICKER_MS = 1200;

interface Orbiter {
  pebble: Pebble;
  sprite: Phaser.GameObjects.Image;
  flashUntil: number;
  /** Where it darted to meet a shot (for the flash). */
  dart: { x: number; y: number } | null;
}

/** Bert's Pebble: little rocks circle the player for a while and each blocks one enemy bolt, then rests a few seconds. Level 5 brings a second pebble. */
export class PebbleCaster implements SkillCaster<PebbleSkill> {
  private orbiters: Orbiter[] = [];
  private until = 0;
  private rechargeMs = 5000;

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  cast({ params }: CastCall<PebbleSkill>): boolean {
    const { scene, player, clock } = this.world;
    this.end();
    this.until = clock.now + params.durationMs;
    this.rechargeMs = params.rechargeMs;
    this.orbiters = Array.from({ length: params.count }, () => ({
      pebble: newPebble(clock.now),
      sprite: scene.add.image(player.x, player.y, Tex.mines, MinesFrame.pebble).setDepth(12).setScale(1.2),
      flashUntil: 0,
      dart: null,
    }));
    ringBurst(scene, player.x, player.y, PEBBLE_ORBIT_RADIUS, SPARK, 280);
    playSfx(scene, 'chime');
    return true;
  }

  private update(): void {
    if (this.orbiters.length === 0) return;
    const { player, clock } = this.world;
    if (player.dead || clock.now >= this.until) {
      this.end();
      return;
    }
    const centre = { x: player.x, y: player.y - 1 };
    this.orbiters.forEach((o, i) => {
      const orbit = orbitPoint(centre, orbitAngle(clock.now, i, this.orbiters.length, ORBIT_PERIOD_MS), PEBBLE_ORBIT_RADIUS);
      const flashing = clock.now < o.flashUntil;
      const at = flashing && o.dart ? o.dart : orbit;
      o.sprite.setPosition(at.x, at.y).setFrame(flashing ? MinesFrame.pebbleBlock : MinesFrame.pebble);
      o.sprite.setAngle(flashing ? Math.sin(clock.now / 25) * 18 : 0);
      const fading = this.until - clock.now < FLICKER_MS && Math.floor(clock.now / 90) % 2 === 0;
      o.sprite.setAlpha(fading ? 0.4 : pebbleReady(o.pebble, clock.now) ? 1 : 0.55);
    });
    this.intercept(centre);
  }

  /** Any enemy bolt that gets close to the player is met by the first ready pebble, wherever it is on its orbit. */
  private intercept(centre: { x: number; y: number }): void {
    const { scene, clock } = this.world;
    const pebbles = (): Pebble[] => this.orbiters.map((o) => o.pebble);
    for (const bolt of this.world.shots.group.getChildren() as EnemyProjectile[]) {
      if (!bolt.active) continue;
      const index = pebbleToBlock(pebbles(), clock.now, bolt, centre);
      if (index < 0) continue;
      const o = this.orbiters[index]!;
      bolt.kill();
      o.pebble = blockShot(o.pebble, clock.now, this.rechargeMs);
      o.flashUntil = clock.now + BLOCK_FLASH_MS;
      o.dart = { x: bolt.x, y: bolt.y };
      sparkBurst(scene, bolt.x, bolt.y, SPARK, 8, 50);
      playSfx(scene, 'crystalHit');
    }
  }

  private end(): void {
    const { scene } = this.world;
    for (const o of this.orbiters) {
      sparkBurst(scene, o.sprite.x, o.sprite.y, 0x9ab8e8, 6, 40);
      o.sprite.destroy();
    }
    this.orbiters = [];
  }
}
