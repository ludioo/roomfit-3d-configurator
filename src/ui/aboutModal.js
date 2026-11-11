import { applyDom } from '../core/i18n.js';
import { CONTACT_URL } from '../core/siteConfig.js';
import { iconHtml, icons } from './icons.js';
import { runUiMotion } from './motion.js';

const OPEN_S = 0.2;
const CLOSE_S = 0.16;

/**
 * @param {{ onClose?: () => void }} [opts]
 */
export function createAboutModal(opts = {}) {
  const root = document.createElement('div');
  root.className = 'about-modal';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'about-title');

  root.innerHTML = `
    <div class="about-modal__backdrop" data-about-close></div>
    <div class="about-modal__panel">
      <header class="about-modal__header">
        <h2 id="about-title" data-i18n="about.title"></h2>
        <button type="button" class="about-modal__close" data-about-close data-i18n-aria="about.close">
          ${iconHtml(icons.x, 'icon icon--sm')}
        </button>
      </header>
      <p data-i18n="about.blurb"></p>
      <p data-i18n="about.credits"></p>
      <p data-i18n="about.disclaimer"></p>
      <p class="about-modal__muted" data-i18n="about.icons"></p>
      <p class="about-modal__cta">
        <a
          class="about-modal__work"
          href="${CONTACT_URL}"
          target="_blank"
          rel="noopener noreferrer"
          data-i18n="about.workWithMe"
        ></a>
      </p>
      <p class="about-modal__links">
        <a href="https://barkahmauludi.com" target="_blank" rel="noopener noreferrer" data-i18n="about.portfolio"></a>
        <a href="https://github.com/ludioo/furnitur-configurator" target="_blank" rel="noopener noreferrer" data-i18n="about.github"></a>
      </p>
      <button type="button" class="about-modal__done" data-about-close data-i18n="about.close"></button>
    </div>
  `;

  applyDom(root);

  const backdrop = /** @type {HTMLElement} */ (root.querySelector('.about-modal__backdrop'));
  const panel = /** @type {HTMLElement} */ (root.querySelector('.about-modal__panel'));
  let animGen = 0;
  /** @type {HTMLElement | null} */
  let returnFocus = null;

  /**
   * @param {{ restoreFocus?: boolean }} [closeOpts]
   */
  function close(closeOpts = {}) {
    if (root.hidden) return;
    const restoreFocus = closeOpts.restoreFocus !== false;
    const gen = ++animGen;
    const focusEl = returnFocus;
    returnFocus = null;
    void (async () => {
      await Promise.all([
        runUiMotion(backdrop, { opacity: [1, 0] }, { duration: CLOSE_S }),
        runUiMotion(
          panel,
          {
            opacity: [1, 0],
            transform: ['translateY(0px)', 'translateY(8px)'],
          },
          { duration: CLOSE_S },
        ),
      ]);
      if (gen !== animGen) return;
      root.hidden = true;
      backdrop.style.opacity = '';
      panel.style.opacity = '';
      panel.style.transform = '';
      if (restoreFocus) focusEl?.focus?.();
      opts.onClose?.();
    })();
  }

  /**
   * @param {HTMLElement | null | undefined} [returnFocusEl]
   */
  function open(returnFocusEl) {
    const gen = ++animGen;
    if (returnFocusEl instanceof HTMLElement) returnFocus = returnFocusEl;
    else if (!returnFocus && document.activeElement instanceof HTMLElement) {
      returnFocus = document.activeElement;
    }
    applyDom(root);
    root.hidden = false;
    backdrop.style.opacity = '0';
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(8px)';
    root.querySelector('.about-modal__close')?.focus();
    void Promise.all([
      runUiMotion(backdrop, { opacity: [0, 1] }, { duration: OPEN_S }),
      runUiMotion(
        panel,
        {
          opacity: [0, 1],
          transform: ['translateY(8px)', 'translateY(0px)'],
        },
        { duration: OPEN_S },
      ),
    ]).then(() => {
      if (gen !== animGen) return;
    });
  }

  root.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (target.closest('[data-about-close]')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.hidden) close();
  });

  return { root, open, close, isOpen: () => !root.hidden };
}
