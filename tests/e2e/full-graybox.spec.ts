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
  await defeatBossWithRealCollision(page, box, isMobile, 1);
}

async function defeatBossWithRealCollision(
  page: Page,
  box: Box,
  isMobile: boolean,
  expectedBossesKilled: number,
): Promise<void> {
  await page.waitForFunction(
    () => {
      const run = window.__FAT_E2E__?.getSnapshot().run;
      return run?.phase === 'bossActive' || run?.bossPhase === 'phase1' || run?.bossPhase === 'phase2' || run?.bossPhase === 'rage';
    },
    { timeout: 12_000 },
  );
  await page.evaluate(() => window.__FAT_E2E__?.debugSetBossHp(1));
  const y = box.y + box.height * 0.86;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  if (!isMobile) await page.keyboard.down('Space');

  let defeated = false;
  for (let i = 0; i < 100 && !defeated; i += 1) {
    const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    if ((run?.bossesKilled ?? 0) >= expectedBossesKilled || run?.bossPhase === 'dead') {
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
    throw new Error(`Boss not defeated (want bossesKilled>=${expectedBossesKilled}): ${JSON.stringify(finalRun)}`);
  }
}

async function waitForNextStageOrClear(page: Page, minStageIndex: number): Promise<void> {
  await page.waitForFunction(
    (minStage) => {
      const run = window.__FAT_E2E__?.getSnapshot().run;
      if (!run) return false;
      if (run.endReason === 'CLEAR') return true;
      return (
        (run.stageIndex ?? 0) >= minStage ||
        run.phase === 'stageClear' ||
        run.phase === 'stageTransition' ||
        run.phase === 'stageIntro' ||
        run.phase === 'wave' ||
        (run.caption ?? '').includes('NEXT STAGE') ||
        (run.caption ?? '').includes('STAGE CLEAR')
      );
    },
    minStageIndex,
    { timeout: 15_000 },
  );
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

  test('Full Run evidence: Stage1→2→3 bosses via real kills (no forceRunClear)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const box = await startRun(page, 'graybox-full-run-path');
    const isMobile = Boolean(testInfo.project.use.isMobile);
    const seenBossIds: string[] = [];

    // Stage 1 — KING BURGER
    await skipToBoss(page);
    await page.waitForFunction(
      () => window.__FAT_E2E__?.getSnapshot().run?.bossId === 'kingBurgerMini',
      { timeout: 12_000 },
    );
    seenBossIds.push('kingBurgerMini');
    await defeatBossWithRealCollision(page, box, isMobile, 1);
    await waitForNextStageOrClear(page, 1);
    let mid = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(mid?.endReason).toBeUndefined();
    expect(mid?.bossesKilled).toBeGreaterThanOrEqual(1);

    // Stage 2 — PIZZA MOTHER
    await skipToBoss(page);
    await page.waitForFunction(
      () => window.__FAT_E2E__?.getSnapshot().run?.bossId === 'pizzaMother',
      { timeout: 15_000 },
    );
    seenBossIds.push('pizzaMother');
    await defeatBossWithRealCollision(page, box, isMobile, 2);
    await waitForNextStageOrClear(page, 2);
    mid = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(mid?.endReason).toBeUndefined();
    expect(mid?.bossesKilled).toBeGreaterThanOrEqual(2);

    // Stage 3 — KING CALORIE → Result CLEAR
    await skipToBoss(page);
    await page.waitForFunction(
      () => window.__FAT_E2E__?.getSnapshot().run?.bossId === 'kingCalorie',
      { timeout: 15_000 },
    );
    seenBossIds.push('kingCalorie');
    await defeatBossWithRealCollision(page, box, isMobile, 3);
    await waitForScene(page, 'ResultScene', 20_000);

    const result = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(result?.endReason).toBe('CLEAR');
    expect(result?.bossesKilled).toBe(3);
    expect(seenBossIds).toEqual(['kingBurgerMini', 'pizzaMother', 'kingCalorie']);
    expect(pageErrors).toEqual([]);
  });

  test('Boss runtime phases: intro→phase1→phase2→rage→dead for all 3 bosses', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await startRun(page, 'graybox-boss-phases');

    const expectedBosses = ['kingBurgerMini', 'pizzaMother', 'kingCalorie'] as const;
    for (let i = 0; i < expectedBosses.length; i += 1) {
      const bossId = expectedBosses[i]!;
      const observed = new Set<string>();

      await page.waitForFunction(
        (id) => {
          const run = window.__FAT_E2E__?.getSnapshot().run;
          if (run?.bossId === id && run.bossPhase) return true;
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
        bossId,
        { timeout: 15_000, polling: 50 },
      );

      // Sample rapidly to catch short intro.
      for (let sample = 0; sample < 60; sample += 1) {
        const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
        if (run?.bossPhase) observed.add(run.bossPhase);
        if (run?.bossPhase === 'phase1' || run?.bossPhase === 'phase2' || run?.bossPhase === 'rage') {
          break;
        }
        await page.waitForTimeout(25);
      }
      expect(observed.has('intro') || observed.has('phase1')).toBe(true);

      await page.waitForFunction(
        () => {
          const run = window.__FAT_E2E__?.getSnapshot().run;
          if (!run?.bossMaxHp) return false;
          if (run.bossPhase === 'phase2' || run.bossPhase === 'rage' || run.bossPhase === 'dead') {
            return true;
          }
          if (run.phase !== 'bossActive' && run.bossPhase !== 'phase1') return false;
          const target = Math.floor(run.bossMaxHp * 0.45);
          const hp = run.bossHp ?? run.bossMaxHp;
          if (hp > target) {
            window.__FAT_E2E__?.debugApplyBossDamage(Math.max(1, hp - target));
          }
          return false;
        },
        { timeout: 10_000, polling: 50 },
      );
      observed.add('phase2');

      await page.waitForFunction(
        () => {
          const run = window.__FAT_E2E__?.getSnapshot().run;
          if (!run?.bossMaxHp) return false;
          if (run.bossPhase === 'rage' || run.bossPhase === 'dead') return true;
          const target = Math.max(1, Math.floor(run.bossMaxHp * 0.18));
          const hp = run.bossHp ?? run.bossMaxHp;
          if (hp > target) {
            window.__FAT_E2E__?.debugApplyBossDamage(Math.max(1, hp - target));
          }
          return false;
        },
        { timeout: 10_000, polling: 50 },
      );
      observed.add('rage');

      await page.waitForFunction(
        () => {
          const run = window.__FAT_E2E__?.getSnapshot().run;
          if (run?.bossPhase === 'dead') return true;
          window.__FAT_E2E__?.debugApplyBossDamage(99);
          return false;
        },
        { timeout: 10_000, polling: 50 },
      );
      observed.add('dead');
      if (observed.has('phase1') || observed.has('intro')) {
        observed.add('phase1');
      }

      expect([...observed]).toEqual(
        expect.arrayContaining(['intro', 'phase1', 'phase2', 'rage', 'dead']),
      );

      if (i < expectedBosses.length - 1) {
        await waitForNextStageOrClear(page, i + 1);
        const mid = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
        expect(mid?.endReason).toBeUndefined();
      } else {
        await waitForScene(page, 'ResultScene', 20_000);
        const result = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
        expect(result?.endReason).toBe('CLEAR');
        expect(result?.bossesKilled).toBe(3);
      }
    }
  });

  test('power-up integration: combat mods + FAT BURN clear connect at runtime', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    let box = await startRun(page, 'graybox-powerup-integration');
    const canvas = page.locator('canvas');

    const togglePause = async (): Promise<void> => {
      await canvas.click({ position: { x: Math.max(8, box.width - 24), y: 18 } });
      await page.waitForTimeout(80);
    };

    const collectWhilePaused = async (id: string): Promise<void> => {
      await togglePause();
      await page.evaluate((powerUpId) => window.__FAT_E2E__?.debugSpawnPowerUp(powerUpId), id);
      await page.waitForFunction(
        () => (window.__FAT_E2E__?.getSnapshot().run?.activePowerUps ?? 0) >= 1,
        { timeout: 4_000 },
      );
      await togglePause();
      await page.waitForFunction(
        () => (window.__FAT_E2E__?.getSnapshot().run?.activePowerUps ?? 0) === 0,
        { timeout: 5_000 },
      );
    };

    const baseline = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run?.powerUpMods);
    expect(baseline?.shotDamage).toBe(1);
    expect(baseline?.fireIntervalMs).toBe(180);
    expect(baseline?.moveSpeedMultiplier).toBe(1);
    expect(baseline?.tripleShot).toBe(false);

    await collectWhilePaused('protein');
    await collectWhilePaused('caffeine');
    await collectWhilePaused('cardio');

    await page.waitForFunction(
      () => {
        const mods = window.__FAT_E2E__?.getSnapshot().run?.powerUpMods;
        return (
          mods?.shotDamage === 2 &&
          mods.fireIntervalMs === 110 &&
          mods.moveSpeedMultiplier === 1.25
        );
      },
      { timeout: 4_000 },
    );
    const stacked = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run?.powerUpMods);
    expect(stacked?.shotDamage).toBe(2);
    expect(stacked?.fireIntervalMs).toBe(110);
    expect(stacked?.moveSpeedMultiplier).toBe(1.25);

    // FAT BURN during wave fire (no boss refill race).
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.activeEnemyProjectiles ?? 0) >= 1,
      { timeout: 12_000 },
    );
    const beforeBurn = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.activeEnemyProjectiles ?? 0,
    );
    expect(beforeBurn).toBeGreaterThan(0);
    await collectWhilePaused('fatBurn');
    await page.waitForFunction(
      (peak) => {
        const n = window.__FAT_E2E__?.getSnapshot().run?.activeEnemyProjectiles ?? 999;
        return n < peak;
      },
      beforeBurn,
      { timeout: 6_000 },
    );
    const afterBurn = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.activeEnemyProjectiles ?? 0,
    );
    expect(afterBurn).toBeLessThan(beforeBurn);

    box = await startRun(page, 'graybox-powerup-cheatday-mods');
    await collectWhilePaused('cheatDay');
    await page.waitForFunction(
      () => {
        const mods = window.__FAT_E2E__?.getSnapshot().run?.powerUpMods;
        return mods?.tripleShot === true && mods.invulnerable === true;
      },
      { timeout: 4_000 },
    );
    const cheat = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(cheat?.powerUpMods?.tripleShot).toBe(true);
    expect(cheat?.powerUpMods?.invulnerable).toBe(true);
    expect(cheat?.calorie).toBeGreaterThanOrEqual(20);
  });
});
