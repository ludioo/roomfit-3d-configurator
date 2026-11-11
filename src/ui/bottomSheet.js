import {
  MQ_COMPACT_HEIGHT,
  MQ_SHORT_LANDSCAPE,
  isCompactHeight,
  isDesktopLayout,
  isShortLandscape,
} from '../core/layoutMode.js';
import { iconHtml, icons } from './icons.js';

export {
  isCompactHeight,
  isDesktopLayout,
  isShortLandscape,
  subscribeLayoutMode,
} from '../core/layoutMode.js';

/**
 * Detect whether pure-web-bottom-sheet is usable (Chrome/Edge 121+, FF 123+, Safari/iOS 18.2+).
 * @returns {boolean}
 */
export function supportsNativeBottomSheet() {
  try {
    const css = globalThis.CSS;
    if (!css?.supports?.('animation-timeline', 'scroll()')) {
      return false;
    }
  } catch {
    return false;
  }

  const ua = navigator.userAgent || '';
  const safari = ua.match(/Version\/(\d+)\.(\d+).*Safari/i);
  if (safari && !/Chrome|CriOS|Edg|Chromium/i.test(ua)) {
    const major = Number(safari[1]);
    const minor = Number(safari[2]);
    if (major < 18 || (major === 18 && minor < 2)) return false;
  }
  const ios = ua.match(/OS (\d+)_(\d+)/i);
  if (ios && /iPhone|iPad|iPod/i.test(ua)) {
    const major = Number(ios[1]);
    const minor = Number(ios[2]);
    if (major < 18 || (major === 18 && minor < 2)) return false;
  }
  return true;
}

/**
 * @param {'desktop' | 'native' | 'fallback'} kind
 * @param {HTMLElement | null} [peekSnapEl] native peek snap slot
 */
export function syncSheetPeekHeight(kind, peekSnapEl = null) {
  const root = document.documentElement;
  if (kind === 'desktop') {
    root.style.removeProperty('--sheet-peek-height');
    root.dataset.layout = 'desktop';
    return;
  }

  const short = isShortLandscape();
  const compact = isCompactHeight();
  root.dataset.layout = short ? 'short-landscape' : 'mobile';

  if (kind === 'native') {
    let peek = '25dvh';
    let snap = '25%';
    if (short) {
      // Grabber + chevron + compact swatch strip must stay in peek (M11).
      peek = '34svh';
      snap = '34%';
    } else if (compact) {
      peek = '38dvh';
      snap = '38%';
    }
    root.style.setProperty('--sheet-peek-height', peek);
    if (peekSnapEl) {
      peekSnapEl.style.setProperty('--snap', snap);
    }
    return;
  }

  // Fallback: let CSS media set --sheet-peek-height (7.5rem / 9.5rem / 18svh).
  root.style.removeProperty('--sheet-peek-height');
}

/**
 * @param {'peek' | 'mid' | 'full' | null} snap
 */
function setSheetSnap(snap) {
  const root = document.documentElement;
  if (!snap) {
    delete root.dataset.sheetSnap;
    return;
  }
  root.dataset.sheetSnap = snap;
}

/**
 * Map pure-web-bottom-sheet snapIndex (0=collapsed, then bottom-to-top) to UI state.
 * With snaps 25/55/90: 1=peek, 2=mid, 3=full.
 * @param {number} snapIndex
 * @returns {'peek' | 'mid' | 'full'}
 */
export function snapIndexToSheetSnap(snapIndex) {
  if (snapIndex <= 1) return 'peek';
  if (snapIndex === 2) return 'mid';
  return 'full';
}

function createGrabberHandle() {
  const handle = document.createElement('div');
  handle.className = 'config-sheet__handle';
  handle.innerHTML = `
    <span class="config-sheet__grabber" aria-hidden="true"></span>
    <span class="config-sheet__chevron" aria-hidden="true">${iconHtml(icons.chevron, 'icon icon--sm')}</span>
  `;
  return handle;
}

/**
 * @param {HTMLElement} mountParent
 * @param {HTMLElement} content
 */
function mountDesktopRail(mountParent, content) {
  document.documentElement.classList.remove('sheet-fallback');
  setSheetSnap(null);
  syncSheetPeekHeight('desktop');

  const host = document.createElement('aside');
  host.className = 'config-rail';
  host.setAttribute('role', 'region');
  host.setAttribute('aria-label', 'Configuration');
  host.append(content);
  mountParent.append(host);
  return { host, content, footerHost: null, mode: /** @type {const} */ ('desktop') };
}

/**
 * Mount config host: desktop rail, native bottom-sheet, or CSS scroll-snap fallback.
 * @param {HTMLElement} mountParent
 * @param {{ useNative?: boolean, forceDesktop?: boolean }} [opts]
 */
