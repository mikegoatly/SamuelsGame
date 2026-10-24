import { applyDeadzone, type Stick } from './stick';

export interface Circle extends Stick {
  r: number;
}

export type ButtonId = 'dash' | 'altFire';
export type TouchRole = 'move' | 'aim' | ButtonId;

export interface ButtonZone extends Circle {
  id: ButtonId;
}

export interface TouchMetrics {
  stickRadius: number;
  buttons: ButtonZone[];
  fullscreen: Circle;
}

export interface StickReading {
  /** Knob offset from the origin in px, clamped to the stick radius. */
  knob: Stick;
  /** Normalised, deadzoned output (magnitude 0..1). */
  value: Stick;
}

const BUTTON_HIT_SLOP = 8;

export function readStick(origin: Stick, point: Stick, radius: number): StickReading {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const distance = Math.hypot(dx, dy);
  const scale = distance > radius ? radius / distance : 1;
  const knob = { x: dx * scale, y: dy * scale };
  return { knob, value: applyDeadzone(knob.x / radius, knob.y / radius) };
}

export function isInCircle(point: Stick, circle: Circle, slop = 0): boolean {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.r + slop;
}

/** Layout in game px for the current screen size; HUD and input both derive from this. */
export function touchMetrics(width: number, height: number): TouchMetrics {
  const stickRadius = Math.min(70, Math.max(40, Math.round(Math.min(width, height) * 0.14)));
  const r = Math.round(stickRadius * 0.56);
  const x = width - 16 - r;
  const dashY = Math.round(height * 0.62);
  return {
    stickRadius,
    buttons: [
      { id: 'dash', x, y: dashY, r },
      { id: 'altFire', x, y: dashY - Math.round(r * 2.5), r },
    ],
    fullscreen: { x: width - 22, y: 22, r: 14 },
  };
}

/** Which control a touch starting at `point` belongs to; null for HUD-owned areas. */
export function classifyTouch(point: Stick, width: number, metrics: TouchMetrics): TouchRole | null {
  if (isInCircle(point, metrics.fullscreen, BUTTON_HIT_SLOP)) return null;
  const button = metrics.buttons.find((b) => isInCircle(point, b, BUTTON_HIT_SLOP));
  if (button) return button.id;
  return point.x < width / 2 ? 'move' : 'aim';
}
