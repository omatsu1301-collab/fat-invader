# FATインベーダー — Acceptance Criteria and Evidence Plan

**Document ID:** FI-07  
**Version:** 1.0  
**Status:** Release Contract  
**Depends on:** FI-01 through FI-06, FI-08

## 1. Purpose

この文書は「実装した」ではなく「完成を証明した」の基準を定義する。AcceptanceはAIの自己申告ではなく、再現可能なtest、capture、Human Gateの証拠で判定する。

## 2. Severity

| Level | Meaning | Release effect |
| --- | --- | --- |
| P0 | data loss、進行不能、起動不能、公開不能 | 必ず修正 |
| P1 | 主操作不能、頻発crash、重大な表示欠け、倫理的逸脱 | 必ず修正 |
| P2 | 一部挙動不良、演出残留、特定viewport問題 | 原則修正。延期は明示承認 |
| P3 | polish、軽微なcopy、非阻害的visual issue | Known limitation可 |

`MUST` failureはseverityにかかわらずGateを通過しない。

## 3. Evidence Types

- **U:** Unit test。
- **I:** Integration test。
- **E:** Playwright E2E。
- **V:** Screenshot / video / visual comparison。
- **H:** Human playtest approval。
- **P:** Production URL smoke test。
- **R:** Repository evidence（file、config、CI、commit）。

各Acceptance itemは最低一つ、重要項目は二つ以上のEvidenceを持つ。

## 4. Phase 0 Acceptance

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-000 | Clean checkoutからdocumented commandでinstall / buildできる | R, CI | MUST |
| AC-001 | TypeScript strict modeが有効 | R | MUST |
| AC-002 | `typecheck`, `lint`, `test`, `build`, `verify`, `test:e2e` scriptsが存在 | R | MUST |
| AC-003 | Desktop 1440×900でTitle表示、overflowなし | E, V | MUST |
| AC-004 | Mobile 390×844でTitle表示、開始操作可能 | E, V | MUST |
| AC-005 | Console error / page error / failed required requestなし | E | MUST |
| AC-006 | CI workflowがPR相当検証を行う | R, CI | MUST |
| AC-007 | Pages base pathがrepository deploymentに対応 | R, E | MUST |
| AC-008 | Production buildに `window.__FAT_E2E__` が存在しない | E, R | MUST |
| AC-009 | docs 01〜08とCLAUDE.mdがrepositoryにある | R | MUST |

## 5. Milestone A Acceptance — Vertical Slice

### 5.1 Start and controls

| ID | Given / When / Then | Evidence | Priority |
| --- | --- | --- | --- |
| AC-100 | Given Title, when START, then Gameplayが2秒以内に操作可能 | E | MUST |
| AC-101 | Given PC Gameplay, when Left/Right or A/D, thenPlayerが対応方向へ動く | E | MUST |
| AC-102 | Given PC Gameplay, when Space/J held, thenfire intervalに従い連射 | E | MUST |
| AC-103 | Given Mobile, when lower zoneをdrag, thenPlayerが追従しauto-fire継続 | E, H | MUST |
| AC-104 | Given any control, thenPlayer hitboxがplayfield外へ出ない | I, E | MUST |
| AC-105 | Given left+right simultaneous, thenhorizontal velocityは0 | I | SHOULD |
| AC-106 | Game focus中のSpace/Arrowでpage scrollしない | E | MUST |

### 5.2 Combat and CALORIE

| ID | Given / When / Then | Evidence | Priority |
| --- | --- | --- | --- |
| AC-110 | Player shotがEnemyへ当たるとHPが正確に減る | U, I | MUST |
| AC-111 | HPが0になったEnemyは一度だけdestroy / score発生 | U, I | MUST |
| AC-112 | Enemy bullet hitで指定CALORIEだけ増加 | U, I | MUST |
| AC-113 | CALORIEは0未満・100超にならない | U | MUST |
| AC-114 | Hit後650ms中に複数CALORIE加算されない | I | MUST |
| AC-115 | CALORIE 100でRUN_ENDED(FAT_OVER)が一度だけ発生 | U, I, E | MUST |
| AC-116 | CALORIE appearance tierが24/25、49/50、74/75で正しく切替 | U, V | MUST |
| AC-117 | Appearance tierでhitbox sizeが変わらない | I | MUST |

### 5.3 Score and Combo

| ID | Given / When / Then | Evidence | Priority |
| --- | --- | --- | --- |
| AC-120 | Combo 0/5/10/25/50で倍率が1/2/4/8/16 | U | MUST |
| AC-121 | 2.0秒以内の次killでcombo +1とtimer reset | U, I | MUST |
| AC-122 | 2.0秒経過またはPlayer hitでcombo 0 | U, I | MUST |
| AC-123 | Pause / transition中はcombo timerが減らない | I, E | MUST |
| AC-124 | Scoreは同一event列で決定論的 | U | MUST |
| AC-125 | BulletのDodgeは一度だけ集計 | U, I | SHOULD |

### 5.4 Lifecycle

