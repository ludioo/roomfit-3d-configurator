const SCRIPT_MARKER = 'data-furncfg-umami';
const PENDING_ATTR = 'data-furncfg-umami-pending';
const UMAMI_SRC = 'https://cloud.umami.is/script.js';
const UMAMI_DOMAINS = 'roomfit.barkahmauludi.com';

/**
 * Inject Umami only when VITE_UMAMI_WEBSITE_ID is set. Idempotent; idle after model load.
 */
export function initAnalytics() {
  const id = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (!id || typeof document === 'undefined') return;
  if (document.querySelector(`script[${SCRIPT_MARKER}]`)) return;
  const root = document.documentElement;
  if (root?.hasAttribute?.(PENDING_ATTR)) return;
  root?.setAttribute?.(PENDING_ATTR, '1');

  const run = () => {
    if (document.querySelector(`script[${SCRIPT_MARKER}]`)) return;
    const s = document.createElement('script');
    s.src = UMAMI_SRC;
    s.defer = true;
    s.setAttribute('data-website-id', id);
    s.setAttribute('data-domains', UMAMI_DOMAINS);
    s.setAttribute(SCRIPT_MARKER, '1');
    (document.head || document.documentElement).appendChild(s);
    root?.removeAttribute?.(PENDING_ATTR);
  };

  const ric = typeof requestIdleCallback === 'function' ? requestIdleCallback : null;
  if (ric) ric(() => run(), { timeout: 3000 });
  else setTimeout(run, 1);
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} [data]
 */
export function track(name, data) {
  try {
    window.umami?.track?.(name, data);
  } catch {
    /* ignore */
  }
}
