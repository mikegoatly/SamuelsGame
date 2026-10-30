/** Smallest comfortable on-screen sizes (screen px) for a modal's text and tap targets. */
const MIN_TEXT_SCREEN_PX = 20;
export const MIN_BUTTON_SCREEN_PX = 44;
const BASE = { textSize: 16, buttonHeight: 30, panelWidth: 360 } as const;
const FONT_STEP = 16;
const SIDE_MARGIN = 8;

export interface PromptMetrics {
  textSize: number;
  titleSize: number;
  buttonHeight: number;
  panelWidth: number;
}

/**
 * Sizes for the secret prompt. `gamePerScreen` is game px per screen px: 1 or more means the canvas is shrunk to fit
 * (a phone), so text steps up in whole 16px font sizes and buttons grow to a thumb-sized 44 screen px.
 */
export function promptMetrics(gamePerScreen: number, gameWidth: number): PromptMetrics {
  const textSize = Math.max(1, Math.ceil((MIN_TEXT_SCREEN_PX * gamePerScreen) / FONT_STEP)) * FONT_STEP;
  const grow = textSize / BASE.textSize;
  return {
    textSize,
    titleSize: textSize + FONT_STEP,
    buttonHeight: Math.max(BASE.buttonHeight, Math.ceil(MIN_BUTTON_SCREEN_PX * gamePerScreen)),
    panelWidth: Math.floor(Math.min(gameWidth - SIDE_MARGIN * 2, BASE.panelWidth * grow)),
  };
}
