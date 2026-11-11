import { expect, test } from '@playwright/test';

test('short landscape keeps sheet layout and usable canvas', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'mobile-landscape only');

  await page.goto('/');
  await expect(page.locator('#splash')).toBeHidden({ timeout: 60_000 });

  const canvas = page.locator('#app canvas');
  await expect(canvas).toBeVisible();

  await expect(page.locator('html')).toHaveAttribute('data-layout', 'short-landscape');
  await expect(page.locator('.config-sheet__grabber')).toBeVisible();
  await expect(page.locator('.config-sheet__chevron')).toBeVisible();
  await expect(page.locator('.config-panel__swatches .swatch').first()).toBeVisible();
  await expect(page.locator('.config-rail')).toHaveCount(0);

  await expect(page.locator('.ar-cta')).toBeVisible();

  const scroll = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    const body = document.body;
    return {
      rootOverflow: getComputedStyle(el).overflowY,
      bodyOverflow: getComputedStyle(body).overflowY,
      delta: el.scrollHeight - el.clientHeight,
    };
  });
  const overflowLocked =
    scroll.rootOverflow === 'hidden' ||
    scroll.rootOverflow === 'clip' ||
    scroll.bodyOverflow === 'hidden' ||
    scroll.bodyOverflow === 'clip';
  expect(overflowLocked || scroll.delta <= 2).toBe(true);

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox?.height ?? 0).toBeGreaterThan(80);
});
