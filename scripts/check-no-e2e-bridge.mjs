import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MARKER = '__FAT_E2E__';
const distAssetsDir = join('dist', 'assets');

let entries;
try {
  entries = readdirSync(distAssetsDir);
} catch (error) {
  console.error(`Could not read ${distAssetsDir}: ${error.message}`);
  process.exit(1);
}

const offenders = entries.filter((file) => {
  if (!file.endsWith('.js')) return false;
  const content = readFileSync(join(distAssetsDir, file), 'utf8');
  return content.includes(MARKER);
});

if (offenders.length > 0) {
  console.error(`Production bundle must not contain the E2E bridge marker "${MARKER}".`);
  console.error(`Found in: ${offenders.join(', ')}`);
  process.exit(1);
}

console.log('Production bundle verified: no E2E bridge present.');
