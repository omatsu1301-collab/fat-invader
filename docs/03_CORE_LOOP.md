# FATインベーダー — Core Loop and Runtime Contract

**Document ID:** FI-03  
**Version:** 1.0  
**Status:** Implementation Baseline  
**Depends on:** FI-01, FI-02, FI-05

## 1. Core Loop

```text
Observe threat
→ Move and shoot
→ Dodge temptation / destroy enemy
→ Receive instant feedback
→ Build combo and power
→ Survive escalation
→ Defeat boss
→ See evaluated appearance
→ Retry for a better run
```

このループの最小成立単位は約2秒である。プレイヤーが「敵を見る→狙う→倒す→反応を受ける」を2秒以内に経験できない空白を長く作らない。

## 2. Session Lifecycle

### 2.1 Boot

Responsibilities:

- 最小ローディングUIを表示。
- 設定とハイスコアを読み込む。
- 必須アセットだけを先読み。
- 保存データを検証し、破損時は既定値へフォールバック。

Exit condition: Titleの描画と入力受付に必要な資源が利用可能。

### 2.2 Title

表示:

- FAT INVADERロゴ。
- `START`。
- PCなら `← → / SPACE`、Mobileなら `DRAG / AUTO FIRE`。
- `SETTINGS`。
- ハイスコア。

入力を受けたらAudio Contextを解放し、Stage 1へ遷移する。開始待ち中にゲームシミュレーションを走らせない。

### 2.3 Stage intro

- ステージ名と短いコピーを1.2〜1.8秒表示。
- Player操作は最後の300msから許可してもよい。
- 敵弾は表示終了まで生成しない。
- Stage intro中はCombo timerを開始しない。

### 2.4 Active wave

各フレームで次を順序どおり処理する。

1. 入力状態の取得。
2. Pause / visibility transitionの確認。
3. 経過時間の正規化とclamp。
4. Player movement。
5. Player fire request。
6. Wave / enemy AI update。
7. Projectile movement。
8. Collision detection。
9. Damage / kill / pickup event resolution。
10. Combo and score update。
11. Spawn / despawn queue処理。
12. VFX / audio event dispatch。
13. HUD update。
14. Wave completion check。

Collision中にCollectionを直接変更しない。破壊・生成はqueueへ積み、解決フェーズで反映する。

### 2.5 Boss transition

- 通常敵と敵弾を安全に片付ける。
- 0.8〜1.2秒の警告演出。
- Boss intro中はPlayer移動可、射撃ダメージ無効でもよい。
- Combo timerは停止。
- Boss active開始時にタイマー再開。

### 2.6 Stage clear

- Boss撃破時に入力・敵生成を停止。
- Boss death演出は1.5〜2.5秒。
- 残存敵弾を得点粒子または光へ変換し、被弾判定をなくす。
- Bonusを集計。
- 最終Stage以外は短いStage summary後、次Stageへ。
- Player CALORIEは次Stageへ引き継ぐ。Stage clear時に10減少させるが0未満にしない。

### 2.7 FAT OVER

Trigger: `calorie >= 100`。

Sequence:

1. Player制御停止。
2. 120ms Slow Motion。
3. コミカルな膨張・煙・停止演出。
4. `FAT OVER` とRun statsを表示。
5. 1秒以内にRetry入力を受付。

Retryは完全な新規Run。乱数seedは通常新しくする。E2Eでは明示seedを維持できる。

### 2.8 Run clear and Result

- 最終Boss death後、Run statsを凍結。
- `evaluationScore` とRankを一度だけ計算。
- Result用Appearanceを表示。
- New High Scoreなら保存し、明示する。
- Retry / Title / Share placeholderのうち、v0.1ではRetryとTitleのみ機能させる。未実装ボタンを表示しない。

## 3. Time Contract

### 3.1 Game time

ゲームロジックは実時間ではなく `gameTimeMs` を利用する。

- Pause中は増えない。
- `document.visibilityState !== 'visible'` では増えない。
- 一フレームのdeltaは最大50msへclampする。
- Tween、Combo、Power-up、無敵、Wave、Boss attackは同じGame Clockに従う。

### 3.2 Hit stop

Hit stopはScene全体の非同期Timerを乱立させない。中央のTime Scaleまたは短いFreeze制御で行う。

- 通常命中: 0〜16ms。頻発するため控えめ。
- 通常敵撃破: 25ms。
- Player被弾: 45ms。
- Boss撃破: 80ms後、Slow Motionへ。
- 連続イベントが重なった場合の単回上限: 90ms。

## 4. Event Contract

ロジック層は描画・音を直接操作せず、型付きEventを発行する。

```ts
type GameEvent =
  | { type: 'SHOT_FIRED'; weaponId: string }
  | { type: 'ENEMY_HIT'; enemyId: string; x: number; y: number }
  | { type: 'ENEMY_KILLED'; enemyId: string; score: number; combo: number; x: number; y: number }
  | { type: 'PLAYER_HIT'; calorie: number; total: number }
  | { type: 'COMBO_TIER_CHANGED'; combo: number; multiplier: number }
  | { type: 'POWERUP_COLLECTED'; powerUpId: string }
  | { type: 'BOSS_PHASE_CHANGED'; bossId: string; phase: string }
  | { type: 'STAGE_CLEARED'; stageId: string }
  | { type: 'RUN_ENDED'; reason: 'FAT_OVER' | 'CLEAR' };
```

Event名とPayloadはテスト可能な公開契約として扱う。表示都合でロジックの意味を変えない。

## 5. Entity Lifecycle

すべての動的Entityは次の状態を持つ。

```text
inactive → spawning → active → dying → inactive
```

