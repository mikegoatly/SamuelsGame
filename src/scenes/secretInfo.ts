import { glitchCard, minesCard, sewerCard } from '../content/cards';
import { heroKit } from '../content/heroes';
import type { CardData } from '../logic/itemCards';
import type { SaveData } from '../logic/save';
import { discoverGlitch, discoverMines, discoverSewer, GLITCH_NOTICE, MINES_NOTICE, queueGlitchNotice, queueMinesNotice, queueSewerNotice, SEWER_NOTICE, type SecretId } from '../logic/secrets';

interface SecretInfo {
  /** Level Select card that Climb down / Follow / Fall in opens (the level itself while it is playable). */
  level: string;
  found: (save: SaveData) => boolean;
  discover: (save: SaveData) => SaveData;
  queueNotice: (save: SaveData) => SaveData;
  notice: string;
  card: CardData;
}

/** Everything that differs between the secrets once their prompt is answered. */
export const SECRET_INFO: Record<SecretId, SecretInfo> = {
  sewer: { level: 'sewer', found: (s) => s.secrets.sewerFound, discover: (s) => discoverSewer(s, heroKit), queueNotice: queueSewerNotice, notice: SEWER_NOTICE, card: sewerCard },
  mines: { level: 'mines', found: (s) => s.secrets.minesFound, discover: (s) => discoverMines(s, heroKit), queueNotice: queueMinesNotice, notice: MINES_NOTICE, card: minesCard },
  glitch: { level: 'glitch', found: (s) => s.secrets.glitchFound, discover: discoverGlitch, queueNotice: queueGlitchNotice, notice: GLITCH_NOTICE, card: glitchCard },
};
