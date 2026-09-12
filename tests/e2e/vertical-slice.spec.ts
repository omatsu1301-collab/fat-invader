import { expect, test, type Page } from '@playwright/test';
// Type-only import: fully erased at compile time, so this never pulls the
// Phaser-touching runtime module into the Node-side test bundle.
import type { FatE2ERunSnapshot } from '../../src/test-support/e2e-bridge';

// FI-02 section 3. Kept as a local literal (not imported from src/game/config)
// so this Node-side test file never pulls in Phaser, which touches canvas/DOM
// globals at module init and cannot run outside a browser context.
const LOGICAL_WIDTH = 390;
/** TitleScene START label sits at LOGICAL_HEIGHT * 0.84 after HOW TO PLAY / SETTINGS. */
const START_CLICK_Y_RATIO = 0.84;

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

/**
 * Finishes the boss fight through a *real* player-projectile-vs-boss
 * collision, per the Milestone A audit ("Bossへの最終ダメージそのものを
 * debug commandで直接発生させないでください"). `debugSetBossHp` only
 * shrinks HP so a single real hit is lethal and the test stays fast/CI-safe
 * — it never applies damage itself. Mouse-based dragging is used for both
 * projects (Phaser treats mouse and touch pointers uniformly), so this one
 * path aims the player under the boss on Desktop and Mobile alike; firing
 * is manual (held Space) on Desktop and automatic on Mobile.
 *
 * Stage 1 boss defeat no longer ends the run (multi-stage). After a real
 * stage-1 kill, `debugForceRunClear` advances remaining stages so Result
 * CLEAR still covers AC-130.
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
    if ((run?.bossesKilled ?? 0) >= 1 || run?.bossPhase === 'dead') {
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

  await page.evaluate(() => window.__FAT_E2E__?.debugForceRunClear());
}

async function startAimingAndFiringAtBoss(page: Page, box: Box, isMobile: boolean): Promise<void> {
  const y = box.y + box.height * 0.86;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  if (!isMobile) {
    await page.keyboard.down('Space');
  }
}

async function stopAimingAndFiring(page: Page, isMobile: boolean): Promise<void> {
  await page.mouse.up();
  if (!isMobile) {
    await page.keyboard.up('Space');
  }
}

/** Re-aims the pointer at the boss's current x so a continuously-firing player keeps hitting it. */
async function keepAimingAtBoss(page: Page, box: Box): Promise<void> {
  const y = box.y + box.height * 0.86;
  const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
  if (typeof run?.bossX === 'number') {
    const screenX = box.x + (run.bossX / LOGICAL_WIDTH) * box.width;
    await page.mouse.move(screenX, y);
  }
}

