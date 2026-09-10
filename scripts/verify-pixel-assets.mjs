/**
 * Verify Pixel North Star processed assets against FI-10 contracts.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PIXEL_ASSETS, RAW_BATCH_DIR } from './pixel-assets.config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

function colorKey(r, g, b) {
  return `${r},${g},${b}`;
}
async function loadRgba(filePath) {
  const buf = await readFile(filePath);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { buf, data, width: info.width, height: info.height };
}

function assertNoIntermediateAlpha(data, label) {
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a !== 0 && a !== 255) {
      throw new Error(`${label}: intermediate alpha ${a} at byte ${i}`);
    }
  }
}

function assertPalette(data, label, allowedSet) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) {
      if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
        throw new Error(`${label}: transparent fringe RGB not cleared at ${i}`);
      }
      continue;
    }
    const key = colorKey(data[i], data[i + 1], data[i + 2]);
    if (!allowedSet.has(key)) {
      throw new Error(`${label}: color outside palette rgb(${key})`);
    }
  }
}

function downsampleExact4(master, masterW, masterH) {
  const rw = masterW / 4;
  const rh = masterH / 4;
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

async function verifyAsset(asset) {
  const rawPath = path.join(ROOT, RAW_BATCH_DIR, asset.rawFile);
  const rawBuf = await readFile(rawPath);
  const rawHash = sha256(rawBuf);
  if (rawHash !== asset.rawSha256) {
    throw new Error(`${asset.id}: raw hash mismatch`);
  }

  const master = await loadRgba(path.join(ROOT, asset.masterRel));
  const processed = await loadRgba(path.join(ROOT, asset.processedRel));
  const pub = await loadRgba(path.join(ROOT, asset.publicRel));

  if (master.width !== asset.runtimeWidth * 4 || master.height !== asset.runtimeHeight * 4) {
    throw new Error(`${asset.id}: master dims ${master.width}x${master.height}`);
  }
  if (processed.width !== asset.runtimeWidth || processed.height !== asset.runtimeHeight) {
    throw new Error(`${asset.id}: processed dims ${processed.width}x${processed.height}`);
  }
  if (pub.width !== asset.runtimeWidth || pub.height !== asset.runtimeHeight) {
    throw new Error(`${asset.id}: public dims ${pub.width}x${pub.height}`);
  }

  assertNoIntermediateAlpha(master.data, `${asset.id} master`);
  assertNoIntermediateAlpha(processed.data, `${asset.id} processed`);
  assertNoIntermediateAlpha(pub.data, `${asset.id} public`);

  const allowed = new Set(asset.palette.map((h) => {
    const c = hexToRgb(h);
    return colorKey(c.r, c.g, c.b);
  }));
  assertPalette(processed.data, `${asset.id} processed`, allowed);
  assertPalette(pub.data, `${asset.id} public`, allowed);
  assertPalette(master.data, `${asset.id} master`, allowed);

  if (!processed.data.equals(pub.data)) {
    throw new Error(`${asset.id}: processed/public pixel mismatch`);
  }

  const fromMaster = downsampleExact4(master.data, master.width, master.height);
  if (!fromMaster.equals(processed.data)) {
    throw new Error(`${asset.id}: master→runtime 4× contract failure`);
  }

  // Re-encode check is optional; pixel equality is the contract.
  return {
    id: asset.id,
    runtimeBytes: pub.buf.length,
    runtimeWidth: pub.width,
    runtimeHeight: pub.height,
  };
}

async function main() {
  const summary = [];
  for (const asset of PIXEL_ASSETS) {
    process.stdout.write(`Verifying ${asset.id}...\n`);
    summary.push(await verifyAsset(asset));
  }
  const total = summary.reduce((s, a) => s + a.runtimeBytes, 0);
  process.stdout.write(
    JSON.stringify({ ok: true, assets: summary.length, totalRuntimeBytes: total, summary }, null, 2) +
      '\n',
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
