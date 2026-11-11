import { beforeEach, describe, expect, it, vi } from 'vitest';

const animate = vi.fn(() => ({ finished: Promise.resolve() }));

vi.mock('motion/mini', () => ({
  animate: (...args) => animate(...args),
}));

const { applyEndKeyframes, prefersReducedMotion, runUiMotion } = await import(
  '../src/ui/motion.js'
);

function mockMatchMedia(matches) {
  globalThis.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? matches : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

describe('motion', () => {
  beforeEach(() => {
    animate.mockClear();
  });

  it('prefersReducedMotion reads matchMedia', () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    mockMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('applyEndKeyframes uses last keyframe value', () => {
    const el = { style: {} };
    applyEndKeyframes(el, {
      opacity: [0, 1],
      transform: ['translateY(8px)', 'translateY(0px)'],
    });
    expect(el.style.opacity).toBe('1');
    expect(el.style.transform).toBe('translateY(0px)');
  });

  it('runUiMotion skips animate when reduced motion', async () => {
    mockMatchMedia(true);
    const el = { style: {} };
    await runUiMotion(el, { opacity: [0, 1] }, { duration: 0.2 });
    expect(animate).not.toHaveBeenCalled();
    expect(el.style.opacity).toBe('1');
  });

  it('runUiMotion calls motion/mini animate when motion ok', async () => {
    mockMatchMedia(false);
    const el = { style: {} };
    await runUiMotion(el, { opacity: [0, 1] }, { duration: 0.2 });
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.calls[0][0]).toBe(el);
    expect(animate.mock.calls[0][2]).toMatchObject({
      duration: 0.2,
      easing: 'ease-out',
    });
  });
});
