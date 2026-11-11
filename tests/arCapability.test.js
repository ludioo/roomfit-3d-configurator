import { describe, expect, it, vi } from 'vitest';
import {
  isIosNonSafari,
  isIosSafari,
  queryImmersiveAr,
  resolveArCapability,
} from '../src/ar/capability.js';

const IPHONE_FIREFOX =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DESKTOP_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DESKTOP_MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const IPAD_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

describe('isIosSafari', () => {
  it('accepts iPhone Safari', () => {
    expect(isIosSafari({ userAgent: IPHONE_SAFARI, vendor: 'Apple Computer, Inc.' })).toBe(true);
  });

  it('rejects iPhone Chrome (CriOS)', () => {
    expect(isIosSafari({ userAgent: IPHONE_CHROME, vendor: 'Apple Computer, Inc.' })).toBe(false);
  });

  it('accepts iPadOS desktop-UA with touch', () => {
    expect(
      isIosSafari({
        userAgent: IPAD_DESKTOP_UA,
        platform: 'MacIntel',
        maxTouchPoints: 5,
        vendor: 'Apple Computer, Inc.',
      }),
    ).toBe(true);
  });

  it('rejects desktop Mac Safari without touch', () => {
    expect(
      isIosSafari({
        userAgent: DESKTOP_MAC_SAFARI,
        platform: 'MacIntel',
        maxTouchPoints: 0,
        vendor: 'Apple Computer, Inc.',
      }),
    ).toBe(false);
  });

  it('rejects Windows desktop', () => {
    expect(isIosSafari({ userAgent: DESKTOP_WIN, platform: 'Win32', maxTouchPoints: 0 })).toBe(
      false,
    );
  });

  it('rejects Android Chrome', () => {
    expect(isIosSafari({ userAgent: ANDROID_CHROME, platform: 'Linux armv8l' })).toBe(false);
  });
});

describe('isIosNonSafari', () => {
  it('accepts iPhone Chrome (CriOS)', () => {
    expect(isIosNonSafari({ userAgent: IPHONE_CHROME, vendor: 'Apple Computer, Inc.' })).toBe(
      true,
    );
  });

  it('accepts iPhone Firefox (FxiOS)', () => {
    expect(isIosNonSafari({ userAgent: IPHONE_FIREFOX, vendor: 'Apple Computer, Inc.' })).toBe(
      true,
    );
  });

  it('rejects iPhone Safari', () => {
    expect(isIosNonSafari({ userAgent: IPHONE_SAFARI, vendor: 'Apple Computer, Inc.' })).toBe(
      false,
    );
  });

  it('rejects Windows desktop', () => {
    expect(
      isIosNonSafari({ userAgent: DESKTOP_WIN, platform: 'Win32', maxTouchPoints: 0 }),
    ).toBe(false);
  });

  it('rejects Android Chrome', () => {
    expect(isIosNonSafari({ userAgent: ANDROID_CHROME, platform: 'Linux armv8l' })).toBe(false);
  });
});

describe('queryImmersiveAr', () => {
  it('returns false when xr is missing', async () => {
    expect(await queryImmersiveAr(null)).toBe(false);
    expect(await queryImmersiveAr(undefined)).toBe(false);
    expect(await queryImmersiveAr({})).toBe(false);
  });

  it('returns true when immersive-ar is supported', async () => {
    const xr = { isSessionSupported: vi.fn().mockResolvedValue(true) };
    expect(await queryImmersiveAr(xr)).toBe(true);
    expect(xr.isSessionSupported).toHaveBeenCalledWith('immersive-ar');
  });

  it('returns false when the probe throws', async () => {
    const xr = {
      isSessionSupported: vi.fn().mockRejectedValue(new Error('secure context')),
    };
    expect(await queryImmersiveAr(xr)).toBe(false);
  });
});

describe('resolveArCapability', () => {
  it('prefers webxr over ios Safari', () => {
    expect(resolveArCapability({ webxr: true, iosSafari: true })).toBe('webxr');
  });

  it('uses quicklook when only ios Safari', () => {
    expect(resolveArCapability({ webxr: false, iosSafari: true })).toBe('quicklook');
  });

  it('marks desktop unsupported', () => {
    expect(resolveArCapability({ webxr: false, iosSafari: false })).toBe('unsupported');
  });

  it('maps Android WebXR to webxr', () => {
    expect(resolveArCapability({ webxr: true, iosSafari: false })).toBe('webxr');
  });
});
