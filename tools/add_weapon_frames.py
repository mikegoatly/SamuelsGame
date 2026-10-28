"""Draws the hand-made weapon frames (0 bow, 1 arrow, 2 fist, 3 sludge slinger, 4 goo blob) into public/assets/extra/weapons-extra.png.

The game merges that strip into the Tiny Dungeon texture at load (frames 132-136), so Kenney's sheet stays stock.
Run: python tools/add_weapon_frames.py   (needs Pillow)
"""
import math
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'public/assets/extra/weapons-extra.png'
OUTLINE, STEEL, WOOD, LIGHT, RED, DARK_RED = (63, 38, 49, 255), (192, 203, 220, 255), (189, 108, 74, 255), (234, 165, 108, 255), (232, 69, 55, 255), (118, 59, 54, 255)
GOO, GOO_LIGHT, GOO_DARK = (122, 223, 74, 255), (196, 255, 140, 255), (62, 150, 56, 255)


def outlined(pixels: dict) -> dict:
    result = dict(pixels)
    for (x, y) in pixels:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                p = (x + dx, y + dy)
                if p not in pixels and 0 <= p[0] < 16 and 0 <= p[1] < 16:
                    result[p] = OUTLINE
    return result


def bow() -> dict:
    px = {}
    for step in range(0, 181, 4):
        a = math.radians(step)
        x, y = round(7.5 + 6.5 * math.cos(a)), round(11 - 8.5 * math.sin(a))
        px[(x, y)] = WOOD if step % 24 else LIGHT
    for x in range(2, 14):
        px[(x, 11)] = STEEL
    px[(7, 4)] = px[(8, 4)] = LIGHT
    return outlined(px)


def arrow() -> dict:
    px = {(7, y): LIGHT for y in range(4, 14)}
    px.update({(8, y): WOOD for y in range(4, 14)})
    for x, y in [(7, 0), (8, 0), (6, 1), (7, 1), (8, 1), (9, 1), (6, 2), (7, 2), (8, 2), (9, 2), (7, 3), (8, 3)]:
        px[(x, y)] = STEEL
    for x, y in [(6, 12), (9, 12), (6, 13), (9, 13), (5, 14), (10, 14), (7, 14), (8, 14)]:
        px[(x, y)] = RED
    return outlined(px)


def fist() -> dict:
    px = {}
    for y in range(3, 12):
        for x in range(3, 13):
            if (x in (3, 12) and y in (3, 11)):
                continue
            px[(x, y)] = RED
    for x in range(3, 13):
        px[(x, 3)] = LIGHT if x % 3 else RED
    for x in (5, 8, 11):
        for y in range(4, 7):
            px[(x, y)] = DARK_RED
    for x in range(4, 12):
        px[(x, 10)] = DARK_RED
    for y in range(12, 14):
        for x in range(4, 12):
            px[(x, y)] = STEEL
    return outlined(px)


def blob_shape(cx: float, cy: float, rx: float, ry: float) -> dict:
    px = {}
    for y in range(16):
        for x in range(16):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                px[(x, y)] = GOO
    for (x, y) in list(px):
        if (x + 1, y) not in px or (x, y + 1) not in px:
            px[(x, y)] = GOO_DARK
    return px


def slinger() -> dict:
    px = {(7, y): LIGHT for y in range(8, 15)}
    px.update({(8, y): WOOD for y in range(8, 15)})
    for x, y in [(6, 7), (9, 7), (5, 6), (10, 6), (5, 5), (10, 5), (5, 4), (10, 4)]:
        px[(x, y)] = WOOD
    px[(7, 7)], px[(8, 7)] = LIGHT, WOOD
    px.update(blob_shape(7.5, 4, 2.7, 2.7))
    px[(7, 3)] = GOO_LIGHT
    px[(8, 6)] = px[(8, 7)] = GOO
    return outlined(px)


def blob() -> dict:
    px = blob_shape(7.5, 8, 4.5, 4)
    px[(6, 6)] = px[(7, 6)] = px[(6, 7)] = GOO_LIGHT
    return outlined(px)


def main() -> None:
    arts = [bow(), arrow(), fist(), slinger(), blob()]
    out = Image.new('RGBA', (16 * len(arts), 16), (0, 0, 0, 0))
    for column, art in enumerate(arts):
        for (x, y), colour in art.items():
            out.putpixel((column * 16 + x, y), colour)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT)


main()
