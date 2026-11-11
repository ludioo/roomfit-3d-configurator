import { expect, test } from '@playwright/test';

test('swatch change then save is visible', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#splash')).toBeHidden({ timeout: 60_000 });
  await expect(page.locator('#app canvas')).toBeVisible();

  const swatch = page.locator('button.swatch[data-color-id="terracotta"]');
  await swatch.scrollIntoViewIfNeeded();
  await swatch.click();
  await expect(swatch).toHaveClass(/is-active/);

  const save = page.locator('[data-save]');
  await save.scrollIntoViewIfNeeded();
  await save.click();

  await expect(page.locator('.toast').filter({ hasText: 'Saved' })).toBeVisible();
});
