import productsData from '../data/products.json';
import { getLang, subscribe as subscribeLang } from '../core/i18n.js';
import { getState, setOption, subscribe as subscribeState } from '../core/state.js';
import { track } from '../core/analytics.js';

/**
 * @param {string} productId
 * @param {'finish' | 'size'} optionsKey
 */
function optionsFor(productId, optionsKey) {
  const product = productsData.products?.find((p) => p.id === productId);
  return product?.options?.[optionsKey] ?? [];
}

/**
 * @param {{ productId: string, finish: string }} cfg
 * @returns {{ roughness: number, metalness: number } | null}
 */
export function resolveFinish(cfg) {
  const opts = optionsFor(cfg.productId, 'finish');
  const match = opts.find((o) => o.id === cfg.finish) ?? opts[0];
  if (!match) return null;
  return { roughness: match.roughness, metalness: match.metalness };
}

/**
 * @param {{ productId: string, size: string }} cfg
 * @returns {number}
 */
export function resolveSizeScale(cfg) {
  const opts = optionsFor(cfg.productId, 'size');
  const match = opts.find((o) => o.id === cfg.size) ?? opts[0];
  return match?.scale ?? 1;
}

/**
 * @param {HTMLElement} mount
 * @param {{
 *   optionKey: 'finish' | 'size',
 *   headingId: string,
 * }} opts
 */
export function initOptionChips(mount, { optionKey, headingId }) {
  const root = document.createElement('div');
  root.className = 'option-chips';
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-labelledby', headingId);
  mount.append(root);

  /** @type {string | null} */
  let builtForProduct = null;

  function syncSelection() {
    const activeId = getState()[optionKey];
    root.querySelectorAll('.option-chip').forEach((btn) => {
      const active = btn.dataset.optionId === activeId;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function rebuild() {
    const cfg = getState();
    const lang = getLang();
    const options = optionsFor(cfg.productId, optionKey);
    const activeId = document.activeElement?.dataset?.optionId;
    root.replaceChildren();
    builtForProduct = cfg.productId;

    for (const opt of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-chip';
      btn.setAttribute('role', 'radio');
      btn.dataset.optionId = opt.id;
      const label = opt.label?.[lang] || opt.label?.en || opt.id;
      btn.textContent = label;
      btn.setAttribute('aria-checked', opt.id === cfg[optionKey] ? 'true' : 'false');
      btn.classList.toggle('is-active', opt.id === cfg[optionKey]);

      btn.addEventListener('click', () => {
        if (getState()[optionKey] === opt.id) return;
        setOption(optionKey, opt.id);
        track('variant_change', { [optionKey]: opt.id });
      });
      root.append(btn);
    }

    if (activeId) {
      const restore = root.querySelector(`[data-option-id="${activeId}"]`);
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
