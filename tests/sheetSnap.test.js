import { describe, expect, it } from 'vitest';
import { snapIndexToSheetSnap } from '../src/ui/bottomSheet.js';

describe('snapIndexToSheetSnap', () => {
  it('maps lib indices (0 collapsed, 1 peek, 2 mid, 3 full) to peek/mid/full', () => {
    expect(snapIndexToSheetSnap(0)).toBe('peek');
    expect(snapIndexToSheetSnap(1)).toBe('peek');
    expect(snapIndexToSheetSnap(2)).toBe('mid');
    expect(snapIndexToSheetSnap(3)).toBe('full');
    expect(snapIndexToSheetSnap(4)).toBe('full');
  });
});
