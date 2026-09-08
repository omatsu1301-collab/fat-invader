import { expect, test, type Page } from '@playwright/test';

async function waitForScene(page: Page, sceneKey: string, timeout = 4000): Promise<void> {
  await page.waitForFunction(
    (key) => window.__FAT_E2E__?.getSnapshot().sceneKey === key,
    sceneKey,
    { timeout },
  );
}

async function startRun(page: Page, seed: string): Promise<{ x: number; y: number; width: number; height: number }> {
  await page.goto('/');
  await waitForScene(page, 'TitleScene');
  await page.evaluate((s) => window.__FAT_E2E__?.setSeed(s), seed);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas bounding box not found');
  await canvas.click({ position: { x: box.width / 2, y: box.height * 0.76 } });
  await waitForScene(page, 'GameScene');
  return box;
}

test.describe('Vertical slice', () => {
  test('title -> move -> fire -> kill -> calorie -> boss -> clear -> result -> retry (AC-130/131/132)', async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const box = await startRun(page, 'e2e-vertical-slice');
    const canvas = page.locator('canvas');
    const isMobile = Boolean(testInfo.project.use.isMobile);

    const playerXBefore = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.playerX,
    );

    if (isMobile) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.86);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.86, { steps: 8 });
      await page.waitForTimeout(400);
      await page.mouse.up();
    } else {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(400);
      await page.keyboard.up('ArrowRight');
    }

    const playerXAfter = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.playerX,
    );
    // AC-101 / AC-103: movement input must actually move the Player.
    expect(playerXAfter).not.toBe(playerXBefore);

    if (!isMobile) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(400);
      await page.keyboard.up('Space');
    } else {
      // Mobile auto-fires while dragging; the drag above already covered it.
      await page.waitForTimeout(400);
    }

    const shotsFired = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.shotsFired ?? 0,
    );
    // AC-102: Desktop manual fire and Mobile auto-fire both produce shots.
    expect(shotsFired).toBeGreaterThan(0);

    // Deterministically finish the formation wave (real kill path, kept fast
    // for CI via the E2E-only debug command per FI-03 section 14). The
    // formation spawns in staggered waves, so this polls-and-kills rather
    // than firing once, otherwise enemies spawned after a single sweep would
    // never be cleared and the wave would never complete.
    await page.waitForFunction(
      () => {
        window.__FAT_E2E__?.debugKillAllEnemies();
        return window.__FAT_E2E__?.getSnapshot().run?.bossPhase !== undefined;
      },
      { timeout: 10_000, polling: 150 },
    );

    const calorieBefore = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.calorie ?? 0,
    );
    await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(15));
    await page.waitForFunction(
      (expected) => (window.__FAT_E2E__?.getSnapshot().run?.calorie ?? 0) >= expected,
      calorieBefore + 15,
      { timeout: 2000 },
    );

    await page.evaluate(() => window.__FAT_E2E__?.debugDefeatBoss());
    await waitForScene(page, 'ResultScene', 6000);

    const resultSnapshot = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(resultSnapshot?.run?.endReason).toBe('CLEAR');

    // AC-132: Retry from Result must start a genuinely fresh run.
    await canvas.click({ position: { x: box.width / 2, y: box.height * 0.74 } });
    await waitForScene(page, 'GameScene');
    const freshSnapshot = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(freshSnapshot?.run?.score).toBe(0);
    expect(freshSnapshot?.run?.endReason).toBeUndefined();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('FAT OVER reaches Result without a rank, then Retry recovers (AC-115/131)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const box = await startRun(page, 'e2e-fat-over');
    await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(100));
    await waitForScene(page, 'ResultScene', 4000);

    const snapshot = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(snapshot?.run?.endReason).toBe('FAT_OVER');
    expect(snapshot?.run?.calorie).toBe(100);

    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: box.width / 2, y: box.height * 0.74 } });
    await waitForScene(page, 'GameScene');
    const fresh = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(fresh?.run?.calorie).toBe(0);
    expect(fresh?.run?.endReason).toBeUndefined();

    expect(pageErrors).toEqual([]);
  });

  test('restarting 10 times never leaks state into the next run (AC-135/136)', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await startRun(page, 'e2e-restart-stress');

    for (let i = 0; i < 10; i += 1) {
      const snapshotAtStart = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
      expect(snapshotAtStart?.run?.score).toBe(0);
      expect(snapshotAtStart?.run?.endReason).toBeUndefined();

      await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(100));
      await waitForScene(page, 'ResultScene', 4000);

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (!box) throw new Error('canvas bounding box not found');
      await canvas.click({ position: { x: box.width / 2, y: box.height * 0.74 } });
      await waitForScene(page, 'GameScene');
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
