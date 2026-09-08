import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageAdapter } from '../../../src/game/adapters/LocalStorageAdapter';

describe('LocalStorageAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('round-trips through real localStorage when available', () => {
    const adapter = new LocalStorageAdapter();
    adapter.setItem('k', 'v');
    expect(adapter.getItem('k')).toBe('v');
  });

  it('falls back to in-memory storage without throwing when localStorage errors (FI-05 section 12)', () => {
    vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded');
    });
    const adapter = new LocalStorageAdapter();
    expect(() => adapter.setItem('k', 'v')).not.toThrow();
    expect(adapter.getItem('k')).toBe('v');
  });
});
