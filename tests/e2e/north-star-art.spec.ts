import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOGICAL_WIDTH = 390;
/** TitleScene START label sits at LOGICAL_HEIGHT * 0.84 after HOW TO PLAY / SETTINGS. */
const START_CLICK_Y_RATIO = 0.84;
const EVIDENCE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/evidence',
);

type Box = { x: number; y: number; width: number; height: number };

async function waitForScene(page: Page, sceneKey: string, timeout = 10_000): Promise<void> {
  await page.waitForFunction(
    (key) => window.__FAT_E2E__?.getSnapshot().sceneKey === key,
    sceneKey,
    { timeout },
  );
}

async function startRun(page: Page, seed: string): Promise<Box> {
  await page.goto('/');
  await waitForScene(page, 'TitleScene');
  await page.evaluate((s) => window.__FAT_E2E__?.setSeed(s), seed);
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas bounding box not found');
  await canvas.click({ position: { x: box.width / 2, y: box.height * START_CLICK_Y_RATIO } });
  await waitForScene(page, 'GameScene');
  return box;
}

test.describe('Pixel North Star runtime evidence', () => {
  test('captures wave and boss screenshots without required-asset errors', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('response', (res) => {
      if (res.status() >= 400 && res.url().includes('/assets/')) {
        errors.push(`asset ${res.status()} ${res.url()}`);
      }
    });

    const box = await startRun(page, 'north-star-evidence');
    await page.waitForTimeout(1200);

    const project = testInfo.project.name;
    if (project.includes('Mobile')) {
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'northstar-wave-390x844.png'),
        fullPage: false,
      });
    } else {
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'northstar-desktop-1440x900.png'),
        fullPage: false,
      });
    }

    // Multi-wave stages: skip straight to boss rather than killing every wave.
    // Call skip only while pre-boss: repeating debugSkipToBoss resets the warning timer.
    await page.waitForFunction(
      () => {
        const run = window.__FAT_E2E__?.getSnapshot().run;
        if (run?.bossPhase !== undefined) return true;
        const phase = run?.phase;
        if (
          phase === 'bossWarning' ||
          phase === 'bossIntro' ||
          phase === 'bossActive' ||
          phase === 'bossDeath'
        ) {
          return false;
        }
        window.__FAT_E2E__?.debugSkipToBoss();
        return false;
      },
      undefined,
      { timeout: 10_000, polling: 150 },
    );

    await page.waitForFunction(
      () => Boolean(window.__FAT_E2E__?.getSnapshot().run?.bossSpriteVisible),
      undefined,
      { timeout: 8000 },
    );

    if (project.includes('Mobile')) {
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'northstar-boss-390x844.png'),
        fullPage: false,
      });
    }

    // Aim under boss briefly; do not redesign the 3-beat death path.
    // Stage-1 kill does not CLEAR the run — stop on death beat instead.
    await page.evaluate(() => window.__FAT_E2E__?.debugSetBossHp(1));
    const y = box.y + box.height * 0.86;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    if (!project.includes('Mobile')) {
      await page.keyboard.down('Space');
    }
    for (let i = 0; i < 40; i += 1) {
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      if (
        (run?.bossesKilled ?? 0) >= 1 ||
        run?.bossPhase === 'dead' ||
        run?.bossDeathBeat === 'finale'
      ) {
        break;
      }
      if (typeof run?.bossX === 'number') {
        const screenX = box.x + (run.bossX / LOGICAL_WIDTH) * box.width;
        await page.mouse.move(screenX, y);
      }
      await page.waitForTimeout(100);
    }
    await page.mouse.up();
    if (!project.includes('Mobile')) {
      await page.keyboard.up('Space');
    }

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
