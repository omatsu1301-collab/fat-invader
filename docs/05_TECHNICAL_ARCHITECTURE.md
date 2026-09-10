# FATインベーダー — Technical Architecture

**Document ID:** FI-05  
**Version:** 1.0  
**Status:** Architecture Decision Baseline  
**Depends on:** FI-01, FI-02, FI-03

## 1. Architecture Decision

採用構成:

```text
Vite
TypeScript (strict)
Phaser
Vitest
Playwright
oxlint or equivalent fast linter
GitHub Actions
GitHub Pages
```

Reactはv0.1では採用しない。Title、HUD、Pause、ResultをPhaser Scene / Game Objectで一貫して管理し、ゲーム状態とReact状態の二重化を避ける。将来、ゲーム外の複雑なメニューやアカウントUIが必要になった時点で再評価する。

## 2. Decision Rationale

| Option | Strength | Risk for this project | Decision |
| --- | --- | --- | --- |
| Raw Canvas | 基礎構造が見える、依存が少ない | 衝突、音、Camera、Tween、Poolを自作し、完成が遅れる | Reject for v0.1 |
| PixiJS | 描画性能、柔軟性 | ゲームライフサイクルと物理の設計量が増える | Reserve |
| React + Canvas | UI開発に親和 | 2状態系統、rerender境界の事故 | Reject for v0.1 |
| Phaser | Scene、input、camera、audio、animation、Arcade Physicsを統合 | Engine API依存 | Adopt |

目的はゲームエンジンの自作ではなく、AI主軸で手戻りを抑え、プレイ可能な完成品を公開すること。Phaserの規約に寄せる。

## 3. Repository Structure

```text
/
  CLAUDE.md
  README.md
  package.json
  vite.config.ts
  tsconfig.json
  playwright.config.ts
  .github/workflows/ci.yml
  .github/workflows/deploy.yml
  docs/
    01_PRODUCT_SPEC.md
    02_GAME_DESIGN.md
    03_CORE_LOOP.md
    04_ART_DIRECTION.md
    05_TECHNICAL_ARCHITECTURE.md
    06_IMPLEMENTATION_ROADMAP.md
    07_ACCEPTANCE_CRITERIA.md
    08_TONE_AND_SATIRE.md
    09_ART_ASSET_INVENTORY.md
    10_PIXEL_ASSET_SPEC.md
  public/assets/
  src/
    main.ts
    game/config.ts
    game/GameApp.ts
    game/scenes/
      BootScene.ts
      TitleScene.ts
      GameScene.ts
      ResultScene.ts
    game/domain/
      run-state.ts
      calorie.ts
      combo.ts
      scoring.ts
      evaluation.ts
      events.ts
    game/entities/
      Player.ts
      Enemy.ts
      Boss.ts
      Projectile.ts
      PowerUp.ts
    game/systems/
      InputSystem.ts
      CombatSystem.ts
      WaveSystem.ts
      BossSystem.ts
      FeedbackSystem.ts
      AudioSystem.ts
      PersistenceSystem.ts
    game/content/
      enemies.ts
      bullets.ts
      bosses.ts
      powerups.ts
      stages.ts
      waves.ts
      asset-manifest.ts
    game/config/
      balance.ts
      accessibility.ts
    game/ports/
      Clock.ts
      Random.ts
      Storage.ts
    game/adapters/
      PhaserClock.ts
      SeededRandom.ts
      LocalStorageAdapter.ts
    ui/
      hud/
      components/
    styles/
      global.css
    test-support/
      e2e-bridge.ts
  tests/
    unit/
    integration/
    e2e/
```

実装中に構造を小さく保つための統合は許可するが、domainとPhaser依存の分離、contentのデータ駆動、test-only bridgeの隔離は維持する。

## 4. Dependency Rules

```text
content/config ──────┐
domain ──────────────┼→ systems → scenes → Phaser runtime
ports ← adapters ────┘
events → feedback/audio/ui
```

- `domain` はPhaserをimportしない。
- `content` は実行時mutable stateを持たない。
- `systems` はSceneの全体遷移を所有しない。
- Sceneは高水準orchestrationを担当し、スコア式やCALORIE式を実装しない。
- Audio/VFX/UIはdomain eventを購読し、戦闘結果を決めない。
- `localStorage` を直接呼ぶのはStorage adapterのみ。

## 5. TypeScript Rules

