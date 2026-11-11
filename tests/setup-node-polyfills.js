const mem = new Map();

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem(key) {
      return mem.has(key) ? mem.get(key) : null;
    },
    setItem(key, value) {
      mem.set(String(key), String(value));
    },
    removeItem(key) {
      mem.delete(String(key));
    },
    clear() {
      mem.clear();
    },
  };
}

if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { language: 'en-US' };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    documentElement: { lang: 'en' },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
  };
}
