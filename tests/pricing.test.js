import { describe, expect, it } from 'vitest';
import productsData from '../src/data/products.json';
import {
  computePrice,
  currencyForLang,
  formatPrice,
} from '../src/core/pricing.js';

const armchair = productsData.products.find((p) => p.id === 'armchair');

describe('computePrice', () => {
  it('returns base price for default options', () => {
    expect(
      computePrice(armchair, {
        fabricColor: 'sand',
        finish: 'fabric',
        size: 'standard',
      }),
    ).toEqual({ IDR: 1850000, USD: 119, illustrative: true });
  });

  it('sums base plus fabric, finish, and size addons', () => {
    expect(
      computePrice(armchair, {
        fabricColor: 'terracotta',
        finish: 'leather',
        size: 'large',
      }),
    ).toEqual({ IDR: 2500000, USD: 167, illustrative: true });
  });
});

describe('currencyForLang', () => {
  it('maps id to IDR and en to USD', () => {
    expect(currencyForLang('id')).toBe('IDR');
    expect(currencyForLang('en')).toBe('USD');
  });
});

describe('formatPrice', () => {
  it('formats IDR with id-ID locale', () => {
    const text = formatPrice(1850000, 'IDR', 'id');
    expect(text.replace(/\s/g, '')).toMatch(/1[.,]?850[.,]?000/);
    expect(text).toMatch(/Rp/);
  });

  it('formats USD with en-US locale', () => {
    const text = formatPrice(119, 'USD', 'en');
    expect(text).toContain('119');
    expect(text).toMatch(/\$|USD/);
  });
});
