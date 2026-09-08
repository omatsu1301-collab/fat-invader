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
