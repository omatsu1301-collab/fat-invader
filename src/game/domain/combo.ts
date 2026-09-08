export type ComboTier = {
  min: number;
  multiplier: number;
  callout: string | null;
};

export const COMBO_TIERS: readonly ComboTier[] = [
  { min: 0, multiplier: 1, callout: null },
  { min: 5, multiplier: 2, callout: 'WARM UP' },
  { min: 10, multiplier: 4, callout: 'FAT BURN' },
  { min: 25, multiplier: 8, callout: 'SHREDDED' },
  { min: 50, multiplier: 16, callout: 'ABSURDLY LEAN' },
];

export type ComboState = {
  combo: number;
  maxCombo: number;
  /** Game-clock timestamp the current combo expires at, or null when idle. */
  expiresAtMs: number | null;
  /** Whether the combo timer should be held (pause / stage transition). */
  frozen: boolean;
};

export function createComboState(): ComboState {
  return { combo: 0, maxCombo: 0, expiresAtMs: null, frozen: false };
}

/** FI-02 section 11.2 combo multiplier table, AC-120. */
export function comboMultiplier(combo: number): number {
  let multiplier = COMBO_TIERS[0]!.multiplier;
  for (const tier of COMBO_TIERS) {
    if (combo >= tier.min) multiplier = tier.multiplier;
  }
  return multiplier;
}

export function comboCallout(combo: number): string | null {
  let callout: string | null = null;
  for (const tier of COMBO_TIERS) {
    if (combo >= tier.min) callout = tier.callout;
  }
  return callout;
}

/**
 * FI-03 section 7 combo lifecycle: a kill before expiry increments combo and
 * resets the 2.0s window (AC-121); the window duration is caller-supplied so
 * tests and GameBalance stay the single source of truth.
 */
export function registerKill(state: ComboState, nowMs: number, windowMs: number): ComboState {
  const combo = state.combo + 1;
  return {
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    expiresAtMs: nowMs + windowMs,
    frozen: state.frozen,
  };
}

/** Player hit resets combo to 0 immediately (AC-122). */
export function registerHit(state: ComboState): ComboState {
  return { ...state, combo: 0, expiresAtMs: null };
}

/**
 * Expires the combo once the window elapses (AC-122). Frozen combos (pause,
 * stage/boss transition per FI-03 section 7) never expire from a tick.
 */
export function tickExpiry(state: ComboState, nowMs: number): ComboState {
  if (state.frozen) return state;
  if (state.expiresAtMs !== null && nowMs >= state.expiresAtMs) {
    return { ...state, combo: 0, expiresAtMs: null };
  }
  return state;
}

export function setFrozen(state: ComboState, frozen: boolean): ComboState {
  return { ...state, frozen };
}
