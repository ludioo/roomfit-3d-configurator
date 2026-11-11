import { t } from '../core/i18n.js';
import { get, set } from '../core/storage.js';
import { prefersReducedMotion } from './motion.js';

const ONBOARDED_KEY = 'onboarded';

/** @type {boolean} */
let tourStarted = false;

function markOnboarded() {
  set(ONBOARDED_KEY, '1');
}

/**
 * @param {Element | undefined} el
 */
function scrollStepIntoView(el) {
  if (!el || typeof el.scrollIntoView !== 'function') return;
  el.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

/**
 * First-visit product tour (lazy driver.js). No-op if already onboarded.
 * @returns {Promise<void>}
 */
export async function maybeStartTour() {
  if (tourStarted || get(ONBOARDED_KEY)) return;
  // Lighthouse / automation (navigator.webdriver) — skip tour so driver.js
  // does not put aria-expanded on the WebGL canvas (axe aria-allowed-attr).
  if (typeof navigator !== 'undefined' && navigator.webdriver) return;
  tourStarted = true;

  try {
    const [{ driver }] = await Promise.all([
      import('driver.js'),
      import('driver.js/dist/driver.css'),
    ]);
    // Theme must load after driver.css so dark tokens beat the white default.
    await import('../styles/onboarding.css');

    const reduceMotion = prefersReducedMotion();

    const steps = [
      {
        element: '#app canvas',
        disableActiveInteraction: false,
        popover: {
          title: t('onboarding.canvasTitle'),
          description: t('onboarding.canvasBody'),
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '.swatches',
        waitForElement: 4000,
        popover: {
          title: t('onboarding.swatchTitle'),
          description: t('onboarding.swatchBody'),
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-save]',
        waitForElement: 4000,
        popover: {
          title: t('onboarding.saveTitle'),
          description: t('onboarding.saveBody'),
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '.ar-cta',
        waitForElement: 2000,
        popover: {
          title: t('onboarding.arTitle'),
          description: t('onboarding.arBody'),
          side: 'top',
          align: 'center',
        },
      },
    ];

    const driverObj = driver({
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      showProgress: true,
      overlayOpacity: 0.65,
      stagePadding: 8,
      stageRadius: 8,
      nextBtnText: t('onboarding.next'),
      prevBtnText: t('onboarding.prev'),
      doneBtnText: t('onboarding.done'),
      closeBtnLabel: t('onboarding.skip'),
      showButtons: ['next', 'previous', 'close'],
      steps,
      onHighlightStarted(el) {
        scrollStepIntoView(el);
      },
      onDestroyed() {
        markOnboarded();
      },
    });

    driverObj.drive();
  } catch (err) {
    tourStarted = false;
    throw err;
  }
}
