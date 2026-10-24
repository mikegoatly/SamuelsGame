import type Phaser from 'phaser';
import { defaultDevice, deviceForPointer, type InputDevice } from '../logic/device';

const AXIS_THRESHOLD = 0.6;
let current: InputDevice = defaultDevice(typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);

export const lastInputDevice = (): InputDevice => current;

function padActive(): boolean {
  const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
  return pads.some((pad) => pad?.connected && (pad.buttons.some((b) => b.pressed) || pad.axes.some((a) => Math.abs(a) > AXIS_THRESHOLD)));
}

/** Remembers which kind of input was used last, so the help screen can highlight the right controls. */
export function installDeviceTracker(game: Phaser.Game): void {
  window.addEventListener('keydown', () => (current = 'keyboard'));
  window.addEventListener('pointerdown', (event) => (current = deviceForPointer(event.pointerType)));
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') current = 'keyboard';
  });
  game.events.on('prestep', () => {
    if (padActive()) current = 'gamepad';
  });
}
