# FATインベーダー — AI-first Implementation Roadmap

**Document ID:** FI-06  
**Version:** 1.0  
**Status:** Execution Baseline  
**Depends on:** FI-01 through FI-08

## 1. Delivery Strategy

20個の細切れ機能を人間が逐次指示する方式ではなく、AIがMilestoneの成果責任を持つ。各MilestoneでAIは、調査、設計差分、実装、テスト、自己監査、修正、文書更新、commit、PR準備まで自律的に進める。

人間は3回のHuman Gateだけを主に担当する。

| Gate | Build | Human question |
| --- | --- | --- |
| Gate 1 | Vertical Slice | 動かして、避けて、倒して、最後まで遊べるか |
| Gate 2 | Game Feel | 撃破と回避が気持ちいいか。画面が読めるか |
| Gate 3 | Release Candidate | 人にURLを渡せるか。風刺の温度は適切か |

## 2. Global Working Rules

各Milestoneで必ず次を守る。

1. 着手前に関連docs、既存code、tests、git statusを読む。
2. 目的とAcceptanceから逆算し、細かな実装順はAIが決める。
3. 既存の未commit変更を勝手に消さない。
4. Scope外機能を実装しない。
5. 途中で得た知見により設計変更が必要なら、コードより先にdocs差分案を出す。
6. バグ修正には、可能な限り先に失敗する回帰testを追加する。
7. 完了前に `verify` と対象E2Eを実行する。
8. 自分の実装を肯定する前提で監査しない。
9. Human Gateを自動testで代替しない。
10. PRは一つのMilestoneまたは明確な修正目的に限定する。

## 3. Phase 0 — Repository Bootstrap

### Objective

AIが迷わず作業でき、変更の品質を自動判定できるリポジトリを作る。

### Scope

- Vite + TypeScript + Phaser project。
- strict TypeScript。
- formatter / linter / Vitest / Playwright。
- GitHub Actions CI skeleton。
- GitHub Pages deploy skeleton。
- `/docs` と `CLAUDE.md` 配置。
- Base path、mobile viewport、safe-areaの最小確認。
- Placeholder Boot / Title表示。

### Deliverables

- Clean install可能なlockfile。
- 全commands contract。
- CI green。
- Desktop / MobileでTitleが開くsmoke E2E。
- READMEにsetup、commands、deploy URL placeholder。

### Exit criteria

- 新規cloneから、documented commandsだけでbuild/test可能。
- Production buildにE2E bridgeが含まれない。
- Titleでconsole errorなし。

## 4. Milestone A — Vertical Slice

### Objective

仮素材で、TitleからFinal ResultまたはFAT OVER、Retryまで一本のゲームとして通す。局所の美しさより全体の成立を優先する。

### Required scope

- Title / Settings minimal。
- Player movement: keyboard + touch。
- Desktop manual fire / Mobile auto fire。
- 1通常敵definitionと編隊。
- 1食べ物弾。
- Collision、CALORIE、無敵時間。
- Score、Combo basic。
- 1 short stage。
- 1 simplified Boss with 2 phases。
- FAT OVER。
- ResultとAppearance placeholder 3段階以上。
- Retry / Title。
- Pause / visibility auto-pause。
- In-memory RunState + local high score。
- Seeded RNGとE2E bridge。

### AI execution sequence

AIは必要に応じ変更できるが、標準順は次。

1. domain: run-state、calorie、combo、scoring、events。
2. ports: Clock、Random、Storage。
3. Scenesとlogical viewport。
4. Player input / movement / fire。
5. Enemy / projectile pools。
6. Combat resolution。
7. Wave / simplified Boss。
8. stage lifecycle、FAT OVER、Result、Retry。
9. persistence、pause。
10. Unit / integration / E2E。
11. Cleanup audit、docs update、PR。

### Placeholder limitations

- Primitive graphicsまたは簡易pixel spriteでよい。
- BGM不要。重要なhit / kill / player hitの仮SEは可。
- Particleは最小。
- Stageは1つ、Bossは1体でよい。
- Content量産は禁止。

### Mandatory tests

- movement boundaries。
- shot → enemy damage → single kill score。
- enemy bullet → CALORIE → invulnerability。
- CALORIE 100 → FAT OVER once。
- combo continue / expire / hit reset。
- pause freezes time。
- boss defeat → Result。
- Retry 10回でstate / listener増殖なし。
- Desktop 1440×900、Mobile 390×844のcritical path。

### Human Gate 1 package

- Preview URL。
- Desktop screenshot。
- Mobile screenshot。
- Title→Play→Boss→Result→Retryの30〜60秒動画。
- Known limitations。
- AIが気づいた操作感の懸念を最大3点。

### Gate 1 acceptance question

