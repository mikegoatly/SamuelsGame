import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const SHEET = resolve(root, 'public/assets/tiny-dungeon/tilemap_packed.png');
const OUT = resolve(root, 'public/favicon.png');
const TILE = 16;
const COLS = 12;
const FRAME = 84;
const SCALE = 4;
const BACKGROUND = [20, 18, 28, 255];

interface Image {
  width: number;
  height: number;
  rgba: Uint8Array;
}

function chunks(png: Buffer): Array<{ type: string; data: Buffer }> {
  const found: Array<{ type: string; data: Buffer }> = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    found.push({ type: png.toString('latin1', at + 4, at + 8), data: png.subarray(at + 8, at + 8 + length) });
    at += 12 + length;
  }
  return found;
}

/** Decodes the 8-bit indexed, non-interlaced PNG the Kenney sheet uses. */
function decodeIndexed(png: Buffer): Image {
  const all = chunks(png);
  const header = all.find((c) => c.type === 'IHDR')!.data;
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  if (header[8] !== 8 || header[9] !== 3 || header[12] !== 0) throw new Error('expected 8-bit indexed non-interlaced PNG');
  const palette = all.find((c) => c.type === 'PLTE')!.data;
  const alpha = all.find((c) => c.type === 'tRNS')?.data;
  const raw = inflateSync(Buffer.concat(all.filter((c) => c.type === 'IDAT').map((c) => c.data)));
  const rgba = new Uint8Array(width * height * 4);
  const previous = new Uint8Array(width);
  const row = new Uint8Array(width);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (width + 1)]!;
    for (let x = 0; x < width; x++) {
      const value = raw[y * (width + 1) + 1 + x]!;
      const left = x > 0 ? row[x - 1]! : 0;
      const up = previous[x]!;
      const upLeft = x > 0 ? previous[x - 1]! : 0;
      const guess = left + up - upLeft;
      const paeth = Math.abs(guess - left) <= Math.abs(guess - up) && Math.abs(guess - left) <= Math.abs(guess - upLeft) ? left : Math.abs(guess - up) <= Math.abs(guess - upLeft) ? up : upLeft;
      row[x] = (value + [0, left, up, (left + up) >> 1, paeth][filter]!) & 255;
    }
    previous.set(row);
    for (let x = 0; x < width; x++) {
      const index = row[x]!;
      rgba.set([palette[index * 3]!, palette[index * 3 + 1]!, palette[index * 3 + 2]!, alpha?.[index] ?? 255], (y * width + x) * 4);
    }
  }
  return { width, height, rgba };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function encodeRgba({ width, height, rgba }: Image): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const sheet = decodeIndexed(readFileSync(SHEET));
const size = TILE * SCALE;
const icon = new Uint8Array(size * size * 4);
const originX = (FRAME % COLS) * TILE;
const originY = Math.floor(FRAME / COLS) * TILE;
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const at = ((originY + Math.floor(y / SCALE)) * sheet.width + originX + Math.floor(x / SCALE)) * 4;
    const opaque = sheet.rgba[at + 3]! > 0;
    icon.set(opaque ? sheet.rgba.subarray(at, at + 4) : BACKGROUND, (y * size + x) * 4);
  }
}
writeFileSync(OUT, encodeRgba({ width: size, height: size, rgba: icon }));
console.log(`wrote ${OUT}`);
