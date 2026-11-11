import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.join('docs', '_mobile-baselines', 'm9');
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

test.describe('M9 mobile polish', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#splash')).toBeHidden({ timeout: 60_000 });
    await expect(page.locator('#app canvas')).toBeVisible();
  });

  test('peek: toast, AR CTA, and sheet grabber do not overlap', async ({
    page,
  }, testInfo) => {
    test.skip(!isMobileProject(testInfo.project.name), 'mobile viewport only');

    await mkdir(OUT_DIR, { recursive: true });
    const tag = testInfo.project.name.replace(/^mobile-/, '');

    async function ensurePeek() {
      await page.evaluate(async () => {
        const sheet = document.querySelector('bottom-sheet');
        if (sheet && typeof sheet.snapToPoint === 'function') {
          // Lib: 0=collapsed, 1=peek, 2=mid, 3=full
          sheet.snapToPoint(1, { behavior: 'instant' });
        } else {
          // Fallback sheet: Save focus can scroll the snap scroller open.
          const view = document.defaultView;
          const scroller = document.querySelector('.config-sheet__scroller');
          const spacer = document.querySelector('.config-sheet__snap--peek');
          if (scroller && spacer && view) {
            scroller.scrollTop = spacer.offsetHeight;
            scroller.dispatchEvent(new view.Event('scroll'));
          }
        }
        const view = document.defaultView;
        const deadline = Date.now() + 2000;
        while (Date.now() < deadline) {
          if (document.documentElement.dataset.sheetSnap === 'peek') return;
          await new Promise((r) => view.requestAnimationFrame(r));
        }
      });
      await expect
        .poll(async () => page.locator('html').getAttribute('data-sheet-snap'), {
          timeout: 2000,
        })
        .toBe('peek');
    }

    await ensurePeek();

    await page.screenshot({
      path: path.join(OUT_DIR, `${tag}-before.png`),
      fullPage: false,
    });

    await page.locator('[data-save]').click();
    const toast = page.locator('.toast').filter({ hasText: 'Saved' });
    await expect(toast).toBeVisible();

    // Save focus can expand the sheet; restore peek so CTA/toast offsets apply.
    await ensurePeek();
    await expect(toast).toBeVisible();

    const toastBox = await toast.boundingBox();
    const ctaBox = await page.locator('.ar-cta').boundingBox();
    const grabberBox = await page.locator('.config-sheet__grabber').boundingBox();

    expect(toastBox).toBeTruthy();
    expect(ctaBox).toBeTruthy();
    expect(grabberBox).toBeTruthy();

    expect(boxesOverlap(toastBox, ctaBox)).toBe(false);
    expect(boxesOverlap(toastBox, grabberBox)).toBe(false);
    expect(boxesOverlap(ctaBox, grabberBox)).toBe(false);

    // Toast stacks above AR CTA; CTA sits above sheet grabber (peek).
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(ctaBox.y + 2);
    expect(ctaBox.y + ctaBox.height).toBeLessThanOrEqual(grabberBox.y + 2);

    await page.screenshot({
      path: path.join(OUT_DIR, `${tag}-after-toast.png`),
      fullPage: false,
    });
  });

  test('five AR taps keep a single identical toast', async ({ page }, testInfo) => {
    test.skip(
      !expectsArUnsupported(testInfo.project.name),
      'unsupported AR toast (Pixel / landscape)',
    );

    const ar = page.locator('button.ar-cta');
    await expect(ar).toHaveAttribute('aria-disabled', 'true');

    for (let i = 0; i < 5; i += 1) {
      await ar.click({ force: true });
    }

    const toasts = page.locator('.toast').filter({ hasText: UNSUPPORTED });
    await expect(toasts).toHaveCount(1);

    if (testInfo.project.name === 'mobile-pixel7') {
      await mkdir(OUT_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(OUT_DIR, 'pixel7-dedupe.png'),
        fullPage: false,
      });
    }
  });

  test('iPhone SE peek: first swatch row clears footer', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-iphone-se', 'SE 375×667 only');

    const firstSwatch = page.locator('.swatch').first();
    const footer = page.locator('.config-panel__footer');
    await expect(firstSwatch).toBeVisible();
    await expect(footer).toBeVisible();

    const swatchBox = await firstSwatch.boundingBox();
    const footerBox = await footer.boundingBox();
    expect(swatchBox).toBeTruthy();
    expect(footerBox).toBeTruthy();
    expect(swatchBox.y + swatchBox.height).toBeLessThanOrEqual(footerBox.y + 2);

    await mkdir(OUT_DIR, { recursive: true });
    await page.screenshot({
      path: path.join(OUT_DIR, 'iphone-se-peek-swatch.png'),
      fullPage: false,
    });
  });
});
