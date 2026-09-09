import { describe, expect, it } from 'vitest';
import { GameBalance } from '../../../src/game/config/balance';
import { applyGameEvent, createRunState, freshComboState } from '../../../src/game/domain/run-state';
import {
  allocateDecorativeCount,
  bossDeathBeatAt,
  bossDeathHidesSprite,
  bossDeathInternalCount,
  comboTierCalloutAt,
  flashAlpha,
  killParticleCount,
  scaledShakePx,
  stackHitStopMs,
  stackShakePx,
  type FeelSettings,
} from '../../../src/game/domain/feel';

const full: FeelSettings = { reducedEffects: false, screenShake: 'full' };
const reduced: FeelSettings = { reducedEffects: true, screenShake: 'full' };
const shakeOff: FeelSettings = { reducedEffects: false, screenShake: 'off' };

function killCtx() {
  return { nowMs: 0, comboWindowMs: 2000, comboState: freshComboState() };
}

describe('feel budgets (AC-201/204/211/212)', () => {
  it('never lets decorative spawns exceed the cap (AC-204)', () => {
    expect(allocateDecorativeCount(16, 310, 320)).toBe(10);
    expect(allocateDecorativeCount(16, 320, 320)).toBe(0);
    expect(allocateDecorativeCount(40 * 16, 0, GameBalance.pools.particle)).toBe(
      GameBalance.pools.particle,
    );
  });

  it('reduces particle and flash intensity under Reduced Effects (AC-211)', () => {
    expect(killParticleCount(reduced)).toBeLessThan(killParticleCount(full));
    expect(flashAlpha(reduced)).toBeLessThan(flashAlpha(full));
  });

  it('zeros shake when Shake Off, and scales it when reduced (AC-212)', () => {
    expect(scaledShakePx(shakeOff, 4)).toBe(0);
    expect(scaledShakePx(reduced, 4)).toBe(4 * GameBalance.feel.shake.reducedScale);
    expect(scaledShakePx(full, 4)).toBe(4);
  });

  it('clamps simultaneous shake and hit-stop instead of summing', () => {
    expect(stackShakePx(2.5, 2.5)).toBe(2.5);
    expect(stackShakePx(2.5, 4)).toBe(4);
    expect(stackHitStopMs(25, 25, 90)).toBe(25);
    expect(stackHitStopMs(25, 80, 90)).toBe(80);
    expect(stackHitStopMs(80, 45, 90)).toBe(80);
    expect(stackHitStopMs(80, 80, 90)).toBeLessThanOrEqual(90);
  });

  it('keeps combo callouts within the 400ms cover budget (AC-214)', () => {
    expect(GameBalance.feel.comboCalloutDurationMs).toBeLessThanOrEqual(400);
    expect(comboTierCalloutAt(5)).toBe('WARM UP');
    expect(comboTierCalloutAt(6)).toBeNull();
    expect(comboTierCalloutAt(25)).toBe('SHREDDED');
    expect(comboTierCalloutAt(50)).toBe('ABSURDLY LEAN');
  });

  it('does not change kill score when feel settings differ (AC-201)', () => {
    const event = {
      type: 'ENEMY_KILLED' as const,
      enemyId: 'fryScout',
      score: 100,
      combo: 1,
      x: 0,
      y: 0,
    };
    const a = applyGameEvent(createRunState('seed', 0), event, killCtx());
    const b = applyGameEvent(createRunState('seed', 0), event, killCtx());
    expect(a.runState.score).toBe(b.runState.score);
    expect(a.runState.score).toBe(100);
    expect(killParticleCount(full)).not.toBe(killParticleCount(reduced));
  });

  it('keeps adopted normal-kill budgets unchanged (Gate 2 non-change)', () => {
    expect(GameBalance.feel.killParticles).toBe(16);
    expect(GameBalance.feel.killParticlesReduced).toBe(6);
    expect(GameBalance.hitStop.normalKillMs).toBe(25);
    expect(GameBalance.feel.shake.normalKillPx).toBe(2.5);
    expect(GameBalance.feel.shake.normalKillMs).toBe(70);
  });

  it('maps boss death elapsed time into impact → internal → finale within 1.0–1.3s', () => {
    const { internalFirstMs, finaleMs } = GameBalance.feel.bossDeath;
    const duration = GameBalance.boss.kingBurgerMini.deathDurationMs;
    expect(duration).toBeGreaterThanOrEqual(1000);
    expect(duration).toBeLessThanOrEqual(1300);
    expect(finaleMs).toBeLessThan(duration);
    expect(bossDeathBeatAt(0)).toBe('impact');
    expect(bossDeathBeatAt(internalFirstMs - 1)).toBe('impact');
    expect(bossDeathBeatAt(internalFirstMs)).toBe('internal');
    expect(bossDeathBeatAt(finaleMs - 1)).toBe('internal');
    expect(bossDeathBeatAt(finaleMs)).toBe('finale');
    expect(bossDeathHidesSprite(finaleMs - 1)).toBe(false);
    expect(bossDeathHidesSprite(finaleMs)).toBe(true);
    expect(bossDeathInternalCount(full)).toBeGreaterThanOrEqual(3);
    expect(bossDeathInternalCount(full)).toBeLessThanOrEqual(4);
    expect(bossDeathInternalCount(reduced)).toBe(3);
  });
});
