import { expect, test, type Page } from '@playwright/test';

/** TitleScene START label sits at LOGICAL_HEIGHT * 0.84 after HOW TO PLAY / SETTINGS. */
const START_CLICK_Y_RATIO = 0.84;
const LOGICAL_WIDTH = 390;

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

async function skipToBoss(page: Page): Promise<void> {
  // Call skip only while pre-boss: repeating debugSkipToBoss resets the warning timer.
  await page.waitForFunction(
    () => {
      const run = window.__FAT_E2E__?.getSnapshot().run;
      if (run?.bossPhase !== undefined) return true;
      const phase = run?.phase;
      if (phase === 'bossWarning' || phase === 'bossIntro' || phase === 'bossActive' || phase === 'bossDeath') {
        return false;
      }
      window.__FAT_E2E__?.debugSkipToBoss();
      return false;
    },
    { timeout: 10_000, polling: 150 },
  );
}

async function defeatStage1BossLightly(
  page: Page,
  box: Box,
  isMobile: boolean,
): Promise<void> {
  await page.waitForFunction(
    () => {
      const run = window.__FAT_E2E__?.getSnapshot().run;
      return run?.phase === 'bossActive' || run?.bossPhase === 'phase1';
    },
    { timeout: 12_000 },
  );
  await page.evaluate(() => window.__FAT_E2E__?.debugSetBossHp(1));
  const y = box.y + box.height * 0.86;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  if (!isMobile) await page.keyboard.down('Space');

  let defeated = false;
  for (let i = 0; i < 80 && !defeated; i += 1) {
    const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    if ((run?.bossesKilled ?? 0) >= 1 || run?.bossPhase === 'dead') {
      defeated = true;
      break;
    }
    if (typeof run?.bossX === 'number') {
      await page.mouse.move(box.x + (run.bossX / LOGICAL_WIDTH) * box.width, y);
    }
    await page.waitForTimeout(100);
  }

  await page.mouse.up();
  if (!isMobile) await page.keyboard.up('Space');

  if (!defeated) {
    const finalRun = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    throw new Error(`Stage-1 boss not defeated: ${JSON.stringify(finalRun)}`);
  }
}

test.describe('Full Graybox acceptance', () => {
  for (const seed of ['graybox-seed-a', 'graybox-seed-b', 'graybox-seed-c'] as const) {
    test(`AC-310 fixed seed ${seed}: skipToBoss → clear → Result without page errors`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(60_000);
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      const box = await startRun(page, seed);
      const isMobile = Boolean(testInfo.project.use.isMobile);
      await skipToBoss(page);

      // Prefer a light real stage-1 kill; force-clear remaining stages for RUN CLEAR.
      await defeatStage1BossLightly(page, box, isMobile);
      await page.evaluate(() => window.__FAT_E2E__?.debugForceRunClear());
      await waitForScene(page, 'ResultScene', 10_000);

      const snap = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
      expect(snap?.run?.endReason).toBe('CLEAR');
      expect(snap?.run?.bossesKilled).toBeGreaterThanOrEqual(1);
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }

  test('multi-stage: stage1 boss defeat advances without CLEAR, then forceRunClear → Result', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const box = await startRun(page, 'graybox-multi-stage');
    const isMobile = Boolean(testInfo.project.use.isMobile);

    await skipToBoss(page);
    await defeatStage1BossLightly(page, box, isMobile);

    await page.waitForFunction(
      () => {
        const run = window.__FAT_E2E__?.getSnapshot().run;
        if (!run) return false;
        if (run.endReason) return false;
        return (
          (run.bossesKilled ?? 0) >= 1 &&
          ((run.stageIndex ?? 0) >= 1 ||
            (run.caption ?? '').includes('STAGE CLEAR') ||
            (run.caption ?? '').includes('STAGE 2') ||
            (run.caption ?? '').includes('NEXT STAGE') ||
            run.phase === 'stageClear' ||
            run.phase === 'stageTransition' ||
            run.phase === 'stageIntro')
        );
      },
      { timeout: 12_000 },
    );

    const mid = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(mid?.bossesKilled).toBeGreaterThanOrEqual(1);
    expect(mid?.endReason).toBeUndefined();
    expect((mid?.stageIndex ?? 0) >= 1 || (mid?.caption ?? '').length > 0).toBe(true);

    await page.evaluate(() => window.__FAT_E2E__?.debugForceRunClear());
    await waitForScene(page, 'ResultScene', 10_000);
    const result = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(result?.endReason).toBe('CLEAR');
  });

  test('power-up: cheatDay near player raises calorie; 90 + cheatDay → FAT OVER', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await startRun(page, 'graybox-powerup-cheat');

    await page.evaluate(() => window.__FAT_E2E__?.debugSpawnPowerUp('cheatDay'));
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.calorie ?? 0) >= 20,
      { timeout: 5_000 },
    );
    const afterCheat = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(afterCheat?.calorie).toBeGreaterThanOrEqual(20);
    expect(afterCheat?.endReason).toBeUndefined();

    // Fresh run: near-cap calorie then cheat day must FAT OVER.
    await startRun(page, 'graybox-powerup-fat-over');
    await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(90));
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.calorie ?? 0) >= 90,
      { timeout: 3_000 },
    );
    await page.evaluate(() => window.__FAT_E2E__?.debugSpawnPowerUp('cheatDay'));
    await waitForScene(page, 'ResultScene', 8_000);
    const fatOver = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(fatOver?.endReason).toBe('FAT_OVER');
    expect(fatOver?.calorie).toBe(100);
  });

  test('power-up: protein / caffeine / cardio / fatBurn spawn and are collectible', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const box = await startRun(page, 'graybox-powerup-kinds');
    const canvas = page.locator('canvas');

    const togglePause = async (): Promise<void> => {
      // Prefer on-screen pause control (works on Mobile); Escape as fallback.
      await canvas.click({
        position: { x: Math.max(8, box.width - 24), y: 18 },
      });
      await page.waitForTimeout(80);
    };

    // Pause freezes physics so spawn is observable before instant player overlap.
    await togglePause();
    for (const id of ['protein', 'caffeine', 'cardio', 'fatBurn'] as const) {
      await page.evaluate((powerUpId) => window.__FAT_E2E__?.debugSpawnPowerUp(powerUpId), id);
      await page.waitForFunction(
        () => (window.__FAT_E2E__?.getSnapshot().run?.activePowerUps ?? 0) >= 1,
        { timeout: 4_000 },
      );
      await togglePause(); // resume → collect
      await page.waitForFunction(
        () => (window.__FAT_E2E__?.getSnapshot().run?.activePowerUps ?? 0) === 0,
        { timeout: 5_000 },
      );
      await togglePause(); // pause again for next spawn
    }
    await togglePause(); // resume

    const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(run?.endReason).toBeUndefined();
    expect(run?.activePowerUps ?? 0).toBe(0);
  });

  test('caps: enemy projectiles stay <= 220 under boss stress', async ({ page }) => {
    test.setTimeout(45_000);
    await startRun(page, 'graybox-cap-stress');
    await page.evaluate(() => window.__FAT_E2E__?.debugSkipToBoss());
    await page.waitForTimeout(2500);

    let peak = 0;
    for (let i = 0; i < 30; i += 1) {
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      peak = Math.max(peak, run?.activeEnemyProjectiles ?? 0);
      expect(run?.activeEnemyProjectiles ?? 0).toBeLessThanOrEqual(220);
      await page.waitForTimeout(50);
    }
    expect(peak).toBeLessThanOrEqual(220);
  });
});
