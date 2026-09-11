/**
 * Deterministic raw → canonical master → processed runtime → public runtime
 * pipeline for FAT INVADER Pixel North Star assets.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PIXEL_ASSETS, RAW_BATCH_DIR, TERMS } from './pixel-assets.config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

function nearestPalette(r, g, b, paletteRgb) {
  let best = paletteRgb[0];
  let bestDist = Infinity;
  for (const c of paletteRgb) {
    const dr = r - c.r;
    const dg = g - c.g;
    const db = b - c.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function ensureDirFor(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

/**
 * Encode RGBA buffer as PNG with fixed settings for deterministic bytes when possible.
 */
async function encodePng(rgba, width, height) {
  return sharp(rgba, {
    raw: { width, height, channels: 4 },
  })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      force: true,
    })
    .toBuffer();
}

/**
 * Map to closed palette, force alpha 0/255, clear fringe RGB on transparent.
 */
function quantizeAndDefringe(data, width, height, paletteRgb) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
      continue;
    }
    const c = nearestPalette(data[i], data[i + 1], data[i + 2], paletteRgb);
    out[i] = c.r;
    out[i + 1] = c.g;
    out[i + 2] = c.b;
    out[i + 3] = 255;
  }
  return { data: out, width, height };
}

function opaqueBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = data[(y * width + x) * 4 + 3];
      if (a === 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 1, h: 1 };
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

function crop(data, width, height, bounds) {
  const out = Buffer.alloc(bounds.w * bounds.h * 4);
  for (let y = 0; y < bounds.h; y += 1) {
    for (let x = 0; x < bounds.w; x += 1) {
      const src = ((bounds.minY + y) * width + (bounds.minX + x)) * 4;
      const dst = (y * bounds.w + x) * 4;
      out[dst] = data[src];
      out[dst + 1] = data[src + 1];
      out[dst + 2] = data[src + 2];
      out[dst + 3] = data[src + 3];
    }
  }
  return { data: out, width: bounds.w, height: bounds.h };
}

