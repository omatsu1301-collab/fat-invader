import { GameBalance } from '../config/balance';
import type { PowerUpId } from '../content/powerups';

export type ActivePowerUpTimers = {
  proteinUntilMs: number;
  caffeineUntilMs: number;
  cardioUntilMs: number;
  cheatDayUntilMs: number;
};

export type PowerUpCombatMods = {
  shotDamage: number;
  fireIntervalMs: number;
  moveSpeedMultiplier: number;
  tripleShot: boolean;
  invulnerable: boolean;
};

export function createPowerUpTimers(): ActivePowerUpTimers {
  return {
    proteinUntilMs: 0,
    caffeineUntilMs: 0,
    cardioUntilMs: 0,
    cheatDayUntilMs: 0,
  };
}

function extendTimer(currentUntilMs: number, nowMs: number, addMs: number, maxMs: number): number {
  const base = Math.max(currentUntilMs, nowMs);
  return Math.min(base + addMs, nowMs + maxMs);
}

/** Apply a timed power-up; same-type extension capped at sameTypeMaxMs from now. */
export function applyTimedPowerUp(
  timers: ActivePowerUpTimers,
  id: Exclude<PowerUpId, 'fatBurn'>,
  nowMs: number,
): ActivePowerUpTimers {
  const maxMs = GameBalance.powerup.sameTypeMaxMs;
  const next = { ...timers };
  switch (id) {
    case 'protein':
      next.proteinUntilMs = extendTimer(
        timers.proteinUntilMs,
        nowMs,
        GameBalance.powerup.protein.durationMs,
        maxMs,
      );
      break;
    case 'caffeine':
      next.caffeineUntilMs = extendTimer(
        timers.caffeineUntilMs,
        nowMs,
        GameBalance.powerup.caffeine.durationMs,
        maxMs,
      );
      break;
    case 'cardio':
      next.cardioUntilMs = extendTimer(
        timers.cardioUntilMs,
        nowMs,
        GameBalance.powerup.cardio.durationMs,
        maxMs,
      );
      break;
    case 'cheatDay':
      next.cheatDayUntilMs = extendTimer(
        timers.cheatDayUntilMs,
        nowMs,
        GameBalance.powerup.cheatDay.durationMs,
        maxMs,
      );
      break;
  }
  return next;
}

export function powerUpCombatMods(timers: ActivePowerUpTimers, nowMs: number): PowerUpCombatMods {
  const protein = nowMs < timers.proteinUntilMs;
  const caffeine = nowMs < timers.caffeineUntilMs;
  const cardio = nowMs < timers.cardioUntilMs;
  const cheatDay = nowMs < timers.cheatDayUntilMs;

  return {
    shotDamage: protein ? GameBalance.powerup.protein.damage : GameBalance.player.shotDamage,
    fireIntervalMs: caffeine
      ? GameBalance.powerup.caffeine.fireIntervalMs
      : GameBalance.player.baseFireIntervalMs,
    moveSpeedMultiplier: cardio ? GameBalance.powerup.cardio.speedMultiplier : 1,
    tripleShot: cheatDay,
    invulnerable: cheatDay,
  };
}
