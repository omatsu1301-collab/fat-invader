# FATインベーダー — Game Design Specification

**Document ID:** FI-02  
**Version:** 1.0  
**Status:** Implementation Baseline  
**Depends on:** FI-01, FI-03, FI-08

## 1. Design Intent

プレイヤーが行う判断は複雑にしない。

- 今撃つか。
- 今どちらへ避けるか。
- 危険な位置のパワーアップを取りに行くか。
- CHEAT DAYの利益とCALORIE増加を受け入れるか。

複雑さは操作ではなく、敵弾の組合せ、コンボ維持、視覚演出の上昇から生む。

## 2. Runtime States

```text
BOOT
  → TITLE
  → PLAYING
      ↔ PAUSED
      → STAGE_CLEAR → PLAYING
      → FAT_OVER
      → RUN_CLEAR → RESULT
  → TITLE or RETRY
```

同時に二つの主状態を持たない。PauseはPLAYINGの上に載る一時状態だが、ゲーム時間は完全停止する。

## 3. Playfield and Camera

- 論理解像度: `390 × 844`。
- プレイ領域: 上端48pxから下端760pxまでを基準とする。
- HUD: 上部にScore、Combo、CALORIE、Pause。
- Player anchor: 画面下部約86%。
- Camera: 固定。ズームや揺れは一時的演出のみ。
- Scale: `FIT` と中央寄せ。Safe AreaはDOM/CSSまたはゲーム内余白で吸収する。
- Playfield外に弾や敵が残り続けない。

## 4. Controls

### 4.1 Desktop

| Action | Primary | Alternate |
| --- | --- | --- |
| Move left | Left Arrow | A |
| Move right | Right Arrow | D |
| Shoot | Space | J |
| Pause / resume | Esc | P |
| Confirm | Enter | Space |
| Mute | M | — |

- 左右同時入力は速度0。
- Shoot押下中は射撃間隔に従い連射する。
- ブラウザのスクロールを引き起こすキーイベントはゲームフォーカス中に抑止する。

### 4.2 Mobile

- 画面下部45%で指を左右へドラッグして移動。
- 指の位置へ瞬間移動せず、最大速度と加速制限に従い追従する。
- 自動射撃を標準とする。
- Pauseは右上ボタン。
- タッチ開始位置に仮想スティックを描画しない。必要なら薄い追従ガイドのみ表示する。
- 二本目以降のタッチは無視し、主ポインターを安定させる。

### 4.3 Control quality baseline

- Player base speed: `330 logical px/s`。
- Acceleration to max: `≤ 90ms`。
- Release deceleration: `≤ 70ms`。
- Player hitbox: 見た目幅の約60%、高さの約70%。
- 入力遅延の人工的追加は禁止。

## 5. Player Model

### 5.1 Core stats

| Property | Baseline |
| --- | ---: |
| CALORIE start | 0 |
| CALORIE maximum | 100 |
| Base move speed | 330 px/s |
| Base fire interval | 180 ms |
| Default shot damage | 1 |
| Hit invulnerability | 650 ms |
| Max simultaneous player shots | 24 |

通常のHPは持たない。CALORIEのみが失敗条件である。

### 5.2 Real-time appearance tiers

| CALORIE | Tier | Gameplay effect |
| --- | --- | --- |
| 0–24 | Light | なし |
| 25–49 | Rounded | なし |
| 50–74 | Heavy | なし |
| 75–99 | Overflowing | 移動速度 -8% |

外見変化は滑らかなMorphを必須とせず、短い煙・閃光を伴うSprite切替でよい。能力低下は最終段階だけに限定し、罰の連鎖を強くしすぎない。

### 5.3 Hit sequence

```text
Collision
→ incoming calorie value is applied
→ 45ms hit stop
→ 2-frame white flash
→ knock feedback / short shake
→ "+NN CAL" popup
→ 650ms invulnerability
→ appearance tier check
→ CALORIE >= 100ならFAT OVER
```

無敵中の敵弾はPlayerを通過するか消滅する。連続多段ヒットは禁止する。

## 6. Player Weapons

### 6.1 Default weapon

`METABOLIC SHOT`

- 正面1発。
- 速度: 680 px/s。
- Damage: 1。
- 発射間隔: 180ms。
- 弾は上端退出または衝突で回収。

### 6.2 Power-ups

同種の時間延長は上限12秒。PROTEIN、CAFFEINE、CARDIOは併用可。取得率と持続は `GameBalance` で調整する。

