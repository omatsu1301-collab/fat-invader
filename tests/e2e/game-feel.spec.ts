import { expect, test, type Page } from '@playwright/test';

/** TitleScene START label sits at LOGICAL_HEIGHT * 0.84 after HOW TO PLAY / SETTINGS. */
const START_CLICK_Y_RATIO = 0.84;
/** stage1Wave1 is a 2×3 fryScout grid (Full Graybox). */
const WAVE1_ENEMY_COUNT = 6;

async function waitForScene(page: Page, sceneKey: string, timeout = 10_000): Promise<void> {
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
  await canvas.click({ position: { x: box.width / 2, y: box.height * START_CLICK_Y_RATIO } });
  await waitForScene(page, 'GameScene');
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
      (minKills) => {
        window.__FAT_E2E__?.debugKillAllEnemies();
        return (window.__FAT_E2E__?.getSnapshot().run?.enemiesKilled ?? 0) >= minKills;
      },
      WAVE1_ENEMY_COUNT,
      { timeout: 10_000, polling: 80 },
    );

    const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(run?.enemiesKilled).toBeGreaterThanOrEqual(WAVE1_ENEMY_COUNT);
    expect(run?.activeParticles ?? 0).toBeLessThanOrEqual(320);
    expect(run?.activeFragments ?? 0).toBeLessThanOrEqual(48);
    expect(run?.activeScorePopups ?? 0).toBeLessThanOrEqual(20);
    expect(run?.activeEnemyProjectiles ?? 0).toBeLessThanOrEqual(220);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('Reduced Effects keeps the same kill score as full VFX (AC-201/211)', async ({ page }) => {
    const runParity = async (reduced: boolean): Promise<{ score: number; enemiesKilled: number }> => {
      await startRun(page, 'e2e-feel-parity');
      await page.evaluate(
        (next) => window.__FAT_E2E__?.debugSetFeelSettings(next),
        reduced
          ? { reducedEffects: true, screenShake: 'off' as const }
          : { reducedEffects: false },
      );
      await page.waitForFunction(
        (min) => (window.__FAT_E2E__?.getSnapshot().run?.activeEnemies ?? 0) >= min,
        WAVE1_ENEMY_COUNT,
        { timeout: 8_000 },
      );
      await page.evaluate(() => window.__FAT_E2E__?.debugKillAllEnemies());
      await page.waitForFunction(
        (min) => (window.__FAT_E2E__?.getSnapshot().run?.enemiesKilled ?? 0) >= min,
        WAVE1_ENEMY_COUNT,
        { timeout: 4_000 },
      );
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      return { score: run?.score ?? 0, enemiesKilled: run?.enemiesKilled ?? 0 };
    };

    const full = await runParity(false);
    const reduced = await runParity(true);
    expect(reduced.enemiesKilled).toBe(full.enemiesKilled);
    expect(reduced.score).toBe(full.score);
    const shake = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run?.shakePx ?? 0);
    expect(shake).toBe(0);
  });

  test('Full / Reduced / Off keep the same enemy fire schedule after VFX (AC-201)', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const seed = 'e2e-feel-rng-streams';
    const profiles = [
      { reducedEffects: false, screenShake: 'full' as const },
      { reducedEffects: true, screenShake: 'reduced' as const },
      { reducedEffects: false, screenShake: 'off' as const },
    ];
    const fingerprints: { delays: number[]; offsets: number[] }[] = [];

    for (const settings of profiles) {
      await startRun(page, seed);
      await page.evaluate((next) => window.__FAT_E2E__?.debugSetFeelSettings(next), settings);
      await page.evaluate(() => {
        for (let i = 0; i < 8; i += 1) window.__FAT_E2E__?.debugPlayDisplayKill();
      });
      await page.waitForFunction(
        (min) => (window.__FAT_E2E__?.getSnapshot().run?.activeEnemies ?? 0) >= min,
        WAVE1_ENEMY_COUNT,
        { timeout: 8_000 },
      );
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      expect(run?.activeEnemies).toBeGreaterThanOrEqual(WAVE1_ENEMY_COUNT);
      expect(run?.enemyFireDelayMs?.length).toBeGreaterThanOrEqual(WAVE1_ENEMY_COUNT);
      fingerprints.push({
        delays: run?.enemyFireDelayMs ?? [],
        offsets: run?.enemyFormationOffsets ?? [],
      });
    }

    expect(fingerprints).toHaveLength(3);
    expect(fingerprints[0]).toEqual(fingerprints[1]);
    expect(fingerprints[0]).toEqual(fingerprints[2]);
  });

  test('enemy bullets still spawn and land or dodge after VFX cap (AC-204)', async ({ page }) => {
    await startRun(page, 'e2e-feel-cap-fire');
    await page.evaluate(() =>
      window.__FAT_E2E__?.debugSetFeelSettings({ reducedEffects: false, screenShake: 'full' }),
    );
    await page.waitForFunction(
      (min) => (window.__FAT_E2E__?.getSnapshot().run?.activeEnemies ?? 0) >= min,
      WAVE1_ENEMY_COUNT,
      { timeout: 8_000 },
    );
    await page.evaluate(() => window.__FAT_E2E__?.debugSaturateVfxCaps());
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.activeParticles ?? 0) >= 320,
      { timeout: 2_000 },
    );
    const atCap = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(atCap?.activeParticles).toBe(320);
    expect(atCap?.activeFragments).toBe(48);

    await page.waitForFunction(
      () => {
        const run = window.__FAT_E2E__?.getSnapshot().run;
        if (!run) return false;
        const landedOrDodged = (run.calorie ?? 0) + (run.caloriesDodged ?? 0);
        return (run.activeEnemyProjectiles ?? 0) >= 1 && landedOrDodged > 0;
      },
      { timeout: 10_000 },
    );

    const after = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(after?.activeParticles).toBe(320);
    expect(after?.activeEnemyProjectiles ?? 0).toBeGreaterThan(0);
    expect((after?.calorie ?? 0) + (after?.caloriesDodged ?? 0)).toBeGreaterThan(0);
    expect(after?.activeEnemies).toBeGreaterThanOrEqual(WAVE1_ENEMY_COUNT);
  });

  test('FAT OVER pose and caption hold ~2.6s then Result once (Gate 2)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await startRun(page, 'e2e-feel-fat-over-pose');
    await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(100));
    await page.waitForFunction(
      () =>
        window.__FAT_E2E__?.getSnapshot().sceneKey === 'GameScene' &&
        window.__FAT_E2E__?.getSnapshot().run?.fatOverPoseActive === true &&
        window.__FAT_E2E__?.getSnapshot().run?.endReason === 'FAT_OVER',
      { timeout: 4_000 },
    );
    const poseAtMs = Date.now();

    const started = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(started?.sceneKey).toBe('GameScene');
    expect(started?.run?.fatOverPoseActive).toBe(true);
    expect(started?.run?.caption).toContain('FAT OVER');
    expect(started?.run?.caption).toContain('満腹につき、いったん帰還。');
    expect(started?.run?.runEndedCount).toBe(1);
    expect(started?.run?.calorie).toBe(100);
    const scoreAtEnd = started?.run?.score ?? 0;

    // Capture while still on the pose frame when possible.
    const isMobile = Boolean(testInfo.project.use.isMobile);
    const shotName = isMobile ? 'gate2-fat-over-pose-mobile' : 'gate2-fat-over-pose-desktop';
    const png = await page.screenshot({
      path: `docs/evidence/${shotName}.png`,
      fullPage: true,
    });
    await testInfo.attach(shotName, { body: png, contentType: 'image/png' });

    await page.evaluate(() => {
      window.__FAT_E2E__?.debugApplyPlayerCalorie(50);
      window.__FAT_E2E__?.debugKillAllEnemies();
    });

    await waitForScene(page, 'ResultScene', 8000);
    const resultAtMs = Date.now();
    const result = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(result?.run?.endReason).toBe('FAT_OVER');
    expect(result?.run?.runEndedCount).toBe(1);
    expect(result?.run?.calorie).toBe(100);
    expect(result?.run?.score).toBe(scoreAtEnd);
    expect(resultAtMs - poseAtMs).toBeLessThan(8000);
    expect(pageErrors).toEqual([]);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas bounding box not found');
    await canvas.click({ position: { x: box.width / 2, y: box.height * 0.74 } });
    await waitForScene(page, 'GameScene');
    const fresh = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(fresh?.run?.calorie).toBe(0);
    expect(fresh?.run?.endReason).toBeUndefined();
    expect(fresh?.run?.runEndedCount).toBe(0);
    expect(fresh?.run?.fatOverPoseActive).toBeUndefined();
    expect(pageErrors).toEqual([]);
  });

  test('boss death plays impact → internal → finale then stage advances (Gate 2 multi-stage)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await startRun(page, 'e2e-feel-boss-death');
    const playBox = await page.locator('canvas').boundingBox();
    if (!playBox) throw new Error('canvas bounding box not found');

    await skipToBoss(page);
    await page.waitForFunction(
      () => {
        const run = window.__FAT_E2E__?.getSnapshot().run;
        return run?.phase === 'bossActive' || run?.bossPhase === 'phase1';
      },
      { timeout: 12_000 },
    );

    await page.evaluate(() => window.__FAT_E2E__?.debugSetBossHp(1));
    const isMobile = Boolean(testInfo.project.use.isMobile);
    const y = playBox.y + playBox.height * 0.86;
    await page.mouse.move(playBox.x + playBox.width / 2, y);
    await page.mouse.down();
    if (!isMobile) await page.keyboard.down('Space');

    const beats: string[] = [];
    let sawPreFinaleVisible = false;
    let sawInternal = false;
    let sawFinaleHidden = false;
    let frozenScore: number | undefined;
    let frozenCalorie: number | undefined;

    for (let i = 0; i < 400; i += 1) {
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      if (run?.bossDeathBeat && run.endReason === undefined) {
        if (frozenScore === undefined) {
          frozenScore = run.score;
          frozenCalorie = run.calorie;
        } else {
          expect(run.score).toBe(frozenScore);
          expect(run.calorie).toBe(frozenCalorie);
        }
        expect(run.bossesKilled).toBe(1);
      }
      const beat = run?.bossDeathBeat;
      if (beat && beats[beats.length - 1] !== beat) beats.push(beat);
      if (beat === 'impact') sawPreFinaleVisible = true;
      if (beat === 'internal') {
        sawInternal = true;
        // Sprite blinks during internal; visibility alone is not required.
        sawPreFinaleVisible = true;
      }
      if (beat === 'finale') {
        expect(run?.bossSpriteVisible).toBe(false);
        sawFinaleHidden = true;
      }
      if (sawPreFinaleVisible && sawInternal && sawFinaleHidden) break;
      if (typeof run?.bossX === 'number') {
        await page.mouse.move(playBox.x + (run.bossX / 390) * playBox.width, y);
      }
    }

    await page.mouse.up();
    if (!isMobile) await page.keyboard.up('Space');

    expect(sawPreFinaleVisible, `beats=${beats.join('>')}`).toBe(true);
    expect(sawInternal, `beats=${beats.join('>')}`).toBe(true);
    expect(sawFinaleHidden, `beats=${beats.join('>')}`).toBe(true);
    expect(beats.join('>')).toMatch(/impact.*internal.*finale|internal.*finale/);

    await page.waitForFunction(
      () => {
        const run = window.__FAT_E2E__?.getSnapshot().run;
        if (!run || run.endReason) return false;
        return (
          (run.bossesKilled ?? 0) >= 1 &&
          ((run.stageIndex ?? 0) >= 1 ||
            (run.caption ?? '').includes('STAGE CLEAR') ||
            (run.caption ?? '').includes('STAGE 2') ||
            (run.caption ?? '').includes('NEXT STAGE') ||
            run.phase === 'stageClear' ||
            run.phase === 'stageTransition' ||
            run.phase === 'stageIntro' ||
            run.phase === 'wave')
        );
      },
      { timeout: 12_000 },
    );

    const mid = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(mid?.bossesKilled).toBe(1);
    expect(mid?.endReason).toBeUndefined();

    await page.evaluate(() => window.__FAT_E2E__?.debugForceRunClear());
    await waitForScene(page, 'ResultScene', 8000);
    const result = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(result?.endReason).toBe('CLEAR');
    expect(result?.bossesKilled).toBeGreaterThanOrEqual(1);
  });
});
