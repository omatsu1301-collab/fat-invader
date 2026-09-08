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

  it('never expires a frozen combo (AC-123)', () => {
    let state = createComboState();
    state = registerKill(state, 0, 2000);
    state = setFrozen(state, true);
    state = tickExpiry(state, 999_999);
    expect(state.combo).toBe(1);
  });
});
