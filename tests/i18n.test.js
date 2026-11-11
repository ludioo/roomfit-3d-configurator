import { beforeEach, describe, expect, it } from 'vitest';
import { getLang, setLang, t } from '../src/core/i18n.js';

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear();
    setLang('en');
  });

  it('returns English strings for known keys', () => {
    setLang('en');
    expect(t('app.title')).toBe('RoomFit');
    expect(t('splash.retry')).toBe('Retry');
  });

  it('returns Indonesian strings after setLang', () => {
    setLang('id');
    expect(getLang()).toBe('id');
    expect(t('app.title')).toBe('RoomFit');
    expect(t('splash.retry')).toBe('Coba lagi');
  });

  it('falls back to the key when missing', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('persists lang in localStorage', () => {
    setLang('id');
    expect(localStorage.getItem('furncfg:lang')).toBe('id');
  });
});
