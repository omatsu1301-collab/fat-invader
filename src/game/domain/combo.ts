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
  /** Absolute game-clock expiry timestamp. Meaningful only while NOT frozen. */
  expiresAtMs: number | null;
  /** Whether the combo timer should be held (pause / stage / boss transition). */
  frozen: boolean;
  /**
   * Remaining window, captured at the moment of freezing. Meaningful only
   * while frozen. Using a duration here (rather than continuing to compare
   * against the still-advancing game clock) is what makes freezing actually
   * hold the countdown instead of merely skipping one check — see
   * `setFrozen` for why that distinction matters.
   */
  frozenRemainingMs: number | null;
};

export function createComboState(): ComboState {
  return {
    combo: 0,
    maxCombo: 0,
    expiresAtMs: null,
    frozen: false,
    frozenRemainingMs: null,
  };
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
 * tests and GameBalance stay the single source of truth. Docs describe kills
 * only happening outside frozen transitions, but a kill mid-freeze still
 * stores its window as a duration rather than an absolute timestamp so it
 * can't be corrupted by the clock time it would eventually unfreeze at.
 */
export function registerKill(state: ComboState, nowMs: number, windowMs: number): ComboState {
  const combo = state.combo + 1;
  const maxCombo = Math.max(state.maxCombo, combo);
  if (state.frozen) {
    return { ...state, combo, maxCombo, frozenRemainingMs: windowMs };
  }
  return { ...state, combo, maxCombo, expiresAtMs: nowMs + windowMs };
}

/** Player hit resets combo to 0 immediately (AC-122). */
export function registerHit(state: ComboState): ComboState {
  return { ...state, combo: 0, expiresAtMs: null, frozenRemainingMs: null };
}

/**
 * Expires the combo once the window elapses (AC-122). Frozen combos (pause,
 * stage/boss transition per FI-03 section 7) never expire from a tick,
 * because `expiresAtMs` is null while frozen (see `setFrozen`).
 */
export function tickExpiry(state: ComboState, nowMs: number): ComboState {
  if (state.frozen) return state;
  if (state.expiresAtMs !== null && nowMs >= state.expiresAtMs) {
    return { ...state, combo: 0, expiresAtMs: null };
  }
  return state;
}

/**
 * Freezes or unfreezes the combo window (AC-123). The game clock keeps
 * advancing during stage/boss transitions (only Pause/hidden stops it
 * entirely), so simply skipping the expiry check while frozen is not
 * enough: `expiresAtMs` is an absolute clock timestamp, and by the time a
 * multi-second transition ends, real elapsed clock time would already be
 * past it — expiring the combo the instant the next tick runs.
 *
 * Freezing instead converts the absolute expiry into a *remaining*
 * duration (`frozenRemainingMs`) that does not drift with the clock.
 * Unfreezing re-bases that duration onto the clock time at the moment
 * play resumes, so the countdown genuinely continues from where it was
 * paused rather than silently having kept running in the background.
 */
export function setFrozen(state: ComboState, frozen: boolean, nowMs: number): ComboState {
  if (frozen === state.frozen) return state;

  if (frozen) {
    if (state.expiresAtMs === null) {
      return { ...state, frozen: true, frozenRemainingMs: null };
    }
    return {
      ...state,
      frozen: true,
      expiresAtMs: null,
      frozenRemainingMs: Math.max(0, state.expiresAtMs - nowMs),
    };
  }

  if (state.frozenRemainingMs === null) {
    return { ...state, frozen: false, expiresAtMs: null };
  }
  return {
    ...state,
    frozen: false,
    expiresAtMs: nowMs + state.frozenRemainingMs,
    frozenRemainingMs: null,
  };
}
