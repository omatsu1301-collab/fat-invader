import { transitionBossPhase, type BossState } from '../domain/boss';
import { bosses, type BossId } from '../content/bosses';

export type BossDamageResult = {
  state: BossState;
  phaseChanged: boolean;
  defeated: boolean;
};

export function completeBossIntro(state: BossState): BossState {
  return transitionBossPhase(state, { type: 'INTRO_COMPLETE' });
}

/** Applies damage and reports whether this hit changed phase or defeated the boss. */
export function applyBossDamage(
  bossId: BossId,
  state: BossState,
  amount: number,
): BossDamageResult {
  const def = bosses[bossId];
  const nextState = transitionBossPhase(state, {
    type: 'DAMAGE',
    amount,
    phase2HpFraction: def.phase2HpFraction,
  });
  return {
    state: nextState,
    phaseChanged: nextState.phase !== state.phase && nextState.phase !== 'dead',
    defeated: nextState.phase === 'dead' && state.phase !== 'dead',
  };
}

export function activePhaseConfig(bossId: BossId, state: BossState) {
  const def = bosses[bossId];
  return state.phase === 'phase2' ? def.phase2 : def.phase1;
}
