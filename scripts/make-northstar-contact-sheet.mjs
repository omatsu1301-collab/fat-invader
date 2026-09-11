/**
 * Static contact sheet of the five approved North Star runtime sprites.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCALE = 4;

const FILES = [
  'public/assets/sprites/player/player_sannichibouzu.png',
  'public/assets/sprites/enemies/fry_scout.png',
  'public/assets/sprites/bullets/player_crumpled_checkup.png',
  'public/assets/sprites/bullets/enemy_golden_fry.png',
  'public/assets/sprites/bosses/king_burger_mini.png',
];

async function main() {
  const images = [];
  for (const rel of FILES) {
    const buf = await readFile(path.join(ROOT, rel));
    const meta = await sharp(buf).metadata();
    const scaled = await sharp(buf)
      .resize((meta.width ?? 1) * SCALE, (meta.height ?? 1) * SCALE, {
        kernel: sharp.kernel.nearest,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    images.push(scaled);
  }

  const pad = 16;
  const rowH = Math.max(...images.map((i) => i.info.height));
  const width = pad + images.reduce((s, i) => s + i.info.width + pad, 0);
  const height = pad * 2 + rowH;
  const sheet = Buffer.alloc(width * height * 4);
  for (let i = 0; i < sheet.length; i += 4) {
    sheet[i] = 9;
    sheet[i + 1] = 6;
    sheet[i + 2] = 21;
    sheet[i + 3] = 255;
  }

  let x = pad;
  for (const img of images) {
    const oy = pad + Math.floor((rowH - img.info.height) / 2);
    for (let y = 0; y < img.info.height; y += 1) {
      for (let px = 0; px < img.info.width; px += 1) {
        const si = (y * img.info.width + px) * 4;
        if (img.data[si + 3] === 0) continue;
        const di = ((oy + y) * width + (x + px)) * 4;
        sheet[di] = img.data[si];
        sheet[di + 1] = img.data[si + 1];
        sheet[di + 2] = img.data[si + 2];
        sheet[di + 3] = img.data[si + 3];
      }
    }
    x += img.info.width + pad;
  }

  const outDir = path.join(ROOT, 'docs/evidence');
  await mkdir(outDir, { recursive: true });
  const png = await sharp(sheet, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false, force: true })
    .toBuffer();
  await writeFile(path.join(outDir, 'northstar-contact-sheet.png'), png);
  process.stdout.write('Wrote northstar-contact-sheet.png\n');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
