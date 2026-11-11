import { animate } from 'motion/mini';

/**
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return (
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Apply the end value of each keyframe to element.style (reduce-motion path).
 * @param {HTMLElement} el
 * @param {Record<string, string | number | Array<string | number>>} keyframes
 */
export function applyEndKeyframes(el, keyframes) {
  for (const [key, value] of Object.entries(keyframes)) {
    const end = Array.isArray(value) ? value[value.length - 1] : value;
    el.style[key] = String(end);
  }
}

/**
 * Light UI motion via motion/mini. Skips animate when prefers-reduced-motion.
 * @param {HTMLElement} el
 * @param {Record<string, string | number | Array<string | number>>} keyframes
 * @param {{ duration?: number, easing?: string }} [opts] duration in seconds
 * @returns {Promise<void>}
 */
export function runUiMotion(el, keyframes, opts = {}) {
  if (!el) return Promise.resolve();
  if (prefersReducedMotion()) {
    applyEndKeyframes(el, keyframes);
    return Promise.resolve();
  }
  const duration = opts.duration ?? 0.18;
  const easing = opts.easing ?? 'ease-out';
  const controls = animate(el, keyframes, { duration, easing });
  return Promise.resolve(controls.finished).then(() => undefined);
}
