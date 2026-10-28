#!/usr/bin/env python3
"""Builds public/assets/fonts/SamuelPixel.ttf from Kenney Pixel (CC0) plus hand-drawn overrides.

Needs: pip install fonttools
Run:   python tools/make_font.py            (writes the TTF)
       python tools/make_font.py --dump     (prints the ASCII glyphs as art)

Every glyph is a bitmap on a 64-unit grid (unitsPerEm 1024 = 16 pixels), so at 16/32/48px one font pixel
is exactly 1/2/3 canvas pixels and nothing is anti-aliased. Advance widths (except the space, see SPACE_PX) and
vertical metrics are copied from Kenney Pixel, so text barely changes width and never changes line height.
"""
import sys
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/assets/fonts/KenneyPixel.ttf"
OUT = ROOT / "public/assets/fonts/SamuelPixel.ttf"
PX = 64  # font units per pixel
# Kenney Pixel's space is 2.5px wide, so every word after the first starts on a half pixel and renders blurry
# (grey columns). Whole pixels only: 2px here, which also keeps every string at or under its old width.
SPACE_PX = 2

# Hand-drawn overrides for glyphs that Kenney Pixel draws ambiguously. Each entry is (top_y, rows): top_y is
# the pixel row (0 = sitting on the baseline, 6 = cap height, 7 = ascender height, negative = descender) of the
# first art row, '#' = ink. Advance widths are untouched.
#   l  Kenney's has a foot, so "li" reads as "u"; ours is an ascender-height stem with a top-left serif.
#   i  Kenney's has no dot at all; ours has a dot with a clear gap.
#   j  same dot treatment, hooks left under the baseline.
#   I  serifed both ends, so it differs from l (taller, one serif) and | (descends).
#   1  flag plus base serif.   |  runs from below the baseline to the ascender line.
#   t  Kenney's foot only touched the stem diagonally (a grey pixel at small sizes); ours is joined.
#   0  was identical to D; now slashed.   8  was identical to B; now has round top and bottom.
OVERRIDES = {
    "l": (7, [".##.", "..#.", "..#.", "..#.", "..#.", "..#.", "..#.", "..#."]),
    "i": (7, ["#", ".", "#", "#", "#", "#", "#", "#"]),
    "j": (7, [".#", "..", ".#", ".#", ".#", ".#", ".#", ".#", "##"]),
    "I": (6, ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"]),
    "1": (6, [".#.", "##.", ".#.", ".#.", ".#.", ".#.", "###"]),
    "|": (7, ["#"] * 9),
    "t": (6, [".#..", "###.", ".#..", ".#..", ".#..", ".#..", ".##."]),
    "0": (6, [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."]),
    "8": (6, [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."]),
}


def contours(font, name):
    pen = DecomposingRecordingPen(font.getGlyphSet())
    font.getGlyphSet()[name].draw(pen)
    polys, cur = [], []
    for op, args in pen.value:
        if op == "moveTo":
            cur = [args[0]]
        elif op == "lineTo":
            cur.append(args[0])
        elif op in ("closePath", "endPath"):
            if cur:
                polys.append(cur)
            cur = []
    return polys


def winding(polys, x, y):
    w = 0
    for poly in polys:
        for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
            if (y1 <= y) != (y2 <= y):
                if x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
                    w += 1 if y2 > y1 else -1
    return w


def rasterise(font, name):
    """Set of (col, row) cells; row is the pixel row index above the baseline (may be negative)."""
    polys = contours(font, name)
    cells = set()
    if not polys:
        return cells
    ys = [p[1] for poly in polys for p in poly]
    xs = [p[0] for poly in polys for p in poly]
    for r in range(min(ys) // PX, max(ys) // PX):
        for c in range(min(xs) // PX, max(xs) // PX):
            if winding(polys, c * PX + PX / 2, r * PX + PX / 2) != 0:
                cells.add((c, r))
    return cells


def from_art(top, rows):
    return {(c, top - i) for i, line in enumerate(rows) for c, ch in enumerate(line) if ch == "#"}


def outline(cells):
    """Merged boundary of the cell set: clockwise outer loops, so the TTF fills with no seams."""
    edges = {}
    for c, r in cells:
        x0, y0, x1, y1 = c * PX, r * PX, (c + 1) * PX, (r + 1) * PX
        for a, b in (((x0, y0), (x0, y1)), ((x0, y1), (x1, y1)), ((x1, y1), (x1, y0)), ((x1, y0), (x0, y0))):
            if (b, a) in edges:
                del edges[(b, a)]
            else:
                edges[(a, b)] = True
    nxt = {}
    for a, b in edges:
        nxt.setdefault(a, []).append(b)
    loops = []
    while nxt:
        start = next(iter(nxt))
        loop, p = [start], start
        while True:
            q = nxt[p].pop()
            if not nxt[p]:
                del nxt[p]
            if q == start:
                break
            loop.append(q)
            p = q
        loops.append(loop)
    result = []
    for loop in loops:  # drop collinear points
        n = len(loop)
        keep = [loop[i] for i in range(n) if (loop[i][0] - loop[i - 1][0]) * (loop[(i + 1) % n][1] - loop[i][1]) != (loop[i][1] - loop[i - 1][1]) * (loop[(i + 1) % n][0] - loop[i][0])]
        result.append(keep)
    return result


def glyph_for(cells):
    pen = TTGlyphPen(None)
    for loop in outline(cells):
        pen.moveTo(loop[0])
        for p in loop[1:]:
            pen.lineTo(p)
        pen.closePath()
    return pen.glyph()


def dump(cells, width):
    """Baseline-aligned rows from y=7 down to y=-2; '-' marks the baseline gap line for reading."""
    w = max([width] + [c + 1 for c, _ in cells])
    return ["".join("#" if (c, r) in cells else "." for c in range(w)) for r in range(7, -3, -1)]


def main():
    src = TTFont(SRC)
    cmap = src.getBestCmap()
    bitmaps = {}
    for code, name in cmap.items():
        cells = rasterise(src, name)
        char = chr(code)
        if char in OVERRIDES and "--orig" not in sys.argv:
            cells = from_art(*OVERRIDES[char])
        bitmaps[name] = cells
    if "--dump" in sys.argv:
        for code in range(33, 127):
            name = cmap[code]
            print(chr(code), src["hmtx"][name][0] // PX)
            print("\n".join(dump(bitmaps[name], src["hmtx"][name][0] // PX)))
        return
    order = [".notdef"] + [n for n in dict.fromkeys(cmap.values()) if n != ".notdef"]
    fb = FontBuilder(src["head"].unitsPerEm, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf({n: glyph_for(bitmaps.get(n, set())) for n in order})
    advance = {n: round(src["hmtx"][n][0] / PX) * PX for n in order}  # only .notdef (457) is off-grid
    for code in (0x20, 0xA0):
        if code in cmap:
            advance[cmap[code]] = SPACE_PX * PX
    assert all(w % PX == 0 for w in advance.values())
    fb.setupHorizontalMetrics({n: (advance[n], 0) for n in order})
    fb.glyphs = fb.font["glyf"].glyphs
    for n in order:
        g = fb.font["glyf"][n]
        g.recalcBounds(fb.font["glyf"])
        fb.font["hmtx"][n] = (advance[n], getattr(g, "xMin", 0))
    h = src["hhea"]
    fb.setupHorizontalHeader(ascent=h.ascent, descent=h.descent, lineGap=h.lineGap)
    o = src["OS/2"]
    fb.setupNameTable({"familyName": "SamuelPixel", "styleName": "Regular"})
    fb.setupOS2(sTypoAscender=o.sTypoAscender, sTypoDescender=o.sTypoDescender, sTypoLineGap=o.sTypoLineGap,
                usWinAscent=o.usWinAscent, usWinDescent=o.usWinDescent, sxHeight=o.sxHeight if hasattr(o, "sxHeight") else 0,
                sCapHeight=7 * PX)
    fb.setupPost()
    fb.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
