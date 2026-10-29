"""Draws the hand-made Crystal Mines frames.

public/assets/extra/mines-extra.png (12 columns of 16px tiles):
0 Nab idle, 1 Nab run, 2 Nab hit, 3 Nab wave, 4 Goblin Miner, 5 Goblin Miner throw, 6 pickaxe (head right),
7 Hookjaw Spider, 8 Hookjaw Spider rearing, 9 Crystal Beetle (facing right), 10 Crystal Beetle shell glint,
11 Rock Mole, 12 dirt mound, 13 Shard Wisp, 14 Shard Wisp flicker, 15 Bert's Pebble, 16 Bert's Pebble block,
17 blue crystal cluster, 18 violet crystal cluster, 19 resonating crystal, 20 crystal pillar top (32 is its bottom),
21 small crystal spike, 22 stalactite, 23 minecart, 24-26 magic gate, 27 Crystal Scepter, 28 scepter bolt,
29 stuck shard, 30 encased block, 31 shatter shard, 32 crystal pillar bottom.

public/assets/extra/bert.png (32px frames, one row):
0 Bert, 1 Bert angry, 2-5 plate overlays (front red, back yellow, left green, right blue), 6 rolled ball,
7 stunned, 8 happy little rocks.
Run: python tools/add_mines_frames.py   (needs Pillow)
"""
import math
from pathlib import Path
from PIL import Image

EXTRA = Path(__file__).resolve().parent.parent / 'public/assets/extra'
OUTLINE = (63, 38, 49, 255)
COLOURS = {
    'k': (30, 24, 34, 255), 'w': (240, 240, 235, 255), 'p': (240, 150, 160, 255),
    'r': (222, 70, 60, 255), 'm': (140, 40, 50, 255), 'R': (255, 150, 120, 255),
    'y': (250, 210, 80, 255), 'Y': (200, 145, 50, 255), 'A': (255, 244, 170, 255),
    'b': (150, 110, 80, 255), 'a': (90, 60, 40, 255), 'l': (200, 160, 120, 255),
    's': (150, 160, 180, 255), 'S': (100, 110, 135, 255), 'z': (66, 72, 96, 255),
    # added for the mines set
    'g': (96, 170, 90, 255), 'G': (60, 120, 70, 255), 'e': (150, 214, 100, 255),       # goblin green
    'C': (70, 140, 235, 255), 'c': (150, 210, 255, 255), 'N': (40, 70, 160, 255),      # crystal blue
    'W': (232, 250, 255, 255),                                                          # crystal core
    'V': (150, 90, 225, 255), 'v': (205, 165, 255, 255), 'P': (88, 48, 150, 255),      # crystal violet
    'q': (60, 215, 225, 255), 'Q': (185, 255, 250, 255), 'u': (30, 135, 160, 255),     # crystal cyan
    'K': (54, 44, 72, 255), 'H': (96, 84, 120, 255),                                   # spider
    'f': (128, 100, 90, 255), 'F': (88, 66, 62, 255),                                  # mole fur
    't': (128, 140, 168, 255), 'L': (178, 190, 214, 255), 'T': (86, 96, 126, 255),     # golem rock
    'j': (80, 200, 110, 255), 'J': (40, 130, 70, 255), 'i': (175, 245, 175, 255),      # green plate
}


def parse(rows, w=16, h=16):
    assert len(rows) == h and all(len(r) == w for r in rows), [len(r) for r in rows]
    return {(x, y): COLOURS[ch] for y, row in enumerate(rows) for x, ch in enumerate(row) if ch != '.'}


def mirrored(half):
    return [row + row[::-1] for row in half]


def outlined(pixels, w=16, h=16):
    result = dict(pixels)
    for (x, y) in pixels:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                p = (x + dx, y + dy)
                if p not in pixels and 0 <= p[0] < w and 0 <= p[1] < h:
                    result[p] = OUTLINE
    return result