- `inactive` EntityのみPoolから取得できる。
- `dying` は当たり判定を持たない。
- Scene shutdown時にすべて `inactive` へ戻す。
- Event listener、Timer、TweenをEntity再利用前に解除する。
- Entity idはRun内で追跡可能な一意値を持つ。

## 6. Collision Resolution

優先順:

1. Player shot vs Boss / Enemy。
2. Player vs Power-up。
3. Enemy bullet vs Player。
4. Enemy body vs Player。
5. Offscreen cleanup。

同一フレームでPlayerがPower-upと敵弾に接触した場合:

- Shield / invulnerabilityを付与するPower-upなら取得を先に解決。
- CHEAT DAYのCALORIE加算は敵弾より先に処理。
- CALORIE 100到達後は追加イベントを抑止し、RUN_ENDEDを一度だけ発行。

敵HPが0以下になった後、同一フレームの追加弾で二重撃破・二重加点しない。

## 7. Combo Lifecycle

```text
idle
→ first kill: combo 1, timer 2.0s
→ next kill before expiry: combo +1, timer reset
→ hit or expiry: combo 0
```

- Kill eventの時刻は解決時のGame Clockを使う。
- Pause、Stage/Boss transition中は残時間を維持。
- 画面上は残り時間を薄いバーまたはCombo文字の減衰で示す。
- Bossに継続ダメージを与えるだけではComboは増えない。Boss phase完了時に+1する案はv0.1では採用しない。

## 8. Dodge Lifecycle

Enemy bulletは次のBooleanを持つ。

- `wasThreatening`: Playerの縦位置より上からactiveになった。
- `wasCountedAsDodged`: 初期false。

Playerの基準Yを越え、命中せず画面下へ抜けた時に一度だけdodgedを加算する。横方向に大きく外れ、Playerへ到達可能性がなかった弾もv0.1では同じく加算してよい。近接回避判定はFuture scope。

## 9. Wave Runtime

Wave definitionはデータとして表現する。

```ts
type WaveDefinition = {
  id: string;
  stageId: string;
  durationLimitMs?: number;
  spawns: SpawnCommand[];
  completion: 'ALL_DEFEATED' | 'SURVIVE' | 'BOSS_DEFEATED';
};
```

- SpawnCommandは時刻、Enemy definition、位置、formation idを持つ。
- Wave完了判定は毎フレーム一度だけ。
- 完了後に新規Spawn commandを実行しない。
- Boss Wave開始前に通常Waveの非同期処理を解放する。

## 10. Run State

```ts
type RunState = {
  seed: string;
  stageIndex: number;
  waveIndex: number;
  score: number;
  combo: number;
  maxCombo: number;
  calorie: number;
  caloriesDodged: number;
  shotsFired: number;
  shotsHit: number;
  enemiesKilled: number;
  bossesKilled: number;
  startedAtGameTimeMs: number;
  endedAtGameTimeMs?: number;
  endReason?: 'FAT_OVER' | 'CLEAR';
};
```

RunStateは唯一の集計元とする。HUD、Result、保存処理が独自集計を持たない。

## 11. Persistent State

```ts
type SaveDataV1 = {
  schemaVersion: 1;
  highScore: number;
  bestRank: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | null;
  settings: {
    bgm: boolean;
    se: boolean;
    vibration: boolean;
    screenShake: 'full' | 'reduced' | 'off';
    reducedEffects: boolean;
  };
};
```

- Storage key: `fat-invader.save.v1`。
- JSON parse、schema version、型を検証。
- 不明フィールドは無視。
- 破損時はconsoleへ一度warningし、既定値を採用。ゲームを停止しない。
- Gameplay中の途中保存・Resumeはv0.1対象外。

## 12. Feedback Stack

通常敵撃破の標準順:

```text
0ms      2-frame white flash starts
0ms      collision disabled
0ms      25ms hit stop
20ms     impact sound
25ms     explosion + fragments
30ms     score popup
40ms     combo update / tier check
50ms     small screen shake
250ms    fragments fade
450ms    popup clears
```

連続撃破時はすべてを同じ強度で重ねない。Audio voice limit、Shake accumulator cap、Particle capを適用する。

## 13. Invariants

次は常に真でなければならない。

- `0 <= calorie <= 100`。
- `score >= 0`。
- `combo >= 0` かつ `maxCombo >= combo`。
- 一つのEnemyからKill scoreは一度だけ。
- 一つのEnemy bulletからPlayer hitまたはDodgeは最大一度。
- RUN_ENDEDはRunにつき一度だけ。
- Pause中にRunStateのゲーム統計は変化しない。
- Scene終了後に旧SceneのTimer・listenerが発火しない。
- Restart後のRunStateは保存対象以外すべて初期値。

## 14. Instrumentation for Tests

Productionへ任意操作用のdebug APIを露出しない。E2E buildのみ、次の最小Bridgeを有効化できる。

- 現在stateのread-only snapshot。
- 固定seed指定。
- Wave / hit / clearを再現するテスト専用command。
- FPS、active entity count、pool countの取得。

Bridgeは `VITE_E2E=1` のBuildでのみ含め、Production buildではtree-shakeまたは明示無効化する。

## 15. Balancing Feedback Loop

AIは数値を一度で正解と仮定しない。

1. Seed固定の自動テストで壊れていないことを確認。
2. DesktopとMobileでHuman Gateを実施。
3. 違和感を「入力・視認性・密度・速度・罰・報酬・演出」に分類。
4. `GameBalance` の最小変更で調整。
5. 同じseedで比較し、別seedで過適合を確認。
6. Acceptanceを再実行。