| ID | Given / When / Then | Evidence | Priority |
| --- | --- | --- | --- |
| AC-130 | Fixed seedでTitle→Stage→Boss→Resultへ到達 | E | MUST |
| AC-131 | FAT OVERからRetryで新規Runへ戻る | E | MUST |
| AC-132 | ResultからRetry / Titleが機能 | E | MUST |
| AC-133 | Pause中にentity、timer、score、CALORIEが変化しない | I, E | MUST |
| AC-134 | visibility hidden相当でauto-pause | I, E | MUST |
| AC-135 | Retry 10回後、listener / timer / pool active数が増殖しない | I, E | MUST |
| AC-136 | 旧Runのbullet、tween、audioが次Runへ残らない | E | MUST |

### 5.5 Gate A visual / human

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-140 | Player、enemy、enemy bullet、player bullet、pickupが識別可能 | V, H | MUST |
| AC-141 | 入力から移動の反応が許容範囲 | H | MUST |
| AC-142 | 被弾理由が理解できる | H | MUST |
| AC-143 | 一周後に「核を伸ばせる」とCreative Directorが採用 | H | MUST |

## 6. Milestone B Acceptance — Game Feel

### 6.1 Kill feedback

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-200 | Normal killにflash、hit stop、explosion、fragment、score popup、combo updateがある | I, V | MUST |
| AC-201 | Kill scoreはeffectの有無に関係なく同じ | U, I | MUST |
| AC-202 | Kill feedback開始がcollisionから知覚上100ms以内 | V, H | MUST |
| AC-203 | 同時killで二重scoreやdestroy errorなし | I, E | MUST |
| AC-204 | Effect cap到達時もgameplay projectileが不正消失しない | I | MUST |

### 6.2 Readability and comfort

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-210 | 360 / 390 / 430 widthでenemy bulletsを継続追跡可能 | V, H | MUST |
| AC-211 | Reduced Effectsでparticle、shake、flash強度が低下 | I, V | MUST |
| AC-212 | Shake OffでGameplay resultを変えずshake 0 | I, V | MUST |
| AC-213 | 敵弾は色を除いても形・outlineで味方弾と区別 | V, H | MUST |
| AC-214 | Combo calloutが中央playfieldを400ms超隠さない | V | MUST |
| AC-215 | 音なしでもattack tell / hit / stage stateが理解可能 | H | SHOULD |

### 6.3 Audio

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-220 | User gesture前に音声再生errorを起こさない | E | MUST |
| AC-221 | BGM / SE設定が個別に反映・保存 | I, E | MUST |
| AC-222 | Restart / scene transitionでBGMが重複しない | E | MUST |
| AC-223 | Concurrent voice数がbudget内 | I | SHOULD |

### 6.4 Game Feel Human Gate

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-230 | 単体撃破が気持ちいいと採用 | H | MUST |
| AC-231 | Combo上昇で気持ちよさが増すと採用 | H | MUST |
| AC-232 | 派手さが回避の妨げにならないと採用 | H | MUST |
| AC-233 | 食べ物が「危険かつおいしそう」と採用 | H | MUST |

Human Gate 2 (2026-09-08): **CONDITIONAL PASS / 修正付き採用（正式PASSではない）。** AC-230 / AC-231 は PASS「ちょうどいい」（通常敵kill feelは非変更）。Boss deathは3-beatへ強化。AC-232 / AC-233 はplaceholderのため保留し、最終ドット素材導入後に再判定する。

## 7. Milestone C Acceptance — Content

### 7.1 Content completeness

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-300 | 3 Stageすべてに通常WaveとBossがある | R, E | MUST |
| AC-301 | 通常敵5種以上が到達可能 | R, E | MUST |
| AC-302 | Food bullet visual / behavior combinationが10以上 | R, E | MUST |
| AC-303 | Boss 3体がintro、phase1、phase2、rage、deadを一度ずつ遷移可能 | I, E | MUST |
| AC-304 | Power-up 5種が取得・終了・併用ruleどおり | U, I, E | MUST |
| AC-305 | Runtime appearance 4段階、Result appearance 6段階が存在 | R, V | MUST |
| AC-306 | 全content id、asset id、pattern idがvalidationを通る | U | MUST |

### 7.2 Full run

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-310 | Fixed seed 3種で進行不能なくRun clear可能 | E | MUST |
| AC-311 | Boss撃破後にenemy bullet hitが発生しない | I, E | MUST |
| AC-312 | Stage間でCALORIEを引継ぎ10減少 | U, I | MUST |
| AC-313 | Full scripted runが想定3〜5分の範囲または調整根拠あり | E, H | MUST |
| AC-314 | Run clear時だけevaluationScoreを計算 | U, I | MUST |
| AC-315 | Rank境界34/35、49/50、64/65、79/80、94/95が正しい | U | MUST |
| AC-316 | High score / best rankが改善時だけ更新 | U, I | MUST |

### 7.3 Fairness

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-320 | 高速・laser・突進攻撃に視覚予告がある | V, H | MUST |
| AC-321 | 画面外から予告なしのhitがない | I, E | MUST |
| AC-322 | Bossに最低一つの安全経路が継続的に存在 | scripted analysis, H | MUST |
| AC-323 | RNG seedで避けられない重なりが生成されない | E | MUST |
| AC-324 | CHEAT DAYのcostが取得前に理解可能 | V, H | SHOULD |