- `strict: true`。
- `noUncheckedIndexedAccess: true`。
- `exactOptionalPropertyTypes: true` を可能なら有効化。
- `any` 禁止。外部境界では `unknown` を検証する。
- Non-null assertionはPhaser lifecycle上の根拠をコメントできる時だけ。
- Discriminated unionでScene state、Boss state、Game eventを表す。
- Content idはliteral unionまたはbranded stringで誤記を減らす。

## 6. Runtime Architecture

### 6.1 Scenes

- `BootScene`: Asset preload、save load、error fallback。
- `TitleScene`: Title、controls、settings、start。
- `GameScene`: Run全体を保持。Stageは同一Scene内で切替可能。
- `ResultScene`: Clear / FAT OVER統計、appearance、retry。

Pauseは別Scene overlayまたはGameSceneの状態として実装できるが、Game Clock停止を一箇所で保証する。

### 6.2 Physics

- Phaser Arcade Physicsを利用。
- 重力なし。
- 速度ベースの移動。
- Player / enemy / projectile / pickupはcollision categoryを分ける。
- 見た目より小さいhitboxを明示設定。
- Physics callback内で破壊せず、resolution queueへ積む。

### 6.3 Timing

- Phaser deltaをClock adapterへ渡す。
- deltaを50msでclamp。
- Pause、visibility hiddenでGame Clockを停止。
- `setTimeout` をゲームロジックに使わない。
- Engine timer / Timelineを生成した所有者がshutdownで解除する。

### 6.4 Randomness

- Production seed: 起動時のsecure-enough random stringでよい。
- Test seed: 明示文字列。
- Wave微調整、drop、fire jitter、formationは `gameplayRandom` のみ使う。
- FeedbackSystemの装飾（particle方向、fragment数、shake offset）は `vfxRandom` のみ使う。
- 両streamは同一run seedから派生し、互いに消費数を共有しない。Full / Reduced / OffでVFXの乱数消費が変わっても敵発射時刻は一致する。
- `Math.random()` の直接使用は禁止。

## 7. Data-driven Content

Enemy、bullet、power-up、wave、boss phaseはTypeScript data objectとして定義する。

```ts
export const enemies = {
  fryScout: {
    id: 'fryScout',
    maxHp: 1,
    score: 100,
    movementPattern: 'formationSweep',
    firePattern: 'singleDown',
    fireRateMs: 1400,
    bulletId: 'fry',
    dropEligible: true,
    contactCalorie: 20,
  },
} as const satisfies Record<string, EnemyDefinition>;
```

データ参照前に開発時validationを行い、存在しないasset id、pattern id、負数HPなどをFail Fastする。

## 8. GameBalance

調整可能な数値を `src/game/config/balance.ts` に集約する。

Categories:

- player movement / fire
- calorie and invulnerability
- combo thresholds / window / multipliers
- enemy HP / speed / rate
- bullet speed / calorie
- power-up rate / duration
- VFX caps / shake / hit stop
- stage pacing
- result target score / thresholds

各値に単位をsuffixまたは型で示す。例: `comboWindowMs`, `playerSpeedPxPerSec`。バランス値変更だけのPRでは、変更理由とBefore/Afterの観察を記録する。

## 9. Object Pools and Caps

必須Pool:

- player projectiles
- enemy projectiles
- common enemies
- particles / fragments
- score popups
- pickups

初期上限:

| Object | Cap |
| --- | ---: |
| Player projectile | 32 |
| Enemy projectile | 220 |
| Normal enemy | 40 |
| Pickup | 2 active / 6 pooled |
| Particle | 320 |
| Score popup | 20 |

Cap到達時の方針:

- 新規decorative particleは捨てる。
- Gameplay projectileは無言で捨てず、発射側Patternをcap-awareにする。
- Pool不足をdevelopment telemetryへ記録。
- Production consoleをspamしない。

## 10. Rendering

- Phaser scale mode `FIT`、autoCenter。
- Pixel art textureはnearest filter。
- Camera shake、zoom、post-like effectsはGameplay cameraへ限定し、HUD cameraを分離する。
- DOM全体へのCSS transformでShakeしない。
- 背景、gameplay、VFX、HUDのdepth rangeを定数化。
- Particleがenemy bulletより前面に長く残らない。

## 11. Audio

- 最初のuser gesture後にAudio開始。
- BGM / SE busを分離。
- 設定変更を即時反映し保存。
- Visibility hiddenでBGMをpauseまたはfade。
- Scene restartでBGMが二重再生されない。
- Audio unavailableでもGameplayは続行する。
- 同時voice上限はFI-04に従う。