def put(px, rows, ox=0, oy=0):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                px[(ox + x, oy + y)] = COLOURS[ch]
    return px


def shifted(px, dx, dy):
    return {(x + dx, y + dy): c for (x, y), c in px.items()}


# ---------------------------------------------------------------- Nab

NAB_HEAD = [
    '.....gggggg.....',
    '....geeggggg....',
    'ee.geegggggggGee',
    '.eegggggggggggG.',
    '..gggwggggwggg..',
    '..gggkggggkggg..',
    '...ggkwwwwkgg...',
    '....ggkkkkgg....',
]

NAB_IDLE = outlined(parse(['................', '................'] + NAB_HEAD + [
    '...gmmmmmmgabb..',
    '..ggmmymmmbbbbl.',
    '..g.mmmmmmbbbbb.',
    '....mmmmmmabbba.',
    '....gg..gg..aa..',
    '................',
]))

NAB_RUN = outlined(parse(['................'] + NAB_HEAD + [
    '..gmmmmmmmgab...',
    '.g.mmymmmbbbbl..',
    '...mmmmmmbbbbbl.',
    '...mmmmmmabbbbb.',
    '..gg....g.abba..',
    '.gg......gg.....',
    '................',
]))

NAB_HIT = outlined(put(parse(['................', '................', '................'] + NAB_HEAD[:4] + [
    '..ggkkggggkkgg..',
    '..ggggkggkgggg..',
    '...gggkkkkggg...',
    '....ggkppkgg....',
    '.g..gmmmmmg..g..',
    '..ggmmymmmmgg...',
    '....mmmmmmmbb...',
    '....gg..gg.bba..',
    '................',
]), [
    '...c...',
    'c.cWc..',
    '.cCcCN.',
    '..NCN..',
    '...N..c',
], 9, 0))

NAB_WAVE = outlined(parse([
    '............g.g.',
    '...........gegg.',
    '...........gggg.',
    '............gg..',
    '......gggggg.g..',
    '.....geegggggg..',
    '.ee.geegggggggg.',
    '..eegggggggggG..',
    '...gggwggggwgg..',
    '...gggkggggkgg..',
    '....ggkwwwwkgg..',
    '.....ggkkkkgg...',
    '.....mmmmmmm....',
    '................',
    '................',
    '................',
]))

# ---------------------------------------------------------------- Goblin Miner

MINER_TOP = [
    '.....YyyyyY.....',
    '....YyyAWAyyY...',
    '...YyyyWWWyyyY..',
    '..aYYYYYYYYYYYa.',
    'ee.GgggggggggG.e',
    '.eGgkkgggggkkgGe',
    '..GggwkgggwkgG..',
    '..GgggggggggggG.',
    '...GgkwkwkwkgG..',
]

MINER = outlined(parse(MINER_TOP + [
    '..gSzSSSSSSzSg..',
    '.gg.SSyySSSS.gg.',
    '.gg.SSSSSSSS.gg.',
    '....zSSSSSSz....',
    '....aa....aa....',
    '...aaa....aaa...',
    '................',
]))

MINER_THROW = outlined(put(parse(MINER_TOP[:4] + ['...GgggggggggG.e', '..Ggkkgggggkkg.e'] + MINER_TOP[6:] + [
    'gg.SzSSSSSSzSg..',
    '...SSyySSSS.gg..',
    '...SSSSSSSS.gg..',
    '...zSSSSSSz.....',
    '...aa....aa.....',
    '..aaa....aaa....',
    '................',
]), [
    'sSSSs',
    's.b..',
    '..b..',
    '..b..',
    '.b...',
    '.b...',
    '.g...',
    'gg...',
], 0, 0))

PICKAXE = outlined(parse([
    '................',
    '................',
    '............ss..',
    '.............Ss.',
    '.............SS.',
    '............sSS.',
    '...........sSS..',
    '.aabbbbbbbbbsSs.',
    '.aaaaaaaaaasSs..',
    '............sSS.',
    '.............SS.',
    '.............SS.',
    '.............Ss.',
    '............ss..',
    '................',
    '................',
]))

