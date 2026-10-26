"""Draws the hand-made monster frames into public/assets/extra/monsters-extra.png (12 columns of 16px tiles).

The game loads that strip as its own spritesheet (Tex.monsters), so Kenney's tile sheet stays stock.
Frames: 0 rat, 1 bomb beetle, 2 skeleton archer, 3 wisp, 4 shark fin, 5 sand shark, 6 fire imp, 7 dust devil, 8 gargoyle, 9 cactus turret.
Run: python tools/add_monster_frames.py   (needs Pillow)
"""
import math
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'public/assets/extra/monsters-extra.png'
OUTLINE = (63, 38, 49, 255)
COLOURS = {
    'b': (150, 110, 80, 255), 'd': (100, 70, 60, 255), 'l': (200, 160, 120, 255), 'w': (240, 240, 235, 255),
    'k': (30, 24, 34, 255), 'r': (222, 70, 60, 255), 'y': (250, 210, 80, 255), 'p': (240, 150, 160, 255),
    'g': (96, 170, 90, 255), 'G': (60, 120, 70, 255), 'c': (120, 220, 240, 255), 'C': (60, 160, 200, 255),
    's': (150, 160, 180, 255), 'S': (100, 110, 135, 255), 'o': (230, 120, 50, 255), 't': (215, 190, 130, 255),
    'T': (175, 145, 95, 255), 'm': (140, 40, 50, 255), 'n': (225, 200, 160, 255), 'a': (90, 60, 40, 255),
}


def parse(rows):
    return {(x, y): COLOURS[ch] for y, row in enumerate(rows) for x, ch in enumerate(row) if ch != '.'}


def mirrored(half):
    return [row + row[::-1] for row in half]


def outlined(pixels):
    result = dict(pixels)
    for (x, y) in pixels:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                p = (x + dx, y + dy)
                if p not in pixels and 0 <= p[0] < 16 and 0 <= p[1] < 16:
                    result[p] = OUTLINE
    return result


RAT = parse([
    '................',
    '................',
    '................',
    '................',
    '.........pp.....',
    '........bbbp....',
    '.......bbbbbb...',
    '..dd..bbbbkbbw..',
    '.d..dbbbbbbbbbp.',
    'd....bbbbbbbbb..',
    '.....bbbbbbbb...',
    '......dbb.dbb...',
    '......dd..dd....',
    '................',
    '................',
    '................',
])

BEETLE = parse([
    '................',
    '.......y........',
    '......yry.......',
    '.......a........',
    '.....dddddd.....',
    '....dmmmmmmd....',
    '...dmmmrrmmmd...',
    '.a.dmmrrrrmmd.a.',
    '..adrmrrrrmrda..',
    '.a.dmmmrrmmmd.a.',
    '..adrmmmmmmrda..',
    '.a.dmmmmmmmmd.a.',
    '...ddmmmmmmdd...',
    '....dddddddd....',
    '.....a....a.....',
    '................',
])

SKELETON = parse([
    '................',
    '......wwww......',
    '.....wwwwww.....',
    '.....wkwwkw.....',
    '.....wwwwww.....',
    '......wkkw......',
    '.....wwwwww..a..',
    '....wwwwwwww.ay.',
    '....w.wwww.w.a.y',
    '....w.wwww.waw.y',
    '......wwww..a.y.',
    '......w..w..aa..',
    '.....ww..ww.....',
    '.....w....w.....',
    '....ww....ww....',
    '................',
])

WISP = parse([
    '................',
    '................',
    '.....cccc.......',
    '....cwwwwc......',
    '...cwwwwwwcc....',
    '...cwwkwwkwc....',
    '..cwwwwwwwwwc...',
    '...cwwwwwwwcC...',
    '....cwwwwwcC....',
    '.....cwwwcC.....',
    '......ccCC.c....',
    '.......CC.C.....',
    '........C.......',
    '................',
    '................',
    '................',
])

FIN = parse([
    '................',
    '................',
    '................',
    '.........S......',
    '........SS......',
    '.......SSs......',
    '......SSss......',
    '.....SSsss......',
    '....SSssss......',
    '...SSsssss......',
    '..SSSSSSSSS.....',
    '.tTtttTttTttT...',
    '................',
    '................',
    '................',
    '................',
])

SHARK = parse([
    '................',
    '.....S..........',
    '....Ss..........',
    '...SSsS.........',
    '..SSssssSSSS....',
    '.SSsssssssssSS..',
    'SSsssswssssssSS.',
    'SsssssssssssssS.',
    '.SsssssssssSSS..',
    '..wwwwwwwwwwS...',
    '...SwSwSwSwS....',
    '...S.S.S.S......',
    '................',
    '................',
    '................',
    '................',
])

IMP = parse([
    '................',
    '..r.........r...',
    '..rr.......rr...',
    '...rrrrrrrrr....',
    '...rrrrrrrrr....',
    '...rywrrwyrr....',
    '...rrrrrrrrr....',
    '....rkmmmkr.....',
    '.y...rrrrr..y...',
    '.yy.rrrrrrr.yy..',
    '..yyrrrrrrryy...',
    '...y.rrrrr.y....',
    '.....rr.rr......',
    '....oyy.yyo.....',
    '................',
    '................',
])

GARGOYLE = parse(mirrored([
    '........',
    '.....S..',
    '..S.SS.S',
    '.SS.SSSS',
    '.SSSSSSS',
    '.SsSSSrS',
    '..SSSSSS',
    '..SSSSSS',
    '..SsssSS',
    '..SSSSSS',
    '...SSsss',
    '...SSsss',
    '...SS.SS',
    '...S...S',
    '..SS..SS',
    '........',
]))


def circle_pixels(cx, cy, r, colour):
    return {(x, y): colour for x in range(16) for y in range(16) if (x - cx) ** 2 + (y - cy) ** 2 <= r * r}


def devil():
    px = {}
    for y in range(1, 15):
        width = 13 - y * 0.55
        shift = math.sin(y * 0.9) * 2
        for x in range(16):
            if abs(x - 7.5 - shift) <= width / 2:
                px[(x, y)] = COLOURS['t'] if (y + (x > 7)) % 3 else COLOURS['T']
    return px


def cactus():
    px = {}
    for y in range(3, 14):
        for x in range(6, 10):
            px[(x, y)] = COLOURS['g'] if x < 8 else COLOURS['G']
    for x, y0 in ((3, 5), (12, 4)):
        for y in range(y0, y0 + 3):
            for xx in (x, x + 1):
                px[(xx, y)] = COLOURS['g']
    for x in range(3, 6):
        px[(x, 8)] = COLOURS['g']
        px[(x, 9)] = COLOURS['g']
    for x in range(10, 13):
        px[(x, 8)] = COLOURS['G']
        px[(x, 9)] = COLOURS['G']
    for spot in ((7, 5), (8, 8), (7, 11), (4, 5), (13, 4), (9, 11)):
        px[spot] = COLOURS['y']
    for x in range(5, 11):
        px[(x, 13)] = COLOURS['T']
    return px


def main() -> None:
    arts = [RAT, BEETLE, SKELETON, WISP, FIN, SHARK, IMP, devil(), GARGOYLE, cactus()]
    out = Image.new('RGBA', (16 * 12, 16), (0, 0, 0, 0))
    for column, art in enumerate(arts):
        for (x, y), colour in outlined(art).items():
            out.putpixel((column * 16 + x, y), colour)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT)


main()
