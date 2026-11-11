import en from '../i18n/en.json';
import id from '../i18n/id.json';
import { getLang as readStoredLang, setLang as writeStoredLang } from './storage.js';

const catalogs = { en, id };

/** @type {'en' | 'id'} */
let lang = resolveInitialLang();

/** @type {Set<(lang: 'en' | 'id') => void>} */
const listeners = new Set();

/**
 * @returns {'en' | 'id'}
 */
function resolveInitialLang() {
  const stored = readStoredLang();
  if (stored) return stored;
  try {
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('id')) return 'id';
  } catch {
    /* ignore */
  }
  return 'en';
}

/** @returns {'en' | 'id'} */
export function getLang() {
  return lang;
}

/**
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  const table = catalogs[lang] || catalogs.en;
  if (key in table) return table[key];
  if (key in catalogs.en) return catalogs.en[key];
  return key;
}

/**
 * @param {'en' | 'id'} next
 */
export function setLang(next) {
  if (next !== 'en' && next !== 'id') return;
  if (next === lang) {
    writeStoredLang(next);
    applyDom();
    return;
  }
  lang = next;
  writeStoredLang(next);
  applyDom();
  for (const fn of listeners) fn(lang);
}

/**
 * @param {(lang: 'en' | 'id') => void} fn
 * @returns {() => void}
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyDom(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) el.setAttribute('aria-label', t(key));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      const text = t(key);
      el.setAttribute('title', text);
      if (el.tagName === 'TITLE') el.textContent = text;
    }
  });
  const docTitle = document.querySelector('title[data-i18n]');
  if (docTitle) {
    const key = docTitle.getAttribute('data-i18n');
    if (key) document.title = t(key);
  }
}
