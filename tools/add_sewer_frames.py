"""Draws the hand-made sewer frames into public/assets/extra/sewer-extra.png (12 columns of 16px tiles).

Frames: 0 slime, 1 slime squash, 2 big slime, 3 big slime squash, 4 slime boss, 5 slime boss angry, 6 toad, 7 toad leaping,
8 gator, 9 gator jaws open, 10 mushroom, 11 mushroom puffing, 12 javelin (tip right), 13 glob, 14 splash, 15-17 gas puffs,
18 pipe spitter, 19 pipe spitter firing.
Run: python tools/add_sewer_frames.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'public/assets/extra/sewer-extra.png'
OUTLINE = (63, 38, 49, 255)
COLOURS = {
    'a': (90, 60, 40, 255), 'b': (150, 110, 80, 255), 'd': (100, 70, 60, 255), 'w': (240, 240, 235, 255),
    'k': (30, 24, 34, 255), 'r': (222, 70, 60, 255), 'y': (250, 210, 80, 255), 'm': (140, 40, 50, 255),
    'n': (225, 200, 160, 255), 'T': (175, 145, 95, 255), 's': (150, 160, 180, 255), 'S': (100, 110, 135, 255),
    'g': (96, 170, 90, 255), 'G': (60, 120, 70, 255),
    # added for the sewer set
    'e': (140, 205, 90, 255), 'h': (214, 245, 170, 255),            # slime light, slime glint
    'q': (52, 128, 130, 255), 'Q': (30, 86, 100, 255), 'u': (120, 205, 195, 255),  # boss teal body, shade, bubbles
    'v': (128, 120, 62, 255), 'V': (88, 82, 44, 255), 'j': (176, 164, 96, 255),    # toad / gator olive, shade, wart/belly
    'x': (176, 214, 150, 255), 'X': (128, 176, 112, 255), 'z': (218, 240, 200, 255),  # gas tones
    'B': (112, 62, 56, 255), 'D': (78, 44, 50, 255),                # brick
}


def parse(rows):
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), [len(r) for r in rows]
    return {(x, y): COLOURS[ch] for y, row in enumerate(rows) for x, ch in enumerate(row) if ch != '.'}


def outlined(pixels):
    result = dict(pixels)
    for (x, y) in pixels:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                p = (x + dx, y + dy)
                if p not in pixels and 0 <= p[0] < 16 and 0 <= p[1] < 16:
                    result[p] = OUTLINE
    return result


def blob(cx, cy, rx, ry, base, shade, light):
    px = {}
    for y in range(16):
        for x in range(16):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                px[(x, y)] = base
    bottom = max(y for _, y in px)
    for (x, y) in list(px):
        if y >= bottom - 1 or (y == bottom - 2 and x > cx + 1):
            px[(x, y)] = shade
        elif x < cx - rx * 0.4 and y < cy - ry * 0.2:
            px[(x, y)] = light
    return px


def put(px, rows, ox=0, oy=0):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                px[(ox + x, oy + y)] = COLOURS[ch]
    return px


def slime(cx, cy, rx, ry, eyes, glint, drip=None):
    px = blob(cx, cy, rx, ry, COLOURS['g'], COLOURS['G'], COLOURS['e'])
    for (x, y) in glint:
        px[(x, y)] = COLOURS['h']
    for (x, y) in eyes:
        px[(x, y)] = COLOURS['w']
        px[(x, y + 1)] = COLOURS['k']
    for p in drip or []:
        px[p] = COLOURS['g']
    return outlined(px)


SLIME = slime(7.5, 10, 5, 4, [(5, 8), (9, 8)], [(4, 7), (5, 7), (4, 8)])
SLIME_SQUASH = slime(7.5, 11, 6, 3, [(5, 10), (9, 10)], [(3, 9), (4, 9), (5, 9)])
SLIME_BIG = slime(7.5, 9, 6.5, 6, [(4, 7), (10, 7)], [(3, 5), (4, 4), (5, 4), (3, 6)])
for p, c in {(11, 5): 'h', (9, 11): 'h', (5, 11): 'e', (6, 11): 'e', (12, 11): 'e', (6, 6): 'e'}.items():
    SLIME_BIG[p] = COLOURS[c]
SLIME_BIG[(7, 11)] = COLOURS['k']; SLIME_BIG[(8, 11)] = COLOURS['k']
SLIME_BIG_SQUASH = slime(7.5, 11, 7.5, 4, [(3, 9), (11, 9)], [(2, 8), (3, 8), (4, 8), (2, 9)])
SLIME_BIG_SQUASH[(7, 12)] = COLOURS['k']; SLIME_BIG_SQUASH[(8, 12)] = COLOURS['k']
for p in [(5, 12), (11, 10)]:
    SLIME_BIG_SQUASH[p] = COLOURS['e']


def boss(angry):
    px = blob(7.5, 10, 6.5, 5, COLOURS['q'], COLOURS['Q'], COLOURS['u'])
    px = {p: (COLOURS['q'] if c == COLOURS['u'] else c) for p, c in px.items()}
    for p in [(4, 12), (5, 12), (4, 13), (10, 11), (11, 11), (10, 12), (8, 9), (3, 8)]:
        px[p] = COLOURS['u']
    for p in [(5, 12), (11, 11)]:
        px[p] = COLOURS['h']
    for p in [(3, 6), (4, 5)]:
        px[p] = COLOURS['u']
    put(px, [
        'y..y..yy..y..y',
        'yy.yy.yy.yy.yy',
        'yyyyyyyyyyyyyy',
    ], 1, 2)
    px[(4, 4)] = COLOURS['y']; px[(11, 4)] = COLOURS['y']
    if angry:
        put(px, [
            'kk......kk',
            '.kkw..wkk.',
            '..kk..kk..',
        ], 3, 6)
        for x in (5, 10):
            px[(x, 8)] = COLOURS['r']
        put(px, ['wkwkwkw', 'kmmmmmk', '.kmmmk.'], 4, 10)
        px[(7, 7)] = COLOURS['y']; px[(8, 7)] = COLOURS['y']
    else:
        put(px, [
            'ww....ww',
            'kk....kk',
        ], 4, 7)
        px[(7, 8)] = COLOURS['k']; px[(8, 8)] = COLOURS['k']
        px[(6, 10)] = COLOURS['k']; px[(7, 11)] = COLOURS['k']; px[(8, 11)] = COLOURS['k']; px[(9, 10)] = COLOURS['k']
        px[(7, 5)] = COLOURS['r']; px[(8, 5)] = COLOURS['r']
    return outlined(px)


BOSS = boss(False)
BOSS_ANGRY = boss(True)

TOAD = outlined(parse([
    '................',
    '................',
    '................',
    '....vv....vv....',
    '...vyyv..vyyv...',
    '...vykv..vkyv...',
    '..vvvvvvvvvvvv..',
    '.vvjvvvvvvvvjvv.',
    '.vvvvVVVVVVvvvv.',
    'vvvjvvVVVVvvjvvv',
    'vvvvvvvvvvvvvvvv',
    'vVvvvjjjjjjvvvVv',
    'VVVvvjjjjjjvvVVV',
    'VVV.vvvvvvvv.VVV',
    '.VV..........VV.',
    '................',
]))

TOAD_LEAP = outlined(parse([
    '................',
    '................',
    '.......vv.vv....',
    '......vyyvyyv...',
    '......vkyvkyv...',
    '.....vvvvvvvv...',
    '....vvjvvvvjvv..',
    '...VVvvvvvvvvvVV',
    '..VV.vvjjjjvvVV.',
    '.VV..vvjjjjvv...',
    'VV....vvvvvv....',
    'VV..............',
    '................',
    '................',
    '................',
    '................',
]))

GATOR = outlined(parse([
    '................',
    '................',
    '................',
    '................',
    '..V..V..V..yy...',
    '.GGGGGGGGGGGGG..',
    'GGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGG',
    '.ggggggggGGGGGGG',
    '..ggggggggwGwGwG',
    '...gggggggGGGGG.',
    '..VV..VV........',
    '................',
    '................',
    '................',
    '................',
]))

GATOR_OPEN = outlined(parse([
    '................',
    '................',
    '................',
    '..V..V..V..yy.GG',
    '.GGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGwGwG',
    'GGGGGGGGGGGmmmmm',
    'GGGGGGGGGGmmrrmm',
    '.ggggggggmmmmmmm',
    '..gggggggggwGwGw',
    '..ggggggggGGGGGG',
    '..VV..VV..GGGG..',
    '................',
    '................',
    '................',
    '................',
]))

MUSHROOM = outlined(parse([
    '................',
    '.....rrrrrr.....',
    '...rrrrwwrrrr...',
    '..rrwwrrrrrrrr..',
    '.rrwwwrrrrwwrrr.',
    '.rrrwrrrrrwwwrr.',
    '.rrrrrrrrrrwrrr.',
    '.mmmmmmmmmmmmmm.',
    '...nnnnnnnnnn...',
    '...nknnnnnnkn...',
    '...nwnnnnnnwn...',
    '...nnnnmmnnnn...',
    '....nnnnnnnn....',
    '....nn....nn....',
    '...TT......TT...',
    '................',
]))

MUSHROOM_PUFF = outlined(parse([
    '..x.....x.x.....',
    '.....x.......x..',
    '..rrrrrrrrr.....',
    '.rrwwrrrrrrr....',
    'rrwwwrrrrwwrr...',
    'rrrwrrrrrwwwr...',
    'mmmmmmmmmmmmmm..',
    '..nnnnnnnnnn....',
    '..nknnnnnnkn....',
    '..nwnnnnnnwn....',
    '..nnnmmmmnnn....',
    '...nnmkkmnn.....',
    '...nnnnnnnn.....',
    '...nn....nn.....',
    '..TT......TT....',
    '................',
]))

JAVELIN = outlined(parse([
    '................',
    '................',
    '................',
    '................',
    '................',
    '..........s.....',
    '.r.........ss...',
    'rrrbbbbbbbsssss.',
    'rrrbbbbbbbbsssS.',
    '.r.aaaaaaasss...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
]))

GLOB = outlined(put({}, [
    '..gggggg..',
    '.ghhggggg.',
    'ghhgggggeg',
    'ghggggggeg',
    'gggggagggg',
    'gggggggggg',
    'ggggggagGg',
    '.gggggGGG.',
    '..GGGGGG..',
], 3, 4))

SPLASH = put({}, [
    '................',
    '..h.....h...e...',
    '................',
    '.....h..e.......',
    '.e.....g....h...',
    '......ggg.......',
    '..h..gghgg..e...',
    '.....ggggg......',
    '......ggg.......',
    '.e..h.....h.....',
    '.......e........',
    '..h........e....',
    '................',
    '................',
    '................',
    '................',
])
SPLASH = {p: c for p, c in SPLASH.items()}

GAS_A = parse([
    '................',
    '................',
    '.....xx..xx.....',
    '....xzzxxzzx....',
    '...xzzzzzzzzx...',
    '..xxzzzxxzzzxx..',
    '..xzzzxXXxzzzx..',
    '.xxzzxXXXXxzzxx.',
    '..xzzzxXXxzzzx..',
    '..xxzzzxxzzzxx..',
    '...xzzzzzzzxx...',
    '....xxzzzxx.....',
    '.....xxxxx......',
    '................',
    '................',
    '................',
])

GAS_B = parse([
    '................',
    '................',
    '................',
    '..xx.....xxx....',
    '.xzzxx..xzzzx...',
    '.xzzzzxxzzzzzx..',
    'xxzzzzzzzXzzzxx.',
    'xzzzzXzzzzzzzzx.',
    'xzzzzzzzzzzxzzx.',
    '.xzzzzzXzzzzzxx.',
    '..xxzzzzzzzxxx..',
    '....xxxxxxxx....',
    '................',
    '................',
    '................',
    '................',
])

GAS_C = parse([
    '................',
    '......xx........',
    '.....xzzx.......',
    '....xzzzzxx.....',
    '...xxzzzzzzx.x..',
    '..xzzzzXzzzzxzx.',
    '..xzzzzzzzzzzzx.',
    '.xxzzzzzzXzzzxx.',
    '.xzzXzzzzzzzxx..',
    '..xzzzzzzzxx....',
    '..xxxzzzxxx.....',
    '.....xxxx.......',
    '................',
    '................',
    '................',
    '................',
])


def pipe(firing):
    px = {}
    for y in range(16):
        for x in range(16):
            d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
            if d <= 7.2:
                px[(x, y)] = COLOURS['S'] if d > 6.2 else (COLOURS['s'] if d > 5.0 else COLOURS['k'])
    for p in [(4, 3), (5, 2), (6, 2), (3, 4)]:
        px[p] = COLOURS['w']
    if firing:
        put(px, [
            '..yyyy..yyyy..',
            '...yyy..yyy...',
        ], 1, 6)
        put(px, [
            '.gg.',
            'ghgg',
            'gggg',
            '.GG.',
        ], 6, 8)
    else:
        put(px, [
            'yyy..yyy',
            'yky..yky',
            'yyy..yyy',
        ], 4, 6)
        for x in (4, 5, 6, 9, 10, 11):
            px[(x + 0, 6)] = COLOURS['y']
        put(px, ['yy....yy'], 4, 9)
    return outlined({p: c for p, c in px.items()})


def pipe_clean(firing):
    px = {}
    for y in range(16):
        for x in range(16):
            d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
            if d <= 7.2:
                px[(x, y)] = COLOURS['S'] if d > 6.2 else (COLOURS['s'] if d > 5.0 else COLOURS['k'])
    for p in [(4, 3), (5, 2), (6, 2), (3, 4), (2, 5)]:
        px[p] = COLOURS['w']
    if firing:
        put(px, ['yyy..yyy'], 4, 6)
        put(px, ['.gg.', 'ghgg', 'gggg', '.GG.'], 6, 8)
    else:
        put(px, ['yyy..yyy', 'yky..yky', 'yyy..yyy'], 4, 6)
    return outlined(px)


PIPE = pipe_clean(False)
PIPE_FIRE = pipe_clean(True)

FRAMES = [SLIME, SLIME_SQUASH, SLIME_BIG, SLIME_BIG_SQUASH, BOSS, BOSS_ANGRY, TOAD, TOAD_LEAP, GATOR, GATOR_OPEN,
          MUSHROOM, MUSHROOM_PUFF, JAVELIN, GLOB, SPLASH, GAS_A, GAS_B, GAS_C, PIPE, PIPE_FIRE]


def main():
    cols = 12
    rows = (len(FRAMES) + cols - 1) // cols
    img = Image.new('RGBA', (cols * 16, rows * 16), (0, 0, 0, 0))
    for i, frame in enumerate(FRAMES):
        ox, oy = (i % cols) * 16, (i // cols) * 16
        for (x, y), c in frame.items():
            if 0 <= x < 16 and 0 <= y < 16:
                img.putpixel((ox + x, oy + y), c)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT)
    print(f'wrote {OUT} ({len(FRAMES)} frames)')


if __name__ == '__main__':
    main()