# ---------------------------------------------------------------- Hookjaw Spider

SPIDER = outlined(parse(mirrored([
    '........',
    '.c...HHH',
    '..K.HKKK',
    '...KKKKK',
    'c..KKKKK',
    '.KK.KKKK',
    '....KKww',
    '..KKKwwk',
    '.K..Kwwk',
    'c...KKww',
    '..KKKKKK',
    '.K...KKK',
    'c....w..',
    '......w.',
    '........',
    '........',
])))

SPIDER_REAR = outlined(parse(mirrored([
    '.c......',
    '.K......',
    'c.K.....',
    '.K.K..HH',
    '..KKKHKK',
    '....KKKK',
    '...KKKKK',
    '..KKKKww',
    '.K..Kwwr',
    'c...Kwwr',
    '....KKww',
    '..KKKKKK',
    '.K...KKK',
    'c...w...',
    '.....w..',
    '........',
])))

# ---------------------------------------------------------------- Crystal Beetle (facing right)


def beetle(glint):
    px = parse([
        '................',
        '................',
        '................',
        '...NNNN.NNN.....',
        '..NcCCNNcCCNN...',
        '.NcWCCNcWCCNKKK.',
        '.NcCCCNcCCCNKwwK',
        'NcCCCNcCCCNcKwkK',
        'NcCCCNcCCCNcKKKK',
        'NNNNNNNNNNNNNKKw',
        '.KK.KK..KK.KK.K.',
        '.K..K...K..K....',
        '................',
        '................',
        '................',
        '................',
    ])
    if glint:
        put(px, [
            'NWW.',
            'cWWN',
            'cWcW',
            'WccW',
            'cWcW',
        ], 8, 4)
        put(px, ['W', 'W'], 15, 3)
    return outlined(px)


# ---------------------------------------------------------------- Rock Mole and dirt mound

MOLE = outlined(parse([
    '................',
    '................',
    '................',
    '.....FffffF.....',
    '....FfffffffF...',
    '...FffwfffwffF..',
    '...FffkfffkffF..',
    '...FffffppfffF..',
    '.ww.FfffppffF.ww',
    'wsw.FFlllllFF.sw',
    '.wsfFFFFFFFFFfw.',
    '..zzbbbbbbbbbzz.',
    '.zkkkkkkkkkkkkz.',
    '.zkkkkkkkkkkkkz.',
    '..zzzzzzzzzzzz..',
    '................',
]))

MOUND = outlined(parse([
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......l........',
    '.....llblb......',
    '....lbbbbabb....',
    '...lbbabbbbbb...',
    '..lbbbbbbabbbb..',
    '..bbbaabbbbbab..',
    '.lbbbbbbbabbbba.',
    '.bbabbbbbbbbbaa.',
    '..aaaaaaaaaaaa..',
    '................',
    '................',
]))

# ---------------------------------------------------------------- Shard Wisp


def wisp(flicker):
    px = parse([
        '................',
        '................',
        '................',
        '.......Q........',
        '......QqQ.......',
        '.....QqqqQ......',
        '....QqwqqwQ.....',
        '....qqkqqkqq....',
        '....uqqqqqqu....',
        '.....uqqqqu.....',
        '......uqqu......',
        '.......uu.......',
        '................',
        '................',
        '................',
        '................',
    ])
    shards = [(2, 4), (12, 3), (13, 10), (3, 11), (7, 13)] if not flicker else \
             [(4, 2), (13, 6), (11, 13), (1, 8), (7, 14)]
    for (x, y) in shards:
        px[(x, y)] = COLOURS['Q']
        px[(x, y + 1)] = COLOURS['q']
    return outlined(px)


# ---------------------------------------------------------------- Bert's Pebble

