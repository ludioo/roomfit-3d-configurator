import { expect, test } from '@playwright/test';

const UNSUPPORTED =
  'AR needs Chrome on Android or Safari on iPhone';

/** Android-emulated projects: Safari-UA iPhone presets resolve Quick Look (D-QA-09). */
function expectsArUnsupported(name) {
  return name === 'mobile-pixel7' || name === 'mobile-landscape';
}

function isIphoneProject(name) {
  return name === 'mobile-iphone13' || name === 'mobile-iphone-se';
}

test('desktop AR CTA disabled: tooltip on hover and toast on click', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop Chromium only');

  await page.goto('/');

  await expect(page.locator('#splash')).toBeHidden({ timeout: 60_000 });

  const ar = page.locator('button.ar-cta');
  await expect(ar).toBeVisible();
  await expect(ar).toHaveAttribute('aria-disabled', 'true');

  await ar.hover();
  await expect(
    page.locator('.tooltip').filter({ hasText: UNSUPPORTED }),
  ).toBeVisible();

  await ar.click({ force: true });
  await expect(page.locator('.toast').filter({ hasText: UNSUPPORTED })).toBeVisible();
});

test('mobile AR CTA tap shows unsupported toast', async ({ page }, testInfo) => {
  test.skip(
    !expectsArUnsupported(testInfo.project.name),
    'Android-emulated mobile only (iPhone UA → Quick Look)',
  );

  await page.goto('/');

  await expect(page.locator('#splash')).toBeHidden({ timeout: 60_000 });

  const ar = page.locator('button.ar-cta');
  await expect(ar).toBeVisible();
  await expect(ar).toHaveAttribute('aria-disabled', 'true');

  await ar.click({ force: true });
  await expect(page.locator('.toast').filter({ hasText: UNSUPPORTED })).toBeVisible();
});

test('iPhone-emulated CTA is Quick Look ready', async ({ page }, testInfo) => {
  test.skip(!isIphoneProject(testInfo.project.name), 'iPhone projects only');

  await page.goto('/');

  await expect(page.locator('#splash')).toBeHidden({ timeout: 60_000 });

  const ar = page.locator('button.ar-cta');
  await expect(ar).toBeVisible();
  // Wait past initial disabled until Safari-UA heuristic settles on quicklook.
  await expect(ar).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10_000 });
});
