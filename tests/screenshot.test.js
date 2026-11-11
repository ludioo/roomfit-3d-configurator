import { describe, expect, it, vi } from 'vitest';
import { isMobileShareHost, shouldAttemptShare } from '../src/scene/screenshot.js';

describe('isMobileShareHost', () => {
  it('detects Android and iPhone', () => {
    expect(isMobileShareHost('Mozilla/5.0 (Linux; Android 14)')).toBe(true);
    expect(isMobileShareHost('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe(true);
  });

  it('rejects desktop Windows UA', () => {
    expect(
      isMobileShareHost(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      ),
    ).toBe(false);
  });
});

describe('shouldAttemptShare', () => {
  const file = new File([new Uint8Array([1])], 'x.png', { type: 'image/png' });
  const mobileUa = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36';

  it('returns false when share is missing', () => {
    expect(shouldAttemptShare({ userAgent: mobileUa }, file)).toBe(false);
  });

  it('returns false on desktop even if canShare is true', () => {
    expect(
      shouldAttemptShare(
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          share: vi.fn(),
          canShare: () => true,
        },
        file,
      ),
    ).toBe(false);
  });

  it('returns false when canShare rejects files', () => {
    expect(
      shouldAttemptShare(
        {
          userAgent: mobileUa,
          share: vi.fn(),
          canShare: () => false,
        },
        file,
      ),
    ).toBe(false);
  });

  it('returns true on mobile when share and canShare({ files }) succeed', () => {
    expect(
      shouldAttemptShare(
        {
          userAgent: mobileUa,
          share: vi.fn(),
          canShare: (data) => Array.isArray(data?.files) && data.files.length === 1,
        },
        file,
      ),
    ).toBe(true);
  });
});
