import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function installDom() {
  const children = [];
  const head = {
    appendChild(node) {
      children.push(node);
      return node;
    },
  };
  const documentElement = {
    attrs: /** @type {Record<string, string>} */ ({}),
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attrs, name);
    },
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    },
    removeAttribute(name) {
      delete this.attrs[name];
    },
  };

  globalThis.document = {
    head,
    documentElement,
    createElement(tag) {
      const el = {
        tagName: String(tag).toUpperCase(),
        attrs: /** @type {Record<string, string>} */ ({}),
        defer: false,
        src: '',
        setAttribute(name, value) {
          this.attrs[name] = String(value);
          if (name === 'src') this.src = String(value);
        },
        getAttribute(name) {
          return this.attrs[name] ?? null;
        },
      };
      return el;
    },
    querySelector(sel) {
      if (!sel.includes('data-furncfg-umami')) return null;
      return children.find((c) => c.attrs['data-furncfg-umami']) ?? null;
    },
    querySelectorAll() {
      return [];
    },
    _scripts: children,
  };

  globalThis.window = globalThis;
  globalThis.requestIdleCallback = (cb) => {
    cb({ didTimeout: false, timeRemaining: () => 0 });
    return 1;
  };
}

describe('analytics', () => {
  beforeEach(() => {
    vi.resetModules();
    installDom();
    delete globalThis.umami;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('initAnalytics does not inject script when website id is empty', async () => {
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');
    const { initAnalytics } = await import('../src/core/analytics.js');
    initAnalytics();
    expect(document._scripts).toHaveLength(0);
  });

  it('initAnalytics injects one Umami script with id and domains', async () => {
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'test-website-id');
    const { initAnalytics } = await import('../src/core/analytics.js');
    initAnalytics();
    initAnalytics();
    expect(document._scripts).toHaveLength(1);
    const s = document._scripts[0];
    expect(s.src).toBe('https://cloud.umami.is/script.js');
    expect(s.attrs['data-website-id']).toBe('test-website-id');
    expect(s.attrs['data-domains']).toBe('roomfit.barkahmauludi.com');
    expect(s.attrs['data-furncfg-umami']).toBe('1');
    expect(s.defer).toBe(true);
  });

  it('track is a no-op without umami and forwards when present', async () => {
    const { track } = await import('../src/core/analytics.js');
    expect(() => track('variant_change', { fabricColor: 'sand' })).not.toThrow();

    const umamiTrack = vi.fn();
    globalThis.umami = { track: umamiTrack };
    track('lang_change', { lang: 'id' });
    expect(umamiTrack).toHaveBeenCalledWith('lang_change', { lang: 'id' });
  });
});
