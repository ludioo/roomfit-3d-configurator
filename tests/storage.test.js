import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildConfigName,
  deleteConfig,
  ensureSchema,
  get,
  getLast,
  listConfigs,
  saveConfig,
  set,
  setLast,
} from '../src/core/storage.js';

const PRICE = { IDR: 1_000_000, USD: 65, illustrative: true };

function sample(overrides = {}) {
  return {
    productId: 'armchair',
    fabricColor: 'sand',
    finish: 'fabric',
    size: 'standard',
    priceSnapshot: PRICE,
    ...overrides,
  };
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prefixes keys with furncfg:', () => {
    expect(set('lang', 'en')).toBe(true);
    expect(localStorage.getItem('furncfg:lang')).toBe('en');
    expect(get('lang')).toBe('en');
  });

  it('ensureSchema writes version 1 and clears on mismatch', () => {
    set('configs', JSON.stringify([{ id: 'old' }]));
    set('last', JSON.stringify({ productId: 'sofa' }));
    set('schemaVersion', '0');
    const result = ensureSchema();
    expect(result.cleared).toBe(true);
    expect(localStorage.getItem('furncfg:schemaVersion')).toBe('1');
    expect(listConfigs()).toEqual([]);
    expect(getLast()).toBeNull();
  });

  it('buildConfigName uses product · color · finish', () => {
    expect(
      buildConfigName(
        { productId: 'armchair', fabricColor: 'sand', finish: 'fabric' },
        'en',
      ),
    ).toBe('Chair · Sand · Fabric');
    expect(
      buildConfigName(
        { productId: 'sofa', fabricColor: 'navy', finish: 'leather' },
        'id',
      ),
    ).toBe('Sofa · Navy · Kulit');
  });

  it('saveConfig adds entry and listConfigs returns it', () => {
    set('lang', 'en');
    const result = saveConfig(sample());
    expect(result.ok).toBe(true);
    expect(result.entry?.name).toBe('Chair · Sand · Fabric');
    expect(listConfigs()).toHaveLength(1);
    expect(listConfigs()[0].productId).toBe('armchair');
    expect(localStorage.getItem('furncfg:configs')).toContain('Chair · Sand · Fabric');
  });

  it('evicts oldest when saving beyond 10', () => {
    for (let i = 0; i < 10; i += 1) {
      saveConfig(sample({ fabricColor: `c${i}` }));
    }
    expect(listConfigs()).toHaveLength(10);
    const firstId = listConfigs()[0].id;
    const result = saveConfig(sample({ fabricColor: 'newest' }));
    expect(result.ok).toBe(true);
    expect(result.evicted?.id).toBe(firstId);
    expect(listConfigs()).toHaveLength(10);
    expect(listConfigs().some((c) => c.id === firstId)).toBe(false);
    expect(listConfigs().at(-1)?.fabricColor).toBe('newest');
  });

  it('deleteConfig removes by id', () => {
    const { entry } = saveConfig(sample());
    expect(deleteConfig(entry.id).ok).toBe(true);
    expect(listConfigs()).toHaveLength(0);
    expect(deleteConfig(entry.id).ok).toBe(false);
  });

  it('getLast and setLast round-trip', () => {
    expect(getLast()).toBeNull();
    expect(
      setLast({
        productId: 'sofa',
        fabricColor: 'ink',
        finish: 'leather',
        size: 'large',
      }),
    ).toBe(true);
    expect(getLast()).toEqual({
      productId: 'sofa',
      fabricColor: 'ink',
      finish: 'leather',
      size: 'large',
    });
  });

  it('saveConfig returns ok:false when setItem throws', () => {
    ensureSchema();
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const result = saveConfig(sample());
    spy.mockRestore();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('quota');
  });

  it('rejects invalid save input', () => {
    expect(saveConfig(/** @type {any} */ ({ productId: 'armchair' })).ok).toBe(
      false,
    );
  });
});
