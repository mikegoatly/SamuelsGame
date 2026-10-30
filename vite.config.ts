import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** Lists every built file the game needs in dist/precache.json, so the service worker can make the installed app work offline. */
function precacheList(): Plugin {
  let outDir = 'dist';
  return {
    name: 'precache-list',
    apply: 'build',
    configResolved: (config) => {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle: () => {
      const files = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && !/\.txt$|^(sw\.js|precache\.json)$/.test(entry.name))
        .map((entry) => relative(outDir, resolve(entry.parentPath, entry.name)).split('\\').join('/'));
      writeFileSync(resolve(outDir, 'precache.json'), JSON.stringify(files));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [precacheList()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
