export const MQ_WIDE = '(min-width: 768px)';
export const MQ_SHORT_LANDSCAPE = '(orientation: landscape) and (max-height: 500px)';
/** Short viewport (e.g. iPhone SE 667): bump peek / compact footer (M9). */
export const MQ_COMPACT_HEIGHT = '(max-height: 700px)';

function mqMatches(query) {
  return (
    typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(query).matches
  );
}

/** Phone landscape short enough that a desktop rail would crush the canvas. */
export function isShortLandscape() {
  return mqMatches(MQ_SHORT_LANDSCAPE);
}

/** Viewport height ≤700px (portrait SE and short landscape). */
export function isCompactHeight() {
  return mqMatches(MQ_COMPACT_HEIGHT);
}

/**
 * Desktop rail when wide enough and not short-landscape (844×390 stays sheet).
 * @returns {boolean}
 */
export function isDesktopLayout() {
  return mqMatches(MQ_WIDE) && !isShortLandscape();
}

/**
 * WebGL pixel-ratio ceiling: sheet/mobile ≤1.5, desktop rail ≤2.
 * @param {boolean} isDesktop
 * @returns {number}
 */
export function pixelRatioCap(isDesktop) {
  return isDesktop ? 2 : 1.5;
}

/**
 * Fire when desktop vs mobile sheet mode should change (not peek-only).
 * @param {(desktop: boolean) => void} onChange
 * @returns {() => void} unsubscribe
 */
export function subscribeLayoutMode(onChange) {
  if (typeof globalThis.matchMedia !== 'function') {
    return () => {};
  }

  const wide = globalThis.matchMedia(MQ_WIDE);
  const short = globalThis.matchMedia(MQ_SHORT_LANDSCAPE);
  let last = isDesktopLayout();

  const check = () => {
    const next = isDesktopLayout();
    if (next === last) return;
    last = next;
    onChange(next);
  };

  wide.addEventListener('change', check);
  short.addEventListener('change', check);
  return () => {
    wide.removeEventListener('change', check);
    short.removeEventListener('change', check);
  };
}
