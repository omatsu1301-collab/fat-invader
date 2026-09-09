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

  test('Full / Reduced / Off keep the same enemy fire schedule after VFX (AC-201)', async ({
    page,
  }) => {
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
        () => (window.__FAT_E2E__?.getSnapshot().run?.activeEnemies ?? 0) >= 8,
        { timeout: 8_000 },
      );
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      expect(run?.activeEnemies).toBeGreaterThanOrEqual(8);
      expect(run?.enemyFireDelayMs?.length).toBeGreaterThanOrEqual(8);
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
      () => (window.__FAT_E2E__?.getSnapshot().run?.activeEnemies ?? 0) >= 8,
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
    expect(after?.activeEnemies).toBeGreaterThanOrEqual(8);
  });

  test('FAT OVER pose is visible on GameScene before Result (Gate 2 evidence)', async ({
    page,
  }, testInfo) => {
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

    const isMobile = Boolean(testInfo.project.use.isMobile);
    const shotName = isMobile ? 'gate2-fat-over-pose-mobile' : 'gate2-fat-over-pose-desktop';
    const png = await page.screenshot({
      path: `docs/evidence/${shotName}.png`,
      fullPage: true,
    });
    await testInfo.attach(shotName, { body: png, contentType: 'image/png' });

    await page.waitForTimeout(450);
    const held = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(held?.sceneKey).toBe('GameScene');
    expect(held?.run?.fatOverPoseActive).toBe(true);
    expect(held?.run?.endReason).toBe('FAT_OVER');

    await waitForScene(page, 'ResultScene', 4000);
    const result = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(result?.run?.endReason).toBe('FAT_OVER');
    expect(pageErrors).toEqual([]);
  });

  test('boss death plays impact → internal → finale → STAGE CLEAR → Result once (Gate 2)', async ({
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

    const beats: string[] = [];
    let scoreAtDeath: number | undefined;
    let calorieAtDeath: number | undefined;
    let sawPreFinaleVisible = false;
    let sawInternal = false;
    let sawFinaleHidden = false;
    let cleared = false;

    for (let i = 0; i < 100 && !cleared; i += 1) {
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      if (run?.bossPhase === 'dead' && run.endReason === undefined) {
        if (scoreAtDeath === undefined) {
          scoreAtDeath = run.score;
          calorieAtDeath = run.calorie;
        }
        expect(run.bossesKilled).toBe(1);
        expect(run.score).toBe(scoreAtDeath);
        expect(run.calorie).toBe(calorieAtDeath);
        expect(run.bossBodyEnabled).toBe(false);
        expect(run.activeEnemyProjectiles ?? 0).toBe(0);
      }
      const beat = run?.bossDeathBeat;
      if (beat && beats[beats.length - 1] !== beat) beats.push(beat);
      if (beat === 'impact' || (beat === 'internal' && run?.bossSpriteVisible)) {
        sawPreFinaleVisible = true;
      }
      if (beat === 'internal') {
        sawInternal = true;
        expect(run?.endReason).toBeUndefined();
      }
      if (beat === 'finale') {
        expect(run?.bossSpriteVisible).toBe(false);
        expect(run?.endReason).toBeUndefined();
        sawFinaleHidden = true;
      }
      if (run?.endReason === 'CLEAR') {
        expect(run.bossesKilled).toBe(1);
        cleared = true;
        break;
      }
      if (typeof run?.bossX === 'number') {
        await page.mouse.move(playBox.x + (run.bossX / 390) * playBox.width, y);
      }
      await page.waitForTimeout(30);
    }

    await page.mouse.up();
    if (!isMobile) await page.keyboard.up('Space');

    expect(sawPreFinaleVisible, 'expected boss sprite to remain visible before the finale').toBe(true);
    expect(sawInternal, 'expected internal-explosion beat before finale').toBe(true);
    expect(sawFinaleHidden, 'expected finale to hide the boss sprite').toBe(true);
    expect(beats.join('>')).toMatch(/internal.*finale/);
    expect(cleared).toBe(true);

    await waitForScene(page, 'ResultScene', 4000);
    const result = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(result?.endReason).toBe('CLEAR');
    expect(result?.bossesKilled).toBe(1);
  });
});
