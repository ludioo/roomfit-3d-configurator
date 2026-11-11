import { applyDom, getLang, setLang, subscribe } from '../core/i18n.js';
import { getState, subscribe as subscribeState, switchProduct } from '../core/state.js';
import { track } from '../core/analytics.js';
import { createAboutModal } from './aboutModal.js';
import { iconHtml, icons } from './icons.js';

/**
 * @param {HTMLElement} mountParent
 * @param {{ saved?: { open: () => void, close: () => void, isOpen: () => boolean } }} [options]
 */
export function initShell(mountParent, options = {}) {
  const saved = options.saved;
  const bar = document.createElement('header');
  bar.className = 'top-bar';
  bar.innerHTML = `
    <div class="top-bar__brand">
      <span class="top-bar__logo" data-i18n="app.logo"></span>
    </div>
    <div class="top-bar__tabs" role="tablist" data-i18n-aria="tab.productAria">
      <button type="button" class="top-bar__tab" role="tab" data-product-id="armchair" data-i18n="tab.chair"></button>
      <button type="button" class="top-bar__tab" role="tab" data-product-id="sofa" data-i18n="tab.sofa"></button>
    </div>
    <div class="top-bar__actions">
      <div class="top-bar__lang" role="group" aria-label="Language">
        <button type="button" class="top-bar__lang-btn" data-lang="en" data-i18n="lang.en"></button>
        <span class="top-bar__lang-sep" aria-hidden="true">|</span>
        <button type="button" class="top-bar__lang-btn" data-lang="id" data-i18n="lang.id"></button>
      </div>
      <button type="button" class="top-bar__saved" data-i18n-aria="nav.savedAria">
        ${iconHtml(icons.save)}
        <span data-i18n="nav.saved"></span>
      </button>
      <button type="button" class="top-bar__about" data-i18n-aria="nav.aboutAria">
        ${iconHtml(icons.info)}
        <span data-i18n="nav.about"></span>
      </button>
    </div>
  `;

  const about = createAboutModal({
    onClose() {
      if (routeFromHash() === 'about') setHash('configure');
    },
  });

  mountParent.append(bar, about.root);
  applyDom(document);
  syncLangButtons();
  syncProductTabs();

  /** @type {HTMLElement | null} */
  const aboutBtn = bar.querySelector('.top-bar__about');

  bar.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-lang');
      if (next !== 'en' && next !== 'id') return;
      if (next === getLang()) return;
      setLang(next);
      track('lang_change', { lang: next });
    });
  });

  bar.querySelectorAll('[data-product-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const productId = btn.getAttribute('data-product-id');
      if (!productId || productId === getState().productId) return;
      switchProduct(productId);
      track('product_change', { productId });
    });
  });

  bar.querySelector('.top-bar__saved')?.addEventListener('click', () => {
    setHash('saved');
    saved?.open();
  });

  aboutBtn?.addEventListener('click', () => {
    setHash('about');
    about.open(aboutBtn);
  });

  subscribe(() => {
    syncLangButtons();
  });

  subscribeState(() => {
    syncProductTabs();
  });

  window.addEventListener('hashchange', syncRoute);
  syncRoute();

  function syncLangButtons() {
    const current = getLang();
    bar.querySelectorAll('[data-lang]').forEach((btn) => {
      const active = btn.getAttribute('data-lang') === current;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function syncProductTabs() {
    const { productId } = getState();
    bar.querySelectorAll('[data-product-id]').forEach((btn) => {
      const active = btn.getAttribute('data-product-id') === productId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function syncRoute() {
    const route = routeFromHash();
    if (route === 'about') {
      saved?.close();
      about.open(aboutBtn);
      return;
    }
    if (about.isOpen()) about.close({ restoreFocus: false });
    if (route === 'saved') {
      saved?.open();
      return;
    }
    saved?.close();
    if (!location.hash || location.hash === '#') {
      setHash('configure', true);
    }
  }

  return { about };
}

/**
 * @returns {'configure' | 'about' | 'saved' | string}
 */
function routeFromHash() {
  const raw = (location.hash || '#configure').replace(/^#/, '');
  return raw || 'configure';
}

/**
 * @param {string} name
 * @param {boolean} [replace]
 */
export function setHash(name, replace = false) {
  const next = `#${name}`;
  if (location.hash === next) return;
  if (replace) history.replaceState(null, '', next);
  else location.hash = next;
}