人間は次だけを判断する。

- 移動が遅い / 速い / ちょうどよい。
- 弾を避けた感覚があるか。
- 撃つ・倒す・被弾する因果が読めるか。
- 「この核なら派手にしたい」と思えるか。

Gate 1採用までMilestone Bへ進まない。

## 5. Milestone B — Game Feel and Art Vertical Slice

### Objective

Vertical Sliceを「動く試作品」から「触って気持ちいい作品」へ変える。Content量産前に、1体・1発・1撃破の品質基準を確立する。

### Required scope

- Final方向のPlayer 4 appearance tiers。
- Final方向の通常敵3種、Boss 1体。
- Player bullet / food bulletのart direction反映。
- 2-frame flash、hit stop、explosion、fragments、score popup。
- Combo tier演出。
- Screen shake budget。
- Background 1 stage、parallax。
- 仮または本SE、BGM 1 loop。
- Power-up 3種: PROTEIN、FAT BURN、CHEAT DAY。
- Reduced Effects、shake toggle、mute。
- HUD visual polish。

### Work order

1. Art inventoryとasset pipelineを確定。（初回監査: `docs/09_ART_ASSET_INVENTORY.md`。最終素材の制作方法とBGM/SE権利処理方針はHuman decision待ち）
2. 単発shot / hit / killを完成。
3. 連続killでeffect capを検証。
4. Player hit / FAT OVERを完成。
5. Combo escalation。
6. Boss phase / death演出。
7. Sound mixとvoice limit。
8. Accessibility effects。
9. Mobile readability。
10. Performance / leak audit。

### Game Feel tuning matrix

| Symptom | First variables to tune |
| --- | --- |
| 撃破が軽い | hit stop、impact SE、fragment size、flash |
| 画面がうるさい | particle cap、popup lifetime、shake、background saturation |
| 弾が見えない | outline、depth、particle opacity、background contrast |
| 操作が重い | acceleration、drag follow、player speed |
| Comboが切れすぎる | window、enemy spacing、wave gap |
| 被弾が理不尽 | bullet speed、telegraph、hitbox、invulnerability |

### Mandatory tests

- Effect on/offでcombat resultが同じ。
- Reduced Effectsでflash / particle / shakeが削減。
- Simultaneous killsでsound / particle cap超過なし。
- Appearance changeでhitbox不変。
- Asset missing fallback。
- 60秒stress seedでentity cap、console error、fatal frame stallなし。

### Human Gate 2 package

- 360、390、430pxのscreenshots。
- 通常状態、Combo 25、Combo 50、Player hit、Boss death。
- 15〜30秒の音あり動画。
- Reduced Effects比較。
- FPS / entity cap summary。

### Gate 2 acceptance question

- 1体倒した時点で気持ちいいか。
- 10体続けて倒すと、さらに気持ちいいか。
- 派手でも敵弾を追えるか。
- 食べ物が危険なのにおいしそうか。
- 演出がダサい、弱い、過剰のどこにあるか。

Gate 2の感想はAIが「維持・強化・削減」に分類し、最小調整案へ変換する。

## 6. Milestone C — Release Content

### Objective

確立した品質基準を崩さず、3〜5分の完成RunへContentを拡張する。

### Required scope

- 3 stages。
- 通常敵5種以上。
- Food bullet pattern 10以上。
- 3 bosses、各3 combat phases。
- Power-up 5種。
- 4 realtime appearances。
- 6 result appearances / ranks。
- Stage-specific backgrounds / BGM variation。
- 完全なscore / evaluation。
- Difficulty curveとtarget score調整。
- Credits / license record。

### Content production rule

量産前に一つのdefinitionをschema validation付きで完成させる。以後は同じschemaへ追加し、敵ごとの専用class乱立を避ける。固有挙動が既存pattern合成で不可能な場合だけ新systemを足す。

### Balance procedure

1. 固定seedでAI autoplay / scripted pathが全Stageを通る。
2. Human playtestを最低5Run。
3. Run duration、death point、final CALORIE、max comboを記録。
4. 3〜5分、Stage 1突破率、Boss telegraph、Rank分布を確認。
5. `GameBalance` の数値だけで最初の調整。
6. 変更後に同一seedと別seedで回帰。

厳密な統計的有意性はv0.1で求めない。明らかな詰まり、退屈、極端なRank偏りを除く。

### Mandatory tests

- 全Wave definition validation。
- 全enemy / bullet / asset id resolution。
- 全Boss state transition。
- 3 fixed seedsでRun clear可能。
- evaluationScore境界とRank。
- Power-up組合せ、延長上限、CHEAT DAY即FAT OVER。
- 全Stageでbullet capを超えない。
- 3〜5分想定のscripted run。

