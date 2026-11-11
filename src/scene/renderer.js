import {
  ACESFilmicToneMapping,
  Color,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import {
  isDesktopLayout,
  pixelRatioCap,
  subscribeLayoutMode,
} from '../core/layoutMode.js';

const CLEAR_COLOR = 0x12151c;

/**
 * @param {HTMLElement} container
 * @returns {{
 *   scene: import('three').Scene,
 *   renderer: import('three').WebGLRenderer,
 *   setOnTick: (fn: ((dt: number, force: boolean) => boolean) | null) => void,
 *   invalidate: () => void,
 *   start: () => void,
 *   stop: () => void,
 *   setPassthrough: (on: boolean) => void,
 *   syncSize: () => void,
 * }}
 */
export function createRenderer(container) {
  const scene = new Scene();
  scene.background = new Color(CLEAR_COLOR);

  const renderer = new WebGLRenderer({
    antialias: isDesktopLayout(),
    alpha: true,
  });
  renderer.setClearColor(CLEAR_COLOR, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  setPixelRatio(renderer);
  container.appendChild(renderer.domElement);

  /** @type {((dt: number, force: boolean) => boolean) | null} */
  let onTick = null;
  let rafId = 0;
  let lastTime = 0;
  let dirty = true;

  function resize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    return { width: w, height: h };
  }

  function setPixelRatio(r) {
    const cap = pixelRatioCap(isDesktopLayout());
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  }

  function schedule() {
    if (rafId || document.hidden) return;
    rafId = requestAnimationFrame(frame);
  }

  function frame(now) {
    rafId = 0;
    if (document.hidden) {
      lastTime = now;
      return;
    }
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
    lastTime = now;

    const force = dirty;
    dirty = false;

    let keep = force;
    if (onTick) {
      if (onTick(dt, force)) keep = true;
    }
    if (dirty) keep = true;

    if (keep) schedule();
  }

  function invalidate() {
    dirty = true;
    schedule();
  }

  function onVisibility() {
    if (document.hidden) return;
    lastTime = performance.now();
    invalidate();
  }

  function syncSize() {
    setPixelRatio(renderer);
    const { width, height } = resize();
    renderer.domElement.dispatchEvent(
      new CustomEvent('furncfg:resize', { detail: { width, height } }),
    );
    invalidate();
  }

  resize();
  window.addEventListener('resize', syncSize);
  document.addEventListener('visibilitychange', onVisibility);
  subscribeLayoutMode(syncSize);

  /**
   * Clear scene background for camera passthrough (AR). Studio restores solid clear.
   * @param {boolean} on
   */
  function setPassthrough(on) {
    if (on) {
      scene.background = null;
      renderer.setClearColor(0x000000, 0);
    } else {
      scene.background = new Color(CLEAR_COLOR);
      renderer.setClearColor(CLEAR_COLOR, 1);
    }
    invalidate();
  }

  return {
    scene,
    renderer,
    setOnTick(fn) {
      onTick = fn;
    },
    invalidate,
    start() {
      lastTime = 0;
      invalidate();
    },
    stop() {
      dirty = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
    },
    setPassthrough,
    syncSize,
  };
}