| Item | Effect | Duration / cost |
| --- | --- | --- |
| PROTEIN | Damage 2、弾を太くする | 8秒 |
| CAFFEINE | 射撃間隔を110msへ短縮 | 8秒 |
| CARDIO | 移動速度+25%、残像 | 8秒 |
| FAT BURN | 敵弾消去＋画面内通常敵へ5 damage | 即時 |
| CHEAT DAY | 3-way＋無敵 | 5秒、取得時CALORIE +20 |

CHEAT DAYでCALORIEが100以上になる場合も即FAT OVER。ただし取得前に危険が明確に読めるアイコン・説明を出す。

### 6.3 Drop rules

- 通常敵撃破時の基本Drop率: 6%。
- 12秒間Dropがない場合、次の有資格敵で確率を段階的に上げる。
- Boss撃破時はDropしない。
- 画面内Power-upは最大2個。
- Drop抽選はseeded RNGを通す。

## 7. Enemy Model

### 7.1 Common properties

すべての敵定義は次の型を満たす。

```ts
type EnemyDefinition = {
  id: string;
  maxHp: number;
  score: number;
  movementPattern: string;
  firePattern: string;
  fireRateMs: number;
  bulletId: string;
  dropEligible: boolean;
  contactCalorie: number;
};
```

### 7.2 Release roster

| Enemy | Role | HP | Base score | Typical behavior |
| --- | --- | ---: | ---: | --- |
| FRY SCOUT | 基本兵 | 1 | 100 | 編隊移動、単発ポテト弾 |
| DONUT DRIFTER | 変則兵 | 2 | 180 | 波形移動、輪を抜ける弾 |
| SODA TANK | 耐久兵 | 4 | 320 | 遅い、タピオカ散弾 |
| PIZZA CUTTER | 突進兵 | 2 | 250 | 予告後に斜め突進 |
| CAKE CASTER | 弾幕兵 | 3 | 300 | 予告後に扇状弾 |

敵の接触もCALORIEを増加させる。接触値は基本20。敵は接触後に破壊または離脱し、重複ヒットしない。

## 8. Enemy Bullets

### 8.1 Required principles

- Hitboxは見た目より小さくする。
- 危険色の輪郭を付け、背景とVFXから分離する。
- 速い弾ほど発射予告を長くする。
- 画面外から予告なしにPlayerへ到達する弾は禁止。
- 食べ物らしさは保ちつつ、回転やハイライトで弾と背景物を区別する。

### 8.2 Pattern baseline

| Bullet | CALORIE | Speed | Pattern |
| --- | ---: | ---: | --- |
| FRY | 10 | 190 | 直線 |
| DONUT | 14 | 170 | 緩いSin波 |
| PIZZA SLICE | 18 | 240 | 予告付き斜線 |
| TAPIOCA | 8 | 210 | 5発散弾、粒ごとに判定 |
| CAKE | 22 | 150 | 大型低速 |
| SODA LASER | 24 | — | 600ms予告後、350ms照射 |

同一攻撃の散弾が無敵時間内に複数当たっても一回分しか加算しない。

## 9. Boss Design

Bossは `intro → phase1 → phase2 → rage → dead` の状態機械を持つ。HP割合と経過時間で遷移し、各攻撃は明確な予告を伴う。

### 9.1 KING BURGER

- 学習目標: 広い弾の隙間と横移動。
- HP baseline: 45。
- Phase 1: 3-way FRY。
- Phase 2: バンズ落下＋安全地帯。
- Rage: 左右移動を速め、交互射撃。

### 9.2 PIZZA MOTHER

- 学習目標: 回転パターンと位置取り。
- HP baseline: 60。
- Phase 1: PIZZA SLICE扇状弾。
- Phase 2: ゆっくり回転する8方向弾。
- Rage: 予告付き突進を混ぜる。

### 9.3 KING CALORIE

- 学習目標: 既知パターンの複合と短い高密度回避。
- HP baseline: 85。
- Phase 1: FRY / DONUT複合。
- Phase 2: TAPIOCA散弾＋SODA LASER。
- Rage: 画面中央へ移動し、間隔を狭めた複合弾幕。
- 撃破時は通常の3倍規模の演出、短いSlow Motion、RUN CLEARへ遷移。

## 10. Wave Structure

### Stage 1 — BURGER DISTRICT

