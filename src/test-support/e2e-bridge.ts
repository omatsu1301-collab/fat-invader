import type Phaser from 'phaser';

export type FatE2ERunSnapshot = {
  score: number;
  combo: number;
  maxCombo: number;
  calorie: number;
  caloriesDodged: number;
  stageIndex: number;
  enemiesKilled: number;
  bossesKilled: number;
  shotsFired: number;
  playerX: number;
  /** Diagnostic only: proves the GameScene SHUTDOWN listener never accumulates (AC-135). */
  shutdownListenerCount: number;
  /** Diagnostic only: proves no previous run's bullets survive into a fresh one (AC-136). */
  activePlayerProjectiles: number;
  activeEnemyProjectiles: number;
  activeEnemies?: number;
  endReason?: 'FAT_OVER' | 'CLEAR';
  bossPhase?: string;
  bossX?: number;
  bossHp?: number;
  bossMaxHp?: number;
  /** Diagnostic only: proves a non-lethal hit never hides/disables the boss sprite (Human Gate 1 P1 regression). */
  bossSpriteActive?: boolean;
  bossSpriteVisible?: boolean;
  bossBodyEnabled?: boolean;
  activeParticles?: number;
  activeFragments?: number;
  activeScorePopups?: number;
  shakePx?: number;
  reducedEffects?: boolean;
  screenShake?: 'full' | 'reduced' | 'off';
  /** Clock-independent gameplay RNG fingerprint (fire delay + formation). */
  enemyFireDelayMs?: number[];
  enemyFormationOffsets?: number[];
};

export type FatE2ESnapshot = {
  sceneKey: string;
  startPressCount: number;
  run: FatE2ERunSnapshot | null;
};

/**
 * Implemented by GameScene and registered into the Phaser registry while
 * active, so the bridge can reach it without holding a direct reference that
 * would survive a scene restart. FI-03 section 14: test-only commands that
 * reproduce wave/hit/clear outcomes deterministically, never exposed outside
 * an E2E build.
 *
 * `debugSetBossHp` deliberately only adjusts HP/position-shaped setup, not
 * the kill itself — the actual boss-defeat path in tests must go through a
 * real player-projectile-vs-boss collision, per the Milestone A audit.
 */
export type E2EDebugHooks = {
  debugKillAllEnemies: () => void;
  debugSetBossHp: (hp: number) => void;
  debugApplyPlayerCalorie: (amount: number) => void;
  debugSetFeelSettings: (settings: {
    reducedEffects?: boolean;
    screenShake?: 'full' | 'reduced' | 'off';
  }) => void;
  debugSetCombo: (combo: number) => void;
  debugSaturateVfxCaps: () => void;
  debugPlayDisplayKill: () => void;
};

export type FatE2EBridge = {
  getSnapshot: () => FatE2ESnapshot;
  setSeed: (seed: string) => void;
  debugKillAllEnemies: () => void;
  debugSetBossHp: (hp: number) => void;
  debugApplyPlayerCalorie: (amount: number) => void;
  debugSetFeelSettings: (settings: {
    reducedEffects?: boolean;
    screenShake?: 'full' | 'reduced' | 'off';
  }) => void;
  debugSetCombo: (combo: number) => void;
  debugSaturateVfxCaps: () => void;
  debugPlayDisplayKill: () => void;
};

declare global {
  interface Window {
    __FAT_E2E__?: FatE2EBridge;
  }
}

export const E2E_SEED_REGISTRY_KEY = 'e2e:seedOverride';
const ACTIVE_HOOKS_REGISTRY_KEY = 'e2e:activeGameScene';
const RUN_SNAPSHOT_REGISTRY_KEY = 'e2e:runSnapshot';

export function registerActiveGameSceneHooks(game: Phaser.Game, hooks: E2EDebugHooks | null): void {
  if (import.meta.env.VITE_E2E !== '1') return;
  game.registry.set(ACTIVE_HOOKS_REGISTRY_KEY, hooks);
}

/**
 * The run snapshot is published to the registry (durable across scene
 * transitions) rather than fetched from the live GameScene, so a snapshot
 * taken from ResultScene still reflects the run that just ended instead of
 * going stale the instant GameScene shuts down.
 */
export function publishRunSnapshot(game: Phaser.Game, snapshot: FatE2ERunSnapshot): void {
  if (import.meta.env.VITE_E2E !== '1') return;
  game.registry.set(RUN_SNAPSHOT_REGISTRY_KEY, snapshot);
}

/**
 * Exposes a minimal read-only snapshot plus deterministic test-only commands
 * for Playwright assertions. Only installed when VITE_E2E=1, so production
 * builds never carry it (FI-05 section 15, AC-008).
 */
export function installE2EBridge(game: Phaser.Game): void {
  if (import.meta.env.VITE_E2E !== '1') {
    return;
  }

  const getHooks = (): E2EDebugHooks | undefined =>
    game.registry.get(ACTIVE_HOOKS_REGISTRY_KEY) as E2EDebugHooks | undefined;

  window.__FAT_E2E__ = {
    getSnapshot: () => ({
      sceneKey: (game.registry.get('currentScene') as string | undefined) ?? 'unknown',
      startPressCount: (game.registry.get('startPressCount') as number | undefined) ?? 0,
      run: (game.registry.get(RUN_SNAPSHOT_REGISTRY_KEY) as FatE2ERunSnapshot | undefined) ?? null,
    }),
    setSeed: (seed: string) => {
      game.registry.set(E2E_SEED_REGISTRY_KEY, seed);
    },
    debugKillAllEnemies: () => getHooks()?.debugKillAllEnemies(),
    debugSetBossHp: (hp: number) => getHooks()?.debugSetBossHp(hp),
    debugApplyPlayerCalorie: (amount: number) => getHooks()?.debugApplyPlayerCalorie(amount),
    debugSetFeelSettings: (settings) => getHooks()?.debugSetFeelSettings(settings),
    debugSetCombo: (combo) => getHooks()?.debugSetCombo(combo),
    debugSaturateVfxCaps: () => getHooks()?.debugSaturateVfxCaps(),
    debugPlayDisplayKill: () => getHooks()?.debugPlayDisplayKill(),
  };
}
