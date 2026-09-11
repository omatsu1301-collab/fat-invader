import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config';
import { GameBalance } from '../config/balance';
import { applyCalorie, calorieTier, CALORIE_MAX } from '../domain/calorie';
import { comboCallout, setFrozen, tickExpiry } from '../domain/combo';
import type { ComboState } from '../domain/combo';
import { GameEventBus, type GameEvent } from '../domain/events';
import { accuracy, applyGameEvent, createRunState, freshComboState } from '../domain/run-state';
import type { RunEndReason, RunState } from '../domain/run-state';
import { evaluateRun } from '../domain/evaluation';
import { stageClearBonus, bossNoHitBonus } from '../domain/scoring';
import {
  applyTimedPowerUp,
  createPowerUpTimers,
  powerUpCombatMods,
  type ActivePowerUpTimers,
} from '../domain/powerup';
import { PhaserClock } from '../adapters/PhaserClock';
import { SeededRandom, createRunRandomSources, generateRuntimeSeed } from '../adapters/SeededRandom';
import { rollEnemyFireDelayMs } from '../domain/combat-rng';
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter';
import { loadSaveData, recordScoreAndRank } from '../systems/PersistenceSystem';
import { InputSystem } from '../systems/InputSystem';
import { pickByIdentity, resolveEnemyHits, resolveFirstPlayerHit } from '../systems/CombatSystem';
import type { PendingEnemyHit, PendingPlayerHit } from '../systems/CombatSystem';
import type { ProjectilePayload } from '../entities/Projectile';
import { WaveSystem } from '../systems/WaveSystem';
import { activePhaseConfig, applyBossDamage, completeBossIntro } from '../systems/BossSystem';
import { firePattern } from '../systems/PatternSystem';
import { FeedbackSystem } from '../systems/FeedbackSystem';
import { DisplayDepth } from '../config/display';
import { DEFAULT_FEEL_SETTINGS, bossDeathBeatAt, type FeelSettings } from '../domain/feel';
import { ensurePlaceholderTextures, TextureKey } from '../entities/textures';
import {
  applyFatOverPose,
  applyHitFlash,
  createPlayer,
  displayScaleForTier,
  isInvulnerable,
  setAppearanceTint,
  updatePlayerMovement,
} from '../entities/Player';
import type { PlayerHandle } from '../entities/Player';
import { deactivateEnemy, spawnEnemy, updateEnemyMovement } from '../entities/Enemy';
import type { EnemyRuntimeData } from '../entities/Enemy';
import {
  deactivateProjectile,
  despawnOffscreen,
  fireProjectile,
  updateSineProjectiles,
} from '../entities/Projectile';
import {
  disableBossHitbox,
  playBossHitFlash,
  spawnBoss,
  updateBossDeathPresentation,
  updateBossMovement,
} from '../entities/Boss';
import type { BossHandle } from '../entities/Boss';
import { deactivatePowerUp, spawnPowerUp } from '../entities/PowerUp';
import type { PowerUpRuntimeData } from '../entities/PowerUp';
import { waves, type WaveId } from '../content/waves';
import { enemies as enemyContent } from '../content/enemies';
import { bosses } from '../content/bosses';
import { stageByIndex, TOTAL_STAGES, type StageDefinition } from '../content/stages';
import { POWERUP_IDS, type PowerUpId } from '../content/powerups';
import {
  E2E_SEED_REGISTRY_KEY,
  publishRunSnapshot,
  registerActiveGameSceneHooks,
} from '../../test-support/e2e-bridge';
import type { E2EDebugHooks, FatE2ERunSnapshot } from '../../test-support/e2e-bridge';
import { AudioSystem } from '../systems/AudioSystem';

type Phase =
  | 'stageIntro'
  | 'wave'
  | 'bossWarning'
  | 'bossIntro'
  | 'bossActive'
  | 'bossDeath'
  | 'stageClear'
  | 'stageTransition'
  | 'ended';

const PLAYFIELD_BOTTOM = LOGICAL_HEIGHT - GameBalance.playfield.bottomInset;
const PLAYER_Y = LOGICAL_HEIGHT * 0.86;
const PLAYER_MARGIN = 24;

const COLOR_MILK_CREAM = '#FFF0D2';
const COLOR_UI_MUTED = '#9D93B5';
const COLOR_BURN_LIME = '#B9FF4A';

export class GameScene extends Phaser.Scene {
  private clock = new PhaserClock();
  private gameplayRandom!: SeededRandom;
  private vfxRandom!: SeededRandom;
  private storage = new LocalStorageAdapter();
  private eventBus = new GameEventBus();
  private inputSystem!: InputSystem;
  private audio: AudioSystem | null = null;

  private runState!: RunState;
  private comboState: ComboState = freshComboState();
  private powerUpTimers: ActivePowerUpTimers = createPowerUpTimers();

  private player!: PlayerHandle;
  private enemiesGroup!: Phaser.Physics.Arcade.Group;
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private powerUpsGroup!: Phaser.Physics.Arcade.Group;
  private boss: BossHandle | null = null;
  private waveSystem: WaveSystem | null = null;

  private phase: Phase = 'stageIntro';
  private phaseStartedAtMs = 0;
  private paused = false;
  private bossFightNoHit = true;
  private waveIndexInStage = 0;
  private lastPowerUpGrantedAtMs = 0;
  private bossShotIndex = 0;
  private activeTells: Phaser.GameObjects.GameObject[] = [];

  private pendingEnemyHits: PendingEnemyHit[] = [];
  private pendingPlayerHits: PendingPlayerHit[] = [];
  private pendingBossHits: number[] = [];

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private calorieLabel!: Phaser.GameObjects.Text;
  private calorieBarFill!: Phaser.GameObjects.Rectangle;
  private bossHpLabel!: Phaser.GameObjects.Text;
  private bossHpBarBg!: Phaser.GameObjects.Rectangle;
  private bossHpBarFill!: Phaser.GameObjects.Rectangle;
  private captionText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private pauseButton!: Phaser.GameObjects.Text;
  private feedback!: FeedbackSystem;
  private feelSettings: FeelSettings = DEFAULT_FEEL_SETTINGS;
  private fatOverPoseApplied = false;
  private runEndedCount = 0;

  private readonly onVisibilityChange = (): void => {
    if (document.hidden && !this.paused && this.phase !== 'ended') {
      this.togglePause();
    }
  };

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.registry.set('currentScene', 'GameScene');