PEBBLE = outlined(parse([
    '................',
    '................',
    '................',
    '................',
    '.....LLLLL......',
    '....LLtttttt....',
    '...LtttttttttT..',
    '...LtwkttwkttT..',
    '...LtkkttkktTT..',
    '...ttttttttttT..',
    '...tttkttktttT..',
    '....ttTkkTttT...',
    '.....TTTTTTT....',
    '................',
    '................',
    '................',
]))

PEBBLE_BLOCK = outlined(parse([
    '................',
    '..............A.',
    '...........A.AyA',
    '............A.A.',
    '.....LLLLL....A.',
    '....LLtttttt....',
    '...LtttttttttT..',
    '...LtkkttkkttT..',
    '...Ltttttttt.T..',
    '...tttttttt..T..',
    '...ttttkkttt.T..',
    '....ttTTTTtT.T..',
    '.....TTTTTTT....',
    '................',
    '................',
    '................',
]))
for _p in [(12, 8), (11, 9), (12, 10), (12, 11)]:
    PEBBLE_BLOCK[_p] = COLOURS['A']

# ---------------------------------------------------------------- Crystals


def recoloured(px, mapping):
    lookup = {COLOURS[a]: COLOURS[b] for a, b in mapping.items()}
    return {p: lookup.get(c, c) for p, c in px.items()}


CLUSTER_ROWS = [
    '................',
    '................',
    '................',
    '.......W........',
    '......cWC.......',
    '......cWC.......',
    '...c..cWCN......',
    '..cWC.cWCN..c...',
    '..cWCNcWCN.cWC..',
    '..cWCNcWCNcWCCN.',
    '..cWCNcWCNcWCNN.',
    '..cCCNcCCNcCCN..',
    '.zSSSSSSSSSSSSz.',
    '..zzzzzzzzzzzz..',
    '................',
    '................',
]
CLUSTER_BLUE = outlined(parse(CLUSTER_ROWS))
CLUSTER_VIOLET = outlined(recoloured(parse([r[::-1] for r in CLUSTER_ROWS]), {'c': 'v', 'C': 'V', 'N': 'P'}))

RESONATING = outlined(shifted(parse([
    '.......W........',
    '......cWc.......',
    '...W..cWcC..W...',
    '..cWc.cWcC.cWc..',
    '..cWcCcWcCcWcC..',
    '..cWcCcWcCcWcC..',
    '..cccCcccCcccC..',
    '.zSSSSSSSSSSSSz.',
    '..zzzzzzzzzzzz..',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
]), 0, 4))
for _y in range(16):
    for _x in range(16):
        _r = math.hypot(_x - 7.5, _y - 8.5)
        if (_x, _y) not in RESONATING and (7.0 <= _r < 8.0 or 4.4 <= _r < 5.2 and _y < 7):
            RESONATING[(_x, _y)] = COLOURS['Q' if _r < 6 else 'q']

PILLAR = parse([
    '................',
    '.......W........',
    '......cWC.......',
    '......cWCN......',
    '.....cWWCN......',
    '.....cWCCN......',
    '.....cWCCNN.....',
    '....ccWCCCN.....',
    '....cWWCCCN.....',
    '....cWCCCCNN....',
    '....cWCCCCCN....',
    '...ccWCCCCCN....',
    '...cWWCCCCCNN...',
    '...cWCCCCCCCN...',
    '...cWCCCCCCCN...',
    '...cWCCCCCCCNN..',
    '..ccWCCCCCCCCN..',
    '..cWWCCCCCCCCN..',
    '..cWCCCCCCCCCN..',
    '..cWCCCCCCCCCN..',
    '..cWCCCCCCCCCN..',
    '..cWCCCCCCCCCN..',
    '..cCCCCCCCCCCN..',
    '..cCCCCCCCCCCN..',
    '.WcCCCCCCCCCCNc.',
    '.cWCCCCCCCCCNcW.',
    '.cWCcCCCCCCCNcC.',
    '.cCCcCCCCCCCNcC.',
    'zSSSSSSSSSSSSSSz',
    '.zzzzzzzzzzzzzz.',
    '................',
    '................',
], 16, 32)
PILLAR = outlined(PILLAR, 16, 32)
PILLAR_TOP = {(x, y): c for (x, y), c in PILLAR.items() if y < 16}
PILLAR_BOTTOM = {(x, y - 16): c for (x, y), c in PILLAR.items() if y >= 16}

