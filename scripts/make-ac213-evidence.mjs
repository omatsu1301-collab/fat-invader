/**
 * Build AC-213 color + grayscale bullet comparison sheet for Human Gate evidence.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function load(rel) {
  const buf = await readFile(path.join(ROOT, rel));
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function toGray(data) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
      continue;
    }
    const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    out[i] = y;
    out[i + 1] = y;
    out[i + 2] = y;
    out[i + 3] = 255;
  }
  return out;
}

function toOneBit(data) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
      continue;
    }
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const v = y >= 128 ? 255 : 0;
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
}

function place(dst, dstW, src, srcW, srcH, ox, oy) {
  for (let y = 0; y < srcH; y += 1) {
    for (let x = 0; x < srcW; x += 1) {
      const si = (y * srcW + x) * 4;
      const di = ((oy + y) * dstW + (ox + x)) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }
}

async function encode(rgba, w, h, outPath) {
  const png = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false, force: true })
    .toBuffer();
  await writeFile(outPath, png);
}

async function main() {
  const player = await load('public/assets/sprites/bullets/player_crumpled_checkup.png');
  const fry = await load('public/assets/sprites/bullets/enemy_golden_fry.png');
  const scale = 8;
  const pad = 16;
  const cellW = Math.max(player.width, fry.width) * scale;
  const cellH = Math.max(player.height, fry.height) * scale;
  const sheetW = pad * 3 + cellW * 2;
  const sheetH = pad * 3 + cellH * 2;

  async function upscale(img) {
    return sharp(img.data, {
      raw: { width: img.width, height: img.height, channels: 4 },
    })
      .resize(img.width * scale, img.height * scale, { kernel: sharp.kernel.nearest })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  }

  const pColor = await upscale(player);
  const fColor = await upscale(fry);
  const pGray = await upscale({ data: toGray(player.data), width: player.width, height: player.height });
  const fGray = await upscale({ data: toGray(fry.data), width: fry.width, height: fry.height });
  const pBit = await upscale({ data: toOneBit(player.data), width: player.width, height: player.height });
  const fBit = await upscale({ data: toOneBit(fry.data), width: fry.width, height: fry.height });

  const colorSheet = Buffer.alloc(sheetW * sheetH * 4, 0);
  // dark void background
  for (let i = 0; i < colorSheet.length; i += 4) {
    colorSheet[i] = 9;
    colorSheet[i + 1] = 6;
    colorSheet[i + 2] = 21;
    colorSheet[i + 3] = 255;
  }
  place(colorSheet, sheetW, pColor.data, pColor.info.width, pColor.info.height, pad, pad);
  place(
    colorSheet,
    sheetW,
    fColor.data,
    fColor.info.width,
    fColor.info.height,
    pad * 2 + cellW,
    pad,
  );
  place(
    colorSheet,
    sheetW,
    pGray.data,
    pGray.info.width,
    pGray.info.height,
    pad,
    pad * 2 + cellH,
  );
  place(
    colorSheet,
    sheetW,
    fGray.data,
    fGray.info.width,
    fGray.info.height,
    pad * 2 + cellW,
    pad * 2 + cellH,
  );

  const outDir = path.join(ROOT, 'docs/evidence');
  await mkdir(outDir, { recursive: true });
  await encode(colorSheet, sheetW, sheetH, path.join(outDir, 'ac213-bullet-silhouette-color-gray.png'));

  const bitSheet = Buffer.alloc(sheetW * (pad * 2 + cellH) * 4, 0);
  for (let i = 0; i < bitSheet.length; i += 4) {
    bitSheet[i] = 9;
    bitSheet[i + 1] = 6;
    bitSheet[i + 2] = 21;
    bitSheet[i + 3] = 255;
  }
  const bitH = pad * 2 + cellH;
  place(bitSheet, sheetW, pBit.data, pBit.info.width, pBit.info.height, pad, pad);
  place(bitSheet, sheetW, fBit.data, fBit.info.width, fBit.info.height, pad * 2 + cellW, pad);
  await encode(bitSheet, sheetW, bitH, path.join(outDir, 'ac213-bullet-silhouette-1bit.png'));
  process.stdout.write('Wrote AC-213 evidence sheets\n');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
