import type Phaser from 'phaser';
import { enemies, type EnemyId } from '../content/enemies';
import type { EnemyRuntimeData } from '../entities/Enemy';

export type PendingEnemyHit = {
  sprite: Phaser.Physics.Arcade.Sprite;
  damage: number;
  x: number;
  y: number;
};

export type EnemyHitOutcome = {
  enemyId: EnemyId;
  x: number;
  y: number;
  killed: boolean;
  score: number;
  sprite: Phaser.Physics.Arcade.Sprite;
};

/**
 * FI-03 section 2.4/6.2 + FI-05 section 6.2: physics overlap callbacks only
 * enqueue hits; this function is the single resolution pass, run once per
 * frame after the physics step, so an enemy can never be killed/scored twice
 * from bullets that overlapped it in the same frame (FI-03 section 13).
 */
export function resolveEnemyHits(pending: readonly PendingEnemyHit[]): EnemyHitOutcome[] {
  const outcomes: EnemyHitOutcome[] = [];
  const killedThisFrame = new Set<Phaser.Physics.Arcade.Sprite>();

  for (const hit of pending) {
    if (!hit.sprite.active || killedThisFrame.has(hit.sprite)) continue;

    const runtime = hit.sprite.getData('enemy') as EnemyRuntimeData;
    runtime.hp -= hit.damage;
    const killed = runtime.hp <= 0;
    if (killed) killedThisFrame.add(hit.sprite);

    outcomes.push({
      enemyId: runtime.enemyId,
      x: hit.x,
      y: hit.y,
      killed,
      score: enemies[runtime.enemyId].score,
      sprite: hit.sprite,
    });
  }

  return outcomes;
}

/**
 * Identifies which of two Arcade Physics overlap callback arguments is the
 * known "target" (e.g. the boss sprite, the player sprite) by identity —
 * never by argument position. Root cause of the P1 progression bug: Arcade
 * Physics does not guarantee `overlap(group, singleSprite, cb)` calls `cb`
 * with `(groupMember, singleSprite)` in that order — when one side is a
 * lone GameObject and the other a Group, the callback can receive them in
 * either order. Code that assumed a fixed order (e.g. "argument 1 is always
 * the projectile") could silently deactivate the wrong sprite. This helper
 * makes the discrimination order-independent by construction, so no caller
 * can reintroduce the bug by assuming a position.
 */
export function pickByIdentity<T>(
  a: T,
  b: T,
  isMatch: (candidate: T) => boolean,
): { match: T; other: T } | null {
  if (isMatch(a)) return { match: a, other: b };
  if (isMatch(b)) return { match: b, other: a };
  return null;
}

export type PendingPlayerHit = { calorie: number; source: 'bullet' | 'contact' };

/**
 * Only the first queued hit in a frame lands, and only when the player is
 * not currently invulnerable (FI-02 section 5.3, FI-03 section 6 invariant:
 * "一つのEnemy bulletからPlayer hitは最大一度", extended here to any single
 * frame so simultaneous overlaps never stack CALORIE).
 */
export function resolveFirstPlayerHit(
  pending: readonly PendingPlayerHit[],
  isCurrentlyInvulnerable: boolean,
): PendingPlayerHit | null {
  if (isCurrentlyInvulnerable || pending.length === 0) return null;
  return pending[0]!;
}
