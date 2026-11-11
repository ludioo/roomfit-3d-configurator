import { detectArCapability, isIosNonSafari } from '../ar/capability.js';
import { applyDom, subscribe, t } from '../core/i18n.js';
import { iconHtml, icons } from './icons.js';
import { showToast } from './toast.js';
import { attachTooltip } from './tooltip.js';

function unsupportedMessage() {
  return t(isIosNonSafari() ? 'ar.openSafari' : 'ar.unsupported');
}

/**
 * AR CTA with capability states (WebXR / Quick Look / unsupported).
 * WebXR → setOnWebxr; Quick Look → setOnQuicklook.
 * @param {HTMLElement} mountParent
 * @returns {{
 *   root: HTMLButtonElement,
 *   setOnWebxr: (fn: (() => void | Promise<void>) | null) => void,
 *   setOnQuicklook: (fn: (() => void | Promise<void>) | null) => void,
 *   destroy: () => void,
 * }}
 */
export function initArButton(mountParent) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ar-cta';
  btn.setAttribute('aria-disabled', 'true');
  btn.innerHTML = `
    ${iconHtml(icons.cube, 'icon icon--sm')}
    <span data-i18n="cta.ar"></span>
  `;
  mountParent.append(btn);
  applyDom(btn);

  /** @type {'webxr' | 'quicklook' | 'unsupported'} */
  let mode = 'unsupported';
  let alive = true;
  let busy = false;
  /** @type {(() => void | Promise<void>) | null} */
  let onWebxr = null;
  /** @type {(() => void | Promise<void>) | null} */
  let onQuicklook = null;

  const tip = attachTooltip(btn, () => (mode === 'unsupported' ? unsupportedMessage() : ''));

  function applyMode(next) {
    mode = next;
    if (mode === 'unsupported') {
      btn.setAttribute('aria-disabled', 'true');
    } else {
      btn.removeAttribute('aria-disabled');
    }
    tip.updateText();
  }

  function runAr(handler) {
    if (!handler || busy) return;
    busy = true;
    btn.setAttribute('aria-busy', 'true');
    void Promise.resolve(handler())
      .catch((err) => {
        console.error('[ar]', err);
        showToast(t('toast.arFail'));
      })
      .finally(() => {
        busy = false;
        btn.removeAttribute('aria-busy');
      });
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (mode === 'unsupported') {
      showToast(unsupportedMessage());
      return;
    }
    if (mode === 'webxr') {
      runAr(onWebxr);
      return;
    }
    if (mode === 'quicklook') runAr(onQuicklook);
  });

  const unsub = subscribe(() => {
    applyDom(btn);
    tip.updateText();
  });

  void detectArCapability().then((next) => {
    if (!alive) return;
    applyMode(next);
  });

  return {
    root: btn,
    setOnWebxr(fn) {
      onWebxr = fn;
    },
    setOnQuicklook(fn) {
      onQuicklook = fn;
    },
    destroy() {
      alive = false;
      onWebxr = null;
      onQuicklook = null;
      unsub();
      tip.destroy();
      btn.remove();
    },
  };
}