### Exit criteria

- 全Contentが一度は自動経路で到達・表示される。
- 空白Wave、無敵Boss、進行不能なし。
- Art / copyがFI-08に違反しない。
- Creditsに全外部assetを記録。

## 7. Milestone D — Release Candidate

### Objective

ゲームを作る段階から、人へ安全に渡せる公開物へ移す。

### Required scope

- Responsive / safe area final。
- Keyboard / touch final。
- Settings persistence。
- Pause / background resume。
- Audio unlock / mute / duplicate prevention。
- High score persistence / corrupt fallback。
- Performance optimization and memory audit。
- Accessibility settings。
- Production build、CI、Pages deploy。
- README、credits、privacy note。
- Public URL smoke tests。

### Browser matrix

最低限:

- Chromium desktop current。
- Mobile Chromium emulation 390×844。
- Mobile Safari相当の実機または利用可能なWebKit検証。
- 360px narrow viewport。

### Release audit

- Scope audit: Non-goalが混入していない。
- Design audit: Core pillarsを満たす。
- Code audit: lifecycle、pool、timer、listener。
- Test audit: greenだけでなく必要scenarioを覆う。
- Security audit: secret、unsafe HTML、不要networkなし。
- Asset audit: license、容量、未使用asset。
- Production audit: E2E bridgeなし、source map方針、base path。
- Satire audit: 人ではなく文化の過剰さを笑っている。

### Human Gate 3 package

- Release Candidate URL。
- 主要画面screenshots。
- Full run video。
- Automated verification summary。
- Known limitations and deferred ideas。
- Release / hold recommendationと根拠。

### Gate 3 decision

人間が `RELEASE`、`HOLD WITH FIXES`、`REJECT DIRECTION` のいずれかを宣言する。

- RELEASE: AIはmerge、deploy、production smokeまで進める。
- HOLD WITH FIXES: 指摘をAcceptanceへ変換し、同じPRで最小修正。
- REJECT DIRECTION: Scope / art / feelの再設計。勝手に局所修正を積まない。

## 8. Release Procedure

1. RC branch / PR headを確認。
2. Docsとcode差分を監査。
3. Clean install。
4. `npm run verify`。
5. Playwright全件。
6. Production build artifact確認。
7. Human Gate 3 approval記録。
8. PRをReadyへ。
9. CI greenとmergeability確認。
10. Mainへmerge。
11. Deploy run完了を監視。
12. 公開URLでTitle→Play→Pause→Retry smoke。
13. Head SHA、deploy SHA、公開版一致を確認。
14. Release noteとKnown limitationsを記録。

## 9. Definition of Done for Any Milestone

- Scopeの全MUSTを満たす。
- Acceptance criteriaに証拠がある。
- Typecheck、lint、tests、buildが成功。
- Console errorなし。
- Docsが実装と一致。
- 新規dependencyとassetの理由・権利が記録済み。
- 残課題は隠さず分類済み。
- Commitが目的単位で理解できる。
- Human Gateが必要なら、採用前に次Milestoneへ進んでいない。

## 10. Failure Recovery

### Test failure

原因を分類し、再現testを固定してから修正する。testを削除・弱体化してgreenにしない。

### Preview failure

port、process、build error、base path、asset pathを順に切り分ける。複数箇所を同時に推測修正しない。

### Design mismatch

実装の欠陥か、仕様の誤りかを分ける。Tasteの問題をbugとして小手先修正しない。Human feedbackを観測可能な差へ翻訳する。

### AI context loss

会話記憶に依存せず、docs、current PR、git log、testsから復旧する。推測で「前回の合意」を作らない。

## 11. Deferred Backlog

実装しないが記録してよい候補:

- Endless mode。
- Daily seeded challenge。
- Local achievement。
- Online leaderboard。
- Character collection / wardrobe。
- More satirical result filters。
- Gamepad。
- Native wrapper。
- Monetization experiment。

Backlog候補はv0.1のPRへ混ぜない。

## 12. First Command to Implementation AI

```text
FATインベーダーのPhase 0を開始してください。

最初にCLAUDE.mdとdocs/01〜08をすべて読み、仕様間の矛盾、実装を阻む未確定事項、現在のrepository状態を監査してください。安全な既定値で解決できる実装詳細は自律判断し、Scope・Taste・公開判断に関わる問題だけを報告してください。

その後、06_IMPLEMENTATION_ROADMAP.mdのPhase 0に限って、必要な調査、設計整合、実装、test、自己監査、修正、documentation、commitまで進めてください。Human Gateを越えてMilestone Aへは進まないでください。

完了報告には、変更概要、主要設計判断、実行した検証と結果、残課題、commit SHA、次に必要なHuman decisionを含めてください。
```

