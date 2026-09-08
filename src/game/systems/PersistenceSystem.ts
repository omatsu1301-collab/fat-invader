import type { KeyValueStorage } from '../ports/Storage';
import type { Rank } from '../domain/evaluation';

const STORAGE_KEY = 'fat-invader.save.v1';

export type SaveDataV1 = {
  schemaVersion: 1;
  highScore: number;
  bestRank: Rank | null;
  settings: {
    bgm: boolean;
    se: boolean;
    vibration: boolean;
    screenShake: 'full' | 'reduced' | 'off';
    reducedEffects: boolean;
  };
};

const RANKS: readonly Rank[] = ['D', 'C', 'B', 'A', 'S', 'SS'];

export function defaultSaveData(): SaveDataV1 {
  return {
    schemaVersion: 1,
    highScore: 0,
    bestRank: null,
    settings: {
      bgm: true,
      se: true,
      vibration: true,
      screenShake: 'full',
      reducedEffects: false,
    },
  };
}

function isRank(value: unknown): value is Rank {
  return typeof value === 'string' && (RANKS as readonly string[]).includes(value);
}

/**
 * Validates an unknown JSON value against SaveDataV1's shape. Unknown
 * fields are ignored; anything structurally wrong falls back to defaults
 * rather than throwing (FI-03 section 11, FI-05 section 12).
 */
function isValidSaveData(value: unknown): value is SaveDataV1 {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate['schemaVersion'] !== 1) return false;
  if (typeof candidate['highScore'] !== 'number' || Number.isNaN(candidate['highScore'])) {
    return false;
  }
  if (candidate['bestRank'] !== null && !isRank(candidate['bestRank'])) return false;

  const settings = candidate['settings'];
  if (typeof settings !== 'object' || settings === null) return false;
  const s = settings as Record<string, unknown>;
  if (typeof s['bgm'] !== 'boolean') return false;
  if (typeof s['se'] !== 'boolean') return false;
  if (typeof s['vibration'] !== 'boolean') return false;
  if (s['screenShake'] !== 'full' && s['screenShake'] !== 'reduced' && s['screenShake'] !== 'off') {
    return false;
  }
  if (typeof s['reducedEffects'] !== 'boolean') return false;

  return true;
}

/** Loads save data, warning once and returning defaults on any corruption. */
export function loadSaveData(storage: KeyValueStorage): SaveDataV1 {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return defaultSaveData();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValidSaveData(parsed)) return parsed;
    console.warn('fat-invader: save data failed validation, using defaults.');
    return defaultSaveData();
  } catch {
    console.warn('fat-invader: save data was not valid JSON, using defaults.');
    return defaultSaveData();
  }
}

function persist(storage: KeyValueStorage, data: SaveDataV1): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Records a completed run's score (and rank, when the run reached RUN
 * CLEAR — FAT OVER runs pass `rank: null` since evaluation only happens on
 * clear per AC-314) if it improves on the saved best. Returns the (possibly
 * unchanged) save data plus whether a new high score was set, matching
 * FI-03 section 2.8 ("New High Scoreなら保存し、明示する").
 */
export function recordScoreAndRank(
  storage: KeyValueStorage,
  current: SaveDataV1,
  score: number,
  rank: Rank | null,
): { data: SaveDataV1; isNewHighScore: boolean } {
  const isNewHighScore = score > current.highScore;
  if (!isNewHighScore) {
    return { data: current, isNewHighScore: false };
  }

  const bestRankIndex = current.bestRank ? RANKS.indexOf(current.bestRank) : -1;
  const resultRankIndex = rank ? RANKS.indexOf(rank) : -1;

  const data: SaveDataV1 = {
    ...current,
    highScore: score,
    bestRank: rank && resultRankIndex > bestRankIndex ? rank : current.bestRank,
  };

  persist(storage, data);
  return { data, isNewHighScore: true };
}
