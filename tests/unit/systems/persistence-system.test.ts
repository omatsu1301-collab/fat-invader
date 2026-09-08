import { describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../../../src/game/ports/Storage';
import {
  defaultSaveData,
  loadSaveData,
  recordScoreAndRank,
} from '../../../src/game/systems/PersistenceSystem';

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('PersistenceSystem', () => {
  it('returns defaults when nothing is stored yet', () => {
    const data = loadSaveData(new MemoryStorage());
    expect(data).toEqual(defaultSaveData());
  });

  it('falls back to defaults and does not throw on corrupt JSON (AC-411)', () => {
    const storage = new MemoryStorage();
    storage.setItem('fat-invader.save.v1', '{not json');
    expect(() => loadSaveData(storage)).not.toThrow();
    expect(loadSaveData(storage)).toEqual(defaultSaveData());
  });

  it('falls back to defaults on structurally invalid data', () => {
    const storage = new MemoryStorage();
    storage.setItem('fat-invader.save.v1', JSON.stringify({ schemaVersion: 1, highScore: 'nope' }));
    expect(loadSaveData(storage)).toEqual(defaultSaveData());
  });

  it('updates high score and best rank only on improvement (AC-316)', () => {
    const storage = new MemoryStorage();
    const base = defaultSaveData();

    const first = recordScoreAndRank(storage, base, 1000, 'C');
    expect(first.isNewHighScore).toBe(true);
    expect(first.data.highScore).toBe(1000);
    expect(first.data.bestRank).toBe('C');

    const lower = recordScoreAndRank(storage, first.data, 500, 'A');
    expect(lower.isNewHighScore).toBe(false);
    expect(lower.data.highScore).toBe(1000);
    expect(lower.data.bestRank).toBe('C');

    const higherButLowerRank = recordScoreAndRank(storage, first.data, 2000, 'D');
    expect(higherButLowerRank.isNewHighScore).toBe(true);
    expect(higherButLowerRank.data.highScore).toBe(2000);
    // Best rank never regresses even though this run's own rank was worse.
    expect(higherButLowerRank.data.bestRank).toBe('C');

    const persisted = loadSaveData(storage);
    expect(persisted.highScore).toBe(2000);
  });

  it('updates high score without touching bestRank when rank is null (FAT OVER)', () => {
    const storage = new MemoryStorage();
    const result = recordScoreAndRank(storage, defaultSaveData(), 500, null);
    expect(result.isNewHighScore).toBe(true);
    expect(result.data.highScore).toBe(500);
    expect(result.data.bestRank).toBeNull();
  });
});