## 12. Persistence

- Adapterを介して `fat-invader.save.v1` を読み書き。
- Runtime schema guardを実装。小規模なら依存ライブラリを増やさず手書きguardでよい。
- Writeは設定変更、new high score、best rank更新時のみ。
- Storage例外はcatchし、memory fallback。ゲームを止めない。
- 個人情報、プレイ履歴詳細、分析IDは保存しない。

## 13. Error Handling

- Boot asset failure: 重要assetなら簡潔なRetry画面。装飾assetならfallback。
- Audio failure: mute扱いで継続。
- Save failure: memory fallbackで継続。
- Invalid content definition: development/testではthrow、production build前にtestで検出。
- Runtime fatal: 可能ならTitleへ戻すが、原因を隠して無限再起動しない。

## 14. Test Architecture

### 14.1 Unit tests

VitestでPhaser非依存領域を検証:

- CALORIE clamp / FAT OVER。
- Combo増加、期限、被弾reset。
- Score multiplier。
- Evaluation rank境界。
- Save migration / corrupt fallback。
- Seeded RNG再現性。
- Wave validation。

### 14.2 Integration tests

- Event sequence: hit → kill → score → combo。
- PauseでClock停止。
- RestartでRunStateとentity poolがreset。
- Boss phase transitionが一度だけ。
- Scene shutdownでlistener / timer解放。

### 14.3 E2E

PlaywrightでDesktopとMobileを検証。E2E用Buildに限りtest bridgeと固定seedを利用できる。見た目の承認をE2Eだけで代替しない。

## 15. E2E Bridge Safety

```ts
declare global {
  interface Window {
    __FAT_E2E__?: FatE2EBridge;
  }
}
```

- `import.meta.env.VITE_E2E === '1'` の場合だけ生成。
- Production deploy workflowでは値を設定しない。
- Production bundle確認testで `__FAT_E2E__` が存在しないことを検証。
- BridgeはDOM evaluationからcommandとsnapshotを提供し、内部object参照を返さない。

## 16. Commands Contract

package scriptsは最低限次を提供する。

```text
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run verify
```

`verify` は `typecheck → lint → unit/integration test → build` を実行する。E2EはCIの専用jobでもよい。

## 17. CI and Deploy

### Pull request CI

1. Clean install from lockfile。
2. Typecheck。
3. Lint。
4. Unit / integration tests。
5. Production build。
6. Playwright critical path。
7. Artifactとしてfailure screenshot / traceを保存。

### Main deploy

1. 同一lockfileでbuild。
2. GitHub Pagesのbase pathをrepository名に合わせる。
3. Pagesへdeploy。
4. Public URL smoke test。

Deploy失敗時に前回の公開版を破壊しないworkflowを採用する。

## 18. Security and Supply Chain

- Dependency追加は目的、代替、bundle影響をPRへ記載。
- lockfileをcommit。
- 信頼できるregistry packageのみ。
- secretをclient bundle、repository、test fixtureへ入れない。
- 外部API、広告SDK、analyticsはv0.1で使用しない。
- ユーザー入力をHTMLとして描画しない。
- GitHub Actionsは可能な範囲で権限を最小化。

## 19. Performance Budget

- Core JS gzip: 1.5MB未満を目標。Phaserを含め計測する。
- 初期必須asset: 5MB未満を目標。
- 非必須Stage assetはStage前読み込みを検討。
- 通常時active enemy bullets: 160以下を目安、絶対cap 220。
- Long task: Gameplay中50ms超を継続発生させない。
- 10回Retry後、active listener / timer / entity数が初回baselineから増え続けない。

## 20. Architecture Guardrails

禁止:

- Scene単一ファイルへ全ロジックを集約する。
- 任意箇所からGlobal mutable stateを書き換える。
- `Math.random()`、ゲームロジック内`setTimeout()`。
- 表示側でScore、Rank、CALORIEを再計算する。
- Projectileごとの毎Frame allocationを大量発生させる。
- Human Gate前のpremature shader / ECS / custom engine導入。
- Testを通すためだけのProduction behavior分岐。

## 21. Architecture Change Procedure

新ライブラリ、状態管理方式、Scene構成、保存schema、deploy方式を変更する場合:

1. 問題を再現可能な形で記述。
2. 現構成で解決できない理由を示す。
3. 最小2案を比較。
4. 影響するdocsとtestsを列挙。
5. Architect approval後に変更。

単なる実装の好みで構成を広げない。