SPIKE = outlined(parse([
    '................',
    '................',
    '................',
    '................',
    '.......v........',
    '.......vV.......',
    '......vWV.......',
    '......vWVP......',
    '...v..vWVP......',
    '...vV.vWVP.vV...',
    '..vWVPvWVPvWVP..',
    '..vVVPvVVPvVVP..',
    '.zSSSSSSSSSSSSz.',
    '..zzzzzzzzzzzz..',
    '................',
    '................',
]))

STALACTITE = outlined(parse([
    '................',
    '..zSSSSSSSSSSz..',
    '..SssssSssssSz..',
    '...SsssSsssSz...',
    '...SssSSssSSz...',
    '....SsSssSSz....',
    '....SsSsSSz.....',
    '.....SsSSz......',
    '.....SsSz.......',
    '......Sz........',
    '......S.........',
    '................',
    '......c.........',
    '.....cC.........',
    '.....CN.........',
    '................',
]))

MINECART = outlined(parse([
    '................',
    '................',
    '................',
    '....cW...vV.....',
    '..s.cWc.vWVc..s.',
    '.sSsssssssssssSs',
    '.SbbbbbbbbbbbbbS',
    '.SlbbbbSlbbbbbaS',
    '.SbbbbbSbbbbbbaS',
    '.SaaaaaSaaaaaaaS',
    '.sSSSSSSSSSSSSSs',
    '..zSz......zSz..',
    '..SkS......SkS..',
    '..zSz......zSz..',
    '................',
    '................',
]))


def gate(phase):
    px = {}
    for y in range(16):
        for x in range(16):
            dx, dy = x - 7.5, y - 7.5
            r = math.hypot(dx, dy)
            if r > 7.3:
                continue
            a = (math.atan2(dy, dx) / (2 * math.pi)) % 1
            if r > 5.3:
                band = int((a * 8 + phase / 3 + r * 0.25) % 2)
                px[(x, y)] = COLOURS['V' if band else 'v']
            elif r < 1.6:
                px[(x, y)] = COLOURS['W']
            else:
                arm = (a * 3 - r * 0.32 + phase / 3) % 1
                px[(x, y)] = COLOURS['v' if arm < 0.22 else ('V' if arm < 0.5 else 'P')]
    return outlined(px)


GATE = [gate(i) for i in range(3)]

SCEPTER = outlined(parse([
    '.......W........',
    '......cWC.......',
    '.....cWWCN......',
    '.....cWCCN......',
    '......CCN.......',
    '.....y.N.y......',
    '......yYy.......',
    '.......b........',
    '.......b........',
    '.......l........',
    '.......b........',
    '.......b........',
    '.......l........',
    '.......b........',
    '......yYy.......',
    '................',
]))

BOLT = outlined(parse([
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......W........',
    '......cWc.......',
    '..c..cWWWC......',
    '.....CcWCN..c...',
    '......CCN.......',
    '.......N........',
    '..........c.....',
    '................',
    '................',
    '................',
    '................',
]))

STUCK = outlined(parse([
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......W........',
    '......cWC.......',
    '......cWC.......',
    '......cCN.......',
    '.......N........',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
]))

ENCASED = outlined(parse([
    '................',
    '...cccccccccc...',
    '..cWcccccccccc..',
    '..cWWcccccccCc..',
    '..ccWccccccCCc..',
    '..cccWccccCCcc..',
    '..ccccWccCCccc..',
    '..cccccWCCcccc..',
    '..cccccCWccccc..',
    '..ccccCCcWcccc..',
    '..cccCCccWWccc..',
    '..ccCCccccWccc..',
    '..cCCccccccWcc..',
    '..CCccccccccWc..',
    '...CCCCCCCCCC...',
    '................',
]))

