import Phaser from 'phaser';
import { promptMetrics } from '../logic/promptLayout';
import { gameText } from './gameText';
import { MenuButton } from './MenuButton';
import { menuText } from './menuText';

export interface ConfirmPanelOptions {
  title: string;
  question: string;
  yes: string;
  no: string;
  border: number;
  titleColor: string;
  onYes: () => void;
  onNo: () => void;
}

/** A dimmed backdrop and a centred panel with a question and two buttons, sized for phones. Returns [yes, no]. */
export function buildConfirmPanel(scene: Phaser.Scene, options: ConfirmPanelOptions): [MenuButton, MenuButton] {
  const { width, height } = scene.scale;
  const m = promptMetrics(scene.scale.displayScale.x, width);
  const cx = width / 2;
  const cy = height / 2;
  const pad = Math.round((m.textSize * 3) / 4);
  scene.add.rectangle(cx, cy, width, height, 0x14121c, 0.75);
  const panel = scene.add.rectangle(cx, cy, m.panelWidth, 0, 0x2a2540).setStrokeStyle(4, options.border);
  const title = menuText(scene, cx, 0, options.title, m.titleSize, options.titleColor);
  const question = gameText(scene, cx, 0, options.question, m.textSize, { color: '#d8d8e8' })
    .setOrigin(0.5, 0)
    .setWordWrapWidth(m.panelWidth - pad * 2)
    .setAlign('center');
  const panelHeight = pad + title.height + pad / 2 + question.height + pad + m.buttonHeight + pad;
  const top = cy - panelHeight / 2;
  panel.setSize(m.panelWidth, panelHeight);
  title.setY(top + pad + title.height / 2);
  question.setY(title.y + title.height / 2 + pad / 2);
  const gap = Math.max(8, pad / 2);
  const buttonWidth = Math.floor((m.panelWidth - pad * 2 - gap) / 2);
  const buttonY = top + panelHeight - pad - m.buttonHeight / 2;
  const yes = new MenuButton(scene, cx - (buttonWidth + gap) / 2, buttonY, buttonWidth, m.buttonHeight, options.yes, options.onYes, m.textSize);
  const no = new MenuButton(scene, cx + (buttonWidth + gap) / 2, buttonY, buttonWidth, m.buttonHeight, options.no, options.onNo, m.textSize);
  return [yes, no];
}
