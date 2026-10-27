"""Draws the hand-made crown frames into public/assets/extra/accessories-extra.png (16px frames, one per column).

Frames: 0 Stone Crown (ruins), 1 Sun Crown (desert), 2 Royal Crown (palace), 3 Shadow Crown (ultimate).
Each crown is drawn so its base sits on row 5 of the frame; the game offsets it per hero so it lands on the head.
Run: python tools/add_accessory_frames.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'public/assets/extra/accessories-extra.png'
OUTLINE = (63, 38, 49, 255)
COLORS = {
    'a': (192, 203, 220, 255), 'b': (132, 126, 135, 255), 'c': (90, 105, 136, 255), 'g': (91, 110, 225, 255),
    'Y': (251, 242, 54, 255), 'y': (251, 191, 54, 255), 'o': (223, 113, 38, 255), 'O': (255, 150, 40, 255),
    'R': (232, 69, 55, 255), 'B': (99, 155, 255, 255), 'W': (255, 255, 255, 255),
    'P': (140, 80, 200, 255), 'p': (96, 48, 140, 255), 'k': (48, 28, 72, 255), 'M': (230, 90, 230, 255),
}

# 8 columns wide (frame x 4..11), 5 rows tall (frame y 1..5). '.' is transparent.
CROWNS = [
    ['aa.aa.aa', 'abbabbab', 'aaaaaaaa', 'abagagab', 'cccccccc'],
    ['O..YY..O', 'OY.YY.YO', 'YYYYYYYY', 'yOyOOyOy', 'oooooooo'],
    ['...YY...', 'Y.YRRY.Y', 'YYYRRYYY', 'yBYYYYBy', 'oyoyyoyo'],
    ['P..PP..P', 'PP.pp.PP', 'PPpkkpPP', 'pkMkkMkp', 'kkkkkkkk'],
]


def draw(rows: list) -> dict:
    px = {}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                px[(4 + x, 1 + y)] = COLORS[ch]
    result = dict(px)
    for (x, y) in px:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                p = (x + dx, y + dy)
                if p not in px and 0 <= p[0] < 16 and 0 <= p[1] < 16:
                    result[p] = OUTLINE
    return result


def main() -> None:
    out = Image.new('RGBA', (16 * len(CROWNS), 16), (0, 0, 0, 0))
    for column, rows in enumerate(CROWNS):
        for (x, y), colour in draw(rows).items():
            out.putpixel((column * 16 + x, y), colour)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT)


main()
