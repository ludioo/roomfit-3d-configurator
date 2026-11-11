import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join('docs', '_mobile-baselines', process.env.BASELINE_TAG || 'm0');

test('mobile UI baseline screenshot after splash', async ({ page }, testInfo) => {
  await mkdir(OUT_DIR, { recursive: true });

  await page.goto('/');

  await expect(page.locator('#splash')).toBeHidden({ timeout: 60_000 });
  await expect(page.locator('#app canvas')).toBeVisible();

  const label = testInfo.project.name.replace(/^baseline-/, '');
  await page.screenshot({
    path: path.join(OUT_DIR, `${label}.png`),
    fullPage: false,
  });
});
