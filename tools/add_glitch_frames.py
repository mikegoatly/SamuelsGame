"""Draws the hand-made Glitch sprites.

public/assets/extra/glitch-extra.png (12 columns of 16px tiles):
0 Glitch the Glitcher (hero), 1 missing-texture floor tile, 2 corrupt tile variant (broken checker with scanline gaps),
3 Missing Texture boss idle, 4 boss hurt/angry, 5 fake copy (hollow checker ring, no face).
Run: python tools/add_glitch_frames.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image

EXTRA = Path(__file__).resolve().parent.parent / 'public/assets/extra'
OUTLINE = (63, 38, 49, 255)
# muted, slightly warm Kenney-style ramp; the outline colour doubles as the darkest tone, like the Tiny Dungeon heroes
COLOURS = {
    'a': OUTLINE, 'k': (38, 43, 68, 255),
    'd': (247, 194, 130, 255), 'f': (225, 154, 101, 255),                              # skin, skin shade
    'c': (189, 108, 74, 255), 'b': (118, 59, 54, 255),                                 # hair / boots, hair shade
    'e': (192, 203, 220, 255), 'E': (139, 155, 180, 255),                              # steel
    'H': (146, 172, 214, 255), 'B': (92, 120, 178, 255), 'S': (68, 70, 118, 255),      # denim blue: light, base, shade
    'x': (44, 42, 76, 255), 'T': (84, 70, 98, 255),                                    # screen, trousers
    'q': (96, 214, 222, 255), 'Q': (190, 244, 246, 255),                               # cyan accent
    'm': (206, 84, 170, 255), 'N': (240, 150, 215, 255),                               # magenta accent
}


def parse(rows, w=16, h=16):
    assert len(rows) == h and all(len(r) == w for r in rows), [(i, len(r)) for i, r in enumerate(rows) if len(r) != w]
    return {(x, y): COLOURS[ch] for y, row in enumerate(rows) for x, ch in enumerate(row) if ch != '.'}


# Rows follow the Rogue/Monk template: 10px head with face, narrower body, arms and hands at the sides, two feet.
# Glitch the Glitcher. Same body plan: screen face with cyan eyes, antenna, little arms and feet.
HERO = parse([
    '......aqqa......',
    '......aeea......',
    '....aaaaaaaa....',
    '...aaaaaaaaaa...',
    '..aaaSHHBBSaaa..',
    '..aaSHBBBBBSaa..',
    '..aaxxxxxxxxaa..',
    '..aaxxQxxxQxaa..',
    '..aaxxqxxxqxaa..',
    '..aaaxxqqqxaaa..',
    '.aaaHBBBBBBHaaa.',
    'aaaBHHBqBBBBSaaa',
    'aaeeSBBBBBBSeeaa',
    'aaeeaSBBBBSaeeaa',
    'aaaaaSSaaSSaaaaa',
    '.aaaaEEaaEEaaaa.',
])

BLACK = (20, 18, 28, 255)
MAGENTA = (214, 56, 190, 255)
SHINE = (244, 140, 226, 255)


def checker(x, y, shift=0):
    return MAGENTA if ((x + shift) // 4 + y // 4) % 2 == 0 else BLACK


# Missing texture: 4px magenta/black cells with a one-pixel highlight on the magenta ones.
MISSING = {(x, y): (SHINE if checker(x, y) == MAGENTA and x % 4 == 0 and y % 4 == 0 else checker(x, y)) for y in range(16) for x in range(16)}

# Corrupt variant: bands of rows slid sideways, transparent scanline gaps (the floor shows through) and a few stray cyan pixels.
SHIFTS = {0: 0, 1: 0, 2: 0, 3: 0, 4: 4, 5: 4, 6: 4, 7: 4, 8: 0, 9: 0, 10: 2, 11: 2, 12: 2, 13: 6, 14: 6, 15: 6}
GAPS = {5, 6, 11}
CORRUPT = {(x, y): checker(x, y, SHIFTS[y]) for y in range(16) for x in range(16) if y not in GAPS}
CORRUPT.update({(2, 5): COLOURS['q'], (3, 5): COLOURS['q'], (11, 11): COLOURS['q'], (12, 11): COLOURS['Q'], (7, 6): COLOURS['q']})

# The boss: a checker cube with a face. Light cells carry the runtime tint of whichever boss it is copying.
BOSS_LIGHT = (244, 128, 228, 255)
BOSS_DARK = (30, 24, 44, 255)
BOSS_EDGE = (10, 8, 16, 255)
WHITE = (250, 244, 252, 255)
CYAN = COLOURS['q']


def cube(face, dx=0, dy=0, hollow=False):
    out = {}
    for y in range(1, 15):
        for x in range(1, 15):
            if x in (1, 14) or y in (1, 14):
                out[(x + dx, y + dy)] = BOSS_EDGE
            elif 4 <= x <= 11 and 4 <= y <= 11:
                if not hollow:
                    out[(x + dx, y + dy)] = BOSS_DARK  # face plate
            else:
                out[(x + dx, y + dy)] = BOSS_LIGHT if ((x - 2) // 2 + (y - 2) // 2) % 2 == 0 else BOSS_DARK
    for (x, y), c in face.items():
        out[(x + dx, y + dy)] = c
    return out


def box(x0, y0, x1, y1, c):
    return {(x, y): c for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}


def merge(*parts):
    out = {}
    for p in parts:
        out.update(p)
    return out


IDLE_FACE = merge(
    box(5, 5, 6, 6, WHITE), box(9, 5, 10, 6, WHITE),                    # eyes
    {(6, 6): BOSS_EDGE, (9, 6): BOSS_EDGE},                             # pupils
    {(5, 9): WHITE, (10, 9): WHITE}, box(6, 10, 9, 10, WHITE),          # smile
    {(12, 2): CYAN, (13, 2): CYAN, (2, 13): CYAN, (3, 13): CYAN},       # glitch accent
)
ANGRY_FACE = merge(
    box(5, 6, 6, 6, WHITE), box(9, 6, 10, 6, WHITE),                    # squinting eyes
    {(5, 5): WHITE, (6, 5): BOSS_DARK, (9, 5): BOSS_DARK, (10, 5): WHITE},
    {(4, 4): WHITE, (5, 4): WHITE, (10, 4): WHITE, (11, 4): WHITE},     # angry brows
    box(5, 9, 10, 10, WHITE), {(6, 9): BOSS_DARK, (8, 9): BOSS_DARK, (7, 10): BOSS_DARK, (9, 10): BOSS_DARK},  # teeth
    {(12, 2): CYAN, (13, 2): CYAN, (13, 3): CYAN, (2, 12): CYAN, (2, 13): CYAN},
)
BOSS_IDLE = cube(IDLE_FACE)
BOSS_HURT = cube(ANGRY_FACE, dx=1)
BOSS_FAKE = cube({}, hollow=True)

FRAMES = [HERO, MISSING, CORRUPT, BOSS_IDLE, BOSS_HURT, BOSS_FAKE]


def sheet(frames, size, cols):
    rows = (len(frames) + cols - 1) // cols
    img = Image.new('RGBA', (cols * size, rows * size), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        ox, oy = (i % cols) * size, (i // cols) * size
        for (x, y), c in frame.items():
            if 0 <= x < size and 0 <= y < size:
                img.putpixel((ox + x, oy + y), c)
    return img


def main():
    EXTRA.mkdir(parents=True, exist_ok=True)
    sheet(FRAMES, 16, 12).save(EXTRA / 'glitch-extra.png')
    print(f'wrote glitch-extra.png ({len(FRAMES)} frames)')


if __name__ == '__main__':
    main()
