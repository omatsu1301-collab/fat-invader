/**
 * FI-05 section 8: every tunable number lives here so no magic numbers are
 * scattered across scenes/entities/systems. Values are the FI-02 baselines,
 * narrowed to what Milestone A's single stage / single enemy / single
 * simplified boss actually needs.
 */
export const GameBalance = {
  player: {
    startCalorie: 0,
    maxCalorie: 100,
    baseSpeedPxPerSec: 330,
    accelToMaxMs: 90,
    releaseDecelMs: 70,
    baseFireIntervalMs: 180,
    shotDamage: 1,
    hitInvulnerabilityMs: 650,
    maxSimultaneousShots: 24,
    hitboxWidthRatio: 0.6,
    hitboxHeightRatio: 0.7,
    spriteSize: 40,
    overflowingSpeedMultiplier: 0.92,
  },

  combo: {
    windowMs: 2000,
  },

  scoring: {
    stageClearBonusPerStage: 5000,
    bossNoHitBonusPerStage: 3000,
    runClearBonus: 20000,
    caloriePerStageClearDecay: 10,
  },

  evaluation: {
    targetScore: 120_000,
    weights: { clear: 35, combat: 25, avoidance: 20, combo: 10, accuracy: 10 },
    comboNormalizer: 50,
    accuracyNormalizer: 0.7,
  },

  enemy: {
    fryScout: {
      id: 'fryScout',
      maxHp: 1,
      score: 100,
      contactCalorie: 20,
      fireRateMs: 1400,
      speedPxPerSec: 55,
      spriteSize: 28,
      fireIntervalJitterMs: 400,
    },
  },

  bullet: {
    playerShot: {
      speedPxPerSec: 680,
      damage: 1,
      size: 6,
    },
    fry: {
      id: 'fry',
      calorie: 10,
      speedPxPerSec: 190,
      size: 12,
    },
  },

  boss: {
    kingBurgerMini: {
      id: 'kingBurgerMini',
      maxHp: 30,
      contactCalorie: 25,
      spriteWidth: 96,
      spriteHeight: 72,
      introDurationMs: 1000,
      phase2HpFraction: 0.5,
      phase1: { moveSpeedPxPerSec: 70, fireIntervalMs: 1100, bulletCount: 1 },
      phase2: { moveSpeedPxPerSec: 130, fireIntervalMs: 700, bulletCount: 3 },
      deathDurationMs: 1200,
    },
  },

  wave: {
    stage1: {
      formationRows: 2,
      formationCols: 4,
      spawnStaggerMs: 150,
      horizontalStepPxPerSec: 40,
      verticalStepPx: 24,
      verticalStepIntervalMs: 2200,
    },
    bossWarningDurationMs: 900,
  },

  hitStop: {
    normalKillMs: 25,
    playerHitMs: 45,
    bossKillMs: 80,
    frameStopUpperBoundMs: 90,
  },

  pools: {
    playerProjectile: 32,
    enemyProjectile: 220,
    normalEnemy: 40,
    scorePopup: 20,
    particle: 320,
    fragment: 48,
  },

  playfield: {
    topInset: 48,
    bottomInset: 84,
  },

  /**
   * Milestone B Game Feel budgets (FI-04 §8, FI-03 §12). Display-only:
   * changing these must never alter score, damage, CALORIE, Boss HP, or
   * stage progression. Hit-stop duration is applied as a simulation freeze
   * for every settings profile so Reduced / Shake Off keep identical combat.
   */
  feel: {
    flashDurationMs: 32,
    flashAlpha: 0.85,
    flashAlphaReduced: 0.3,
    killParticles: 16,
    killParticlesReduced: 6,
    killFragmentsMin: 2,
    killFragmentsMax: 5,
    particleLifetimeMs: 250,
    fragmentLifetimeMs: 250,
    scorePopupLifetimeMs: 450,
    scorePopupRisePxPerSec: 70,
    muzzleParticles: 3,
    muzzleParticlesReduced: 1,
    comboCalloutDurationMs: 380,
    playerHitVignetteMs: 90,
    /**
     * Boss death is a 3-beat display sequence (Human Gate 2). Timings are
     * display-only; they must not change score, bossesKilled, or STAGE CLEAR
     * bonuses. Normal-kill particle / hit-stop / shake values stay untouched.
     */
    bossDeath: {
      internalCount: 4,
      internalCountReduced: 3,
      internalFirstMs: 220,
      internalGapMs: 170,
      finaleMs: 900,
      blinkPeriodMs: 70,
      impactFlashMs: 90,
      internalParticles: 8,
      internalParticlesReduced: 4,
      internalFragments: 3,
      finaleParticles: 18,
      finaleParticlesReduced: 8,
      finaleFragments: 8,
      finaleFragmentsReduced: 4,
    },
    bossDeathShockwaves: 2,
    shake: {
      normalKillPx: 2.5,
      normalKillMs: 70,
      playerHitPx: 4,
      playerHitMs: 100,
      bossPhasePx: 3,
      bossPhaseMs: 120,
      bossDeathPx: 6,
      bossDeathMs: 250,
      bossDeathInternalPx: 3.5,
      bossDeathInternalMs: 55,
      reducedScale: 0.25,
      comboTierBonusPx: 1.5,
    },
  },
} as const;

export type GameBalanceType = typeof GameBalance;
