import productsData from '../data/products.json';

const PREFIX = 'furncfg:';
const SCHEMA_VERSION = 1;
const MAX_CONFIGS = 10;
const CONFIGS_KEY = 'configs';
const LAST_KEY = 'last';
const SCHEMA_KEY = 'schemaVersion';

/** Short product names for auto titles (match top-bar tabs). */
const PRODUCT_SHORT = {
  armchair: { en: 'Chair', id: 'Kursi' },
  sofa: { en: 'Sofa', id: 'Sofa' },
};

/**
 * @param {{ en?: string, id?: string } | string | undefined} label
 * @param {string} lang
 */
function pickLabel(label, lang) {
  if (!label) return '';
  if (typeof label === 'string') return label;
  return label[lang] || label.en || '';
}

/**
 * Auto-name like "Chair · Sand · Fabric".
 * @param {{ productId: string, fabricColor: string, finish: string }} snapshot
 * @param {string} [lang]
 * @returns {string}
 */
export function buildConfigName(snapshot, lang = 'en') {
  const code = lang === 'id' ? 'id' : 'en';
  const product = productsData.products?.find((p) => p.id === snapshot.productId);
  const productName =
    PRODUCT_SHORT[snapshot.productId]?.[code] ||
    pickLabel(product?.label, code) ||
    snapshot.productId;
  const colorOpt = product?.options?.fabricColor?.find((o) => o.id === snapshot.fabricColor);
  const finishOpt = product?.options?.finish?.find((o) => o.id === snapshot.finish);
  const color = pickLabel(colorOpt?.label, code) || snapshot.fabricColor;
  const finish = pickLabel(finishOpt?.label, code) || snapshot.finish;
  return `${productName} · ${color} · ${finish}`;
}

/** @typedef {{ productId: string, fabricColor: string, finish: string, size: string }} ConfigSnapshot */
/** @typedef {{ IDR: number, USD: number, illustrative?: boolean }} PriceSnapshot */
/** @typedef {{
 *   id: string,
 *   name: string,
 *   createdAt: string,
 *   productId: string,
 *   fabricColor: string,
 *   finish: string,
 *   size: string,
 *   priceSnapshot: PriceSnapshot
 * }} SavedConfig */
/** @typedef {{
 *   productId: string,
 *   fabricColor: string,
 *   finish: string,
 *   size: string,
 *   priceSnapshot: PriceSnapshot,
 *   name?: string
 * }} SaveConfigInput */

/**
 * @param {string} key short key without prefix (e.g. "lang")
 * @returns {string | null}
 */
export function get(key) {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 * @returns {boolean}
 */
export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
    return true;
  } catch {
    return false;
  }
}

/** @returns {'en' | 'id' | null} */
export function getLang() {
  const v = get('lang');
  if (v === 'en' || v === 'id') return v;
  return null;
}

/**
 * @param {'en' | 'id'} lang
 * @returns {boolean}
 */
export function setLang(lang) {
  if (lang !== 'en' && lang !== 'id') return false;
  return set('lang', lang);
}

/**
 * Ensure schemaVersion is 1; clear configs+last on mismatch.
 * @returns {{ ok: boolean, cleared: boolean }}
 */
export function ensureSchema() {
  const raw = get(SCHEMA_KEY);
  if (raw === String(SCHEMA_VERSION)) {
    return { ok: true, cleared: false };
  }
  remove(CONFIGS_KEY);
  remove(LAST_KEY);
  const ok = set(SCHEMA_KEY, String(SCHEMA_VERSION));
  return { ok, cleared: true };
}

/**
 * @param {unknown} item
 * @returns {item is SavedConfig}
 */
function isSavedConfig(item) {
  if (!item || typeof item !== 'object') return false;
  const c = /** @type {SavedConfig} */ (item);
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.createdAt === 'string' &&
    typeof c.productId === 'string' &&
    typeof c.fabricColor === 'string' &&
    typeof c.finish === 'string' &&
    typeof c.size === 'string' &&
    !!c.priceSnapshot &&
    typeof c.priceSnapshot.IDR === 'number' &&
    typeof c.priceSnapshot.USD === 'number'
  );
}

/**
 * @returns {SavedConfig[]}
 */
function readConfigs() {
  const raw = get(CONFIGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedConfig);
  } catch {
    return [];
  }
}

/**
 * @returns {SavedConfig[]}
 */
export function listConfigs() {
  ensureSchema();
  return readConfigs();
}

/**
 * @param {SavedConfig[]} list
 * @returns {boolean}
 */
function writeConfigs(list) {
  return set(CONFIGS_KEY, JSON.stringify(list));
}

/**
 * @param {SaveConfigInput} input
 * @returns {{ ok: boolean, reason?: string, entry?: SavedConfig, evicted?: SavedConfig }}
 */
export function saveConfig(input) {
  ensureSchema();
  if (
    !input?.productId ||
    !input?.fabricColor ||
    !input?.finish ||
    !input?.size ||
    !input?.priceSnapshot ||
    typeof input.priceSnapshot.IDR !== 'number' ||
    typeof input.priceSnapshot.USD !== 'number'
  ) {
    return { ok: false, reason: 'invalid' };
  }

  const list = readConfigs();
  /** @type {SavedConfig | undefined} */
  let evicted;
  if (list.length >= MAX_CONFIGS) {
    evicted = list.shift();
  }

  const lang = get('lang') === 'id' ? 'id' : 'en';
  /** @type {SavedConfig} */
  const entry = {
    id: `cfg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name:
      input.name ||
      buildConfigName(
        {
          productId: input.productId,
          fabricColor: input.fabricColor,
          finish: input.finish,
        },
        lang,
      ),
    createdAt: new Date().toISOString(),
    productId: input.productId,
    fabricColor: input.fabricColor,
    finish: input.finish,
    size: input.size,
    priceSnapshot: input.priceSnapshot,
  };

  list.push(entry);
  if (!writeConfigs(list)) {
    return { ok: false, reason: 'quota' };
  }
  return { ok: true, entry, evicted };
}

/**
 * @param {string} id
 * @returns {{ ok: boolean, reason?: string }}
 */
export function deleteConfig(id) {
  ensureSchema();
  if (!id) return { ok: false, reason: 'invalid' };
  const list = readConfigs();
  const next = list.filter((c) => c.id !== id);
  if (next.length === list.length) return { ok: false, reason: 'missing' };
  if (!writeConfigs(next)) return { ok: false, reason: 'quota' };
  return { ok: true };
}

/**
 * @returns {ConfigSnapshot | null}
 */
export function getLast() {
  ensureSchema();
  const raw = get(LAST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.productId !== 'string' ||
      typeof parsed.fabricColor !== 'string' ||
      typeof parsed.finish !== 'string' ||
      typeof parsed.size !== 'string'
    ) {
      return null;
    }
    return {
      productId: parsed.productId,
      fabricColor: parsed.fabricColor,
      finish: parsed.finish,
      size: parsed.size,
    };
  } catch {
    return null;
  }
}

/**
 * @param {ConfigSnapshot} snapshot
 * @returns {boolean}
 */
export function setLast(snapshot) {
  ensureSchema();
  if (
    !snapshot?.productId ||
    !snapshot?.fabricColor ||
    !snapshot?.finish ||
    !snapshot?.size
  ) {
    return false;
  }
  return set(
    LAST_KEY,
    JSON.stringify({
      productId: snapshot.productId,
      fabricColor: snapshot.fabricColor,
      finish: snapshot.finish,
      size: snapshot.size,
    }),
  );
}
