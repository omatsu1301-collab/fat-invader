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
import { PhaserClock } from '../adapters/PhaserClock';
import { SeededRandom, generateRuntimeSeed } from '../adapters/SeededRandom';
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter';
import { loadSaveData, recordScoreAndRank } from '../systems/PersistenceSystem';
import { InputSystem } from '../systems/InputSystem';
import { resolveEnemyHits, resolveFirstPlayerHit } from '../systems/CombatSystem';
import type { PendingEnemyHit, PendingPlayerHit } from '../systems/CombatSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { activePhaseConfig, applyBossDamage, completeBossIntro } from '../systems/BossSystem';
import { ensurePlaceholderTextures, TextureKey } from '../entities/textures';
import {
  applyHitFlash,
  createPlayer,
  isInvulnerable,
  setAppearanceTint,
  updatePlayerMovement,
} from '../entities/Player';
import type { PlayerHandle } from '../entities/Player';
import { deactivateEnemy, spawnEnemy, updateFormationMovement } from '../entities/Enemy';
import type { EnemyRuntimeData } from '../entities/Enemy';
import { deactivateProjectile, despawnOffscreen, fireProjectile } from '../entities/Projectile';
import { playBossHitFlash, spawnBoss, updateBossMovement } from '../entities/Boss';
import type { BossHandle } from '../entities/Boss';
import { waves } from '../content/waves';
import { bullets } from '../content/bullets';
import { enemies as enemyContent } from '../content/enemies';
import {
  E2E_SEED_REGISTRY_KEY,
  publishRunSnapshot,
  registerActiveGameSceneHooks,
} from '../../test-support/e2e-bridge';
import type { E2EDebugHooks, FatE2ERunSnapshot } from '../../test-support/e2e-bridge';

type Phase =
  | 'stageIntro'
  | 'wave'
  | 'bossWarning'
  | 'bossIntro'
  | 'bossActive'
  | 'stageClear'
  | 'ended';

const PLAYFIELD_BOTTOM = LOGICAL_HEIGHT - GameBalance.playfield.bottomInset;
const PLAYER_Y = LOGICAL_HEIGHT * 0.86;
const PLAYER_MARGIN = 24;

const COLOR_MILK_CREAM = '#FFF0D2';
const COLOR_UI_MUTED = '#9D93B5';
const COLOR_BURN_LIME = '#B9FF4A';

export class GameScene extends Phaser.Scene {
  private clock = new PhaserClock();
  private random!: SeededRandom;
  private storage = new LocalStorageAdapter();
  private eventBus = new GameEventBus();
  private inputSystem!: InputSystem;

  private runState!: RunState;
  private comboState: ComboState = freshComboState();

  private player!: PlayerHandle;
  private enemiesGroup!: Phaser.Physics.Arcade.Group;
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private boss: BossHandle | null = null;
  private waveSystem: WaveSystem | null = null;

  private phase: Phase = 'stageIntro';
  private phaseStartedAtMs = 0;
  private paused = false;
  private bossFightNoHit = true;

