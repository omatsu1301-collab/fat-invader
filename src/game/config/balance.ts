/**
 * FI-05 section 8: every tunable number lives here so no magic numbers are
 * scattered across scenes/entities/systems. Full Graybox expands Stage 1–3
 * content while preserving locked Game Feel and Stage 1 combat fairness.
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
    donutDrifter: {
      id: 'donutDrifter',
      maxHp: 2,
      score: 180,
      contactCalorie: 20,
      fireRateMs: 1600,
      speedPxPerSec: 70,
      spriteSize: 30,
      fireIntervalJitterMs: 350,
      sineAmplitudePx: 48,
      sinePeriodMs: 1400,
    },
    sodaTank: {
      id: 'sodaTank',
      maxHp: 4,
      score: 320,
      contactCalorie: 22,
      fireRateMs: 2200,
      speedPxPerSec: 28,
      spriteSize: 36,
      fireIntervalJitterMs: 400,
    },
    pizzaCutter: {
      id: 'pizzaCutter',
      maxHp: 2,
      score: 250,
      contactCalorie: 20,
      fireRateMs: 2800,
      speedPxPerSec: 210,
      spriteSize: 30,
      fireIntervalJitterMs: 200,
      telegraphMs: 700,
      chargeDurationMs: 450,
    },
    cakeCaster: {
      id: 'cakeCaster',
      maxHp: 3,
      score: 300,
      contactCalorie: 20,
      fireRateMs: 2400,
      speedPxPerSec: 40,
      spriteSize: 32,
      fireIntervalJitterMs: 300,
      telegraphMs: 650,
    },
  },

  bullet: {
    playerShot: {
      speedPxPerSec: 680,
      damage: 1,
      /** Collision width. Visual canvas is 12×16; body applied as 6×16 @ (3,0). */
      size: 6,
    },
    fry: {
      id: 'fry',
      calorie: 10,
      speedPxPerSec: 190,
      size: 12,
      visualSize: 14,
    },
    donut: {
      id: 'donut',
      calorie: 14,
      speedPxPerSec: 170,
      size: 12,
      visualSize: 16,
      sineAmplitudePx: 36,
      sinePeriodMs: 900,
    },
    pizzaSlice: {
      id: 'pizzaSlice',
      calorie: 18,
      speedPxPerSec: 240,
      size: 12,
      visualSize: 16,
      telegraphMs: 650,
    },
    tapioca: {
      id: 'tapioca',
      calorie: 8,
      speedPxPerSec: 210,
      size: 8,
      visualSize: 10,
      spreadCount: 5,
      spreadDeg: 40,
    },
    cake: {
      id: 'cake',
      calorie: 22,
      speedPxPerSec: 150,
      size: 18,
      visualSize: 22,
    },
    sodaLaser: {
      id: 'sodaLaser',
      calorie: 24,
      speedPxPerSec: 0,
      size: 14,
      visualSize: 18,
      /** Fairness: player must see tell before active beam (AC-320). */
      telegraphMs: 600,
      /** Active hazard lifetime after tell completes. */
      beamDurationMs: 350,
      /** Half-width of the vertical corridor (visual = collision). */
      beamHalfWidthPx: 10,
      /** Top of the continuous hazard below the muzzle. */
      beamSourceOffsetY: 16,
      /**
       * Absolute end Y for tell + hazard (LOGICAL_HEIGHT - bottomInset).
       * Must reach the player movement band.
       */
      beamReachY: 760,
      /** Player movement band Y (LOGICAL_HEIGHT * 0.86) for fairness checks. */
      playerBandY: 726,
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
      rageHpFraction: 0.25,
      phase1: { moveSpeedPxPerSec: 70, fireIntervalMs: 1100, bulletCount: 1, patternId: 'fryStraight' },
      phase2: { moveSpeedPxPerSec: 130, fireIntervalMs: 700, bulletCount: 3, patternId: 'fry3Way' },
      rage: { moveSpeedPxPerSec: 160, fireIntervalMs: 520, bulletCount: 2, patternId: 'fryAlternating' },
      deathDurationMs: 1200,
    },
    pizzaMother: {
      id: 'pizzaMother',
      maxHp: 42,
      contactCalorie: 25,
      spriteWidth: 100,
      spriteHeight: 78,
      introDurationMs: 1000,
      phase2HpFraction: 0.55,
      rageHpFraction: 0.28,
      phase1: { moveSpeedPxPerSec: 80, fireIntervalMs: 1000, bulletCount: 3, patternId: 'pizzaSliceFan' },
      phase2: { moveSpeedPxPerSec: 100, fireIntervalMs: 900, bulletCount: 8, patternId: 'pizzaRadial8' },
      rage: { moveSpeedPxPerSec: 150, fireIntervalMs: 750, bulletCount: 1, patternId: 'pizzaSliceTelegraph' },
      deathDurationMs: 1200,
    },
    kingCalorie: {
      id: 'kingCalorie',
      maxHp: 55,
      contactCalorie: 28,
      spriteWidth: 108,
      spriteHeight: 84,
      introDurationMs: 1100,
      phase2HpFraction: 0.55,
      rageHpFraction: 0.28,
      phase1: { moveSpeedPxPerSec: 90, fireIntervalMs: 950, bulletCount: 2, patternId: 'fryDonutComposite' },
      phase2: { moveSpeedPxPerSec: 110, fireIntervalMs: 850, bulletCount: 5, patternId: 'tapiocaLaserComposite' },
      rage: { moveSpeedPxPerSec: 40, fireIntervalMs: 700, bulletCount: 8, patternId: 'kingCalorieFinale' },
      deathDurationMs: 1400,
    },
  },

  powerup: {
    dropRate: 0.06,
    pityMs: 12_000,
    maxOnScreen: 2,
    sameTypeMaxMs: 12_000,
    protein: { durationMs: 8000, damage: 2 },
    caffeine: { durationMs: 8000, fireIntervalMs: 110 },
    cardio: { durationMs: 8000, speedMultiplier: 1.25 },
    fatBurn: { enemyDamage: 5 },
    cheatDay: { durationMs: 5000, calorieCost: 20 },
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
    stageTransitionHoldMs: 1200,
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
    /**
     * Dedicated soda-laser hazard pool (1 object per beam).
     * Must stay separate from enemyProjectile so normal bullet pressure
     * cannot shorten laser reach.
     */
    sodaLaser: 8,
    normalEnemy: 40,
    scorePopup: 20,
    particle: 320,
    fragment: 48,
    powerup: 4,
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
     * Human Gate 2 follow-up: total FAT OVER hold before Result (locked).
     * Caption is delayed so pose reads first (Full Graybox Human Gate 2026-09-11).
     */
    fatOverHoldMs: 2600,
    /** Pose-only beat inside fatOverHoldMs; caption appears after this delay. */
    fatOverCaptionDelayMs: 1100,
    /** Unchanged STAGE CLEAR → Result hold. */
    clearHoldMs: 1600,
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
