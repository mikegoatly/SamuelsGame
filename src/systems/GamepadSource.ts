import Phaser from 'phaser';
import { applyDeadzone, pastThreshold } from '../logic/stick';
import type { InputSource } from './InputController';

const AIM_FIRE_THRESHOLD = 0.5;
const TRIGGER_THRESHOLD = 0.3;

type Pad = Phaser.Input.Gamepad.Gamepad;

export class GamepadSource implements InputSource {
  readonly moveVector = new Phaser.Math.Vector2();
  readonly aimWorldPoint = null;
  fire = false;
  altFire = false;
  dash = false;

  private readonly lastAim = new Phaser.Math.Vector2(1, 0);
  private padAiming = false;
  private pointerX = 0;
  private pointerY = 0;
  private pad: Pad | undefined;

  get aimVector(): Phaser.Math.Vector2 | null {
    return this.padAiming ? this.lastAim : null;
  }

  update(scene: Phaser.Scene): void {
    this.moveVector.reset();
    this.fire = this.altFire = this.dash = false;
    const pad = this.activePad(scene);
    if (!pad) return;

    const left = applyDeadzone(pad.leftStick.x, pad.leftStick.y);
    this.moveVector.set(
      left.x + Number(pad.right) - Number(pad.left),
      left.y + Number(pad.down) - Number(pad.up),
    );
    if (this.moveVector.lengthSq() > 1) this.moveVector.normalize();

    const right = applyDeadzone(pad.rightStick.x, pad.rightStick.y);
    const aimMagnitude = Math.hypot(right.x, right.y);
    this.trackAimDevice(scene, aimMagnitude > 0);
    if (aimMagnitude > 0) this.lastAim.set(right.x, right.y).normalize();

    this.fire = pastThreshold(pad.R2, TRIGGER_THRESHOLD) || pastThreshold(aimMagnitude, AIM_FIRE_THRESHOLD);
    this.altFire = pastThreshold(pad.L2, TRIGGER_THRESHOLD);
    this.dash = pad.A;
  }

  rumble(durationMs: number, weak: number, strong: number): void {
    const actuator = this.pad?.vibration as GamepadHapticActuator | undefined;
    try {
      void actuator?.playEffect?.('dual-rumble', {
        duration: durationMs,
        weakMagnitude: weak,
        strongMagnitude: strong,
      });
    } catch {
      /* unsupported */
    }
  }

  private activePad(scene: Phaser.Scene): Pad | undefined {
    this.pad = scene.input.gamepad?.gamepads.find((pad) => pad?.connected);
    return this.pad;
  }

  private trackAimDevice(scene: Phaser.Scene, stickActive: boolean): void {
    const pointer = scene.input.activePointer;
    const pointerMoved = pointer.x !== this.pointerX || pointer.y !== this.pointerY;
    this.pointerX = pointer.x;
    this.pointerY = pointer.y;
    if (stickActive) this.padAiming = true;
    else if (pointerMoved) this.padAiming = false;
  }
}
