import type { InputDevice } from '../logic/device';

export interface ControlsPanel {
  title: string;
  lines: ReadonlyArray<readonly [action: string, how: string]>;
}

export const GOAL_LINES = [
  'Fight through the rooms, then defeat each boss to clear the level.',
  'Kill monsters to level up and pick up coins, potions and charms.',
  "Don't rush ahead: monsters far above your level hit hard and barely feel your attacks.",
];

export const CONTROLS_HELP: Record<InputDevice, ControlsPanel> = {
  keyboard: {
    title: 'Keyboard + mouse',
    lines: [
      ['Move', 'W A S D'],
      ['Aim / fire', 'Mouse / left click'],
      ['Alt fire', 'Right click'],
      ['Dash', 'Space'],
      ['Swap weapon', 'Q / wheel'],
      ['Pause', 'Esc'],
      ['Mute', 'M'],
    ],
  },
  gamepad: {
    title: 'Gamepad',
    lines: [
      ['Move', 'Left stick'],
      ['Aim / fire', 'Right stick / RT'],
      ['Alt fire', 'LT'],
      ['Dash', 'A'],
      ['Swap weapon', 'Y / LB / RB'],
      ['Pause', 'Start'],
      ['Menus', 'D-pad, A, B'],
    ],
  },
  touch: {
    title: 'Touch',
    lines: [
      ['Move', 'Left stick'],
      ['Aim / fire', 'Right stick'],
      ['Alt fire', 'Fire button'],
      ['Dash', 'Dash button'],
      ['Swap weapon', 'Swap button'],
      ['Pause', 'Top right'],
      ['Menus', 'Tap'],
    ],
  },
};

export const DEVICE_ORDER: readonly InputDevice[] = ['keyboard', 'gamepad', 'touch'];
