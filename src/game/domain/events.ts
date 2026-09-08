export type GameEvent =
  | { type: 'SHOT_FIRED'; weaponId: string }
  | { type: 'ENEMY_HIT'; enemyId: string; x: number; y: number }
  | { type: 'ENEMY_KILLED'; enemyId: string; score: number; combo: number; x: number; y: number }
  | { type: 'PLAYER_HIT'; calorie: number; total: number }
  | { type: 'COMBO_TIER_CHANGED'; combo: number; multiplier: number }
  | { type: 'POWERUP_COLLECTED'; powerUpId: string }
  | { type: 'BOSS_PHASE_CHANGED'; bossId: string; phase: string }
  | { type: 'WAVE_COMPLETED'; waveId: string }
  | { type: 'STAGE_CLEARED'; stageId: string }
  | { type: 'RUN_ENDED'; reason: 'FAT_OVER' | 'CLEAR' };

export type GameEventListener = (event: GameEvent) => void;

/**
 * Minimal synchronous pub/sub so domain-driven events can reach display,
 * audio, and HUD concerns without those layers deciding combat outcomes
 * (FI-05 section 4: "Audio/VFX/UIはdomain eventを購読し、戦闘結果を決めない").
 */
export class GameEventBus {
  private listeners = new Set<GameEventListener>();

  on(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
