import { expect, test } from '@playwright/test';

const MIN_TAP = 44;

function isPortraitMobile(name) {
  return name.startsWith('mobile-') && name !== 'mobile-landscape';
}

async function minBox(locator) {
  const box = await locator.boundingBox();
  expect(box, 'element should have a box').toBeTruthy();
  expect(box.width).toBeGreaterThanOrEqual(MIN_TAP);
  expect(box.height).toBeGreaterThanOrEqual(MIN_TAP);
}

test('top bar controls are tappable without horizontal overflow', async ({
  page,
}, testInfo) => {
  test.skip(!isPortraitMobile(testInfo.project.name), 'portrait mobile only');

  await page.goto('/');
  await expect(page.locator('#splash')).toBeHidden({ timeout: 60_000 });

  const bar = page.locator('.top-bar');
  await expect(bar).toBeVisible();

  const chair = page.locator('.top-bar__tab[data-product-id="armchair"]');
  const sofa = page.locator('.top-bar__tab[data-product-id="sofa"]');
  const langEn = page.locator('.top-bar__lang-btn[data-lang="en"]');
  const langId = page.locator('.top-bar__lang-btn[data-lang="id"]');
  const saved = page.locator('.top-bar__saved');
  const about = page.locator('.top-bar__about');

  for (const el of [chair, sofa, langEn, langId, saved, about]) {
    await expect(el).toBeVisible();
    await minBox(el);
  }

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const top = document.querySelector('.top-bar');
    return {
      doc: root.scrollWidth <= root.clientWidth + 1,
      bar: !top || top.scrollWidth <= top.clientWidth + 1,
    };
  });
  expect(overflow.doc).toBe(true);
  expect(overflow.bar).toBe(true);
});