export async function mountBottomSheet(mountParent, opts = {}) {
  const content = document.createElement('div');
  content.className = 'config-panel__body';

  if (opts.forceDesktop ?? isDesktopLayout()) {
    return mountDesktopRail(mountParent, content);
  }

  const useNative = opts.useNative ?? supportsNativeBottomSheet();

  if (useNative) {
    document.documentElement.classList.remove('sheet-fallback');
    setSheetSnap('peek');

    const { registerSheetElements } = await import('pure-web-bottom-sheet');
    registerSheetElements();

    const sheet = document.createElement('bottom-sheet');
    sheet.className = 'config-sheet';
    sheet.tabIndex = 0;
    sheet.setAttribute('aria-label', 'Configuration');
    sheet.setAttribute('nested-scroll', '');

    const snap90 = document.createElement('div');
    snap90.slot = 'snap';
    snap90.className = 'top';
    snap90.style.setProperty('--snap', '90%');

    const snap55 = document.createElement('div');
    snap55.slot = 'snap';
    snap55.style.setProperty('--snap', '55%');

    const snap25 = document.createElement('div');
    snap25.slot = 'snap';
    snap25.className = 'initial';

    syncSheetPeekHeight('native', snap25);

    const header = document.createElement('div');
    header.slot = 'header';
    header.append(createGrabberHandle());

    const footerHost = document.createElement('div');
    footerHost.slot = 'footer';

    const onSnapChange = (event) => {
      const detail = event?.detail;
      const index = typeof detail?.snapIndex === 'number' ? detail.snapIndex : 0;
      setSheetSnap(snapIndexToSheetSnap(index));
    };
    sheet.addEventListener('snap-position-change', onSnapChange);

    const shortMq =
      typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia(MQ_SHORT_LANDSCAPE)
        : null;
    const compactMq =
      typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia(MQ_COMPACT_HEIGHT)
        : null;
    const onPeekMqChange = () => syncSheetPeekHeight('native', snap25);
    shortMq?.addEventListener('change', onPeekMqChange);
    compactMq?.addEventListener('change', onPeekMqChange);

    sheet.append(snap90, snap55, snap25, header, content, footerHost);
    mountParent.append(sheet);

    return {
      host: sheet,
      content,
      footerHost,
      mode: /** @type {const} */ ('native'),
      destroy() {
        shortMq?.removeEventListener('change', onPeekMqChange);
        compactMq?.removeEventListener('change', onPeekMqChange);
        sheet.removeEventListener('snap-position-change', onSnapChange);
        setSheetSnap(null);
        document.documentElement.style.removeProperty('--sheet-peek-height');
        delete document.documentElement.dataset.layout;
        sheet.remove();
      },
    };
  }

  document.documentElement.classList.add('sheet-fallback');
  setSheetSnap('peek');
  syncSheetPeekHeight('fallback');

  const host = document.createElement('div');
  host.className = 'config-sheet config-sheet--fallback';
  host.setAttribute('role', 'region');
  host.setAttribute('aria-label', 'Configuration');

  const scroller = document.createElement('div');
  scroller.className = 'config-sheet__scroller';

  const spacer = document.createElement('div');
  spacer.className = 'config-sheet__snap config-sheet__snap--peek';
  spacer.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('div');
  panel.className = 'config-sheet__panel';

  const grabber = createGrabberHandle();
  panel.append(grabber, content);
  scroller.append(spacer, panel);
  host.append(scroller);
  mountParent.append(host);

  const syncFallbackSnap = () => {
    const max = Math.max(1, spacer.offsetHeight);
    // Near spacer end = peek; scrolled up toward panel expand = full.
    const expanded = scroller.scrollTop < max * 0.45;
    setSheetSnap(expanded ? 'full' : 'peek');
  };

  scroller.addEventListener('scroll', syncFallbackSnap, { passive: true });

  const shortMq =
    typeof globalThis.matchMedia === 'function'
      ? globalThis.matchMedia(MQ_SHORT_LANDSCAPE)
      : null;
  const compactMq =
    typeof globalThis.matchMedia === 'function'
      ? globalThis.matchMedia(MQ_COMPACT_HEIGHT)
      : null;
  const onPeekMqChange = () => {
    syncSheetPeekHeight('fallback');
    requestAnimationFrame(() => {
      scroller.scrollTop = spacer.offsetHeight;
      syncFallbackSnap();
    });
  };
  shortMq?.addEventListener('change', onPeekMqChange);
  compactMq?.addEventListener('change', onPeekMqChange);

  requestAnimationFrame(() => {
    scroller.scrollTop = spacer.offsetHeight;
    syncFallbackSnap();
  });

  return {
    host,
    content,
    footerHost: null,
    mode: /** @type {const} */ ('fallback'),
    destroy() {
      shortMq?.removeEventListener('change', onPeekMqChange);
      compactMq?.removeEventListener('change', onPeekMqChange);
      scroller.removeEventListener('scroll', syncFallbackSnap);
      setSheetSnap(null);
      delete document.documentElement.dataset.layout;
      host.remove();
    },
  };
}
