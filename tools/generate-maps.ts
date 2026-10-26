import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildTmj } from '../src/logic/map/mapBuilder';
import { THEMES } from '../src/logic/map/mapThemes';

const outDir = resolve(import.meta.dirname, '..', 'public', 'assets', 'maps');
mkdirSync(outDir, { recursive: true });
const compactNumbers = (json: string): string =>
  json.replace(/\[\s*(-?\d+(?:,\s*-?\d+)*)\s*\]/g, (_, nums: string) => `[${nums.replace(/\s+/g, '')}]`);

for (const theme of THEMES) {
  const file = join(outDir, `${theme.id}.tmj`);
  writeFileSync(file, `${compactNumbers(JSON.stringify(buildTmj(theme), null, 1))}\n`);
  console.log(`wrote ${file}`);
}
