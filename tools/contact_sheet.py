"""Numbered contact sheet: upscales a tile sheet and prints each frame index on its tile.

Usage: python tools/contact_sheet.py <in.png> <out.png> [tile=16] [margin=0] [spacing=0] [scale=4]
Frame index = row * columns + column (Phaser spritesheet order).
"""
import sys
from PIL import Image, ImageDraw, ImageFont


def count(size, tile, margin, spacing):
    return (size - 2 * margin + spacing) // (tile + spacing)


def main():
    src, out = sys.argv[1], sys.argv[2]
    tile, margin, spacing, scale = (int(v) for v in (sys.argv[3:] + ['16', '0', '0', '4'][len(sys.argv) - 3:])[:4])
    img = Image.open(src).convert('RGBA')
    cols = count(img.width, tile, margin, spacing)
    rows = count(img.height, tile, margin, spacing)
    cell = tile * scale
    pad = 2
    sheet = Image.new('RGBA', (cols * (cell + pad) + pad, rows * (cell + pad) + pad), (70, 70, 90, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=11)
    for r in range(rows):
        for c in range(cols):
            x = margin + c * (tile + spacing)
            y = margin + r * (tile + spacing)
            frame = img.crop((x, y, x + tile, y + tile))
            ox, oy = pad + c * (cell + pad), pad + r * (cell + pad)
            draw.rectangle((ox, oy, ox + cell - 1, oy + cell - 1), fill=(34, 34, 44, 255))
            if frame.getbbox() is None:
                continue
            sheet.alpha_composite(frame.resize((cell, cell), Image.NEAREST), (ox, oy))
            label = str(r * cols + c)
            w = draw.textlength(label, font=font)
            draw.rectangle((ox, oy, ox + w + 3, oy + 12), fill=(0, 0, 0, 200))
            draw.text((ox + 2, oy), label, fill=(255, 255, 80, 255), font=font)
    sheet.save(out)
    print(f'{src}: {cols}x{rows} frames of {tile}px (margin {margin}, spacing {spacing}) -> {out}')


main()
