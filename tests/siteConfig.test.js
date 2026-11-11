import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITE_NAME, SITE_ORIGIN, absoluteUrl } from '../src/core/siteConfig.js';

describe('siteConfig', () => {
  it('exposes a single origin used by index.html share meta', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(SITE_ORIGIN).toBe('https://roomfit.barkahmauludi.com');
    expect(SITE_NAME).toBe('RoomFit');
    expect(html).toContain(SITE_ORIGIN);
    expect(html).toContain('og:image');
    expect(html).toContain(absoluteUrl('/og-image.png'));
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('theme-color');
  });
});
