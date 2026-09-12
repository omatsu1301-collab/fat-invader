import { expect, test, type Page } from '@playwright/test';

const START_CLICK_Y_RATIO = 0.84;
const LOGICAL_HEIGHT = 844;
const COMBAT_MIN_Y = LOGICAL_HEIGHT * 0.62;
const COMBAT_MAX_Y = LOGICAL_HEIGHT * 0.9;

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

test.describe('Player 4-way Combat Zone movement', () => {
  test('desktop vertical + horizontal move and stay inside Combat Zone', async ({
    page,
  }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), 'desktop keyboard path');
    test.setTimeout(60_000);
    await startRun(page, 'e2e-4way-desktop');

    const before = await page.evaluate(() => {
      const run = window.__FAT_E2E__?.getSnapshot().run;
      return { x: run?.playerX ?? 0, y: run?.playerY ?? 0 };
    });

    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(450);
    await page.keyboard.up('ArrowUp');

    const afterUp = await page.evaluate(() => {
      const run = window.__FAT_E2E__?.getSnapshot().run;
      return { x: run?.playerX ?? 0, y: run?.playerY ?? 0 };
    });
    expect(afterUp.y).toBeLessThan(before.y);
    expect(afterUp.y).toBeGreaterThanOrEqual(COMBAT_MIN_Y - 1);

    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(700);
    await page.keyboard.up('ArrowDown');

    const afterDown = await page.evaluate(() => {
      const run = window.__FAT_E2E__?.getSnapshot().run;
      return { x: run?.playerX ?? 0, y: run?.playerY ?? 0 };
    });
    expect(afterDown.y).toBeGreaterThan(afterUp.y);
    expect(afterDown.y).toBeLessThanOrEqual(COMBAT_MAX_Y + 1);

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowRight');
    const afterRight = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.playerX ?? 0,
    );
    expect(afterRight).toBeGreaterThan(afterDown.x);
  });

  test('mobile 2D drag moves player vertically within Combat Zone', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.use.isMobile, 'mobile drag path');
    test.setTimeout(60_000);
    const box = await startRun(page, 'e2e-4way-mobile');

    const beforeY = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.playerY ?? 0,
    );

    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.86);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7, { steps: 10 });
    await page.waitForTimeout(400);
    await page.mouse.up();

    const afterY = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.playerY ?? 0,
    );
    expect(afterY).toBeLessThan(beforeY);
    expect(afterY).toBeGreaterThanOrEqual(COMBAT_MIN_Y - 2);
    expect(afterY).toBeLessThanOrEqual(COMBAT_MAX_Y + 2);
  });
});
