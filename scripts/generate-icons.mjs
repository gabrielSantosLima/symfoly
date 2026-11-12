#!/usr/bin/env node
// Generates the app icons (PNG + multi-size ICO) from the Symfoly mark.
// Self-contained: renders the simple geometry (rounded tile, circles, lines)
// and writes PNG/ICO by hand, so it needs no image dependencies.
//
// Usage: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- geometry (coordinates in a 64x64 space) -------------------------------
const TILE = { x: 2, y: 2, w: 60, h: 60, r: 14, rgb: [79, 70, 229] }; // #4F46E5
const WHITE = [255, 255, 255];
const LINES = [
  [[32, 32], [32, 15]],
  [[32, 32], [18, 40]],
  [[32, 32], [46, 40]]
];
const LINE_HALF = 2.5; // stroke width 5
const DOTS = [
  [32, 15, 4.5],
  [18, 40, 4.5],
  [46, 40, 4.5],
  [32, 32, 7]
];

function inRoundedRect(x, y, rx, ry, w, h, r) {
  if (x < rx || x > rx + w || y < ry || y > ry + h) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + w - r);
  const cy = Math.min(Math.max(y, ry + r), ry + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  let t = len === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function sample(x, y) {
  for (const [cx, cy, r] of DOTS) {
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) return WHITE;
  }
  for (const [[ax, ay], [bx, by]] of LINES) {
    if (distToSegment(x, y, ax, ay, bx, by) <= LINE_HALF) return WHITE;
  }
  if (inRoundedRect(x, y, TILE.x, TILE.y, TILE.w, TILE.h, TILE.r)) return TILE.rgb;
  return null;
}

// --- rasterize (supersampled) ----------------------------------------------
function render(size, ss = 4) {
  const scale = 64 / size;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let a = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const fx = (x + (sx + 0.5) / ss) * scale;
          const fy = (y + (sy + 0.5) / ss) * scale;
          const color = sample(fx, fy);
          if (!color) continue;
          r += color[0] / 255;
          g += color[1] / 255;
          b += color[2] / 255;
          a += 1;
        }
      }
      const n = ss * ss;
      const alpha = a / n;
      const index = (y * size + x) * 4;
      if (alpha > 0) {
        rgba[index] = Math.round((r / a) * 255);
        rgba[index + 1] = Math.round((g / a) * 255);
        rgba[index + 2] = Math.round((b / a) * 255);
        rgba[index + 3] = Math.round(alpha * 255);
      }
    }
  }
  return rgba;
}

// --- minimal PNG writer -----------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// --- minimal ICO writer (PNG-compressed entries) ----------------------------
function encodeIco(sizes) {
  const images = sizes.map((size) => ({ size, png: encodePng(size, render(size)) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = Buffer.alloc(16 * images.length);
  let offset = 6 + 16 * images.length;
  images.forEach((image, index) => {
    const entry = index * 16;
    entries[entry] = image.size >= 256 ? 0 : image.size;
    entries[entry + 1] = image.size >= 256 ? 0 : image.size;
    entries[entry + 2] = 0;
    entries[entry + 3] = 0;
    entries.writeUInt16LE(1, entry + 4);
    entries.writeUInt16LE(32, entry + 6);
    entries.writeUInt32LE(image.png.length, entry + 8);
    entries.writeUInt32LE(offset, entry + 12);
    offset += image.png.length;
  });
  return Buffer.concat([header, entries, ...images.map((image) => image.png)]);
}

// --- main -------------------------------------------------------------------
const resources = join(ROOT, "resources");
mkdirSync(resources, { recursive: true });

writeFileSync(join(resources, "icon.png"), encodePng(512, render(512)));
writeFileSync(join(resources, "tray.png"), encodePng(32, render(32)));
writeFileSync(
  join(resources, "icon.ico"),
  encodeIco([16, 24, 32, 48, 64, 128, 256])
);

console.log("Wrote resources/icon.png (512), tray.png (32) and icon.ico (16–256).");
