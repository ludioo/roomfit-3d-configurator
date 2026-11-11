import productsData from '../data/products.json';
import { getLang, subscribe as subscribeLang } from '../core/i18n.js';
import { getState, setOption, subscribe as subscribeState } from '../core/state.js';
import { track } from '../core/analytics.js';

/**
 * @param {string} productId
 */
function fabricColorsFor(productId) {
  const product = productsData.products?.find((p) => p.id === productId);
  return product?.options?.fabricColor ?? [];
}

/**
 * @param {HTMLElement} mount
 */
export function initSwatches(mount) {
  const root = document.createElement('div');
  root.className = 'swatches';
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-labelledby', 'config-color-heading');
  mount.append(root);

  /** @type {string | null} */
  let builtForProduct = null;

  function syncSelection() {
    const { fabricColor } = getState();
    root.querySelectorAll('.swatch').forEach((btn) => {
      const active = btn.dataset.colorId === fabricColor;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function rebuild() {
    const { productId, fabricColor } = getState();
    const lang = getLang();
    const colors = fabricColorsFor(productId);
    const activeId = document.activeElement?.dataset?.colorId;
    root.replaceChildren();
    builtForProduct = productId;

    for (const opt of colors) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.setAttribute('role', 'radio');
      btn.dataset.colorId = opt.id;
      const label = opt.label?.[lang] || opt.label?.en || opt.id;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('aria-checked', opt.id === fabricColor ? 'true' : 'false');
      btn.classList.toggle('is-active', opt.id === fabricColor);
      btn.style.setProperty('--swatch-fill', opt.hex);

      const disc = document.createElement('span');
      disc.className = 'swatch__disc';
      disc.setAttribute('aria-hidden', 'true');

      const caption = document.createElement('span');
      caption.className = 'swatch__label';
      caption.textContent = label;

      btn.append(disc, caption);
      btn.addEventListener('click', () => {
        if (getState().fabricColor === opt.id) return;
        setOption('fabricColor', opt.id);
        track('variant_change', { fabricColor: opt.id });
      });
      root.append(btn);
    }

    if (activeId) {
      const restore = root.querySelector(`[data-color-id="${activeId}"]`);
      if (restore instanceof HTMLElement) restore.focus();
    }
  }

  rebuild();

  const unsubState = subscribeState((next) => {
    if (next.productId !== builtForProduct) rebuild();
    else syncSelection();
  });
  const unsubLang = subscribeLang(() => rebuild());

  return {
    root,
    destroy() {
      unsubState();
      unsubLang();
      root.remove();
    },
  };
}

/**
 * Resolve hex for current fabricColor + product.
 * @param {{ productId: string, fabricColor: string }} cfg
 * @returns {string | null}
 */
export function resolveFabricHex(cfg) {
  const colors = fabricColorsFor(cfg.productId);
  const match = colors.find((c) => c.id === cfg.fabricColor);
  return match?.hex ?? colors[0]?.hex ?? null;
}
