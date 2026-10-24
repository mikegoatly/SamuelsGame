# Samuel's Game

Top-down twin-stick action game (Phaser 3 + TypeScript + Vite). See `docs/DESIGN.md`.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm test           # Vitest (pure logic in src/logic)
npm run typecheck
```

## Controls (M1)

| Action | Input |
|---|---|
| Move | WASD / arrow keys |
| Aim | Mouse |
| Fire | Left mouse button |
| Alt fire | Right mouse button (not wired to a weapon yet) |
| Dash | Space |

## Assets

Kenney CC0 assets are committed in `public/assets`, so the game runs without any script.
To re-copy them from the Kenney collection:

```
npm run copy-assets
# or, from another location:
KENNEY_DIR="D:\path\to\Kenney Game Assets All-in-1 3.0.0" npm run copy-assets
```

Frame indices for the Tiny Dungeon sheet are documented in `src/content/assetKeys.ts`.