1. FRY SCOUT編隊
2. FRY + DONUT混成
3. SODA TANK導入
4. KING BURGER

### Stage 2 — PIZZA ORBIT

1. DONUT波形
2. PIZZA CUTTER導入
3. PIZZA + SODA混成
4. PIZZA MOTHER

### Stage 3 — BUFFET APOCALYPSE

1. CAKE CASTER導入
2. 全通常敵混成
3. 高密度Final Wave
4. KING CALORIE

Waveは固定定義とseeded RNGの微小変化を組み合わせる。完全ランダム配置は禁止。初見学習可能性を優先する。

## 11. Scoring

### 11.1 Combat score

```text
killScore = enemy.baseScore × comboMultiplier
stageClearBonus = 5,000 × stageNumber
bossNoHitBonus = 3,000 × stageNumber
runClearBonus = 20,000
```

### 11.2 Combo

- 敵撃破でCombo +1。
- 最後の撃破から2.0秒で失効。
- 被弾でComboは0へ戻る。
- BossのPhase移行演出中はComboタイマーを停止する。

| Combo | Multiplier | Callout |
| ---: | ---: | --- |
| 0–4 | ×1 | — |
| 5–9 | ×2 | WARM UP |
| 10–24 | ×4 | FAT BURN |
| 25–49 | ×8 | SHREDDED |
| 50+ | ×16 | ABSURDLY LEAN |

倍率上昇は派手に通知するが、プレイ領域中央を400ms以上隠さない。

### 11.3 Accuracy

`shotsHit / shotsFired`。FAT BURNなど画面効果は分母・分子に含めない。3-wayは発射された各弾を1 shotと数える。

### 11.4 Calories dodged

弾がPlayerの縦位置を通過して画面外へ出た時、その弾のCALORIE値を `caloriesDodged` に加算する。一発につき一度だけ計上する。現実の消費量ではない。

## 12. Result Evaluation and Appearance

RUN CLEAR時に0〜100の `evaluationScore` を計算する。

```text
clear                = 35
combat               = min(totalScore / targetScore, 1) × 25
avoidance             = (1 - finalCalorie / 100) × 20
combo                 = min(maxCombo / 50, 1) × 10
accuracy              = min(accuracy / 0.70, 1) × 10
evaluationScore       = round(sum)
```

`targetScore` の初期値は120,000。バランステスト後に設定値だけ変更できる。

| Evaluation | Rank | Appearance concept | Copy baseline |
| ---: | --- | --- | --- |
| 0–34 | D | ふっくらした生還者 | 「誘惑は強かった。君も生きている。」 |
| 35–49 | C | 標準的な勇者 | 「だいたい健康そう。たぶん。」 |
| 50–64 | B | 引き締まり | 「数字が君を褒めはじめた。」 |
| 65–79 | A | アスリート | 「仕上がっている。話が通じる範囲で。」 |
| 80–94 | S | 極端な超仕上がり | 「BODY FAT 3% — WARNING」 |
| 95–100 | SS | 人類をやめた抽象体 | 「ERROR: 美が物理法則を突破」 |

FAT OVER時も侮辱的な敗北絵にしない。主人公は満腹・膨張・困惑などコミカルな状態で、即リトライ可能とする。

## 13. Difficulty

v0.1は単一の標準難度。Adaptive difficultyは実装しない。

調整順序は次のとおり。

1. 弾の可読性。
2. 入力追従。
3. 安全地帯の幅。
4. 発射間隔。
5. 敵HP。
6. Drop率。
7. スコア閾値。

難しくするために視認性を落とさない。プレイヤー死亡の80%以上が「何に当たったか分かる」状態を目標とする。

## 14. Accessibility and Comfort

- 強いフラッシュ軽減: 白フラッシュの輝度・回数を減らす。
- 画面揺れ軽減: Shakeを0〜25%へ。
- Reduced Effects: 粒子数と色収差を減らす。
- Vibration toggle。
- 色だけに依存せず、形・輪郭・動きでPlayer弾と敵弾を区別する。
- 重要文字は最低12 logical px相当、本文は14以上を目安とする。
- 音なしでも攻撃予告と被弾が理解できる。

## 15. Tuning Rule

上記数値はすべて `GameBalance` の初期値であり、コードへ分散させない。Human Gateで「遅い」「うるさい」「理不尽」などの評価が出た場合、まず設定値で直し、構造変更は設定で解決できない時だけ行う。