    const seedOverride = this.registry.get(E2E_SEED_REGISTRY_KEY) as string | undefined;
    const seed = seedOverride ?? generateRuntimeSeed();
    const rng = createRunRandomSources(seed);
    this.gameplayRandom = rng.gameplayRandom;
    this.vfxRandom = rng.vfxRandom;
    this.runState = createRunState(seed, 0);
    this.comboState = setFrozen(freshComboState(), true, 0);
    this.powerUpTimers = createPowerUpTimers();
    this.phase = 'stageIntro';
    this.phaseStartedAtMs = 0;
    this.paused = false;
    this.bossFightNoHit = true;
    this.waveIndexInStage = 0;
    this.lastPowerUpGrantedAtMs = 0;
    this.bossShotIndex = 0;
    this.boss = null;
    this.waveSystem = null;
    this.pendingEnemyHits = [];
    this.pendingPlayerHits = [];
    this.pendingBossHits = [];
    this.activeTells = [];
    this.feelSettings = toFeelSettings(loadSaveData(this.storage).settings);
    this.fatOverPoseApplied = false;
    this.runEndedCount = 0;

    ensurePlaceholderTextures(this);
    this.cameras.main.setBackgroundColor('#090615');

    this.player = createPlayer(
      this,
      LOGICAL_WIDTH / 2,
      PLAYER_Y,
      PLAYER_MARGIN,
      LOGICAL_WIDTH - PLAYER_MARGIN,
    );

