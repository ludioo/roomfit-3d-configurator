import productsData from '../data/products.json';
import { getLang, subscribe as subscribeLang, t } from '../core/i18n.js';
import { computePrice, currencyForLang, formatPrice } from '../core/pricing.js';
import { getState, subscribe as subscribeState } from '../core/state.js';

/**
 * @param {string} productId
 */
function productById(productId) {
  return productsData.products?.find((p) => p.id === productId) ?? null;
}

/**
 * @param {HTMLElement} mount
 */
export function initPriceBar(mount) {
  const root = document.createElement('div');
  root.className = 'price-bar';
  root.setAttribute('role', 'status');

  const label = document.createElement('span');
  label.className = 'price-bar__label';

  const sep = document.createElement('span');
  sep.className = 'price-bar__sep';
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = ' · ';

  const amount = document.createElement('span');
  amount.className = 'price-bar__amount';
  amount.setAttribute('aria-live', 'polite');
  amount.setAttribute('aria-atomic', 'true');

  root.append(label, sep, amount);
  mount.append(root);

  function render() {
    const state = getState();
    const lang = getLang();
    const product = productById(state.productId);
    const snapshot = computePrice(product, {
      fabricColor: state.fabricColor,
      finish: state.finish,
      size: state.size,
    });
    const currency = currencyForLang(lang);
    label.textContent = t('price.illustrative');
    amount.textContent = formatPrice(snapshot[currency], currency, lang);
  }

  render();
  const unsubState = subscribeState(render);
  const unsubLang = subscribeLang(render);

  return {
    render,
    destroy() {
      unsubState();
      unsubLang();
      root.remove();
    },
  };
}
