/**
 * FI-02 section 9: bosses run `intro -> phase1 -> phase2 -> rage -> dead`.
 * Milestone A's simplified boss keeps only the two combat phases required by
 * the vertical slice acceptance ("Bossは最低2つの行動状態を持つ"), plus the
 * non-combat intro/dead bookends needed for a clean lifecycle.
 */
export type BossPhase = 'intro' | 'phase1' | 'phase2' | 'dead';

export type BossState = {
  phase: BossPhase;
  hp: number;
  maxHp: number;
  wasHitThisRun: boolean;
};

export function createBossState(maxHp: number): BossState {
  return { phase: 'intro', hp: maxHp, maxHp, wasHitThisRun: false };
}

/** Pure transition: intro ends explicitly, phase1->phase2 on HP threshold, any phase->dead at 0 HP. */
export function transitionBossPhase(
  state: BossState,
  event:
    | { type: 'INTRO_COMPLETE' }
    | { type: 'DAMAGE'; amount: number; phase2HpFraction: number },
): BossState {
  if (state.phase === 'dead') return state;

  if (event.type === 'INTRO_COMPLETE') {
    return state.phase === 'intro' ? { ...state, phase: 'phase1' } : state;
  }

  const hp = Math.max(0, state.hp - event.amount);
  if (hp <= 0) {
    return { ...state, hp: 0, phase: 'dead', wasHitThisRun: true };
  }

  const shouldEnterPhase2 =
    state.phase === 'phase1' && hp <= state.maxHp * event.phase2HpFraction;

  return {
    ...state,
    hp,
    phase: shouldEnterPhase2 ? 'phase2' : state.phase,
    wasHitThisRun: true,
  };
}
