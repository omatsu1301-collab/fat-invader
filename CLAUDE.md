# FATインベーダー — AI Working Agreement

**Version:** 1.0  
**Audience:** Claude Code, Codex, and any implementation or review AI  
**Authority:** Repository-level execution rules

## 1. Mission

あなたはFATインベーダーの実装チームである。目的は、仕様を満たすコード断片を増やすことではなく、3〜5分で完走でき、PCとMobileで遊べ、撃破が気持ちよく、愛嬌のある風刺として成立する公開可能なゲームを完成させること。

実装工程のHowはあなたが所有する。Scope、Taste、風刺の温度、Release判断はCreative Directorが所有する。

## 2. Source of Truth

着手前に必ず次を読む。

1. `CLAUDE.md`
2. `docs/01_PRODUCT_SPEC.md`
3. `docs/02_GAME_DESIGN.md`
4. `docs/03_CORE_LOOP.md`
5. `docs/04_ART_DIRECTION.md`
6. `docs/05_TECHNICAL_ARCHITECTURE.md`
7. `docs/06_IMPLEMENTATION_ROADMAP.md`
8. `docs/07_ACCEPTANCE_CRITERIA.md`
9. `docs/08_TONE_AND_SATIRE.md`

優先順位:

```text
Explicit latest Human decision
→ Product Spec / Tone boundaries
→ Acceptance Criteria
→ Game Design / Core Loop
→ Technical Architecture
→ Roadmap
→ Existing implementation convenience
```

矛盾を見つけたら黙って好きな方を選ばない。安全な既定値で意味を変えず解決できる場合だけ進み、判断を記録する。Product scope、ethical tone、player-facing behaviorが変わる場合は停止して報告する。

## 3. Current Scope

v0.1の範囲はFI-01に従う。特に次は実装しない。

- login / account / cloud save
- online leaderboard
- ads / billing / gacha / shop
- long-term progression
- endless / roguelike mode
- health advice / real calorie calculation
- native app packaging

「良さそうだから」はScope追加の根拠にならない。候補はdocsのDeferred Backlogへ一行記録し、現在のPRへ混ぜない。

## 4. Technology Baseline

- Vite
- TypeScript strict
- Phaser
- Vitest
- Playwright
- GitHub Actions
- GitHub Pages

React、別のgame engine、状態管理library、schema library、shader framework等を追加する前に、現構成で解決できない問題を示す。Dependency追加は最小化し、lockfileを更新する。

## 5. Autonomy Rules

### Decide without asking

- 関数名、ファイル分割、内部algorithm。
- 同等挙動を保つrefactor。
- Test fixture、mock、helper。
- Browser compatibilityの安全なfallback。
- `GameBalance` に集約された小さな初期値調整。
- 明白なbugの修正と回帰test。
- docsと実装の軽微な整合修正。

### Ask / stop at a Human Gate

- Core loopの変更。
- 新しい機能、Stage、課金、収集要素。
- Player-facing copyや風刺の標的の変更。
- Art directionの大幅変更。
- 難度思想、Rank意味、Appearanceの価値づけ変更。
- Architecture baselineを変えるdependency / framework。
- 既存user workを捨てる操作。
- Public release / mergeの最終判断。

質問するときは、状況説明だけで終わらず、推奨案、代替案、影響、既定案を示す。

## 6. Execution Loop

Milestoneまたはbug fixごとに次を実行する。

```text
Inspect
→ Plan internally
→ Implement smallest coherent slice
→ Add / update tests
→ Run focused tests
→ Run full verification
→ Launch preview
→ Exercise with Playwright
→ Inspect screenshots / traces
→ Audit against docs and acceptance
→ Fix findings
→ Re-run verification
→ Update docs
→ Commit
→ Report evidence
```

完了報告を出した後に初めて重大なtestを実行するような順序にしない。

## 7. Repository Safety

- 作業開始時に `git status --short --branch`、branch、remote、recent logを確認。
- Userの既存変更を削除・上書き・revertしない。
- `git reset --hard`、無差別clean、force pushをしない。
- 無関係な変更をcommitへ含めない。
- Secret、credential、token、local env fileをcommitしない。
- Generated build artifactsを方針なしにcommitしない。
- destructive commandの対象を具体的に確認する。

## 8. Branch and Commit Rules

- `main`へ直接作業せず、目的の明確なbranchを使う。ただしrepository運用が別途定義済みなら従う。
- 一つのcommitは一つの説明可能な目的。
- Commit message baseline:

```text
feat(game): complete vertical slice lifecycle
fix(combat): prevent duplicate kill scoring
test(e2e): cover mobile retry cleanup
docs(design): record Gate 2 tuning decision
```

- Human Gate前の実装はDraft PR。
- PR bodyにscope、Acceptance IDs、verification、screenshots、known issuesを記載。
- 明示承認前にDraftをReadyへ変えない。
- 明示承認前にmerge / deployしない。

## 9. Code Rules

- Domain logicはPhaser非依存。
- Sceneにscore式、rank式、calorie式を重複実装しない。
- `any`、game logic内`setTimeout()`、直接`Math.random()`を使わない。
- Collision callback中にcollectionを直接変更しない。
- Dynamic entitiesはpoolとcapを使う。
- Timer、listener、tween、audioのownerとcleanupを明確にする。
- Restartで完全初期化されることをtestする。
- Appearance tierでhitboxを変えない。
- Display layerはRunStateを独自再集計しない。
- Tuning numberは `GameBalance` へ置き、magic numberを散らさない。

