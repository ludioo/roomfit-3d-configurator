/**
 * Pure AR capability helpers (WebXR immersive-ar + iOS Safari Quick Look heuristic).
 * No three.js; safe for Vitest node environment.
 */

/**
 * iPhone/iPad/iPod or iPadOS desktop-UA with touch (any browser).
 * @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number }} [nav]
 * @returns {boolean}
 */
function isIosDevice(nav = {}) {
  const ua = nav.userAgent ?? '';
  const appleMobile = /iPhone|iPad|iPod/i.test(ua);
  const iPadOsDesktopUa =
    nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1;
  return appleMobile || iPadOsDesktopUa;
}

/**
 * Safari on iPhone/iPad (incl. desktop-UA iPad), excluding Chrome/Firefox/Edge/Opera iOS.
 * @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number, vendor?: string }} [nav]
 * @returns {boolean}
 */
export function isIosSafari(nav = {}) {
  const ua = nav.userAgent ?? '';
  if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) return false;
  if (!isIosDevice(nav)) return false;

  // WebKit Safari: Apple vendor and/or Safari token without Chromium brands
  if (/Chrome|Chromium|Edg\//i.test(ua) && !/Safari/i.test(ua)) return false;
  return /Safari/i.test(ua) || (nav.vendor ?? '').includes('Apple');
}

/**
 * iOS (or iPadOS) but not Safari — e.g. Chrome/Firefox/Edge/Opera on iPhone.
 * @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number, vendor?: string }} [nav]
 * @returns {boolean}
 */
export function isIosNonSafari(
  nav = typeof navigator !== 'undefined' ? navigator : {},
) {
  return isIosDevice(nav) && !isIosSafari(nav);
}

/**
 * @param {{ isSessionSupported?: (mode: string) => Promise<boolean> } | null | undefined} xr
 * @returns {Promise<boolean>}
 */
export async function queryImmersiveAr(xr) {
  if (!xr || typeof xr.isSessionSupported !== 'function') return false;
  try {
    return !!(await xr.isSessionSupported('immersive-ar'));
  } catch {
    return false;
  }
}

/**
 * @param {{ webxr: boolean, iosSafari: boolean }} flags
 * @returns {'webxr' | 'quicklook' | 'unsupported'}
 */
export function resolveArCapability({ webxr, iosSafari }) {
  if (webxr) return 'webxr';
  if (iosSafari) return 'quicklook';
  return 'unsupported';
}

/**
 * Probe the current navigator once.
 * @param {Navigator} [nav]
 * @returns {Promise<'webxr' | 'quicklook' | 'unsupported'>}
 */
export async function detectArCapability(nav = typeof navigator !== 'undefined' ? navigator : {}) {
  const webxr = await queryImmersiveAr(nav.xr);
  const iosSafari = isIosSafari(nav);
  return resolveArCapability({ webxr, iosSafari });
}
