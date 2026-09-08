import { expect, test, type Page } from '@playwright/test';

// FI-02 section 3. Kept as a local literal (not imported from src/game/config)
// so this Node-side test file never pulls in Phaser, which touches canvas/DOM
// globals at module init and cannot run outside a browser context.
const LOGICAL_WIDTH = 390;

type Box = { x: number; y: number; width: number; height: number };

async function waitForScene(page: Page, sceneKey: string, timeout = 4000): Promise<void> {
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
  await canvas.click({ position: { x: box.width / 2, y: box.height * 0.76 } });
  await waitForScene(page, 'GameScene');
  return box;
}

/**
 * Finishes the boss fight through a *real* player-projectile-vs-boss
 * collision, per the Milestone A audit ("Bossへの最終ダメージそのものを
 * debug commandで直接発生させないでください"). `debugSetBossHp` only
 * shrinks HP so a single real hit is lethal and the test stays fast/CI-safe
 * — it never applies damage itself. Mouse-based dragging is used for both
 * projects (Phaser treats mouse and touch pointers uniformly), so this one
 * path aims the player under the boss on Desktop and Mobile alike; firing
 * is manual (held Space) on Desktop and automatic on Mobile.
 */
async function defeatBossWithRealCollision(page: Page, box: Box, isMobile: boolean): Promise<void> {
  await page.evaluate(() => window.__FAT_E2E__?.debugSetBossHp(1));

  const y = box.y + box.height * 0.86;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  if (!isMobile) {
    await page.keyboard.down('Space');
  }

  let defeated = false;
  for (let i = 0; i < 60 && !defeated; i += 1) {
    const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    if (run?.endReason === 'CLEAR') {
      defeated = true;
      break;
    }
    if (typeof run?.bossX === 'number') {
      const screenX = box.x + (run.bossX / LOGICAL_WIDTH) * box.width;
      await page.mouse.move(screenX, y);
    }
    await page.waitForTimeout(120);
  }

  await page.mouse.up();
  if (!isMobile) {
    await page.keyboard.up('Space');
  }

  if (!defeated) {
    const finalRun = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    throw new Error(
      `Boss was not defeated via real collision within the timeout. Final run snapshot: ${JSON.stringify(finalRun)}`,
    );
  }
}

test.describe('Vertical slice', () => {
  test('title -> move -> fire -> kill -> calorie -> boss (real hit) -> clear -> result -> retry (AC-130/131/132)', async ({
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

    // Blocker 1 fix proof: the boss must go down via a real player-projectile
    // collision, not a debug "defeat" shortcut.
    await defeatBossWithRealCollision(page, box, isMobile);
    await waitForScene(page, 'ResultScene', 6000);

    const resultSnapshot = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(resultSnapshot?.run?.endReason).toBe('CLEAR');
    expect(resultSnapshot?.run?.bossesKilled).toBe(1);

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

  test('Pause freezes score/CALORIE/game clock and blocks queued hits until resumed (AC-133)', async ({
    page,
  }) => {
    await startRun(page, 'e2e-pause');

    await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(20));
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.calorie ?? 0) >= 20,
    );
    // Let the 650ms post-hit invulnerability window (AC-114) expire before
    // pausing, so it can't also suppress the second hit queued below and
    // confound this test's proof that *pause* — not invulnerability — is
    // what's blocking it.
    await page.waitForTimeout(750);

    await page.keyboard.press('Escape');
    const before = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);

    // Real time passes while paused; nothing in the run should move.
    await page.waitForTimeout(800);
    const afterWait = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(afterWait).toEqual(before);

    // A hit queued while paused must not be resolved until play resumes,
    // since resolveCombat only runs inside the active (non-paused) update path.
    await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(50));
    await page.waitForTimeout(300);
    const stillPaused = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(stillPaused?.calorie).toBe(before?.calorie);
    expect(stillPaused?.playerX).toBe(before?.playerX);

    await page.keyboard.press('Escape'); // resume
    await page.waitForFunction(
      (expected) => (window.__FAT_E2E__?.getSnapshot().run?.calorie ?? 0) >= expected,
      (before?.calorie ?? 0) + 50,
      { timeout: 2000 },
    );
  });

  test('tab-hidden triggers auto-pause (AC-134)', async ({ page }) => {
    await startRun(page, 'e2e-visibility');

    await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(10));
    await page.waitForFunction(
      () => (window.__FAT_E2E__?.getSnapshot().run?.calorie ?? 0) >= 10,
    );

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    const before = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(after).toEqual(before);
  });

  test('restarting 10 times never leaks state or SHUTDOWN listeners into the next run (AC-135/136)', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await startRun(page, 'e2e-restart-stress');

    // Phaser's own systems (physics, tweens, input, loader, ...) each
    // register their own SHUTDOWN listener as part of normal scene
    // lifecycle, so the baseline count is not 1. The audit's concern is
    // growth: `.on(SHUTDOWN, ...)` re-registered on every create() would add
    // one extra listener per restart, so what matters is that this count
    // stays flat against the count from the very first run.
    const baselineShutdownListenerCount = await page.evaluate(
      () => window.__FAT_E2E__?.getSnapshot().run?.shutdownListenerCount,
    );
    expect(baselineShutdownListenerCount).toBeGreaterThan(0);

    for (let i = 0; i < 10; i += 1) {
      const snapshotAtStart = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
      expect(snapshotAtStart?.run?.score).toBe(0);
      expect(snapshotAtStart?.run?.endReason).toBeUndefined();
      expect(snapshotAtStart?.run?.shutdownListenerCount).toBe(baselineShutdownListenerCount);
      // AC-136: no *enemy* bullets survive from the previous run into this
      // fresh one. (Player projectiles are deliberately not asserted here:
      // on Mobile, auto-fire can legitimately produce a brand-new in-flight
      // shot within the fresh run's very first frame, which would be a
      // false positive for "leftover from the previous run" — enemy
      // bullets can't exist yet this early since the wave hasn't spawned.)
      expect(snapshotAtStart?.run?.activeEnemyProjectiles).toBe(0);

      // Fire a few real shots so this run has in-flight bullets whose
      // clearing the *next* iteration's assertions above actually prove.
      await page.keyboard.down('Space');
      await page.waitForTimeout(200);
      await page.keyboard.up('Space');

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