test.describe('Vertical slice', () => {
  test('title -> move -> fire -> kill -> calorie -> boss (real hit) -> clear -> result -> retry (AC-130/131/132)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
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

    await skipToBoss(page);

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
    // collision, not a debug "defeat" shortcut. Force-clear remaining stages
    // afterward so Result CLEAR still covers AC-130 under multi-stage.
    await defeatBossWithRealCollision(page, box, isMobile);
    await waitForScene(page, 'ResultScene', 8000);

    const resultSnapshot = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot());
    expect(resultSnapshot?.run?.endReason).toBe('CLEAR');
    expect(resultSnapshot?.run?.bossesKilled).toBeGreaterThanOrEqual(1);

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
    await waitForScene(page, 'ResultScene', 6000);

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
    // what's blocking it. Clear enemies so stray bullets cannot refresh invuln.
    await page.evaluate(() => window.__FAT_E2E__?.debugKillAllEnemies());
    await page.waitForTimeout(800);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
    // Confirm paused via frozen clock before queueing the hit.
    const before = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run)).toEqual(before);

    await page.evaluate(() => window.__FAT_E2E__?.debugApplyPlayerCalorie(50));
    await page.waitForTimeout(300);
    const stillPaused = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(stillPaused?.calorie).toBe(before?.calorie);

    await page.keyboard.press('Escape'); // resume
    await page.waitForFunction(
      (expected) => (window.__FAT_E2E__?.getSnapshot().run?.calorie ?? 0) >= expected,
      (before?.calorie ?? 0) + 50,
      { timeout: 8000 },
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
    test.setTimeout(90_000);
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
      await waitForScene(page, 'ResultScene', 6000);

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (!box) throw new Error('canvas bounding box not found');
      await canvas.click({ position: { x: box.width / 2, y: box.height * 0.74 } });
      await waitForScene(page, 'GameScene');
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  /**
   * Human Gate 1 P1 regression, Test 1: KING BURGER vanished (active=false,
   * visible=false, body disabled) the instant the *first* real player
   * projectile hit it, even though its HP was still well above 0 — because
   * `onPlayerProjectileHitsBoss` deactivated whichever overlap argument came
   * first, and Arcade Physics does not guarantee that argument is always the
   * projectile when one side is a lone sprite (the boss) and the other a
   * Group (playerProjectiles). `debugSetBossHp(1)`-based tests couldn't
   * catch this because they collapse "first hit" and "final hit" into the
   * same event. This test keeps the boss well above 0 HP so a real,
   * non-lethal hit is observed while it's still alive.
   */
  test('boss survives a non-lethal real hit without vanishing (Human Gate 1 P1 regression, Test 1)', async ({
    page,
  }, testInfo) => {
    const box = await startRun(page, 'e2e-boss-nonlethal-hit');
    const isMobile = Boolean(testInfo.project.use.isMobile);

    await skipToBoss(page);

    await page.evaluate(() => window.__FAT_E2E__?.debugSetBossHp(10));
    const initial = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    const initialHp = initial?.bossHp ?? 10;
    expect(initial?.bossSpriteActive).toBe(true);
    expect(initial?.bossSpriteVisible).toBe(true);
    expect(initial?.bossBodyEnabled).toBe(true);

    await startAimingAndFiringAtBoss(page, box, isMobile);

    let observed: FatE2ERunSnapshot | null | undefined;
    for (let i = 0; i < 80; i += 1) {
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      if (typeof run?.bossHp === 'number' && run.bossHp < initialHp && run.bossHp > 0) {
        observed = run;
        break;
      }
      // Safety valve: the HP=10 buffer should make this unreachable, but
      // fail loudly rather than hang if it somehow dies before we observe it.
      if (run?.bossHp === 0 || (run?.bossesKilled ?? 0) >= 1 || run?.endReason) break;
      await keepAimingAtBoss(page, box);
      await page.waitForTimeout(80);
    }

    await stopAimingAndFiring(page, isMobile);

    expect(
      observed,
      'expected to observe the boss mid-fight after at least one real hit landed, HP still > 0',
    ).toBeDefined();
    expect(observed?.bossHp).toBeLessThan(initialHp);
    expect(observed?.bossHp).toBeGreaterThan(0);
    expect(observed?.endReason).toBeUndefined();
    // The regression itself: a non-lethal hit must never hide or disable the boss.
    expect(observed?.bossSpriteActive).toBe(true);
    expect(observed?.bossSpriteVisible).toBe(true);
    expect(observed?.bossBodyEnabled).toBe(true);
  });

  /**
   * Human Gate 1 P1 regression, Test 2: proves the boss requires multiple
   * real hits and stays visible/damageable across all of them, with only
   * the hit that brings HP to 0 ending the fight — as opposed to the bug,
   * where the first hit silently ended the boss's ability to take further
   * damage without actually defeating it.
   *
   * Multi-stage: stage-1 boss death does not CLEAR the run; we assert the
   * kill itself, then force-clear remaining stages for Result cleanup.
   */
  test('boss takes several real hits to defeat and only the killing hit ends the fight (Human Gate 1 P1 regression, Test 2)', async ({
    page,
  }, testInfo) => {
    const box = await startRun(page, 'e2e-boss-multi-hit');
    const isMobile = Boolean(testInfo.project.use.isMobile);

    await skipToBoss(page);
    await page.waitForFunction(
      () => {
        const run = window.__FAT_E2E__?.getSnapshot().run;
        return run?.phase === 'bossActive' || run?.bossPhase === 'phase1';
      },
      { timeout: 12_000 },
    );

    await page.evaluate(() => window.__FAT_E2E__?.debugSetBossHp(5));

    await startAimingAndFiringAtBoss(page, box, isMobile);

    let sawIntermediateAliveState = false;
    let defeated = false;
    for (let i = 0; i < 150 && !defeated; i += 1) {
      const run = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
      if ((run?.bossesKilled ?? 0) >= 1 || run?.bossPhase === 'dead') {
        defeated = true;
        break;
      }
      if (typeof run?.bossHp === 'number' && run.bossHp > 0 && run.bossHp < 5) {
        sawIntermediateAliveState = true;
        expect(run.bossSpriteActive).toBe(true);
        expect(run.bossSpriteVisible).toBe(true);
        expect(run.bossBodyEnabled).toBe(true);
      }
      await keepAimingAtBoss(page, box);
      await page.waitForTimeout(50);
    }

    await stopAimingAndFiring(page, isMobile);

    expect(defeated, 'boss was not defeated via real hits within the timeout').toBe(true);
    expect(
      sawIntermediateAliveState,
      'expected to observe at least one intermediate HP state (1 or 2) before defeat — otherwise this test cannot distinguish "3 real hits" from "1 hit that happened to be lethal"',
    ).toBe(true);

    const afterDeath = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(afterDeath?.bossesKilled).toBeGreaterThanOrEqual(1);
    expect(afterDeath?.endReason).toBeUndefined();

    await page.evaluate(() => window.__FAT_E2E__?.debugForceRunClear());
    await waitForScene(page, 'ResultScene', 8000);
    const finalRun = await page.evaluate(() => window.__FAT_E2E__?.getSnapshot().run);
    expect(finalRun?.endReason).toBe('CLEAR');
    expect(finalRun?.bossesKilled).toBeGreaterThanOrEqual(1);
  });
});
