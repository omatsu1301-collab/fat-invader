import { expect, test, type Page } from '@playwright/test';

async function waitForScene(page: Page, sceneKey: string, timeout = 4000): Promise<void> {
  await page.waitForFunction(
    (key) => window.__FAT_E2E__?.getSnapshot().sceneKey === key,
    sceneKey,
    { timeout },
  );
}

async function startRun(page: Page, seed: string): Promise<void> {
  await page.goto('/');
  await waitForScene(page, 'TitleScene');
  await page.evaluate((s) => window.__FAT_E2E__?.setSeed(s), seed);
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas bounding box not found');
  await canvas.click({ position: { x: box.width / 2, y: box.height * 0.76 } });
  await waitForScene(page, 'GameScene');
}

test.describe('Game Feel (Milestone B steps 2-6)', () => {
  test('simultaneous kills never exceed particle cap or drop enemy bullets (AC-204/424)', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await startRun(page, 'e2e-feel-cap');
    await page.evaluate(() => window.__FAT_E2E__?.debugSetFeelSettings({ reducedEffects: false }));

    await page.waitForFunction(
      () => {
        window.__FAT_E2E__?.debugKillAllEnemies();
        return (window.__FAT_E2E__?.getSnapshot().run?.enemiesKilled ?? 0) >= 8;
      },
      { timeout: 10_000, polling: 80 },
    );

    const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(run?.enemiesKilled).toBeGreaterThanOrEqual(8);
    expect(run?.activeParticles ?? 0).toBeLessThanOrEqual(320);
    expect(run?.activeFragments ?? 0).toBeLessThanOrEqual(48);
    expect(run?.activeScorePopups ?? 0).toBeLessThanOrEqual(20);
    expect(run?.activeEnemyProjectiles ?? 0).toBeLessThanOrEqual(220);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Reduced Effects keeps the same kill score as full VFX (AC-201/211)', async ({ page }) => {
    await startRun(page, 'e2e-feel-parity');
    await page.evaluate(() => window.__FAT_E2E__?.debugSetFeelSettings({ reducedEffects: false }));
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.activeEnemies ?? 0) >= 8,
      { timeout: 8_000 },
    );
    await page.evaluate(() => window.__FAT_E2E__?.debugKillAllEnemies());
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.enemiesKilled ?? 0) >= 8,
      { timeout: 4_000 },
    );
    const full = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    const fullScore = full?.score ?? 0;

    await startRun(page, 'e2e-feel-parity');
    await page.evaluate(() =>
      window.__FAT_E2E__?.debugSetFeelSettings({ reducedEffects: true, screenShake: 'off' }),
    );
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.activeEnemies ?? 0) >= 8,
      { timeout: 8_000 },
    );
    await page.evaluate(() => window.__FAT_E2E__?.debugKillAllEnemies());
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.enemiesKilled ?? 0) >= 8,
      { timeout: 4_000 },
    );
    const reduced = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(reduced?.score).toBe(fullScore);
    expect(reduced?.enemiesKilled).toBe(full?.enemiesKilled);
    expect(reduced?.shakePx ?? 0).toBe(0);
  });

  test('player hit and FAT OVER still reach Result with no page errors (AC-115)', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await startRun(page, 'e2e-feel-player-hit');
    await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(100));
    await waitForScene(page, 'ResultScene', 4000);
    expect(pageErrors).toEqual([]);
  });

  test('boss death holds the dead phase before CLEAR (AC-200 path / step 6)', async ({
    page,
  }, testInfo) => {
    await startRun(page, 'e2e-feel-boss-death');
    const playBox = await page.locator('canvas').boundingBox();
    if (!playBox) throw new Error('canvas bounding box not found');

    await page.waitForFunction(
      () => {
        window.__FAT_E2E__?.debugKillAllEnemies();
        return window.__FAT_E2E__?.getSnapshot().run?.bossPhase !== undefined;
      },
      { timeout: 10_000, polling: 150 },
    );

    await page.evaluate(() => window.__FAT_E2E__?.debugSetBossHp(1));
    const isMobile = Boolean(testInfo.project.use.isMobile);
    const y = playBox.y + playBox.height * 0.86;
    await page.mouse.move(playBox.x + playBox.width / 2, y);
    await page.mouse.down();
    if (!isMobile) await page.keyboard.down('Space');

    let sawDead = false;
    let cleared = false;
    for (let i = 0; i < 80 && !cleared; i += 1) {
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      if (run?.bossPhase === 'dead' && run.endReason === undefined) {
        sawDead = true;
        expect(run.bossSpriteVisible).toBe(true);
        expect(run.bossBodyEnabled).toBe(false);
        expect(run.activeEnemyProjectiles ?? 0).toBe(0);
      }
      if (run?.endReason === 'CLEAR') {
        cleared = true;
        break;
      }
      if (typeof run?.bossX === 'number') {
        await page.mouse.move(playBox.x + (run.bossX / 390) * playBox.width, y);
      }
      await page.waitForTimeout(100);
    }

    await page.mouse.up();
    if (!isMobile) await page.keyboard.up('Space');

    expect(sawDead, 'expected a visible boss-death beat before STAGE CLEAR').toBe(true);
    expect(cleared).toBe(true);
  });
});
