# FATインベーダー — Art & Audio Asset Inventory

**Document ID:** FI-09
**Version:** 1.0 (Milestone B開始準備)
**Depends on:** FI-04 (Art Direction), FI-06 §5 (Milestone B)
**Status:** Draft — Milestone B未着手時点の欠品監査

FI-04 §12「Milestone B開始時にArt asset inventoryを作成し、欠品を明示する」を満たすための記録。Milestone Bの実装(Work order step 2以降)に着手する前に、Human(Creative Director)が判断すべき論点をまとめる。

## 1. Current state (Milestone A placeholder inventory)

すべて `src/game/entities/textures.ts` の `ensurePlaceholderTextures()` で実行時生成される単色図形。ファイルとしての素材(PNG等)は一切存在しない。

| Texture key | 現状 | Canvas size | FI-04が要求する最終形 |
| --- | --- | --- | --- |
| `tex-player` | 角丸cyan矩形＋目2点 | 40×40 | Player、48×48 canvas、4 appearance tiers、idle/move/shoot/hit/FAT OVERアニメーション一式（§6.2, §6.3） |
| `tex-enemy-fry-scout` | 角丸amber矩形 | 28×28 | FRY SCOUT最終art、40×40 canvas、idle 4f + attack tell 2〜4f（§5.3, §6.2, §6.3） |
| `tex-boss-king-burger-mini` | 角丸pink矩形＋amber帯 | 96×72 | KING BURGER最終art、160×128以内 canvas、idle/attack tell/phase change/death一式（§5.3, §6.2, §6.3） |
| `tex-bullet-player` | cyan細長矩形 | 6×16 | Player bullet最終art（cyan core + white tip、§4.2） |
| `tex-bullet-fry` | outline付きcoral円 | 14×14 | Enemy bullet（食べ物形状、warm color + dark outline、§4.2） |
| `tex-pickup-placeholder` | lime円 | 22×22 | Power-up 3種の固有icon（PROTEIN / FAT BURN / CHEAT DAY、§4.2, §6.2） |

不足しているもの(Milestone Aでは一切未着手):

- 背景(background/parallax)一式。現在は単色背景のみ。
- BGM、SEすべて。現在は完全に無音。
- HUDの装飾素材(枠、アイコン)。現在はPhaser標準テキストのみ。
- Result appearance用のD〜SS 6段階分の専用イラスト。現在は文字ラベルのみ。

## 2. Milestone B required scope との差分

FI-06 §5 Required scopeに基づく、Stage 1(BURGER DISTRICT)向け最小セット。Stage roster自体はFI-02で確定済み(FRY SCOUT / DONUT DRIFTER / SODA TANK / KING BURGER)なので、キャラクター選定に関する未決事項はない。

| カテゴリ | 必要数 | 現状 | 欠品 |
| --- | --- | --- | --- |
| Player final appearance tiers | 4 | 0（placeholder 1種のみ、tier分岐なし） | 4 |
| Normal enemy final art | 3（FRY SCOUT / DONUT DRIFTER / SODA TANK） | 0（FRY SCOUTのみplaceholder、DONUT DRIFTER・SODA TANKは未実装） | 3 |
| Boss final art | 1（KING BURGER、Milestone Aの2-phase簡易版から拡張） | 0（placeholder mini版のみ） | 1 |
| Player bullet art | 1 | 0 | 1 |
| Food bullet art | Stage 1で使う種類分（最低FRY、Milestone Bで増やすかは要判断） | 0（FRYのみplaceholder） | 要確定 |
| Power-up icon | 3（PROTEIN / FAT BURN / CHEAT DAY） | 0（PowerUp自体が未実装、Milestone A非スコープ） | 3 |
| Background parallax (Stage 1, 3層以内) | 1 stage分 | 0 | 1 stage分 |
| BGM loop | 1（KING BURGER戦用の圧縮版/専用loopは任意） | 0 | 1〜2 |
| SE | shot / enemy hit / kill / player hit / power-up / combo tier / UI click | 0 | 一式 |
| HUD装飾 | CALORIE frame等 | 0（テキストのみ） | 未確定（Polish範囲） |

## 3. Open questions for Human decision

CLAUDE.md Autonomy Rules「Art directionの大幅変更」「既存の判断に関わる資産の出所」はAI単独で決められないため、実装着手前に次を確認する。

1. **最終素材の制作方法をどうするか。** 想定される選択肢:
   - (a) Human側で外部発注・購入したpixel artアセットをリポジトリへ提供する。
   - (b) AIが生成AIツールでラスター素材を作成し、Humanがtaste審査する(FI-04 §14「AI生成画像の不統一な解像感を、そのまま寄せ集めること」は禁止だが、統一されたAI生成パイプライン自体を禁止していない — 解釈の確認が必要)。
   - (c) 当面はPhaser Graphics APIによる「強化されたplaceholder」(現状より情報量の多い図形合成)でGame Feel実装を先行させ、ラスター素材は差し替え可能なid設計にとどめてMilestone C以降に本素材へ置き換える。
   - AIの推奨: (c)を起点にWork order step 2〜6(単発kill演出、combo演出、Boss演出)を素材非依存のまま完成させ、(a)または(b)の素材が揃い次第、同じtexture keyへ差し替える。これは「仮素材の完成度向上に時間を使わない」というFI-04 §12の原則にも合致し、Game Feelの検証(hit stop、flash、shake等)は形状の精緻さに依存しないため。
   - 代替案: 最初から(a)/(b)を確定させ、Feel実装と素材制作を並行する。Human側の素材供給速度に実装が引っ張られるriskがある。
   - 影響: この決定がWork order全体の着手順序を左右するため、最初のHuman Gateとして確認したい。

2. **BGM/SEの権利処理方針。** フリー素材ライブラリの利用、Humanによる作曲外注、AI生成音源のいずれか。FI-04 §13は権利・出典・生成条件をmanifest/creditsに記録することを求めており、方針が決まらないと `asset-manifest.ts` のlicense欄を設計できない。

3. **Food bullet patternの種類数をMilestone Bで増やすか。** FI-06 §5はMilestone Bで「Player bullet / food bulletのart direction反映」とのみ規定し、パターン増加はMilestone C(10種以上)の役割。Milestone Bでは既存のFRY弾1種のart差し替えに留め、パターン追加はしない、という理解でよいか確認したい(AIの既定解釈: 留める)。

## 4. Asset manifest (`asset-manifest.ts`) — 未着手

FI-05のディレクトリ構成は `src/game/content/asset-manifest.ts` を将来配置として明記している。最終素材の供給方法（上記1〜2の決定）が確定するまで、manifestのschema(id、path、frame size、animation定義、license note)を確定できないため、このファイルはまだ作成していない。方針決定後、最初のMilestone B実装ステップとして着手する。

## 5. Not blocking Milestone B start

上記の未決事項は「素材そのもの」と「manifest」に限定される。Work order step 2「単発shot / hit / killを完成」からstep 6「Boss phase / death演出」までは、現行のplaceholder texture key構成のまま(強化graphicsへの差し替えを含め)着手可能であり、Human decisionを待つ必要はない。
