import type { InputDevice } from '../logic/device';

export interface ControlsPanel {
  title: string;
  lines: ReadonlyArray<readonly [action: string, how: string]>;
}

export const GOAL_LINES = [
  'Fight through the rooms, then defeat each boss to clear the level.',
  'Kill monsters to level up and pick up gold, potions and gems. Spend them at the Camp on upgrades, skills and potions.',
  "Don't rush ahead: monsters far above your level hit hard and barely feel your attacks.",
];

export const CONTROLS_HELP: Record<InputDevice, ControlsPanel> = {
  keyboard: {
    title: 'Keyboard + mouse',
    lines: [
      ['Move', 'W A S D'],
      ['Aim / fire', 'Mouse / left click'],
      ['Skill 1', 'Right click / 1'],
      ['Skill 2', 'E / 2'],
      ['Skill 3', 'R / 3'],
      ['Dash', 'Space'],
      ['Potion', 'F'],
      ['Pause', 'Esc'],
      ['Mute', 'M'],
    ],
  },
  gamepad: {
    title: 'Gamepad',
    lines: [
      ['Move', 'Left stick'],
      ['Aim / fire', 'Right stick / RT'],
      ['Skill 1', 'LT'],
      ['Skill 2', 'RB'],
      ['Skill 3', 'LB'],
      ['Dash', 'A'],
      ['Potion', 'Y'],
      ['Pause', 'Start'],
      ['Menus', 'D-pad, A, B'],
    ],
  },
  touch: {
    title: 'Touch',
    lines: [
      ['Move', 'Left stick'],
      ['Aim / fire', 'Right stick'],
      ['Skill 1', 'Button 1'],
      ['Skill 2', 'Button 2'],
      ['Skill 3', 'Button 3'],
      ['Dash', 'Dash button'],
      ['Potion', 'Potion button'],
      ['Pause', 'Top right'],
      ['Menus', 'Tap'],
    ],
  },
};

export const DEVICE_ORDER: readonly InputDevice[] = ['keyboard', 'gamepad', 'touch'];