SHATTER = outlined(parse([
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '........W.......',
    '.......cWC......',
    '......cWCN......',
    '.......CN.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
]))

FRAMES = [NAB_IDLE, NAB_RUN, NAB_HIT, NAB_WAVE, MINER, MINER_THROW, PICKAXE, SPIDER, SPIDER_REAR,
          beetle(False), beetle(True), MOLE, MOUND, wisp(False), wisp(True), PEBBLE, PEBBLE_BLOCK,
          CLUSTER_BLUE, CLUSTER_VIOLET, RESONATING, PILLAR_TOP, SPIKE, STALACTITE, MINECART, *GATE,
          SCEPTER, BOLT, STUCK, ENCASED, SHATTER, PILLAR_BOTTOM]

# ---------------------------------------------------------------- Bert (32px)


def ellipse(cx, cy, rx, ry):
    return {(x, y) for y in range(32) for x in range(32) if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1}


def boulder(px, mask, base='t', light='L', shade='T'):
    """Paints a rock part over px: light top-left rim, shade bottom-right rim, darker seam where it overlaps."""
    for (x, y) in mask:
        if (x, y + 1) not in mask or (x + 1, y) not in mask or (x, y + 2) not in mask:
            ch = shade
        elif (x, y - 1) not in mask or (x - 1, y) not in mask and (x, y - 2) not in mask:
            ch = light
        else:
            ch = base
        px[(x, y)] = COLOURS[ch]
    return px


TORSO = ellipse(16, 18, 10, 8.5)
HEAD = ellipse(16, 9, 7, 6)
SHOULDERS = [ellipse(cx, 14, 4.5, 4.5) for cx in (5.5, 26.5)]


def bert_body():
    px = {}
    boulder(px, ellipse(12, 27.5, 3.8, 3))
    boulder(px, ellipse(20, 27.5, 3.8, 3))
    boulder(px, TORSO)
    for cx, shoulder in zip((5.5, 26.5), SHOULDERS):
        boulder(px, shoulder)
        boulder(px, ellipse(cx, 21.5, 4, 4.2))
    boulder(px, HEAD)
    return px


BODY_MASK = set(bert_body())


def heart(px, colours='WcCN'):
    w, c, b, n = colours
    put(px, [
        '..' + w + c + c + '..',
        '.' + w + w + c + b + n,
        '.' + c + c + b + b + n,
        '..' + b + b + n + '.',
        '...' + n + '..',
    ], 13, 16)
    return px


def bert(angry=False):
    px = bert_body()
    heart(px)
    if angry:
        put(px, [
            'kk......kk',
            '.kk....kk.',
            '.wkk..kkw.',
            '.rk....kr.',
        ], 11, 6)
        put(px, ['.kkkk.', 'k....k'], 13, 11)
    else:
        put(px, [
            '.ww....ww.',
            '.wk....kw.',
            '.kk....kk.',
        ], 11, 7)
        put(px, ['k....k', '.kkkk.'], 13, 11)
    put(px, ['T', 'T'], 7, 23)
    put(px, ['T', 'T'], 24, 23)
    return outlined(px, 32, 32)


def plate(cells, colours):
    hi, base, dark = colours
    px = {p: COLOURS[{'h': hi, 'b': base, 'd': dark}[ch]] for p, ch in cells.items()}
    return outlined(px, 32, 32)


def cells(rows, ox, oy):
    return {(ox + x, oy + y): ch for y, row in enumerate(rows) for x, ch in enumerate(row) if ch != '.'}


def facet(mask):
    """Plate shading: light top-left rim, dark bottom-right rim, light diagonal facet line."""
    out = {}
    for (x, y) in mask:
        if (x + 1, y) not in mask or (x, y + 1) not in mask:
            out[(x, y)] = 'd'
        elif (x, y - 1) not in mask or (x - 1, y) not in mask:
            out[(x, y)] = 'h'
        else:
            out[(x, y)] = 'b'
    return out


