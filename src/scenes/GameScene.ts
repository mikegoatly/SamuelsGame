import Phaser from 'phaser';
import { Frame, Sfx } from '../content/assetKeys';
import { CAMERA_ZOOM } from '../content/config';
import { Player } from '../entities/Player';
import { createProjectilePool, Projectile } from '../entities/Projectile';
import { TargetDummy } from '../entities/TargetDummy';
import { InputController } from '../systems/InputController';
import { buildRoom } from './RoomBuilder';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create(): void {
    const walls = buildRoom(this);
    const projectiles = createProjectilePool(this);
    const player = new Player(this, 320, 200, new InputController(this), projectiles);
    const dummies = this.physics.add.staticGroup([
      new TargetDummy(this, 400, 160, Frame.slime),
      new TargetDummy(this, 440, 240, Frame.crab),
      new TargetDummy(this, 240, 120, Frame.cyclops),
    ]);

    this.physics.add.collider(player, walls);
    this.physics.add.collider(player, dummies);
    this.physics.add.collider(projectiles, walls, (bolt) => (bolt as Projectile).kill());
    this.physics.add.overlap(projectiles, dummies, (bolt, dummy) => {
      (bolt as Projectile).kill();
      (dummy as TargetDummy).flash();
      this.sound.play(Sfx.hit, { volume: 0.4 });
    });

    this.physics.world.setBounds(0, 0, walls.width, walls.height);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, walls.width, walls.height);
    camera.setZoom(CAMERA_ZOOM);
    camera.startFollow(player, true, 0.15, 0.15);
  }
}
