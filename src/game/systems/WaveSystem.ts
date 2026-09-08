import type { SpawnCommand, WaveDefinition } from '../content/waves';

/**
 * FI-03 section 9: wave completion is checked once per frame, and no new
 * spawn command executes after completion. Framework-free so it is
 * unit-testable without a live Phaser scene.
 */
export class WaveSystem {
  private readonly wave: WaveDefinition;
  private readonly startedAtMs: number;
  private spawnedCount = 0;
  private completed = false;

  constructor(wave: WaveDefinition, startedAtMs: number) {
    this.wave = wave;
    this.startedAtMs = startedAtMs;
  }

  /** Returns spawn commands whose time has come, in order, without repeats. */
  collectDueSpawns(nowMs: number): SpawnCommand[] {
    if (this.completed) return [];
    const elapsed = nowMs - this.startedAtMs;
    const due: SpawnCommand[] = [];
    while (
      this.spawnedCount < this.wave.spawns.length &&
      this.wave.spawns[this.spawnedCount]!.atMs <= elapsed
    ) {
      due.push(this.wave.spawns[this.spawnedCount]!);
      this.spawnedCount += 1;
    }
    return due;
  }

  allSpawned(): boolean {
    return this.spawnedCount >= this.wave.spawns.length;
  }

  /** Call once per frame with the current live enemy count. */
  checkCompletion(activeEnemyCount: number): boolean {
    if (this.completed) return true;
    if (this.wave.completion === 'ALL_DEFEATED' && this.allSpawned() && activeEnemyCount === 0) {
      this.completed = true;
    }
    return this.completed;
  }

  isCompleted(): boolean {
    return this.completed;
  }
}
