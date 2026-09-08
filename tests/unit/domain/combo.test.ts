import { describe, expect, it } from 'vitest';
import {
  comboMultiplier,
  createComboState,
  registerHit,
  registerKill,
  setFrozen,
  tickExpiry,
} from '../../../src/game/domain/combo';

describe('combo', () => {
  it('maps combo count to multiplier per FI-02 table (AC-120)', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(4)).toBe(1);
    expect(comboMultiplier(5)).toBe(2);
    expect(comboMultiplier(9)).toBe(2);
    expect(comboMultiplier(10)).toBe(4);
    expect(comboMultiplier(24)).toBe(4);
    expect(comboMultiplier(25)).toBe(8);
    expect(comboMultiplier(49)).toBe(8);
    expect(comboMultiplier(50)).toBe(16);
  });

  it('increments and resets the 2.0s window on each kill (AC-121)', () => {
    let state = createComboState();
    state = registerKill(state, 1000, 2000);
    expect(state.combo).toBe(1);
    expect(state.expiresAtMs).toBe(3000);

    state = registerKill(state, 2500, 2000);
    expect(state.combo).toBe(2);
    expect(state.maxCombo).toBe(2);
    expect(state.expiresAtMs).toBe(4500);
  });

  it('expires combo back to 0 once the window elapses (AC-122)', () => {
    let state = createComboState();
    state = registerKill(state, 0, 2000);
    state = tickExpiry(state, 1999);
    expect(state.combo).toBe(1);
    state = tickExpiry(state, 2000);
    expect(state.combo).toBe(0);
    expect(state.expiresAtMs).toBeNull();
  });

  it('resets combo to 0 immediately on player hit (AC-122)', () => {
    let state = createComboState();
    state = registerKill(state, 0, 2000);
    state = registerHit(state);
    expect(state.combo).toBe(0);
    expect(state.maxCombo).toBe(1);
  });

  it('never expires a frozen combo even while the clock keeps advancing (AC-123)', () => {
    let state = createComboState();
    state = registerKill(state, 0, 2000);
    state = setFrozen(state, true, 500);
    state = tickExpiry(state, 999_999);
    expect(state.combo).toBe(1);
  });

  /**
   * Blocker 2 regression: freezing must preserve *remaining* time, not just
   * skip the expiry check. The game clock keeps advancing during boss/stage
   * transitions (only Pause/hidden stops it outright), so if freezing left
   * `expiresAtMs` as an absolute timestamp, real elapsed clock time during a
   * multi-second transition would already be past it — expiring the combo
   * the instant the next tick ran after unfreezing. This reproduces exactly
   * the scenario from the audit: kill at t=0 (2000ms window), freeze at
   * t=500 (1500ms remaining), unfreeze at t=5500, combo must survive until
   * t=7000 (5500 + 1500), not expire immediately at t=5500.
   */
  it('resumes the countdown from where it was frozen, not from the clock time at unfreeze (AC-123)', () => {
    let state = createComboState();
    state = registerKill(state, 0, 2000); // expiresAtMs = 2000
    state = setFrozen(state, true, 500); // 1500ms remaining, stashed
    expect(state.expiresAtMs).toBeNull();
    expect(state.frozenRemainingMs).toBe(1500);

    // While frozen, no amount of clock advancement expires it.
    state = tickExpiry(state, 5499);
    expect(state.combo).toBe(1);

    state = setFrozen(state, false, 5500); // re-based: expiresAtMs = 5500 + 1500 = 7000
    expect(state.expiresAtMs).toBe(7000);

    state = tickExpiry(state, 6999);
    expect(state.combo).toBe(1);

    state = tickExpiry(state, 7000);
    expect(state.combo).toBe(0);
  });

  it('setFrozen is a no-op when the requested state already holds', () => {
    let state = createComboState();
    state = registerKill(state, 0, 2000);
    const unchanged = setFrozen(state, false, 12345);
    expect(unchanged).toBe(state);
  });
});