## 8. Milestone D Acceptance — Release

### 8.1 Responsive matrix

| ID | Viewport | Requirement | Evidence |
| --- | --- | --- | --- |
| AC-400 | 360×640 | Title、HUD、Pause、Result欠けなし | E, V |
| AC-401 | 390×844 | Touch drag、auto-fire、safe area正常 | E, H |
| AC-402 | 430×932 | 不自然な引伸ばし・操作領域ずれなし | E, V |
| AC-403 | 1440×900 | Keyboard操作、中央配置、過大UIなし | E, V |

上記はすべてMUST。

### 8.2 Persistence and lifecycle

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-410 | Reload後にsettings / high score保持 | E | MUST |
| AC-411 | Corrupt saveでcrashせずdefaultへ | U, E | MUST |
| AC-412 | Storage unavailableでもplay可能 | I | MUST |
| AC-413 | Background→foregroundでjump、instant hit、audio duplicateなし | E, H | MUST |
| AC-414 | Pause overlayからresume / titleが機能 | E | MUST |

### 8.3 Quality and performance

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-420 | `npm run verify` success | CI, R | MUST |
| AC-421 | Full Playwright suite success | CI | MUST |
| AC-422 | Gameplay console error / uncaught exception / failed required assetなし | E | MUST |
| AC-423 | 10 retry / 10 minute stressでactive count増殖なし | I, E | MUST |
| AC-424 | Enemy bullet absolute cap 220、particle cap 320を超えない | I, E | MUST |
| AC-425 | 対象実機で長時間55fps未満が継続しない | H, measured log | SHOULD |
| AC-426 | 初期必須asset 5MB目標、超過時に理由とloading対策 | R | SHOULD |

### 8.4 Production

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-430 | Main CI success SHAとdeploy source SHAが一致 | R, P | MUST |
| AC-431 | Public URLが200でTitle表示 | P | MUST |
| AC-432 | Public URLでStart、move、pause、retryが可能 | P | MUST |
| AC-433 | Asset pathがrepository base pathで404にならない | P | MUST |
| AC-434 | ProductionにE2E bridge、secret、不要debug overlayなし | P, R | MUST |
| AC-435 | 前回版を壊すmanual upload手順に依存しない | R | MUST |

### 8.5 Legal and tone

| ID | Requirement | Evidence | Priority |
| --- | --- | --- | --- |
| AC-440 | 全外部assetのlicense / source / author記録 | R | MUST |
| AC-441 | 実在brand logo / protected character模倣なし | V, R | MUST |
| AC-442 | 実kcal消費・医学的減量効果の主張なし | R, V | MUST |
| AC-443 | Rank / FAT OVER copyがFI-08 boundaryに適合 | R, H | MUST |
| AC-444 | D〜SSすべての姿に尊厳・能力・愛嬌がある | V, H | MUST |

## 9. Human Gate Protocol

AIは「採用された」と推測しない。Creative Directorの明示的な `採用 / 修正 / 保留` を記録する。

### Gate evidence package

- 対象commit SHA。
- Preview URL。
- 画面サイズを記載したscreenshots。
- 操作開始から該当結果までのvideo。
- Automated test summary。
- Known issues。
- 判断してほしい項目を最大5点。

### Human feedback conversion

例:

```text
Raw: 「爆発はいいが、何に当たったか分からん」
Classification: readability / VFX density
Acceptance delta: enemy bullet silhouette must remain visible during adjacent kill VFX
Candidate tuning: particle opacity 0.8→0.5, lifetime 450→280ms, bullet outline +1px
Non-change: explosion size and impact SE remain
```

AIは感想を一つの巨大改修へ翻訳せず、維持すべき点と変える点を分離する。

## 10. Release Blocking Checklist

次のどれかが真ならReleaseしない。

- MUST failureが1件以上。
- Gate 3が明示承認されていない。
- CI / deployのSHAが不一致。
- Production smoke未実施。
- Known P0 / P1 issueがある。
- Asset license不明。
- Mobileで主操作不能。
- E2E bridgeがProductionに存在。
- 人の身体を侮辱するcopy / artが残る。

## 11. Completion Report Template

```markdown
## Outcome
- Milestone:
- Status: PASS / CONDITIONAL / FAIL
- Commit SHA:
- PR:
- Preview / Production URL:

## Implemented
- ...

## Verification
| Command / check | Result | Evidence |
| --- | --- | --- |
| npm run verify | PASS | ... |
| npm run test:e2e | PASS | ... |

## Acceptance
- Passed: AC-...
- Failed: AC-...
- Not applicable: AC-... with reason

## Independent audit findings
- ...

## Known limitations
- Severity / scope / workaround

## Human decision required
- Gate question and choices
```

## 12. Traceability Rule

実装PRは、説明欄に該当Acceptance IDを列挙する。Acceptance IDなしの変更は、bug fix、refactor、docs、toolingのいずれかへ分類し、目的を明記する。Test名にも主要IDを含めてよい。