def crest():
    """Jagged plate on Bert's back: only the parts poking out above and around the body are drawn."""
    spikes = [(4, 3), (10, 0), (16, -3), (22, 0), (28, 3)]
    mask = set()
    for x in range(3, 29):
        top = min(sy + abs(x - sx) * 1.6 for sx, sy in spikes)
        for y in range(max(0, int(top)), 13):
            if (x, y) not in BODY_MASK:
                mask.add((x, y))
    out = facet(mask)
    for sx, sy in spikes:
        for y in range(max(0, sy), sy + 3):
            if (sx, y) in out:
                out[(sx, y)] = 'h'
    return out


PLATE_FRONT = plate(facet(set(cells([
    '.bbbbbbbbbbb.',
    'bbbbbbbbbbbbb',
    'bbbbbbbbbbbbb',
    '.bbbbbbbbbbb.',
    '..bbbbbbbbb..',
    '....bbbbb....',
], 10, 21))), 'Rrm')
PLATE_BACK = plate(crest(), 'Ayy')
PLATE_LEFT = plate(facet({p for p in ellipse(5.5, 13.5, 5.2, 5.2) if p[1] <= 15}), 'ijJ')
PLATE_RIGHT = plate(facet({p for p in ellipse(26.5, 13.5, 5.2, 5.2) if p[1] <= 15}), 'cCN')


def bert_ball():
    px = {}
    boulder(px, ellipse(16, 17, 13, 12.5))
    for mask in (ellipse(9, 12, 5, 5), ellipse(22, 22, 5.5, 5)):
        boulder(px, mask)
    for (x, y) in [(10, 19), (11, 20), (12, 21), (13, 22), (20, 9), (21, 10), (22, 11), (23, 12)]:
        px[(x, y)] = COLOURS['T']
    put(px, ['.Wc.', 'WcCN', '.CN.'], 15, 14)
    return outlined(px, 32, 32)


def bert_stunned():
    px = bert_body()
    heart(px, 'cCNN')
    put(px, ['kkkk', 'k..k', 'k.kk', 'k...'], 10, 6)
    put(px, ['kkkk', 'k..k', 'kk.k', '...k'], 18, 6)
    put(px, ['.k.k.k', 'k.k.k.'], 13, 11)
    put(px, ['.A.', 'AyA', '.A.'], 4, 1)
    put(px, ['.A.', 'AyA', '.A.'], 25, 2)
    put(px, ['y'], 15, 0)
    return outlined(px, 32, 32)


def rocks_pile():
    px = {}
    rocks = [(8, 26, 5, 4), (17, 26.5, 5, 3.8), (25, 26, 4.5, 4), (12.5, 19.5, 4.5, 3.8), (21.5, 19.5, 4.5, 3.8),
             (17, 13, 4, 3.5)]
    for (cx, cy, rx, ry) in rocks:
        boulder(px, ellipse(cx, cy, rx, ry))
    for (cx, cy, _, _) in rocks:
        x, y = int(cx) - 2, int(cy) - 2
        put(px, ['.k.k.', '.....', 'k...k', '.kkk.'], x, y)
    return outlined(px, 32, 32)


BERT_FRAMES = [bert(), bert(True), PLATE_FRONT, PLATE_BACK, PLATE_LEFT, PLATE_RIGHT, bert_ball(), bert_stunned(),
               rocks_pile()]


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
    sheet(FRAMES, 16, 12).save(EXTRA / 'mines-extra.png')
    sheet(BERT_FRAMES, 32, len(BERT_FRAMES)).save(EXTRA / 'bert.png')
    print(f'wrote mines-extra.png ({len(FRAMES)} frames) and bert.png ({len(BERT_FRAMES)} frames)')


if __name__ == '__main__':
    main()
