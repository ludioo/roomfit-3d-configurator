import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join('docs', '_mobile-baselines', 'm11');
const UNSUPPORTED = 'AR needs Chrome on Android or Safari on iPhone';

function isMobileProject(name) {
  return name.startsWith('mobile-');
}

function expectsArUnsupported(name) {
  return name === 'mobile-pixel7' || name === 'mobile-landscape';
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} a
 * @param {{ x: number, y: number, width: number, height: number }} b
 */
function boxesOverlap(a, b) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

test.describe('M11 product polish', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#splash')).toBeHidden({ timeout: 60_000 });
    await expect(page.locator('#app canvas')).toBeVisible();
  });

  test('brand RoomFit in title and header', async ({ page }) => {
    await expect(page).toHaveTitle(/RoomFit/);
    await expect(page.locator('.top-bar__logo')).toHaveText('RoomFit');
  });

  test('share meta and og-image present', async ({ page, request }) => {
    const html = await page.content();
    expect(html).toContain('og:title');
    expect(html).toContain('og:image');
    expect(html).toContain('twitter:card');
    expect(html).toContain('theme-color');
    expect(html).toContain('rel="canonical"');
    const og = await request.get('/og-image.png');
    expect(og.status()).toBe(200);
    const icon = await request.get('/apple-touch-icon.png');
    expect(icon.status()).toBe(200);
  });

  test('Saved empty CTA and auto-name after save', async ({ page }) => {
    await page.locator('.top-bar__saved').click();
    await expect(page.locator('.saved-panel')).toBeVisible();
    await expect(page.locator('[data-empty-cta]')).toHaveText(/Save your first look/i);
    await page.locator('[data-empty-cta]').click();
    await expect(page.locator('.saved-panel')).toBeHidden({ timeout: 5000 });

    await page.locator('[data-save]').click();
    await expect(page.locator('.toast')).toContainText(/Saved/i);

    await page.locator('.top-bar__saved').click();
    await expect(page.locator('.saved-item__name')).toHaveText('Chair · Sand · Fabric');
  });

  test('product swap shows model-busy indicator', async ({ page }) => {
    const sofa = page.locator('.top-bar__tab[data-product-id="sofa"]');
    await sofa.click();
    await expect(page.locator('#model-busy')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#model-busy')).toBeHidden({ timeout: 60_000 });
    await expect(sofa).toHaveAttribute('aria-selected', 'true');
  });

  test('landscape affordance: chevron + peek swatches', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-landscape', 'landscape only');
    await mkdir(OUT_DIR, { recursive: true });
    await expect(page.locator('.config-sheet__chevron')).toBeVisible();
    await expect(page.locator('.config-panel__swatches .swatch').first()).toBeVisible();
    await page.screenshot({
      path: path.join(OUT_DIR, 'landscape-after.png'),
      fullPage: false,
    });
  });

  test('toast AR unsupported does not overlap CTA', async ({ page }, testInfo) => {
    test.skip(!isMobileProject(testInfo.project.name), 'mobile viewport only');

    await mkdir(OUT_DIR, { recursive: true });
    const tag = testInfo.project.name.replace(/^mobile-/, '');

    await page.evaluate(async () => {
      const sheet = document.querySelector('bottom-sheet');
      if (sheet && typeof sheet.snapToPoint === 'function') {
        sheet.snapToPoint(1, { behavior: 'instant' });
      }
    });

    await page.screenshot({
      path: path.join(OUT_DIR, `${tag}-before.png`),
      fullPage: false,
    });

    if (expectsArUnsupported(testInfo.project.name)) {
      await page.locator('.ar-cta').click({ force: true });
    } else {
      // iPhone = Quick Look ready — mirror toast DOM + data-toast-visible for layout check.
      await page.evaluate((msg) => {
        document.documentElement.dataset.toastVisible = '1';
        let host = document.querySelector('.toast-host');
        if (!host) {
          host = document.createElement('div');
          host.className = 'toast-host';
          document.body.append(host);
        }
        host.replaceChildren();
        const el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.textContent = msg;
        host.append(el);
      }, UNSUPPORTED);
    }

    const toast = page.locator('.toast');
    await expect(toast).toContainText(UNSUPPORTED);

    const toastBox = await toast.boundingBox();
    const ctaBox = await page.locator('.ar-cta').boundingBox();
    expect(toastBox).toBeTruthy();
    expect(ctaBox).toBeTruthy();
    expect(boxesOverlap(toastBox, ctaBox)).toBe(false);

    await page.screenshot({
      path: path.join(OUT_DIR, `${tag}-toast-cta.png`),
      fullPage: false,
    });
  });

  test('About Work with me CTA above GitHub', async ({ page }) => {
    await page.locator('.top-bar__about').click();
    const work = page.locator('.about-modal__work');
    const github = page.locator('.about-modal__links a', { hasText: 'GitHub' });
    await expect(work).toBeVisible();
    await expect(work).toHaveAttribute('href', /barkahmauludi\.com\/contact/);
    const workBox = await work.boundingBox();
    const ghBox = await github.boundingBox();
    expect(workBox?.y ?? 0).toBeLessThan(ghBox?.y ?? 9999);
  });
});
