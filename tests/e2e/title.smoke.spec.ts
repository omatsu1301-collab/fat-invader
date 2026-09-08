import { expect, test } from '@playwright/test';

test.describe('Title smoke', () => {
  test('renders within viewport, raises no errors, and starts gameplay', async (
    { page },
    testInfo,
  ) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => failedRequests.push(request.url()));

    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    await page.waitForFunction(() => window.__FAT_E2E__?.getSnapshot().sceneKey === 'TitleScene');

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const viewport = testInfo.project.use.viewport;

    if (box && viewport) {
      // AC-003 / AC-004: Title must render fully inside the viewport, no overflow.
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }

    if (box) {
      // AC-004 / AC-100: start input must be accepted and move into gameplay.
      await canvas.click({ position: { x: box.width / 2, y: box.height * 0.76 } });
    }

    await page.waitForFunction(() => (window.__FAT_E2E__?.getSnapshot().startPressCount ?? 0) > 0);
    await page.waitForFunction(() => window.__FAT_E2E__?.getSnapshot().sceneKey === 'GameScene', {
      timeout: 2000,
    });

    // AC-005: no console errors, uncaught exceptions, or failed required requests.
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
});
