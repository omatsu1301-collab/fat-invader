/**
 * FI-05 section 4: `localStorage` must only be called through this port so
 * persistence failures (quota, privacy mode) can fall back safely without
 * scattering try/catch across gameplay code.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
