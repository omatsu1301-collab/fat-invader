/**
 * FI-02 section 9: bosses run `intro -> phase1 -> phase2 -> rage -> dead`.
 */
export type BossPhase = 'intro' | 'phase1' | 'phase2' | 'rage' | 'dead';

export type BossState = {
  phase: BossPhase;
  hp: number;
  maxHp: number;
  wasHitThisRun: boolean;
};

export function createBossState(maxHp: number): BossState {
  return { phase: 'intro', hp: maxHp, maxHp, wasHitThisRun: false };
}

/** Pure transition with rage threshold support (AC-303). */
export function transitionBossPhase(
  state: BossState,
  event:
    | { type: 'INTRO_COMPLETE' }
    | {
        type: 'DAMAGE';
        amount: number;
        phase2HpFraction: number;
        rageHpFraction: number;
      },
): BossState {
  if (state.phase === 'dead') return state;

  if (event.type === 'INTRO_COMPLETE') {
    return state.phase === 'intro' ? { ...state, phase: 'phase1' } : state;
  }

  const hp = Math.max(0, state.hp - event.amount);
  if (hp <= 0) {
    return { ...state, hp: 0, phase: 'dead', wasHitThisRun: true };
  }

  let phase = state.phase;
  if (phase === 'phase1' && hp <= state.maxHp * event.phase2HpFraction) {
    phase = 'phase2';
  }
  if ((phase === 'phase1' || phase === 'phase2') && hp <= state.maxHp * event.rageHpFraction) {
    phase = 'rage';
  }

  return {
    ...state,
    hp,
    phase,
    wasHitThisRun: true,
  };
}