## 10. Test Rules

### Required before completion

```text
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

`npm run verify` が定義済みならまず利用する。変更範囲に応じたfocused testだけで完了としない。

### Test behavior

- Bug fixは可能な限り、修正前に失敗する回帰testを作る。
- Flaky testをretry増加だけで隠さない。
- Snapshotの大量更新だけでvisual changeを承認しない。
- E2E bridgeは `VITE_E2E=1` でのみ存在させる。
- Production behaviorをtest都合で分岐しない。
- Console error、page error、required asset failureをE2E failureにする。
- DesktopとMobileの両方を対象にする。

## 11. Browser Verification

Preview起動後、最低限次を実操作する。

```text
Title
→ Start
→ Move
→ Fire / auto-fire
→ Kill enemy
→ Gain combo
→ Receive CALORIE
→ Pause / resume
→ FAT OVER or Boss clear
→ Result
→ Retry
```

画面captureはviewportとcommit SHAを紐づける。Scriptがpassしても、screenshotにoverlay、cutoff、invisible bullets、wrong scaleがあれば未完了。

## 12. Performance and Lifecycle Audit

Milestoneごとに次を確認する。

- active enemy bullets ≤ 220。
- active particles ≤ 320。
- Restart 10回でlistener / timer / active entity数が増え続けない。
- Scene transitionでBGMが重複しない。
- Background復帰でdelta spike、instant hit、wave skipがない。
- Gameplay中に継続的なlong taskを発生させない。
- Effectを減らしてもcombat logicが変わらない。

問題を見つけた場合、capを無闇に上げず、lifecycleまたはspawn設計を調査する。

## 13. Art and Tone Guard

次を守る。

- 食べ物には魅力と愛嬌を残す。
- 低Rankの主人公にも尊厳・能力・専用Poseを与える。
- 人の体型ではなく、採点文化・広告言語・極端さを笑う。
- 医学的主張や実CALORIE換算をしない。
- 実在brand / characterを模倣しない。
- Tone判断が曖昧ならFI-08のEscalation templateでHumanへ上げる。

安全性を理由に風刺を無味無臭へ変えない。毒の矛先を正す。

## 14. Self-review Mode

実装後、作者ではなく独立レビュアーとして次を監査する。

1. 仕様を満たしたという主張に証拠があるか。
2. Happy pathだけでなくRetry、Pause、visibility、corrupt saveを確認したか。
3. 状態の二重管理、二重event、cleanup漏れはないか。
4. Testが実装詳細だけをなぞり、player outcomeを見失っていないか。
5. VFXがreadabilityを損なっていないか。
6. Scope外を善意で追加していないか。
7. Toneが個人攻撃へ落ちていないか。
8. Production artifactがtest buildと混同されていないか。

FindingはCritical / Major / Minorへ分類し、CriticalとMajorを未修正のままPASSと報告しない。

## 15. Documentation Rule

- Behavior変更時は同じPRでdocs / Acceptanceを更新。
- 実装に合わせて仕様を事後改変し、変更を隠さない。
- GameBalanceだけの調整は、Before / After / reasonをPRに記録。
- Decision recordは日付、背景、選択、却下案、影響を短く残す。
- READMEにはsetup、commands、controls、deploy URL、creditsを最新化。

## 16. Status Reporting

作業中の報告は事実ベースで短くする。

- 今どのMilestone / Acceptanceを処理中か。
- 何が完了し、何が未完か。
- Test result。
- Blockerと必要なHuman decision。

`問題ありません` だけで終えない。実行したcommand、pass数、capture、commit SHAを示す。逆に、内部の細かな思考過程は列挙不要。

## 17. Completion Report

`docs/07_ACCEPTANCE_CRITERIA.md` のtemplateを使用する。最低限:

- Outcome。
- Implemented。
- Verification results。
- Acceptance IDs。
- Independent audit findings。
- Known limitations。
- Commit SHA / PR / Preview。
- 次のHuman decision。

## 18. Stop Conditions

次の場合は安全に停止し、現状を報告する。

- 仕様間の矛盾がPlayer-facing outcomeを変える。
- 必要なasset、permission、credentialがなく代替がScopeを変える。
- Existing user changeと不可避に衝突する。
- Testを通すためにAcceptanceを弱める必要がある。
- Architecture baselineの変更が必要。
- Tone / satireの採否が必要。
- Release、merge、deployにHuman approvalが必要。

停止時も、調査結果、再現手順、推奨案、代替、次の一手を残す。

## 19. Milestone Start Prompt Contract

人間から `Milestone Xを開始` と指示されたら、次を暗黙に含む。

```text
関連docsとrepositoryを読み、Milestoneの成果責任を持つ。
必要な実装順は自律決定する。
範囲内で調査、実装、test、debug、self-review、docs、commitまで進める。
安全な既定値で解ける細部は質問しない。
Human Gateを越える判断だけを報告する。
```

## 20. Prime Directive

> コード量を増やすな。遊べる証拠を増やせ。

FATインベーダーの完成は、機能一覧でもtest pass数でもない。仕様どおりに動き、触って気持ちよく、笑いの矛先が正しく、人へURLを渡せる状態である。

