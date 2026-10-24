import Phaser from 'phaser';
import { Sfx } from '../content/assetKeys';
import { CAMERA_ZOOM } from '../content/config';
import { magicBolt } from '../content/weapons';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { createProjectilePool, Projectile } from '../entities/Projectile';
import { damageToEnemy } from '../logic/combat';
import { GameEvents } from '../systems/GameEvents';
import { floatText } from '../systems/floatText';
import { InputController } from '../systems/InputController';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { buildRoom } from './RoomBuilder';

export class GameScene extends Phaser.Scene {
  private ending = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.ending = false;
    const events = new GameEvents();
    const progression = new ProgressionSystem(events);
    const walls = buildRoom(this);
    const projectiles = createProjectilePool(this);
    const player = new Player(this, 320, 200, new InputController(this), projectiles, progression, events);
    const enemies = this.physics.add.group({ allowGravity: false });
    const spawner = new SpawnSystem(this, player, enemies, events);

    this.physics.add.collider(player, walls);
    this.physics.add.collider(enemies, walls);
    this.physics.add.collider(enemies, enemies);
    this.physics.add.collider(player, enemies, (_, enemy) => (enemy as Enemy).tryContact(player));
    this.physics.add.collider(projectiles, walls, (bolt) => (bolt as Projectile).kill());
    this.physics.add.overlap(projectiles, enemies, (boltObj, enemyObj) => {
      const bolt = boltObj as Projectile;
      const enemy = enemyObj as Enemy;
      if (!bolt.active || !enemy.alive) return;
      const damage = damageToEnemy(magicBolt.baseDamage, progression.level, enemy.level);
      enemy.takeHit(damage, bolt.body!.velocity.x, bolt.body!.velocity.y);
      bolt.kill();
    });

    events.on('enemy-died', (level) => progression.awardKill(level));
    events.on('level-up', () => this.celebrateLevelUp(player));
    events.on('player-died', () => this.endRun(progression, spawner));

    this.physics.world.setBounds(0, 0, walls.width, walls.height);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, walls.width, walls.height);
    camera.setZoom(CAMERA_ZOOM);
    camera.startFollow(player, true, 0.15, 0.15);
    camera.fadeIn(250);

    this.scene.launch('Hud', { events, progression, player, spawner });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      events.clear();
      this.scene.stop('Hud');
    });
    spawner.start();
  }

  private celebrateLevelUp(player: Player): void {
    floatText(this, player.x, player.y - 16, 'LEVEL UP!', '#7dffb0', 14, 24, 1100);
    this.sound.play(Sfx.shoot, { volume: 0.5, rate: 1.8 });
    this.sound.play(Sfx.hit, { volume: 0.4, rate: 1.5, delay: 0.1 });
  }

  private endRun(progression: ProgressionSystem, spawner: SpawnSystem): void {
    if (this.ending) return;
    this.ending = true;
    spawner.stop();
    const camera = this.cameras.main;
    this.physics.pause();
    camera.fadeOut(900, 20, 18, 28);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('GameOver', { level: progression.level, wave: spawner.wave }),
    );
  }
}
