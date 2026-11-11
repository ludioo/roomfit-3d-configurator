import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/ui/motion.js', () => ({
  runUiMotion: vi.fn(() => Promise.resolve()),
}));

function createStubElement() {
  /** @type {ReturnType<typeof createStubElement>[]} */
  const kids = [];
  const el = {
    className: '',
    textContent: '',
    style: /** @type {Record<string, string>} */ ({}),
    get children() {
      return kids;
    },
    get childElementCount() {
      return kids.length;
    },
    querySelector(sel) {
      if (sel === '.toast') {
        return kids.find((c) => c.className === 'toast') ?? null;
      }
      return null;
    },
    replaceChildren(...nodes) {
      kids.length = 0;
      for (const n of nodes) kids.push(n);
    },
    append(...nodes) {
      for (const n of nodes) kids.push(n);
    },
    setAttribute() {},
    remove() {
      /* parent unlinks in tests via replaceChildren / host filter */
    },
  };
  const origRemove = el.remove.bind(el);
  el.remove = () => {
    const idx = kids.indexOf(el);
    if (idx >= 0) kids.splice(idx, 1);
    origRemove();
  };
  return el;
}

function stubDom() {
  /** @type {ReturnType<typeof createStubElement> | null} */
  let bodyChild = null;

  globalThis.document = {
    body: {
      append(node) {
        bodyChild = node;
        this._host = node;
      },
      _host: null,
    },
    createElement() {
      const el = createStubElement();
      // Toast nodes remove themselves from the current host.
      el.remove = () => {
        if (!bodyChild) return;
        const idx = bodyChild.children.indexOf(el);
        if (idx >= 0) bodyChild.children.splice(idx, 1);
      };
      return el;
    },
  };
}

describe('showToast dedupe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubDom();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('keeps a single toast and refreshes timer for the same message', async () => {
    const { showToast } = await import('../src/ui/toast.js');
    showToast('Hello');
    showToast('Hello');
    showToast('Hello');

    const host = globalThis.document.body._host;
    expect(host.querySelector('.toast')).toBeTruthy();
    expect(host.children.length).toBe(1);
    expect(host.querySelector('.toast').textContent).toBe('Hello');

    // Without refresh, 2.5s from first show would hide; after 3 rapid shows timer resets.
    await vi.advanceTimersByTimeAsync(2000);
    expect(host.querySelector('.toast')).toBeTruthy();

    await vi.advanceTimersByTimeAsync(2500);
    expect(host.querySelector('.toast')).toBeNull();
  });

  it('replaces toast when the message changes', async () => {
    const { showToast } = await import('../src/ui/toast.js');
    showToast('One');
    showToast('Two');

    const host = globalThis.document.body._host;
    expect(host.children.length).toBe(1);
    expect(host.querySelector('.toast').textContent).toBe('Two');
  });
});
