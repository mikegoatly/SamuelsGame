export type InputDevice = 'keyboard' | 'gamepad' | 'touch';

export const deviceForPointer = (pointerType: string): InputDevice => (pointerType === 'touch' || pointerType === 'pen' ? 'touch' : 'keyboard');

export const defaultDevice = (coarsePointer: boolean): InputDevice => (coarsePointer ? 'touch' : 'keyboard');
