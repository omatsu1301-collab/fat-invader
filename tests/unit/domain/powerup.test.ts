import { describe, expect, it } from 'vitest';
import { GameBalance } from '../../../src/game/config/balance';
import {
  applyTimedPowerUp,
  createPowerUpTimers,
  powerUpCombatMods,
} from '../../../src/game/domain/powerup';

describe('power-up domain (AC-304)', () => {
  it('applies PROTEIN / CAFFEINE / CARDIO / CHEAT DAY combat mods', () => {
    let timers = createPowerUpTimers();
    const now = 1000;
    timers = applyTimedPowerUp(timers, 'protein', now);
    timers = applyTimedPowerUp(timers, 'caffeine', now);
    timers = applyTimedPowerUp(timers, 'cardio', now);
    timers = applyTimedPowerUp(timers, 'cheatDay', now);

    const mods = powerUpCombatMods(timers, now + 100);
    expect(mods.shotDamage).toBe(GameBalance.powerup.protein.damage);
    expect(mods.fireIntervalMs).toBe(GameBalance.powerup.caffeine.fireIntervalMs);
    expect(mods.moveSpeedMultiplier).toBe(GameBalance.powerup.cardio.speedMultiplier);
    expect(mods.tripleShot).toBe(true);
    expect(mods.invulnerable).toBe(true);
  });

  it('expires timed mods and restores baseline', () => {
    let timers = createPowerUpTimers();
    timers = applyTimedPowerUp(timers, 'protein', 0);
    const active = powerUpCombatMods(timers, GameBalance.powerup.protein.durationMs - 1);
    expect(active.shotDamage).toBe(2);
    const expired = powerUpCombatMods(timers, GameBalance.powerup.protein.durationMs + 1);
    expect(expired.shotDamage).toBe(GameBalance.player.shotDamage);
    expect(expired.tripleShot).toBe(false);
    expect(expired.invulnerable).toBe(false);
  });

  it('caps same-type extension at sameTypeMaxMs from now', () => {
    let timers = createPowerUpTimers();
    timers = applyTimedPowerUp(timers, 'protein', 0);
    timers = applyTimedPowerUp(timers, 'protein', 1000);
    timers = applyTimedPowerUp(timers, 'protein', 2000);
    expect(timers.proteinUntilMs).toBeLessThanOrEqual(2000 + GameBalance.powerup.sameTypeMaxMs);
  });
});