    this.enemiesGroup = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: GameBalance.pools.normalEnemy,
      runChildUpdate: false,
    });
    this.playerProjectiles = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: GameBalance.pools.playerProjectile,
      runChildUpdate: false,
    });
    this.enemyProjectiles = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: GameBalance.pools.enemyProjectile,
      runChildUpdate: false,
    });
    this.powerUpsGroup = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: GameBalance.pools.powerup,
      runChildUpdate: false,
    });

    this.physics.add.overlap(
      this.playerProjectiles,
      this.enemiesGroup,
      (proj, enemy) => this.onPlayerProjectileHitsEnemy(proj, enemy),
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.enemyProjectiles,
      this.player.sprite,
      (a, b) => this.onEnemyProjectileHitsPlayer(a, b),
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.enemiesGroup,
      this.player.sprite,
      (a, b) => this.onEnemyContactsPlayer(a, b),
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.powerUpsGroup,
      this.player.sprite,
      (a, b) => this.onPowerUpCollected(a, b),
      undefined,
      this,
    );

    this.inputSystem = new InputSystem(this, isMobileViewport());
    this.audio = new AudioSystem(loadSaveData(this.storage).settings);
    this.audio.unlockOnGesture(this);

    this.feedback = new FeedbackSystem(
      this,
      this.feelSettings,
      this.vfxRandom,
      this.eventBus,
      () => ({ x: this.player.sprite.x, y: this.player.sprite.y }),
      () => (this.boss ? { x: this.boss.sprite.x, y: this.boss.sprite.y } : null),
    );

    this.buildHud();
    this.lockHudToCamera();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    registerActiveGameSceneHooks(this.game, this.buildDebugHooks());

    this.showStageIntroCaption();
  }

  private currentStage(): StageDefinition {
    return stageByIndex(this.runState.stageIndex) ?? stageByIndex(0)!;
  }

  private showStageIntroCaption(): void {
    const stage = this.currentStage();
    this.showCaption(`STAGE ${stage.index + 1} — ${stage.name}`);
  }

  private buildHud(): void {
    this.scoreText = this.add
      .text(16, 12, 'SCORE 0', { fontFamily: 'monospace', fontSize: '16px', color: COLOR_MILK_CREAM })
      .setDepth(DisplayDepth.hud);

    this.comboText = this.add
      .text(LOGICAL_WIDTH / 2, 12, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLOR_BURN_LIME,
      })
      .setOrigin(0.5, 0)
      .setDepth(DisplayDepth.hud);

    this.calorieLabel = this.add
      .text(16, 34, 'CALORIE 0', { fontFamily: 'monospace', fontSize: '12px', color: COLOR_UI_MUTED })
      .setDepth(DisplayDepth.hud);

    this.add
      .rectangle(16, 30 + 22, 140, 8, 0x21102f)
      .setOrigin(0, 0.5)
      .setDepth(DisplayDepth.hud)
      .setScrollFactor(0);
    this.calorieBarFill = this.add
      .rectangle(16, 30 + 22, 0, 8, 0x53f6ff)
      .setOrigin(0, 0.5)
      .setDepth(DisplayDepth.hud);

    const bossBarWidth = 220;
    this.bossHpLabel = this.add
      .text(LOGICAL_WIDTH / 2, 46, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: COLOR_UI_MUTED,
      })
      .setOrigin(0.5)
      .setDepth(DisplayDepth.hud)
      .setVisible(false);
    this.bossHpBarBg = this.add
      .rectangle(LOGICAL_WIDTH / 2, 60, bossBarWidth, 8, 0x21102f)
      .setOrigin(0.5, 0.5)
      .setDepth(DisplayDepth.hud)
      .setVisible(false);
    this.bossHpBarFill = this.add
      .rectangle(LOGICAL_WIDTH / 2 - bossBarWidth / 2, 60, bossBarWidth, 8, 0xff4f64)
      .setOrigin(0, 0.5)
      .setDepth(DisplayDepth.hud + 1)
      .setVisible(false);

    this.pauseButton = this.add
      .text(LOGICAL_WIDTH - 20, 14, '❚❚', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: COLOR_MILK_CREAM,
      })
      .setOrigin(1, 0)
      .setDepth(DisplayDepth.hud)
      .setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerdown', () => this.togglePause());

    this.captionText = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.4, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: COLOR_MILK_CREAM,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DisplayDepth.caption);

    this.pauseOverlay = this.add.container(0, 0).setDepth(DisplayDepth.pause).setVisible(false);
    const overlayBg = this.add
      .rectangle(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x090615, 0.7)
      .setOrigin(0, 0);
    const overlayText = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 'PAUSED\nESC / P / TAP TO RESUME', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: COLOR_MILK_CREAM,
        align: 'center',
      })
      .setOrigin(0.5);
    this.pauseOverlay.add([overlayBg, overlayText]);
    this.pauseOverlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    this.pauseOverlay.on('pointerdown', () => this.togglePause());
  }

  private showCaption(text: string): void {
    this.captionText.setText(text).setVisible(true);
  }

  private hideCaption(): void {
    this.captionText.setVisible(false);
  }

  private lockHudToCamera(): void {
    const hud = [
      this.scoreText,
      this.comboText,
      this.calorieLabel,
      this.calorieBarFill,
      this.bossHpLabel,
      this.bossHpBarBg,
      this.bossHpBarFill,
      this.pauseButton,
      this.captionText,
      this.pauseOverlay,
    ];
    for (const obj of hud) {
      obj.setScrollFactor(0);
    }
  }

  update(_time: number, deltaMs: number): void {
    const intent = this.inputSystem.poll();
    if (intent.pauseRequested) {
      this.togglePause();
    }

    const simRunning = !this.paused && !document.hidden && this.phase !== 'ended';
    const displayRunning = !this.paused && !document.hidden;
    this.feedback.tick(Math.min(Math.max(deltaMs, 0), 50), displayRunning);

    if (this.phase === 'bossDeath' && this.boss) {
      updateBossDeathPresentation(this.boss, this.feedback.bossDeathElapsedMs() ?? 0);
    }

    const hitStopped = this.feedback.isHitStopped();
    this.clock.tick(deltaMs, simRunning && !hitStopped);
    this.updateHud();
    this.updateBossHpBar();
    publishRunSnapshot(this.game, this.buildSnapshot());

    if (!simRunning || hitStopped) return;

    const nowMs = this.clock.nowMs();
    const dt = this.clock.lastDeltaMs();

    this.comboState = tickExpiry(this.comboState, nowMs);

    const tier = calorieTier(this.runState.calorie);
    const mods = powerUpCombatMods(this.powerUpTimers, nowMs);
    const speedMultiplier =
      (tier === 'overflowing' ? GameBalance.player.overflowingSpeedMultiplier : 1) *
      mods.moveSpeedMultiplier;
    updatePlayerMovement(this.player, intent, dt, speedMultiplier);
    setAppearanceTint(this.player, tier);
    if (!this.fatOverPoseApplied) {
      const scale = displayScaleForTier(tier);
      this.player.sprite.setScale(scale);
    }

    if (intent.firing && nowMs >= this.player.nextFireAtMs) {
      this.firePlayerShot(nowMs);
    }

    despawnOffscreen(this.playerProjectiles, LOGICAL_HEIGHT);
    despawnOffscreen(this.enemyProjectiles, LOGICAL_HEIGHT, (sprite) => {
      const payload = sprite.getData('payload') as { calorie: number } | undefined;
      if (payload) {
        this.applyEvent({ type: 'BULLET_DODGED', calorie: payload.calorie });
      }
    });
    for (const child of this.powerUpsGroup.children) {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) continue;
      if (sprite.y > LOGICAL_HEIGHT + 32 || sprite.y < -32) {
        deactivatePowerUp(sprite);
      }
    }

    updateSineProjectiles(this.enemyProjectiles, nowMs);

    switch (this.phase) {
      case 'stageIntro':
        if (nowMs - this.phaseStartedAtMs >= 1400) {
          this.enterPhase('wave', nowMs);
        }
        break;
      case 'wave':
        this.updateWave(nowMs);
        break;
      case 'bossWarning':
        if (nowMs - this.phaseStartedAtMs >= GameBalance.wave.bossWarningDurationMs) {
          this.startBossIntro(nowMs);
        }
        break;
      case 'bossIntro':
        this.updateBossPatrol(dt);
        if (this.boss) {
          const introMs = bosses[this.boss.bossId].introDurationMs;
          if (nowMs - this.phaseStartedAtMs >= introMs) {
            this.finishBossIntro(nowMs);
          }
        }
        break;
      case 'bossActive':
        this.updateBossActive(nowMs, dt);
        break;
      case 'bossDeath':
        if (this.boss) {
          const deathMs = bosses[this.boss.bossId].deathDurationMs;
          if (nowMs - this.phaseStartedAtMs >= deathMs) {
            this.enterPhase('stageClear', nowMs);
          }
        }
        break;
      case 'stageClear':
        if (nowMs - this.phaseStartedAtMs >= 800) {
          if (this.runState.stageIndex < TOTAL_STAGES && !this.runState.endReason) {
            this.enterPhase('stageTransition', nowMs);
          }
        }
        break;
      case 'stageTransition':
        if (nowMs - this.phaseStartedAtMs >= GameBalance.wave.stageTransitionHoldMs) {
          this.beginNextStageIntro(nowMs);
        }
        break;
      case 'ended':
        break;
    }

    this.resolveCombat(nowMs);
  }

  private enterPhase(phase: Phase, nowMs: number): void {
    this.phase = phase;
    this.phaseStartedAtMs = nowMs;

    if (phase === 'wave') {
      this.hideCaption();
      this.comboState = setFrozen(this.comboState, false, nowMs);
      this.startCurrentWave(nowMs);
    } else if (phase === 'bossWarning') {
      this.comboState = setFrozen(this.comboState, true, nowMs);
      this.showCaption('WARNING\n巨大な誘惑が接近中');
    } else if (phase === 'stageClear') {
      this.handleStageClear();
    } else if (phase === 'stageTransition') {
      this.showCaption('NEXT STAGE');
    }
  }

  private startCurrentWave(nowMs: number): void {
    const stage = this.currentStage();
    const waveId = stage.waveIds[this.waveIndexInStage] as WaveId | undefined;
    if (!waveId) {
      this.enterPhase('bossWarning', nowMs);
      return;
    }
    this.waveSystem = new WaveSystem(waves[waveId], nowMs);
  }

  private updateWave(nowMs: number): void {
    if (!this.waveSystem) return;
    const due = this.waveSystem.collectDueSpawns(nowMs);
    for (const cmd of due) {
      const spacingX = 90;
      const x = 60 + cmd.gridX * spacingX;
      const y = 110 + cmd.gridY * 60;
      spawnEnemy(
        this.enemiesGroup,
        cmd.enemyId,
        x,
        y,
        nowMs,
        this.gameplayRandom,
        cmd.firePatternOverride,
      );
    }

    const descentPxPerSec =
      GameBalance.wave.stage1.verticalStepPx / (GameBalance.wave.stage1.verticalStepIntervalMs / 1000);
    for (const child of this.enemiesGroup.children) {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) continue;
      updateEnemyMovement(sprite, nowMs, descentPxPerSec);
      this.updateEnemyFire(sprite, nowMs);
      if (sprite.y > PLAYFIELD_BOTTOM) {
        this.despawnEnemyOffscreen(sprite);
      }
    }

    const activeCount = this.countActiveEnemies();
    if (this.waveSystem.checkCompletion(activeCount)) {
      this.onWaveCompleted(nowMs);
    }
  }

  private onWaveCompleted(nowMs: number): void {
    const stage = this.currentStage();
    const waveId = stage.waveIds[this.waveIndexInStage];
    if (waveId) {
      this.applyEvent({ type: 'WAVE_COMPLETED', waveId });
    }
    this.waveIndexInStage += 1;
    if (this.waveIndexInStage >= stage.waveIds.length) {
      this.enterPhase('bossWarning', nowMs);
    } else {
      this.startCurrentWave(nowMs);
    }
  }

  private countActiveEnemies(): number {
    return countActive(this.enemiesGroup);
  }

  private updateEnemyFire(sprite: Phaser.Physics.Arcade.Sprite, nowMs: number): void {
    const runtime = sprite.getData('enemy') as EnemyRuntimeData;
    if (nowMs < runtime.nextFireAtMs) return;
    const def = enemyContent[runtime.enemyId];
    const patternId = runtime.firePattern;
    firePattern({
      group: this.enemyProjectiles,
      x: sprite.x,
      y: sprite.y + 16,
      patternId,
      shotIndex: runtime.shotIndex,
      playerX: this.player.sprite.x,
      scheduleTelegraph: (delayMs, fire) => {
        this.scheduleTelegraphFire(delayMs, fire, () => sprite.active && this.phase === 'wave');
      },
      showTell: (kind, x, y, meta) => this.showTellGraphics(kind, x, y, meta),
    });
    runtime.shotIndex += 1;
    const delay = rollEnemyFireDelayMs(this.gameplayRandom, def.fireRateMs, def.fireIntervalJitterMs);
    runtime.lastFireDelayMs = delay;
    runtime.nextFireAtMs = nowMs + delay;
  }

  private scheduleTelegraphFire(
    delayMs: number,
    fire: () => void,
    stillValid: () => boolean,
  ): void {
    this.time.delayedCall(delayMs, () => {
      if (this.phase !== 'wave' && this.phase !== 'bossActive') return;
      if (!stillValid()) return;
      fire();
    });
  }

  private showTellGraphics(
    kind: 'diagonal' | 'laser' | 'cast',
    x: number,
    y: number,
    meta?: number,
  ): void {
    let obj: Phaser.GameObjects.GameObject;
    if (kind === 'laser') {
      obj = this.add
        .rectangle(x, y + 120, 10, 240, 0xff6b6b, 0.35)
        .setDepth(DisplayDepth.caption - 1);
    } else if (kind === 'diagonal') {
      const dir = meta ?? 1;
      const line = this.add.graphics().setDepth(DisplayDepth.caption - 1);
      line.lineStyle(2, 0xffb33d, 0.7);
      line.beginPath();
      line.moveTo(x, y);
      line.lineTo(x + dir * 80, y + 140);
      line.strokePath();
      obj = line;
    } else {
      obj = this.add
        .rectangle(x, y + 20, 28, 28, 0xff71c8, 0.4)
        .setDepth(DisplayDepth.caption - 1);
    }
    this.activeTells.push(obj);
    this.time.delayedCall(650, () => {
      obj.destroy();
      this.activeTells = this.activeTells.filter((t) => t !== obj);
    });
  }

  private despawnEnemyOffscreen(sprite: Phaser.Physics.Arcade.Sprite): void {
    deactivateEnemy(sprite);
  }

  private startBossIntro(nowMs: number): void {
    this.phase = 'bossIntro';
    this.phaseStartedAtMs = nowMs;
    this.hideCaption();
    for (const child of this.enemyProjectiles.children) {
      deactivateProjectile(child as Phaser.Physics.Arcade.Sprite);
    }
    this.clearTells();
    this.bossFightNoHit = true;
    this.bossShotIndex = 0;
    const stage = this.currentStage();
    const bossId = stage.bossId;
    this.boss = spawnBoss(this, bossId, LOGICAL_WIDTH / 2, 130, nowMs);
    this.bossHpLabel.setText(bosses[bossId].displayName);
    this.physics.add.overlap(
      this.playerProjectiles,
      this.boss.sprite,
      (proj, boss) => this.onPlayerProjectileHitsBoss(proj, boss),
      undefined,
      this,
    );
    this.showCaption(bosses[bossId].displayName);
  }

  private updateBossPatrol(dt: number): void {
    if (!this.boss) return;
    updateBossMovement(
      this.boss,
      dt,
      bosses[this.boss.bossId].phase1.moveSpeedPxPerSec,
      PLAYER_MARGIN + 20,
      LOGICAL_WIDTH - PLAYER_MARGIN - 20,
    );
  }

  private finishBossIntro(nowMs: number): void {
    if (!this.boss) return;
    this.hideCaption();
    this.boss.state = completeBossIntro(this.boss.state);
    this.phase = 'bossActive';
    this.phaseStartedAtMs = nowMs;
    this.comboState = setFrozen(this.comboState, false, nowMs);
    this.boss.nextFireAtMs = nowMs + 500;
  }

  private updateBossActive(nowMs: number, dt: number): void {
    if (!this.boss) return;
    const cfg = activePhaseConfig(this.boss.bossId, this.boss.state);
    updateBossMovement(
      this.boss,
      dt,
      cfg.moveSpeedPxPerSec,
      PLAYER_MARGIN + 20,
      LOGICAL_WIDTH - PLAYER_MARGIN - 20,
    );

    if (nowMs >= this.boss.nextFireAtMs) {
      this.bossFire(cfg.patternId);
      this.boss.nextFireAtMs = nowMs + cfg.fireIntervalMs;
    }
  }

  private bossFire(patternId: import('../content/patterns').PatternId): void {
    if (!this.boss) return;
    const bossRef = this.boss;
    firePattern({
      group: this.enemyProjectiles,
      x: bossRef.sprite.x,
      y: bossRef.sprite.y + 30,
      patternId,
      shotIndex: this.bossShotIndex,
      playerX: this.player.sprite.x,
      scheduleTelegraph: (delayMs, fire) => {
        this.scheduleTelegraphFire(
          delayMs,
          fire,
          () => Boolean(this.boss) && this.boss!.sprite.active && this.phase === 'bossActive',
        );
      },
      showTell: (kind, x, y, meta) => this.showTellGraphics(kind, x, y, meta),
    });
    this.bossShotIndex += 1;
  }

  private handleStageClear(): void {
    const clearedStage = this.currentStage();
    this.applyEvent({ type: 'STAGE_CLEARED', stageId: clearedStage.id });
    this.runState = {
      ...this.runState,
      calorie: Math.max(0, this.runState.calorie - GameBalance.scoring.caloriePerStageClearDecay),
    };

    // After STAGE_CLEARED, stageIndex already points at the next slot.
    const stageNumber = this.runState.stageIndex;
    let bonus = stageClearBonus(stageNumber, GameBalance.scoring.stageClearBonusPerStage);
    if (this.bossFightNoHit) {
      bonus += bossNoHitBonus(stageNumber, GameBalance.scoring.bossNoHitBonusPerStage);
    }

    const isFinal = this.runState.stageIndex >= TOTAL_STAGES;
    if (isFinal) {
      bonus += GameBalance.scoring.runClearBonus;
    }
    this.runState = { ...this.runState, score: this.runState.score + bonus };

    this.clearEnemyBullets();
    if (this.boss) {
      this.boss.sprite.destroy();
      this.boss = null;
    }
    this.clearTells();

    if (isFinal) {
      this.showCaption('RUN CLEAR');
      this.applyEvent({ type: 'RUN_ENDED', reason: 'CLEAR' });
    } else {
      this.showCaption('STAGE CLEAR');
    }
  }

  private beginNextStageIntro(nowMs: number): void {
    this.waveIndexInStage = 0;
    this.bossFightNoHit = true;
    this.powerUpTimers = createPowerUpTimers();
    this.phase = 'stageIntro';
    this.phaseStartedAtMs = nowMs;
    this.comboState = setFrozen(this.comboState, true, nowMs);
    this.showStageIntroCaption();
  }

  private clearEnemyBullets(): void {
    for (const child of this.enemyProjectiles.children) {
      deactivateProjectile(child as Phaser.Physics.Arcade.Sprite);
    }
  }

  private clearTells(): void {
    for (const tell of this.activeTells) {
      tell.destroy();
    }
    this.activeTells = [];
  }

  private firePlayerShot(nowMs: number): void {
    const mods = powerUpCombatMods(this.powerUpTimers, nowMs);
    const damage = mods.shotDamage;
    const speed = -GameBalance.bullet.playerShot.speedPxPerSec;
    const baseX = this.player.sprite.x;
    const baseY = this.player.sprite.y - 20;

    const fireOne = (vx: number, vy: number): Phaser.Physics.Arcade.Sprite | null =>
      fireProjectile(this.playerProjectiles, TextureKey.bulletPlayer, baseX, baseY, vx, vy, {
        kind: 'player',
        damage,
        calorie: 0,
        bulletId: 'playerShot',
      });

    let fired: Phaser.Physics.Arcade.Sprite | null = null;
    if (mods.tripleShot) {
      const spread = 18;
      for (const angleDeg of [-spread, 0, spread]) {
        const rad = Phaser.Math.DegToRad(-90 + angleDeg);
        const sprite = fireOne(Math.cos(rad) * Math.abs(speed), Math.sin(rad) * Math.abs(speed));
        if (sprite) fired = sprite;
      }
    } else {
      fired = fireOne(0, speed);
    }

    if (fired) {
      this.player.nextFireAtMs = nowMs + mods.fireIntervalMs;
      this.applyEvent({ type: 'SHOT_FIRED', weaponId: 'crumpledCheckup' });
      this.audio?.playSe('shot');
    }
  }

  private onPlayerProjectileHitsEnemy(a: unknown, b: unknown): void {
    const sprites = [a, b] as Phaser.Physics.Arcade.Sprite[];
    const enemySprite = sprites.find((s) => s.getData('enemy') !== undefined);
    const projSprite = sprites.find(
      (s) => (s.getData('payload') as ProjectilePayload | undefined)?.kind === 'player',
    );
    if (!enemySprite || !projSprite || enemySprite === projSprite) return;
    if (!projSprite.active || !enemySprite.active) return;
    const payload = projSprite.getData('payload') as ProjectilePayload;
    this.pendingEnemyHits.push({
      sprite: enemySprite,
      damage: payload.damage,
      x: enemySprite.x,
      y: enemySprite.y,
    });
    deactivateProjectile(projSprite);
  }

  private onPlayerProjectileHitsBoss(a: unknown, b: unknown): void {
    if (!this.boss) return;
    const bossSpriteRef = this.boss.sprite;
    const picked = pickByIdentity(
      a as Phaser.Physics.Arcade.Sprite,
      b as Phaser.Physics.Arcade.Sprite,
      (candidate) => candidate === bossSpriteRef,
    );
    if (!picked) return;
    const bossSprite = picked.match;
    const projSprite = picked.other;
    if (!projSprite.active || !bossSprite.active) return;

    const payload = projSprite.getData('payload') as ProjectilePayload | undefined;
    if (payload?.kind !== 'player') return;

    if (this.boss.state.phase === 'intro' || this.boss.state.phase === 'dead') {
      deactivateProjectile(projSprite);
      return;
    }
    deactivateProjectile(projSprite);
    this.pendingBossHits.push(payload.damage);
  }

  private onEnemyProjectileHitsPlayer(a: unknown, b: unknown): void {
    const playerSpriteRef = this.player.sprite;
    const picked = pickByIdentity(
      a as Phaser.Physics.Arcade.Sprite,
      b as Phaser.Physics.Arcade.Sprite,
      (candidate) => candidate === playerSpriteRef,
    );
    if (!picked) return;
    const projSprite = picked.other;
    if (!projSprite.active) return;
    const payload = projSprite.getData('payload') as ProjectilePayload | undefined;
    if (payload?.kind !== 'enemy') return;
    this.pendingPlayerHits.push({ calorie: payload.calorie, source: 'bullet' });
    deactivateProjectile(projSprite);
  }

  private onEnemyContactsPlayer(a: unknown, b: unknown): void {
    const playerSpriteRef = this.player.sprite;
    const picked = pickByIdentity(
      a as Phaser.Physics.Arcade.Sprite,
      b as Phaser.Physics.Arcade.Sprite,
      (candidate) => candidate === playerSpriteRef,
    );
    if (!picked) return;
    const enemySprite = picked.other;
    if (!enemySprite.active) return;
    const runtime = enemySprite.getData('enemy') as EnemyRuntimeData | undefined;
    if (!runtime) return;
    const def = enemyContent[runtime.enemyId];
    this.pendingPlayerHits.push({ calorie: def.contactCalorie, source: 'contact' });
    deactivateEnemy(enemySprite);
  }

  private onPowerUpCollected(a: unknown, b: unknown): void {
    const playerSpriteRef = this.player.sprite;
    const picked = pickByIdentity(
      a as Phaser.Physics.Arcade.Sprite,
      b as Phaser.Physics.Arcade.Sprite,
      (candidate) => candidate === playerSpriteRef,
    );
    if (!picked) return;
    const pickup = picked.other;
    if (!pickup.active) return;
    const data = pickup.getData('powerup') as PowerUpRuntimeData | undefined;
    if (!data) return;
    deactivatePowerUp(pickup);
    this.collectPowerUp(data.powerUpId, this.clock.nowMs());
  }

  private collectPowerUp(powerUpId: PowerUpId, nowMs: number): void {
    this.applyEvent({ type: 'POWERUP_COLLECTED', powerUpId });
    this.audio?.playSe('pickup');

    if (powerUpId === 'fatBurn') {
      this.convertEnemyBulletsToSparks();
      for (const child of this.enemiesGroup.children) {
        const sprite = child as Phaser.Physics.Arcade.Sprite;
        if (!sprite.active) continue;
        this.pendingEnemyHits.push({
          sprite,
          damage: GameBalance.powerup.fatBurn.enemyDamage,
          x: sprite.x,
          y: sprite.y,
        });
      }
      return;
    }

    this.powerUpTimers = applyTimedPowerUp(this.powerUpTimers, powerUpId, nowMs);

    if (powerUpId === 'cheatDay') {
      const cost = GameBalance.powerup.cheatDay.calorieCost;
      const total = applyCalorie(this.runState.calorie, cost);
      this.applyEvent({ type: 'PLAYER_HIT', calorie: cost, total });
    }
  }

  private maybeDropPowerUp(x: number, y: number, nowMs: number): void {
    const roll = this.gameplayRandom.next();
    const pityDue = nowMs - this.lastPowerUpGrantedAtMs >= GameBalance.powerup.pityMs;
    if (roll >= GameBalance.powerup.dropRate && !pityDue) return;
    const id = POWERUP_IDS[this.gameplayRandom.nextInt(0, POWERUP_IDS.length - 1)]!;
    const spawned = spawnPowerUp(this.powerUpsGroup, id, x, y);
    if (spawned) {
      this.lastPowerUpGrantedAtMs = nowMs;
    }
  }

  private resolveCombat(nowMs: number): void {
    if (this.pendingEnemyHits.length > 0) {
      const outcomes = resolveEnemyHits(this.pendingEnemyHits);
      this.pendingEnemyHits = [];
      for (const outcome of outcomes) {
        this.applyEvent({ type: 'ENEMY_HIT', enemyId: outcome.enemyId, x: outcome.x, y: outcome.y });
        if (outcome.killed) {
          deactivateEnemy(outcome.sprite);
          const predictedCombo = this.comboState.frozen ? this.runState.combo : this.runState.combo + 1;
          this.applyEvent({
            type: 'ENEMY_KILLED',
            enemyId: outcome.enemyId,
            score: outcome.score,
            combo: predictedCombo,
            x: outcome.x,
            y: outcome.y,
          });
          if (enemyContent[outcome.enemyId].dropEligible) {
            this.maybeDropPowerUp(outcome.x, outcome.y, nowMs);
          }
        }
      }
    }

    if (this.pendingBossHits.length > 0 && this.boss && this.boss.state.phase !== 'dead') {
      const totalDamage = this.pendingBossHits.reduce((sum, d) => sum + d, 0);
      this.pendingBossHits = [];
      const result = applyBossDamage(this.boss.bossId, this.boss.state, totalDamage);
      this.boss.state = result.state;
      playBossHitFlash(this.boss);
      if (result.phaseChanged) {
        this.applyEvent({
          type: 'BOSS_PHASE_CHANGED',
          bossId: this.boss.bossId,
          phase: this.boss.state.phase,
        });
      }
      if (result.defeated) {
        disableBossHitbox(this.boss);
        this.convertEnemyBulletsToSparks();
        this.applyEvent({ type: 'BOSS_DEFEATED', bossId: this.boss.bossId });
        this.comboState = setFrozen(this.comboState, true, nowMs);
        this.phase = 'bossDeath';
        this.phaseStartedAtMs = nowMs;
        this.audio?.playSe('bossKill');
      }
    }

    if (this.pendingPlayerHits.length > 0) {
      if (this.phase === 'bossDeath' || this.phase === 'stageClear' || this.phase === 'stageTransition') {
        this.pendingPlayerHits = [];
      } else {
        const mods = powerUpCombatMods(this.powerUpTimers, nowMs);
        const invuln = isInvulnerable(this.player, nowMs) || mods.invulnerable;
        const hit = resolveFirstPlayerHit(this.pendingPlayerHits, invuln);
        this.pendingPlayerHits = [];
        if (hit) {
          this.bossFightNoHit = false;
          const total = applyCalorie(this.runState.calorie, hit.calorie);
          applyHitFlash(this.player, nowMs);
          this.applyEvent({ type: 'PLAYER_HIT', calorie: hit.calorie, total });
          this.audio?.playSe('hit');
        }
      }
    }
  }

  private applyEvent(event: GameEvent): void {
    const hadEnded = Boolean(this.runState.endReason);
    const result = applyGameEvent(this.runState, event, {
      nowMs: this.clock.nowMs(),
      comboWindowMs: GameBalance.combo.windowMs,
      comboState: this.comboState,
    });
    this.runState = result.runState;
    this.comboState = result.comboState;
    this.eventBus.emit(event);

    if (!hadEnded && this.runState.endReason) {
      this.runEndedCount += 1;
      if (event.type !== 'RUN_ENDED') {
        this.eventBus.emit({ type: 'RUN_ENDED', reason: this.runState.endReason });
      }
      this.onRunEnded(this.runState.endReason);
    }
  }

  private onRunEnded(reason: RunEndReason): void {
    this.phase = 'ended';
    if (reason === 'FAT_OVER') {
      applyFatOverPose(this.player);
      this.fatOverPoseApplied = true;
      this.showCaption('FAT OVER\n満腹につき、いったん帰還。');
    }

    const saveData = loadSaveData(this.storage);
    let evaluationScore: number | null = null;
    let rank: import('../domain/evaluation').Rank | null = null;

    if (reason === 'CLEAR') {
      const evalResult = evaluateRun({
        score: this.runState.score,
        targetScore: GameBalance.evaluation.targetScore,
        finalCalorie: this.runState.calorie,
        maxCombo: this.runState.maxCombo,
        comboNormalizer: GameBalance.evaluation.comboNormalizer,
        accuracy: accuracy(this.runState),
        accuracyNormalizer: GameBalance.evaluation.accuracyNormalizer,
        weights: GameBalance.evaluation.weights,
      });
      evaluationScore = evalResult.evaluationScore;
      rank = evalResult.rank;
    }

    const { isNewHighScore } = recordScoreAndRank(this.storage, saveData, this.runState.score, rank);

    publishRunSnapshot(this.game, this.buildSnapshot());

    const holdMs =
      reason === 'FAT_OVER' ? GameBalance.feel.fatOverHoldMs : GameBalance.feel.clearHoldMs;
    this.time.delayedCall(holdMs, () => {
      this.scene.start('ResultScene', {
        runState: this.runState,
        evaluationScore,
        rank,
        isNewHighScore,
      });
    });
  }

  private togglePause(): void {
    if (this.phase === 'ended') return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
      this.feedback.clearHitStop();
    }
    this.pauseOverlay.setVisible(this.paused);
  }

  private updateHud(): void {
    this.scoreText.setText(`SCORE ${this.runState.score}`);
    this.calorieLabel.setText(`CALORIE ${this.runState.calorie}`);
    const ratio = this.runState.calorie / CALORIE_MAX;
    this.calorieBarFill.width = 140 * ratio;
    this.calorieBarFill.fillColor =
      this.runState.calorie >= 85 ? 0xff4f64 : this.runState.calorie >= 60 ? 0xffb33d : 0x53f6ff;

    const callout = comboCallout(this.runState.combo);
    this.comboText.setText(
      this.runState.combo > 1 ? `COMBO ${this.runState.combo}${callout ? ` — ${callout}` : ''}` : '',
    );
  }

  private updateBossHpBar(): void {
    const boss = this.boss;
    const shouldShow = Boolean(boss) && boss!.state.phase !== 'intro' && boss!.state.phase !== 'dead';
    this.bossHpLabel.setVisible(shouldShow);
    this.bossHpBarBg.setVisible(shouldShow);
    this.bossHpBarFill.setVisible(shouldShow);
    if (!shouldShow || !boss) return;

    const ratio = Phaser.Math.Clamp(boss.state.hp / boss.state.maxHp, 0, 1);
    this.bossHpBarFill.width = 220 * ratio;
  }

  private buildSnapshot(): FatE2ERunSnapshot {
    return {
      score: this.runState.score,
      combo: this.runState.combo,
      maxCombo: this.runState.maxCombo,
      calorie: this.runState.calorie,
      caloriesDodged: this.runState.caloriesDodged,
      stageIndex: this.runState.stageIndex,
      enemiesKilled: this.runState.enemiesKilled,
      bossesKilled: this.runState.bossesKilled,
      shotsFired: this.runState.shotsFired,
      playerX: this.player.sprite.x,
      shutdownListenerCount: this.events.listenerCount(Phaser.Scenes.Events.SHUTDOWN),
      activePlayerProjectiles: countActive(this.playerProjectiles),
      activeEnemyProjectiles: countActive(this.enemyProjectiles),
      activeEnemies: countActive(this.enemiesGroup),
      activePowerUps: countActive(this.powerUpsGroup),
      enemyFireDelayMs: this.collectEnemyFireDelays(),
      enemyFormationOffsets: this.collectEnemyFormationOffsets(),
      phase: this.phase,
      waveIndexInStage: this.waveIndexInStage,
      ...this.feelSnapshot(),
      ...(this.runState.endReason ? { endReason: this.runState.endReason } : {}),
      ...(this.boss
        ? {
            bossPhase: this.boss.state.phase,
            bossX: this.boss.sprite.x,
            bossHp: this.boss.state.hp,
            bossMaxHp: this.boss.state.maxHp,
            bossSpriteActive: this.boss.sprite.active,
            bossSpriteVisible: this.boss.sprite.visible,
            bossBodyEnabled: (this.boss.sprite.body as Phaser.Physics.Arcade.Body | null)?.enable ?? false,
          }
        : {}),
      ...(this.phase === 'bossDeath'
        ? { bossDeathBeat: bossDeathBeatAt(this.feedback.bossDeathElapsedMs() ?? 0) }
        : {}),
      ...(this.fatOverPoseApplied ? { fatOverPoseActive: true } : {}),
      runEndedCount: this.runEndedCount,
      ...(this.captionText.visible && this.captionText.text
        ? { caption: this.captionText.text }
        : {}),
    };
  }

  private buildDebugHooks(): E2EDebugHooks {
    return {
      debugKillAllEnemies: (): void => {
        for (const child of this.enemiesGroup.children) {
          const sprite = child as Phaser.Physics.Arcade.Sprite;
          if (sprite.active) {
            this.pendingEnemyHits.push({
              sprite,
              damage: (sprite.getData('enemy') as EnemyRuntimeData).hp,
              x: sprite.x,
              y: sprite.y,
            });
          }
        }
      },
      debugSetBossHp: (hp: number): void => {
        if (!this.boss) return;
        const clamped = Math.max(1, Math.min(hp, this.boss.state.maxHp));
        this.boss.state = { ...this.boss.state, hp: clamped };
      },
      debugApplyPlayerCalorie: (amount: number): void => {
        this.pendingPlayerHits.push({ calorie: amount, source: 'contact' });
      },
      debugSetFeelSettings: (settings): void => {
        this.feelSettings = {
          reducedEffects: settings.reducedEffects ?? this.feelSettings.reducedEffects,
          screenShake: settings.screenShake ?? this.feelSettings.screenShake,
        };
        this.feedback.setSettings(this.feelSettings);
      },
      debugSetCombo: (combo): void => {
        const next = Math.max(0, Math.floor(combo));
        this.runState = {
          ...this.runState,
          combo: next,
          maxCombo: Math.max(this.runState.maxCombo, next),
        };
        this.eventBus.emit({ type: 'COMBO_TIER_CHANGED', combo: next, multiplier: 1 });
      },
      debugSaturateVfxCaps: (): void => {
        this.feedback.saturateDecorativeCapsForDebug();
        publishRunSnapshot(this.game, this.buildSnapshot());
      },
      debugPlayDisplayKill: (): void => {
        this.feedback.playDisplayKillForDebug(this.player.sprite.x, this.player.sprite.y);
      },
      debugSkipToBoss: (): void => {
        for (const child of this.enemiesGroup.children) {
          const sprite = child as Phaser.Physics.Arcade.Sprite;
          if (sprite.active) deactivateEnemy(sprite);
        }
        this.waveSystem = null;
        this.waveIndexInStage = this.currentStage().waveIds.length;
        this.enterPhase('bossWarning', this.clock.nowMs());
      },
      debugSkipWave: (): void => {
        for (const child of this.enemiesGroup.children) {
          const sprite = child as Phaser.Physics.Arcade.Sprite;
          if (sprite.active) deactivateEnemy(sprite);
        }
        if (this.phase === 'wave' && this.waveSystem) {
          this.waveSystem.forceComplete();
          this.onWaveCompleted(this.clock.nowMs());
        }
      },
      debugAdvanceStage: (force = false): void => {
        const nowMs = this.clock.nowMs();
        if (this.phase === 'stageClear' || this.phase === 'stageTransition') {
          if (this.runState.stageIndex >= TOTAL_STAGES) return;
          this.beginNextStageIntro(nowMs);
          return;
        }
        if (!force) return;
        if (this.runState.endReason) return;
        // Force-complete current stage rewards then jump to next intro or run end.
        if (this.boss) {
          this.boss.sprite.destroy();
          this.boss = null;
        }
        this.clearEnemyBullets();
        for (const child of this.enemiesGroup.children) {
          const sprite = child as Phaser.Physics.Arcade.Sprite;
          if (sprite.active) deactivateEnemy(sprite);
        }
        this.phase = 'stageClear';
        this.phaseStartedAtMs = nowMs;
        this.handleStageClear();
        if (!this.runState.endReason && this.runState.stageIndex < TOTAL_STAGES) {
          this.beginNextStageIntro(nowMs);
        }
      },
      debugSpawnPowerUp: (id: string): void => {
        if (!POWERUP_IDS.includes(id as PowerUpId)) return;
        spawnPowerUp(
          this.powerUpsGroup,
          id as PowerUpId,
          this.player.sprite.x,
          this.player.sprite.y - 40,
        );
      },
      debugForceRunClear: (): void => {
        if (this.runState.endReason) return;
        while (this.runState.stageIndex < TOTAL_STAGES && !this.runState.endReason) {
          const stage = this.currentStage();
          this.applyEvent({ type: 'STAGE_CLEARED', stageId: stage.id });
          this.runState = {
            ...this.runState,
            calorie: Math.max(
              0,
              this.runState.calorie - GameBalance.scoring.caloriePerStageClearDecay,
            ),
          };
          const stageNumber = this.runState.stageIndex;
          let bonus = stageClearBonus(stageNumber, GameBalance.scoring.stageClearBonusPerStage);
          bonus += bossNoHitBonus(stageNumber, GameBalance.scoring.bossNoHitBonusPerStage);
          this.runState = { ...this.runState, score: this.runState.score + bonus };
        }
        if (!this.runState.endReason) {
          this.runState = {
            ...this.runState,
            score: this.runState.score + GameBalance.scoring.runClearBonus,
          };
          this.applyEvent({ type: 'RUN_ENDED', reason: 'CLEAR' });
        }
      },
    };
  }

  private convertEnemyBulletsToSparks(): void {
    for (const child of this.enemyProjectiles.children) {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) continue;
      this.feedback.spawnSpark(sprite.x, sprite.y);
      deactivateProjectile(sprite);
    }
  }

  private collectEnemyFireDelays(): number[] {
    const delays: number[] = [];
    for (const child of this.enemiesGroup.children) {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) continue;
      const runtime = sprite.getData('enemy') as EnemyRuntimeData | undefined;
      if (runtime) delays.push(runtime.lastFireDelayMs);
    }
    delays.sort((a, b) => a - b);
    return delays;
  }

  private collectEnemyFormationOffsets(): number[] {
    const offsets: number[] = [];
    for (const child of this.enemiesGroup.children) {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) continue;
      const runtime = sprite.getData('enemy') as EnemyRuntimeData | undefined;
      if (runtime) offsets.push(runtime.formationPhaseOffset);
    }
    offsets.sort((a, b) => a - b);
    return offsets;
  }

  private feelSnapshot(): {
    activeParticles: number;
    activeFragments: number;
    activeScorePopups: number;
    shakePx: number;
    reducedEffects: boolean;
    screenShake: FeelSettings['screenShake'];
  } {
    const tel = this.feedback.telemetry();
    return {
      activeParticles: tel.activeParticles,
      activeFragments: tel.activeFragments,
      activeScorePopups: tel.activeScorePopups,
      shakePx: tel.shakePx,
      reducedEffects: this.feelSettings.reducedEffects,
      screenShake: this.feelSettings.screenShake,
    };
  }

  private handleShutdown(): void {
    this.feedback.destroy();
    this.inputSystem.destroy();
    this.audio?.destroy();
    this.audio = null;
    this.clearTells();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.eventBus.clear();
    registerActiveGameSceneHooks(this.game, null);
  }
}

function isMobileViewport(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function countActive(group: Phaser.Physics.Arcade.Group): number {
  let count = 0;
  for (const child of group.children) {
    if ((child as Phaser.Physics.Arcade.Sprite).active) count += 1;
  }
  return count;
}

function toFeelSettings(settings: {
  reducedEffects: boolean;
  screenShake: FeelSettings['screenShake'];
}): FeelSettings {
  return {
    reducedEffects: settings.reducedEffects,
    screenShake: settings.screenShake,
  };
}