/** Integer nearest-neighbor scale. */
function nearestScale(src, srcW, srcH, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4);
  for (let y = 0; y < dstH; y += 1) {
    const sy = Math.min(srcH - 1, Math.floor(((y + 0.5) * srcH) / dstH));
    for (let x = 0; x < dstW; x += 1) {
      const sx = Math.min(srcW - 1, Math.floor(((x + 0.5) * srcW) / dstW));
      const si = (sy * srcW + sx) * 4;
      const di = (y * dstW + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}

/** Exact 4× downsample: take top-left of each 4×4 block (deterministic with upscale). */
function downsampleExact4(master, masterW, masterH) {
  const rw = masterW / 4;
  const rh = masterH / 4;
  if (!Number.isInteger(rw) || !Number.isInteger(rh)) {
    throw new Error(`Master ${masterW}x${masterH} is not runtime×4`);
  }
  const out = Buffer.alloc(rw * rh * 4);
  for (let y = 0; y < rh; y += 1) {
    for (let x = 0; x < rw; x += 1) {
      const si = (y * 4 * masterW + x * 4) * 4;
      const di = (y * rw + x) * 4;
      out[di] = master[si];
      out[di + 1] = master[si + 1];
      out[di + 2] = master[si + 2];
      out[di + 3] = master[si + 3];
    }
  }
  return out;
}

function placeCentered(src, srcW, srcH, canvasW, canvasH) {
  const out = Buffer.alloc(canvasW * canvasH * 4);
  const ox = Math.floor((canvasW - srcW) / 2);
  const oy = Math.floor((canvasH - srcH) / 2);
  for (let y = 0; y < srcH; y += 1) {
    for (let x = 0; x < srcW; x += 1) {
      const dx = ox + x;
      const dy = oy + y;
      if (dx < 0 || dy < 0 || dx >= canvasW || dy >= canvasH) continue;
      const si = (y * srcW + x) * 4;
      const di = (dy * canvasW + dx) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}

function fitSize(srcW, srcH, maxW, maxH) {
  const scale = Math.min(maxW / srcW, maxH / srcH);
  let w = Math.max(1, Math.round(srcW * scale));
  let h = Math.max(1, Math.round(srcH * scale));
  w = Math.min(w, maxW);
  h = Math.min(h, maxH);
  return { w, h };
}

async function processAsset(asset) {
  const rawPath = path.join(ROOT, RAW_BATCH_DIR, asset.rawFile);
  const rawBuf = await readFile(rawPath);
  const rawHash = sha256(rawBuf);
  if (rawHash !== asset.rawSha256) {
    throw new Error(`Raw hash mismatch for ${asset.id}: ${rawHash}`);
  }

  const { data, info } = await sharp(rawBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== asset.rawWidth || info.height !== asset.rawHeight) {
    throw new Error(
      `Raw dims mismatch for ${asset.id}: got ${info.width}x${info.height}, expected ${asset.rawWidth}x${asset.rawHeight}`,
    );
  }

  const paletteRgb = asset.palette.map(hexToRgb);
  const quantized = quantizeAndDefringe(data, info.width, info.height, paletteRgb);
  const bounds = opaqueBounds(quantized.data, quantized.width, quantized.height);
  const cropped = crop(quantized.data, quantized.width, quantized.height, bounds);

  const fit = fitSize(
    cropped.width,
    cropped.height,
    asset.maxVisibleWidth,
    asset.maxVisibleHeight,
  );
  const fitted = nearestScale(cropped.data, cropped.width, cropped.height, fit.w, fit.h);
  const runtimeRgba = placeCentered(
    fitted,
    fit.w,
    fit.h,
    asset.runtimeWidth,
    asset.runtimeHeight,
  );

  const masterW = asset.runtimeWidth * 4;
  const masterH = asset.runtimeHeight * 4;
  const masterRgba = nearestScale(
    runtimeRgba,
    asset.runtimeWidth,
    asset.runtimeHeight,
    masterW,
    masterH,
  );

  // Round-trip check: master → runtime must equal runtime design.
  const roundTrip = downsampleExact4(masterRgba, masterW, masterH);
  if (!roundTrip.equals(runtimeRgba)) {
    throw new Error(`Master/runtime 4× round-trip failed for ${asset.id}`);
  }

  const masterPng = await encodePng(masterRgba, masterW, masterH);
  const runtimePng = await encodePng(runtimeRgba, asset.runtimeWidth, asset.runtimeHeight);

  const masterAbs = path.join(ROOT, asset.masterRel);
  const processedAbs = path.join(ROOT, asset.processedRel);
  const publicAbs = path.join(ROOT, asset.publicRel);
  await ensureDirFor(masterAbs);
  await ensureDirFor(processedAbs);
  await ensureDirFor(publicAbs);
  await writeFile(masterAbs, masterPng);
  await writeFile(processedAbs, runtimePng);
  await copyFile(processedAbs, publicAbs);

  const used = new Set();
  for (let i = 0; i < runtimeRgba.length; i += 4) {
    if (runtimeRgba[i + 3] === 0) continue;
    const hex =
      '#' +
      [runtimeRgba[i], runtimeRgba[i + 1], runtimeRgba[i + 2]]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    used.add(hex);
  }

  return {
    id: asset.id,
    textureKey: asset.textureKey,
    rawSourcePath: `${RAW_BATCH_DIR}/${asset.rawFile}`,
    rawSourceWidth: asset.rawWidth,
    rawSourceHeight: asset.rawHeight,
    rawSha256: rawHash,
    masterPath: asset.masterRel,
    processedPath: asset.processedRel,
    runtimePath: asset.publicRel.replace(/^public\//, ''),
    publicPath: asset.publicRel,
    runtimeWidth: asset.runtimeWidth,
    runtimeHeight: asset.runtimeHeight,
    masterWidth: masterW,
    masterHeight: masterH,
    paletteUsed: [...used].sort(),
    opaquePixelCount: countOpaque(runtimeRgba),
    processingHistory: [
      { action: 'ingest-raw', notes: 'byte-for-byte handoff copy verified by SHA-256' },
      { action: 'index-palette', notes: 'nearest FI-10 closed palette; alpha binarize 0/255' },
      { action: 'defringe', notes: 'transparent RGB cleared to 0' },
      { action: 'crop', notes: `opaque bbox ${bounds.w}x${bounds.h}` },
      {
        action: 'nearest-to-master',
        notes: `fit ${fit.w}x${fit.h} into runtime ${asset.runtimeWidth}x${asset.runtimeHeight}; upscale ×4 to master`,
      },
      { action: 'nearest-downscale', notes: 'runtime is exact every-4th-pixel of master' },
      { action: 'pivot-pad', notes: 'center origin 0.5 on transparent canvas' },
    ],
  };
}

function countOpaque(rgba) {
  let n = 0;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] === 255) n += 1;
  }
  return n;
}

async function main() {
  const results = [];
  for (const asset of PIXEL_ASSETS) {
    process.stdout.write(`Processing ${asset.id}...\n`);
    results.push(await processAsset(asset));
  }

  const provenance = {
    batch: 'chatgpt-2026-09-10',
    ...TERMS,
    notes:
      'OpenAI relationship: user owns Output. Output may be non-unique. Not legal advice. Human reviewed third-party/brand similarity.',
    assets: results.map((r) => {
      const def = PIXEL_ASSETS.find((a) => a.id === r.id);
      return {
        ...r,
        subject: def.subject,
        humanDecision: def.humanDecision,
        generator: TERMS.generator,
        generatedOn: TERMS.generatedOn,
        termsUrl: TERMS.termsUrl,
        termsEffectiveOn: TERMS.termsEffectiveOn,
        termsCheckedOn: TERMS.termsCheckedOn,
        similarityRiskReviewed: TERMS.similarityRiskReviewed,
      };
    }),
  };

  const provenancePath = path.join(ROOT, RAW_BATCH_DIR, 'provenance.json');
  await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${provenancePath}\n`);
  process.stdout.write(`Processed ${results.length} assets.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
