import { describe, expect, it } from 'vitest';
import { createRunRandomSources, SeededRandom } from '../../../src/game/adapters/SeededRandom';
import { GameBalance } from '../../../src/game/config/balance';
import { rollEnemyFireDelayMs, rollFormationPhaseOffset } from '../../../src/game/domain/combat-rng';
import {
  allocateDecorativeCount,
  killFragmentCount,
  killParticleCount,
  muzzleParticleCount,
  scaledShakePx,
  type FeelSettings,
} from '../../../src/game/domain/feel';
import type { RandomSource } from '../../../src/game/ports/Random';

const full: FeelSettings = { reducedEffects: false, screenShake: 'full' };
const reduced: FeelSettings = { reducedEffects: true, screenShake: 'reduced' };
const off: FeelSettings = { reducedEffects: false, screenShake: 'off' };

const FIRE_RATE = GameBalance.enemy.fryScout.fireRateMs;
const FIRE_JITTER = GameBalance.enemy.fryScout.fireIntervalJitterMs;
const PARTICLE_TINT_MAX = 3;

/** Mirrors FeedbackSystem muzzle / kill burst / shake draws. Phaser-free. */
function consumeVfxDraws(random: RandomSource, settings: FeelSettings, shakeFrames: number): void {
  const muzzle = muzzleParticleCount(settings);
  for (let i = 0; i < muzzle; i += 1) {
    random.next();
    random.next();
  }
  const particles = killParticleCount(settings);
  for (let i = 0; i < particles; i += 1) {
    random.next();
    random.next();
    random.nextInt(0, PARTICLE_TINT_MAX);
  }
  const fragments = killFragmentCount(settings, random.next());
  for (let i = 0; i < fragments; i += 1) {
    random.next();
    random.next();
  }
  const shakePx = scaledShakePx(settings, GameBalance.feel.shake.normalKillPx);
  if (shakePx <= 0) return;
  for (let i = 0; i < shakeFrames; i += 1) {
    random.next();
    random.next();
  }
}

function rollWaveThenRefire(random: RandomSource): { spawns: number[]; refire: number } {
  const spawns: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    spawns.push(rollEnemyFireDelayMs(random, FIRE_RATE, FIRE_JITTER));
    rollFormationPhaseOffset(random);
  }
  const refire = rollEnemyFireDelayMs(random, FIRE_RATE, FIRE_JITTER);
  return { spawns, refire };
}

describe('gameplay vs VFX RNG isolation (AC-201/204)', () => {
  it('keeps enemy fire jitter identical after Full / Reduced / Off VFX (AC-201)', () => {
    const seed = 'feel-rng-isolation';
    const profiles: FeelSettings[] = [full, reduced, off];
    const results = profiles.map((settings) => {
      const { gameplayRandom, vfxRandom } = createRunRandomSources(seed);
      const before = rollWaveThenRefire(gameplayRandom);
      for (let i = 0; i < 12; i += 1) consumeVfxDraws(vfxRandom, settings, 8);
      const afterVfxRefire = rollEnemyFireDelayMs(gameplayRandom, FIRE_RATE, FIRE_JITTER);
      return { ...before, afterVfxRefire };
    });

    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toEqual(results[2]);
    expect(killParticleCount(full)).toBeGreaterThan(killParticleCount(reduced));
    expect(scaledShakePx(off, GameBalance.feel.shake.normalKillPx)).toBe(0);
  });

  it('documents that a shared stream would fork fire jitter across feel settings', () => {
    const seed = 'shared-stream-bug';
    const forked = [full, reduced, off].map((settings) => {
      const shared = new SeededRandom(seed);
      rollWaveThenRefire(shared);
      for (let i = 0; i < 12; i += 1) consumeVfxDraws(shared, settings, 8);
      return rollEnemyFireDelayMs(shared, FIRE_RATE, FIRE_JITTER);
    });
    expect(forked[0]).not.toBe(forked[1]);
    expect(forked[0]).not.toBe(forked[2]);
  });

  it('still rolls a live enemy fire delay after decorative cap refusal (AC-204)', () => {
    expect(
      allocateDecorativeCount(
        killParticleCount(full),
        GameBalance.pools.particle,
        GameBalance.pools.particle,
      ),
    ).toBe(0);
    const { gameplayRandom } = createRunRandomSources('cap-does-not-block-fire');
    const delay = rollEnemyFireDelayMs(gameplayRandom, FIRE_RATE, FIRE_JITTER);
    expect(delay).toBeGreaterThanOrEqual(FIRE_RATE);
    expect(delay).toBeLessThanOrEqual(FIRE_RATE + FIRE_JITTER);
    expect(GameBalance.pools.enemyProjectile).toBeGreaterThan(0);
  });
});
