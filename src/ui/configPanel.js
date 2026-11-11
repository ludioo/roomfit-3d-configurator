import productsData from '../data/products.json';
import { applyDom, t } from '../core/i18n.js';
import { computePrice } from '../core/pricing.js';
import { getState } from '../core/state.js';
import { saveConfig } from '../core/storage.js';
import { track } from '../core/analytics.js';
import { mountBottomSheet } from './bottomSheet.js';
import { initSwatches } from './swatches.js';
import { initOptionChips } from './optionChips.js';
import { initPriceBar } from './priceBar.js';
import { showToast } from './toast.js';
import { iconHtml, icons } from './icons.js';

/**
 * @param {string} productId
 */
function productById(productId) {
  return productsData.products?.find((p) => p.id === productId) ?? null;
}

/**
 * @param {HTMLElement} mountParent
 * @param {{ onSaved?: () => void, onScreenshot?: () => void | Promise<void> }} [options]
 */
export async function initConfigPanel(mountParent, options = {}) {
  const sheet = await mountBottomSheet(mountParent);
  const { host, content, footerHost, mode, destroy: destroySheet } = sheet;
  host.setAttribute('aria-label', t('config.panelAria'));

  const section = document.createElement('section');
  section.className = 'config-panel';
  section.innerHTML = `
    <div class="config-panel__options">
      <h2 id="config-color-heading" class="config-panel__heading" data-i18n="config.color"></h2>
      <div class="config-panel__swatches" data-swatches></div>
      <h2 id="config-finish-heading" class="config-panel__heading" data-i18n="config.finish"></h2>
      <div class="config-panel__chips" data-finish-chips></div>
      <h2 id="config-size-heading" class="config-panel__heading" data-i18n="config.size"></h2>
      <div class="config-panel__chips" data-size-chips></div>
    </div>
    <div class="config-panel__footer">
      <div data-price-bar></div>
      <div class="config-panel__actions">
        <button type="button" class="config-panel__action" data-screenshot data-i18n-aria="cta.screenshotAria">
          ${iconHtml(icons.camera, 'icon icon--sm')}
          <span data-i18n="cta.screenshot"></span>
        </button>
        <button type="button" class="config-panel__action" data-save data-i18n-aria="config.saveAria">
          ${iconHtml(icons.save, 'icon icon--sm')}
          <span data-i18n="config.save"></span>
        </button>
      </div>
    </div>
  `;
  content.append(section);

  const footer = section.querySelector('.config-panel__footer');
  if (mode === 'native' && footerHost && footer) {
    footerHost.append(footer);
  }

  applyDom(section);
  if (footerHost) applyDom(footerHost);

  const swatchMount = section.querySelector('[data-swatches]');
  const finishMount = section.querySelector('[data-finish-chips]');
  const sizeMount = section.querySelector('[data-size-chips]');
  const priceMount = host.querySelector('[data-price-bar]');
  const saveBtn = host.querySelector('[data-save]');
  const screenshotBtn = host.querySelector('[data-screenshot]');
  const swatches = initSwatches(/** @type {HTMLElement} */ (swatchMount));
  const finishChips = initOptionChips(/** @type {HTMLElement} */ (finishMount), {
    optionKey: 'finish',
    headingId: 'config-finish-heading',
  });
  const sizeChips = initOptionChips(/** @type {HTMLElement} */ (sizeMount), {
    optionKey: 'size',
    headingId: 'config-size-heading',
  });
  const priceBar = initPriceBar(/** @type {HTMLElement} */ (priceMount));

  screenshotBtn?.addEventListener('click', () => {
    void options.onScreenshot?.();
  });

  saveBtn?.addEventListener('click', () => {
    const state = getState();
    const product = productById(state.productId);
    const priceSnapshot = computePrice(product, {
      fabricColor: state.fabricColor,
      finish: state.finish,
      size: state.size,
    });
    const result = saveConfig({
      productId: state.productId,
      fabricColor: state.fabricColor,
      finish: state.finish,
      size: state.size,
      priceSnapshot,
    });
    if (!result.ok) {
      showToast(t('toast.storageFail'));
      return;
    }
    track('config_save', {
      productId: state.productId,
      fabricColor: state.fabricColor,
      finish: state.finish,
      size: state.size,
    });
    showToast(result.evicted ? t('toast.savedEvicted') : t('toast.saved'));
    options.onSaved?.();
  });

  return {
    host,
    mode,
    swatches,
    destroy() {
      swatches.destroy();
      finishChips.destroy();
      sizeChips.destroy();
      priceBar.destroy();
      if (typeof destroySheet === 'function') destroySheet();
      else host.remove();
    },
  };
}
