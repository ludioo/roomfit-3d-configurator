import { runUiMotion } from './motion.js';

const DURATION_MS = 2500;
const ENTER_S = 0.18;
const EXIT_S = 0.16;

/** @type {HTMLElement | null} */
let host = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let hideTimer = null;
/** @type {number} */
let toastGen = 0;
/** @type {string | null} */
let activeMessage = null;

function ensureHost() {
  if (host) return host;
  host = document.createElement('div');
  host.className = 'toast-host';
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-relevant', 'additions');
  document.body.append(host);
  return host;
}

/**
 * @param {HTMLElement} el
 * @param {number} gen
 */
function setToastVisible(on) {
  const root = document?.documentElement;
  if (!root) return;
  if (on) root.dataset.toastVisible = '1';
  else delete root.dataset.toastVisible;
}

async function exitAndRemove(el, gen) {
  try {
    await runUiMotion(
      el,
      {
        opacity: [1, 0],
        transform: ['translateY(0px)', 'translateY(6px)'],
      },
      { duration: EXIT_S },
    );
  } finally {
    el.remove();
    if (gen === toastGen) {
      activeMessage = null;
      setToastVisible(false);
    }
  }
}

/**
 * Schedule hide for the current generation.
 * @param {HTMLElement} el
 * @param {number} gen
 */
function armHideTimer(el, gen) {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (gen !== toastGen) return;
    void exitAndRemove(el, gen);
  }, DURATION_MS);
}

/**
 * Toast with light enter/exit via motion/mini (skips when reduced-motion).
 * Identical message while visible refreshes the hide timer (no stack).
 * @param {string} message
 */
export function showToast(message) {
  if (!message) return;
  const root = ensureHost();

  const existing = root.querySelector('.toast');
  if (existing && activeMessage === message) {
    armHideTimer(/** @type {HTMLElement} */ (existing), toastGen);
    return;
  }

  const gen = ++toastGen;
  activeMessage = message;
  setToastVisible(true);
  root.replaceChildren();

  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
  root.append(el);

  void runUiMotion(
    el,
    {
      opacity: [0, 1],
      transform: ['translateY(8px)', 'translateY(0px)'],
    },
    { duration: ENTER_S },
  );

  armHideTimer(el, gen);
}
