/** @typedef {{ productId: string, fabricColor: string, finish: string, size: string }} ConfigState */
/** @typedef {{ fabricColor: string, finish: string, size: string }} ProductOptions */

/** @type {ConfigState} */
const DEFAULT_STATE = {
  productId: 'armchair',
  fabricColor: 'sand',
  finish: 'fabric',
  size: 'standard',
};

/** @type {ProductOptions} */
const DEFAULT_OPTIONS = {
  fabricColor: DEFAULT_STATE.fabricColor,
  finish: DEFAULT_STATE.finish,
  size: DEFAULT_STATE.size,
};

/** @type {ConfigState} */
let state = { ...DEFAULT_STATE };

/** @type {Map<string, ProductOptions>} */
const lastByProduct = new Map();

/** @type {Set<(next: ConfigState) => void>} */
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(state);
}

/** @returns {Readonly<ConfigState>} */
export function getState() {
  return state;
}

/** @returns {ConfigState} */
export function getSnapshot() {
  return { ...state };
}

/**
 * @param {keyof ConfigState} key
 * @param {string} value
 */
export function setOption(key, value) {
  if (!(key in DEFAULT_STATE)) return;
  if (state[key] === value) return;
  state = { ...state, [key]: value };
  notify();
}

/**
 * @param {Partial<ConfigState>} patch
 */
export function setState(patch) {
  let changed = false;
  const next = { ...state };
  for (const key of Object.keys(DEFAULT_STATE)) {
    if (key in patch && patch[key] != null && next[key] !== patch[key]) {
      next[key] = patch[key];
      changed = true;
    }
  }
  if (!changed) return;
  state = next;
  notify();
}

/**
 * Switch product; remember current options for the previous product and
 * restore the last options for the new one (or defaults if never visited).
 * @param {string} productId
 */
export function switchProduct(productId) {
  if (!productId || productId === state.productId) return;

  lastByProduct.set(state.productId, {
    fabricColor: state.fabricColor,
    finish: state.finish,
    size: state.size,
  });

  const restored = lastByProduct.get(productId) ?? DEFAULT_OPTIONS;
  state = {
    productId,
    fabricColor: restored.fabricColor,
    finish: restored.finish,
    size: restored.size,
  };
  notify();
}

/**
 * @param {(next: ConfigState) => void} fn
 * @returns {() => void}
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reset to defaults — tests only. */
export function resetState() {
  state = { ...DEFAULT_STATE };
  lastByProduct.clear();
  notify();
}
