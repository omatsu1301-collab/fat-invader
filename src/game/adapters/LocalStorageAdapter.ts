import type { KeyValueStorage } from '../ports/Storage';

/**
 * FI-05 section 12: storage exceptions (quota, private browsing) must not
 * stop the game. Falls back to an in-memory map for the session so writes
 * still "succeed" from the caller's perspective.
 */
export class LocalStorageAdapter implements KeyValueStorage {
  private memoryFallback = new Map<string, string>();
  private useMemoryFallback = false;

  getItem(key: string): string | null {
    if (this.useMemoryFallback) {
      return this.memoryFallback.get(key) ?? null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      this.useMemoryFallback = true;
      return this.memoryFallback.get(key) ?? null;
    }
  }

  setItem(key: string, value: string): void {
    if (this.useMemoryFallback) {
      this.memoryFallback.set(key, value);
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      this.useMemoryFallback = true;
      this.memoryFallback.set(key, value);
    }
  }
}
