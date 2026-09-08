import { describe, expect, it } from 'vitest';
import { createBossState, transitionBossPhase } from '../../../src/game/domain/boss';

describe('boss state machine', () => {
  it('moves intro -> phase1 only on INTRO_COMPLETE', () => {
    const state = createBossState(30);
    expect(state.phase).toBe('intro');
    const next = transitionBossPhase(state, { type: 'INTRO_COMPLETE' });
    expect(next.phase).toBe('phase1');
  });

  it('switches to phase2 once HP drops to the configured fraction (>= 2 combat states required)', () => {
    let state = createBossState(30);
    state = transitionBossPhase(state, { type: 'INTRO_COMPLETE' });
    state = transitionBossPhase(state, { type: 'DAMAGE', amount: 10, phase2HpFraction: 0.5 });
    expect(state.phase).toBe('phase1');
    expect(state.hp).toBe(20);

    state = transitionBossPhase(state, { type: 'DAMAGE', amount: 5, phase2HpFraction: 0.5 });
    expect(state.phase).toBe('phase2');
    expect(state.hp).toBe(15);
  });

  it('dies exactly once HP reaches 0 and further damage is a no-op', () => {
    let state = createBossState(10);
    state = transitionBossPhase(state, { type: 'INTRO_COMPLETE' });
    state = transitionBossPhase(state, { type: 'DAMAGE', amount: 10, phase2HpFraction: 0.5 });
    expect(state.phase).toBe('dead');
    expect(state.hp).toBe(0);

    const again = transitionBossPhase(state, { type: 'DAMAGE', amount: 5, phase2HpFraction: 0.5 });
    expect(again).toEqual(state);
  });
});
