"""Draws the hand-made floor props into public/assets/extra/props-extra.png (16px frames, one per column).

Frames: 0 grate backing (dark pit), 1 grate bars (rusty frame and bars, see-through between them),
2 eyes open, 3 eyes narrowed (mid-blink). Layer them backing -> eyes -> bars so the eyes glow from under the bars.
Run: python tools/add_prop_frames.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'public/assets/extra/props-extra.png'
FRAMES = 4
PIT = (12, 18, 14, 255)
PIT_DEEP = (6, 10, 8, 255)
RUST = (150, 84, 44, 255)
RUST_DARK = (92, 50, 30, 255)
RUST_LIGHT = (196, 124, 68, 255)
EYE = (200, 255, 96, 255)
EYE_GLOW = (84, 150, 48, 255)
BAR_COLUMNS = (3, 6, 9, 12)
EYE_COLUMNS = (4, 10)


def pit(img: Image.Image, ox: int) -> None:
    for y in range(16):
        for x in range(16):
            img.putpixel((ox + x, y), PIT_DEEP if x in (1, 14) or y in (1, 14) else PIT)


def bars(img: Image.Image, ox: int) -> None:
    for y in range(16):
        for x in range(16):
            edge = x in (0, 15) or y in (0, 15)
            if edge:
                img.putpixel((ox + x, y), RUST_DARK if x in (15,) or y == 15 else RUST_LIGHT if y == 0 else RUST)
            elif x in BAR_COLUMNS:
                img.putpixel((ox + x, y), RUST if x in (3, 9) else RUST_DARK)
    for x, y in ((1, 1), (14, 1), (1, 14), (14, 14)):
        img.putpixel((ox + x, y), RUST_LIGHT)


def eyes(img: Image.Image, ox: int, open_: bool) -> None:
    for cx in EYE_COLUMNS:
        rows = {8: EYE, 9: EYE} if open_ else {9: EYE_GLOW}
        for y, colour in rows.items():
            for dx in (0, 1):
                img.putpixel((ox + cx + dx, y), colour)
        if open_:
            for dx in (0, 1):
                img.putpixel((ox + cx + dx, 7), EYE_GLOW)
                img.putpixel((ox + cx + dx, 10), EYE_GLOW)


def main() -> None:
    out = Image.new('RGBA', (16 * FRAMES, 16), (0, 0, 0, 0))
    pit(out, 0)
    bars(out, 16)
    eyes(out, 32, True)
    eyes(out, 48, False)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT)


main()
