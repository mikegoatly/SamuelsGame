import Phaser from 'phaser';
import { MinesFrame, Tex } from '../../content/assetKeys';
import { bertTuning } from '../../content/bert';
import type { Point } from '../../logic/geometry';
import { pillarSpots, type Obstacle } from '../../logic/bertRoll';
import { feel } from '../../systems/feel';
import { sparkBurst } from '../../systems/skills/skillFx';
import { playSfx } from '../../systems/sfx';

const SCALE = 1.5;
const CRYSTAL = 0x9ad0ff;
const SPAWN_GAP = 36;
const GROW_MS = 500;

interface Prop extends Obstacle {
  kind: 'pillar' | 'spike';
  parts: Phaser.GameObjects.GameObject[];
  body?: Phaser.GameObjects.Zone;
}

/** The crystal pillars Bert crashes into (phases 1-2, solid for the player) and the small spikes that regrow in phase 3. */
export class BertProps {
  private readonly props = new Map<string, Prop>();
  private readonly solids: Phaser.Physics.Arcade.StaticGroup;
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = [];
  private nextId = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    this.solids = scene.physics.add.staticGroup();
    this.colliders.push(scene.physics.add.collider(player, this.solids));
  }

  /** Lets another body (Bert, walking) bump into the pillars; `active` is false while he rolls so the crash is his own rule. */
  collideWith(body: Phaser.Physics.Arcade.Sprite, active: () => boolean): void {
    this.colliders.push(this.scene.physics.add.collider(body, this.solids, undefined, active));
  }

  get obstacles(): Obstacle[] {
    return [...this.props.values()];
  }

  get spikeCount(): number {
    return [...this.props.values()].filter((p) => p.kind === 'spike').length;
  }

  spawnPillars(centre: Point, arenaRadius: number, avoid: readonly Point[]): void {
    for (const spot of pillarSpots(centre, arenaRadius, bertTuning.pillarCount, avoid, SPAWN_GAP)) this.addPillar(spot);
  }

  private addPillar(at: Point): void {
    const bottom = this.scene.add.image(at.x, at.y, Tex.mines, MinesFrame.pillarBottom).setScale(SCALE).setDepth(4);
    const top = this.scene.add.image(at.x, at.y - 16 * SCALE, Tex.mines, MinesFrame.pillarTop).setScale(SCALE).setDepth(6);
    const zone = this.scene.add.zone(at.x, at.y, 18, 12);
    this.scene.physics.add.existing(zone, true);
    this.solids.add(zone);
    const id = `pillar${this.nextId++}`;
    this.props.set(id, { id, kind: 'pillar', x: at.x, y: at.y - 4, radius: bertTuning.pillarRadius, parts: [bottom, top], body: zone });
    this.scene.tweens.add({ targets: [bottom, top], alpha: { from: 0, to: 1 }, duration: GROW_MS });
  }

  /** A spike pops up at a spot away from the given points. */
  growSpike(centre: Point, arenaRadius: number, avoid: readonly Point[]): void {
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * arenaRadius * 0.7;
      const at = { x: centre.x + Math.cos(angle) * distance, y: centre.y + Math.sin(angle) * distance };
      const crowded = [...avoid, ...this.obstacles].some((o) => Math.hypot(o.x - at.x, o.y - at.y) < 34);
      if (crowded) continue;
      const sprite = this.scene.add.image(at.x, at.y, Tex.mines, MinesFrame.spike).setScale(0.2).setDepth(4);
      this.scene.tweens.add({ targets: sprite, scale: SCALE, duration: GROW_MS, ease: 'Back.easeOut' });
      const id = `spike${this.nextId++}`;
      this.props.set(id, { id, kind: 'spike', x: at.x, y: at.y, radius: bertTuning.spikeRadius, parts: [sprite] });
      sparkBurst(this.scene, at.x, at.y, CRYSTAL, 5, 30);
      playSfx(this.scene, 'chime');
      return;
    }
  }

  kindOf(id: string): 'pillar' | 'spike' | undefined {
    return this.props.get(id)?.kind;
  }

  /** Smashes one prop with a burst of crystal shards. */
  shatter(id: string): void {
    const prop = this.props.get(id);
    if (!prop) return;
    this.props.delete(id);
    sparkBurst(this.scene, prop.x, prop.y, CRYSTAL, prop.kind === 'pillar' ? 22 : 10, 110);
    this.scene.tweens.add({ targets: prop.parts, alpha: 0, scaleY: 0.2, duration: 220, onComplete: () => prop.parts.forEach((p) => p.destroy()) });
    prop.body?.destroy();
    playSfx(this.scene, 'shatter');
    feel.shake(prop.kind === 'pillar' ? 220 : 90, prop.kind === 'pillar' ? 0.012 : 0.005);
  }

  clearPillars(): void {
    for (const prop of [...this.props.values()]) if (prop.kind === 'pillar') this.shatter(prop.id);
  }

  clearAll(): void {
    for (const id of [...this.props.keys()]) this.shatter(id);
  }

  destroy(): void {
    for (const collider of this.colliders) collider.destroy();
    this.colliders.length = 0;
    for (const prop of this.props.values()) {
      prop.parts.forEach((p) => p.destroy());
      prop.body?.destroy();
    }
    this.props.clear();
  }
}