  private pendingEnemyHits: PendingEnemyHit[] = [];
  private pendingPlayerHits: PendingPlayerHit[] = [];
  private pendingBossHits: number[] = [];

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private calorieLabel!: Phaser.GameObjects.Text;
  private calorieBarFill!: Phaser.GameObjects.Rectangle;
  private captionText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private pauseButton!: Phaser.GameObjects.Text;

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
    this.random = new SeededRandom(seed);
    this.runState = createRunState(seed, 0);
    this.comboState = setFrozen(freshComboState(), true);
    this.phase = 'stageIntro';
    this.phaseStartedAtMs = 0;
    this.paused = false;
    this.bossFightNoHit = true;
    this.boss = null;
    this.waveSystem = null;
    this.pendingEnemyHits = [];
    this.pendingPlayerHits = [];
    this.pendingBossHits = [];

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
      (proj) => this.onEnemyProjectileHitsPlayer(proj),
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.enemiesGroup,
      this.player.sprite,
      (enemy) => this.onEnemyContactsPlayer(enemy),
      undefined,
      this,
    );

    this.inputSystem = new InputSystem(this, isMobileViewport());

    this.buildHud();

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    registerActiveGameSceneHooks(this.game, this.buildDebugHooks());

    this.showCaption('STAGE 1 — BURGER DISTRICT\n香りから逃げろ。');
  }

  private buildHud(): void {
    this.scoreText = this.add
      .text(16, 12, 'SCORE 0', { fontFamily: 'monospace', fontSize: '16px', color: COLOR_MILK_CREAM })
      .setDepth(10);

    this.comboText = this.add
      .text(LOGICAL_WIDTH / 2, 12, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLOR_BURN_LIME,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.calorieLabel = this.add
      .text(16, 34, 'CALORIE 0', { fontFamily: 'monospace', fontSize: '12px', color: COLOR_UI_MUTED })
      .setDepth(10);

    this.add.rectangle(16, 30 + 22, 140, 8, 0x21102f).setOrigin(0, 0.5).setDepth(10);
    this.calorieBarFill = this.add
      .rectangle(16, 30 + 22, 0, 8, 0x53f6ff)
      .setOrigin(0, 0.5)
      .setDepth(10);

    this.pauseButton = this.add
      .text(LOGICAL_WIDTH - 20, 14, '❚❚', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: COLOR_MILK_CREAM,
      })
      .setOrigin(1, 0)
      .setDepth(10)
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
      .setDepth(20);

    this.pauseOverlay = this.add.container(0, 0).setDepth(30).setVisible(false);
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

  update(_time: number, deltaMs: number): void {
    const intent = this.inputSystem.poll();
    if (intent.pauseRequested) {
      this.togglePause();
    }

    const isRunning = !this.paused && !document.hidden && this.phase !== 'ended';
    this.clock.tick(deltaMs, isRunning);
    this.updateHud();
    publishRunSnapshot(this.game, this.buildSnapshot());

    if (!isRunning) return;

    const nowMs = this.clock.nowMs();
    const dt = this.clock.lastDeltaMs();

    this.comboState = tickExpiry(this.comboState, nowMs);

    const tier = calorieTier(this.runState.calorie);
    const speedMultiplier =
      tier === 'overflowing' ? GameBalance.player.overflowingSpeedMultiplier : 1;
    updatePlayerMovement(this.player, intent, dt, speedMultiplier);
    setAppearanceTint(this.player, tier);

    if (intent.firing && nowMs >= this.player.nextFireAtMs) {
      this.firePlayerShot(nowMs);
    }

    despawnOffscreen(this.playerProjectiles, LOGICAL_HEIGHT);
    despawnOffscreen(this.enemyProjectiles, LOGICAL_HEIGHT);

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
        if (nowMs - this.phaseStartedAtMs >= GameBalance.boss.kingBurgerMini.introDurationMs) {
          this.finishBossIntro(nowMs);
        }
        break;
      case 'bossActive':
        this.updateBossActive(nowMs, dt);
        break;
      case 'stageClear':
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
      this.comboState = setFrozen(this.comboState, false);
      this.waveSystem = new WaveSystem(waves.stage1Wave1, nowMs);
    } else if (phase === 'bossWarning') {
      this.comboState = setFrozen(this.comboState, true);
      this.showCaption('WARNING\n巨大な誘惑が接近中');
    } else if (phase === 'stageClear') {
      this.handleStageClear();
    }
  }

  private updateWave(nowMs: number): void {
    if (!this.waveSystem) return;
    const due = this.waveSystem.collectDueSpawns(nowMs);
    for (const cmd of due) {
      const spacingX = 90;
      const x = 60 + cmd.gridX * spacingX;
      const y = 110 + cmd.gridY * 60;
      spawnEnemy(this.enemiesGroup, cmd.enemyId, x, y, nowMs, this.random);
    }

    const descentPxPerSec =
      GameBalance.wave.stage1.verticalStepPx / (GameBalance.wave.stage1.verticalStepIntervalMs / 1000);
    for (const child of this.enemiesGroup.children) {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) continue;
      updateFormationMovement(sprite, nowMs, descentPxPerSec, 18);
      this.updateEnemyFire(sprite, nowMs);
      if (sprite.y > PLAYFIELD_BOTTOM) {
        this.despawnEnemyOffscreen(sprite);
      }
    }

    const activeCount = this.countActiveEnemies();
    if (this.waveSystem.checkCompletion(activeCount)) {
      this.enterPhase('bossWarning', nowMs);
    }
  }

  private countActiveEnemies(): number {
    let count = 0;
    for (const child of this.enemiesGroup.children) {
      if ((child as Phaser.Physics.Arcade.Sprite).active) count += 1;
    }
    return count;
  }

  private updateEnemyFire(sprite: Phaser.Physics.Arcade.Sprite, nowMs: number): void {
    const runtime = sprite.getData('enemy') as EnemyRuntimeData;
    if (nowMs < runtime.nextFireAtMs) return;
    const def = enemyContent[runtime.enemyId];
    const bulletDef = bullets[def.bulletId as keyof typeof bullets];
    fireProjectile(
      this.enemyProjectiles,
      TextureKey.bulletFry,
      sprite.x,
      sprite.y + 16,
      0,
      bulletDef.speedPxPerSec,
      { kind: 'enemy', damage: 0, calorie: bulletDef.calorie, bulletId: bulletDef.id },
    );
    runtime.nextFireAtMs = nowMs + def.fireRateMs + this.random.nextInt(0, def.fireIntervalJitterMs);
  }

  private despawnEnemyOffscreen(sprite: Phaser.Physics.Arcade.Sprite): void {
    deactivateEnemy(sprite);
  }

  private startBossIntro(nowMs: number): void {
    this.phase = 'bossIntro';
    this.phaseStartedAtMs = nowMs;
    this.hideCaption();
    // Clear any straggling enemy bullets before the boss appears (FI-03 2.5).
    for (const child of this.enemyProjectiles.children) {
      deactivateProjectile(child as Phaser.Physics.Arcade.Sprite);
    }
    this.bossFightNoHit = true;
    this.boss = spawnBoss(this, 'kingBurgerMini', LOGICAL_WIDTH / 2, 130, nowMs);
    this.showCaption('KING BURGER');
  }

  private updateBossPatrol(dt: number): void {
    if (!this.boss) return;
    updateBossMovement(
      this.boss,
      dt,
      GameBalance.boss.kingBurgerMini.phase1.moveSpeedPxPerSec,
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
    this.comboState = setFrozen(this.comboState, false);
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
      this.bossFire(cfg.bulletCount);
      this.boss.nextFireAtMs = nowMs + cfg.fireIntervalMs;
    }
  }

  private bossFire(bulletCount: number): void {
    if (!this.boss) return;
    const bulletDef = bullets.fry;
    const baseX = this.boss.sprite.x;
    const baseY = this.boss.sprite.y + 30;
    const speed = bulletDef.speedPxPerSec;

    if (bulletCount <= 1) {
      fireProjectile(this.enemyProjectiles, TextureKey.bulletFry, baseX, baseY, 0, speed, {
        kind: 'enemy',
        damage: 0,
        calorie: bulletDef.calorie,
        bulletId: bulletDef.id,
      });
      return;
    }

    const spreadDeg = 24;
    for (let i = 0; i < bulletCount; i += 1) {
      const t = bulletCount === 1 ? 0 : i / (bulletCount - 1) - 0.5;
      const angleDeg = t * spreadDeg * 2;
      const angleRad = Phaser.Math.DegToRad(90 + angleDeg);
      const vx = Math.cos(angleRad) * speed;
      const vy = Math.sin(angleRad) * speed;
      fireProjectile(this.enemyProjectiles, TextureKey.bulletFry, baseX, baseY, vx, vy, {
        kind: 'enemy',
        damage: 0,
        calorie: bulletDef.calorie,
        bulletId: bulletDef.id,
      });
    }
  }

  private handleStageClear(): void {
    if (!this.boss) return;
    this.applyEvent({ type: 'STAGE_CLEARED', stageId: 'stage1' });
    this.runState = {
      ...this.runState,
      calorie: Math.max(0, this.runState.calorie - GameBalance.scoring.caloriePerStageClearDecay),
    };

    const stageNumber = 1;
    let bonus = stageClearBonus(stageNumber, GameBalance.scoring.stageClearBonusPerStage);
    if (this.bossFightNoHit) {
      bonus += bossNoHitBonus(stageNumber, GameBalance.scoring.bossNoHitBonusPerStage);
    }
    bonus += GameBalance.scoring.runClearBonus;
    this.runState = { ...this.runState, score: this.runState.score + bonus };

    this.showCaption('STAGE CLEAR');
    this.applyEvent({ type: 'RUN_ENDED', reason: 'CLEAR' });
  }

  private firePlayerShot(nowMs: number): void {
    const sprite = fireProjectile(
      this.playerProjectiles,
      TextureKey.bulletPlayer,
      this.player.sprite.x,
      this.player.sprite.y - 20,
      0,
      -GameBalance.bullet.playerShot.speedPxPerSec,
      {
        kind: 'player',
        damage: GameBalance.player.shotDamage,
        calorie: 0,
        bulletId: 'playerShot',
      },
    );
    if (sprite) {
      this.player.nextFireAtMs = nowMs + GameBalance.player.baseFireIntervalMs;
      this.applyEvent({ type: 'SHOT_FIRED', weaponId: 'metabolicShot' });
    }
  }

  private onPlayerProjectileHitsEnemy(proj: unknown, enemy: unknown): void {
    const projSprite = proj as Phaser.Physics.Arcade.Sprite;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    if (!projSprite.active || !enemySprite.active) return;
    this.pendingEnemyHits.push({
      sprite: enemySprite,
      damage: GameBalance.player.shotDamage,
      x: enemySprite.x,
      y: enemySprite.y,
    });
    deactivateProjectile(projSprite);
  }

  private onEnemyProjectileHitsPlayer(proj: unknown): void {
    const projSprite = proj as Phaser.Physics.Arcade.Sprite;
    if (!projSprite.active) return;
    const payload = projSprite.getData('payload') as { calorie: number } | undefined;
    this.pendingPlayerHits.push({ calorie: payload?.calorie ?? 0, source: 'bullet' });
    deactivateProjectile(projSprite);
  }

  private onEnemyContactsPlayer(enemy: unknown): void {
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;
    if (!enemySprite.active) return;
    const runtime = enemySprite.getData('enemy') as EnemyRuntimeData;
    const def = enemyContent[runtime.enemyId];
    this.pendingPlayerHits.push({ calorie: def.contactCalorie, source: 'contact' });
    deactivateEnemy(enemySprite);
  }

  private resolveCombat(nowMs: number): void {
    if (this.pendingEnemyHits.length > 0) {
      const outcomes = resolveEnemyHits(this.pendingEnemyHits);
      this.pendingEnemyHits = [];
      for (const outcome of outcomes) {
        this.applyEvent({ type: 'ENEMY_HIT', enemyId: outcome.enemyId, x: outcome.x, y: outcome.y });
        if (outcome.killed) {
          deactivateEnemy(outcome.sprite);
          // The reducer (not this payload) computes the authoritative post-kill
          // combo; `combo` here is a same-tick prediction for event listeners.
          const predictedCombo = this.comboState.frozen ? this.runState.combo : this.runState.combo + 1;
          this.applyEvent({
            type: 'ENEMY_KILLED',
            enemyId: outcome.enemyId,
            score: outcome.score,
            combo: predictedCombo,
            x: outcome.x,
            y: outcome.y,
          });
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
        this.enterPhase('stageClear', nowMs);
      }
    }

    if (this.pendingPlayerHits.length > 0) {
      const hit = resolveFirstPlayerHit(this.pendingPlayerHits, isInvulnerable(this.player, nowMs));
      this.pendingPlayerHits = [];
      if (hit) {
        this.bossFightNoHit = false;
        const total = applyCalorie(this.runState.calorie, hit.calorie);
        applyHitFlash(this.player, nowMs);
        this.applyEvent({ type: 'PLAYER_HIT', calorie: hit.calorie, total });
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
      if (event.type !== 'RUN_ENDED') {
        this.eventBus.emit({ type: 'RUN_ENDED', reason: this.runState.endReason });
      }
      this.onRunEnded(this.runState.endReason);
    }
  }

  private onRunEnded(reason: RunEndReason): void {
    this.phase = 'ended';
    if (reason === 'FAT_OVER') {
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

    this.time.delayedCall(1600, () => {
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

  private buildSnapshot(): FatE2ERunSnapshot {
    return {
      score: this.runState.score,
      combo: this.runState.combo,
      maxCombo: this.runState.maxCombo,
      calorie: this.runState.calorie,
      stageIndex: this.runState.stageIndex,
      enemiesKilled: this.runState.enemiesKilled,
      shotsFired: this.runState.shotsFired,
      playerX: this.player.sprite.x,
      ...(this.runState.endReason ? { endReason: this.runState.endReason } : {}),
      ...(this.boss ? { bossPhase: this.boss.state.phase } : {}),
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
      debugDefeatBoss: (): void => {
        if (this.boss && this.boss.state.phase !== 'dead') {
          this.pendingBossHits.push(this.boss.state.hp);
        }
      },
      debugApplyPlayerCalorie: (amount: number): void => {
        this.pendingPlayerHits.push({ calorie: amount, source: 'contact' });
      },
    };
  }

  private handleShutdown(): void {
    this.inputSystem.destroy();
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
