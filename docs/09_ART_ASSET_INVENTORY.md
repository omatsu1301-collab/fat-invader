# FATインベーダー — Art & Audio Asset Inventory

**Document ID:** FI-09
**Version:** 1.2 (Pixel Spec 草案への相互参照)
**Depends on:** FI-04 (Art Direction), FI-06 §5 (Milestone B), FI-10 (Pixel Asset Spec draft)
**Status:** 下表のとおり一部確定・一部未確定 / FI-10 草案参照あり

| 項目 | 状態 |
| --- | --- |
| Art inventory（本ドキュメント） | **完了** |
| 素材制作方針（強化placeholder先行） | **確定**（§3-1） |
| texture/audio keyを後から差し替え可能にする設計方針 | **確定**（§3-1） |
| Pixel Asset Spec / Style North Star（ラスター向け） | **草案** → [`docs/10_PIXEL_ASSET_SPEC.md`](./10_PIXEL_ASSET_SPEC.md)（FI-10）。画像未生成・Human Gate待ち |
| asset-manifest.ts 実体、素材license記入、BGM/SE音源供給方法 | **未確定**（§3-2, §4）。manifest **schema** は FI-10 §9 で草案化 |

FI-06 §5 Work order step 1「Art inventoryとasset pipelineを確定」のうち、Art inventoryと素材制作方針・key設計方針は確定した。ラスター向けの Pixel Asset Spec / Style North Star / manifest schema は FI-10 として草案化した（Human 承認前・画像未生成）。asset-manifest.ts 実体、license 記入、BGM/SE音源供給は未確定のまま。**step 1は完全には完了していない。** ただし音源まわりの未確定はWork order step 7（Sound mixとvoice limit）の直前までに確定すればよく、Milestone B Work order step 2〜6（単発kill演出からBoss phase/death演出まで）の着手を妨げない。Style North Star 承認前に素材量産へ進まない。

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

1. **最終素材の制作方法をどうするか。 → Human決定済み(下記参照)。**
   - 想定した選択肢: (a) Human側で外部発注・購入したpixel artアセットを提供、(b) AIが生成AIツールでラスター素材を作成しHumanがtaste審査、(c) 当面はPhaser Graphics APIによる「強化されたplaceholder」でGame Feel実装を先行させ、ラスター素材は差し替え可能なid設計にとどめて後で本素材へ置き換える。
   - **Decision (2026-09-08):** (c) 強化placeholder先行を採用。
   - **背景:** Game Feelの検証(hit stop、flash、shake、combo演出、Boss演出)は形状の精緻さに依存せず、FI-04 §12「仮素材の完成度向上に時間を使わない」の原則にも合致するため。
   - **却下案:** (a)/(b)を先に確定させてから実装する案は、Human側の素材供給・生成速度にWork order全体が引っ張られるriskを理由に見送り。
   - **影響:** Milestone BのWork order step 2「単発shot / hit / killを完成」からstep 6「Boss phase / death演出」までは、現行のplaceholder texture key構成を強化する形でHuman decisionを待たず着手できる。ラスター最終素材(BGM/SE含む)の制作方法は、Work order step 7(Sound mixとvoice limit)以降に改めて確定すればよい。texture/audio keyのid設計を最初から差し替え可能にしておくことが実装側の責務になる。

2. **BGM/SEの権利処理方針。** フリー素材ライブラリの利用、Humanによる作曲外注、AI生成音源のいずれか。FI-04 §13は権利・出典・生成条件をmanifest/creditsに記録することを求めており、方針が決まらないと `asset-manifest.ts` のlicense欄を設計できない。

3. **Food bullet patternの種類数をMilestone Bで増やすか。 → Human決定済み。** Milestone Bでは既存のFRY弾1種のまま。パターン追加はMilestone C。

## 4. Asset pipeline確定状況(FI-06 Work order step 1の残り)

- **確定済み:** 素材制作方針(強化placeholder先行、§3-1)、texture/audio keyを最終素材へ差し替え可能に保つ設計方針(§3-1)。
- **草案 (FI-10):** Pixel Asset Spec、Style North Star 5 still、raw / canonical master / processed / public runtime 配置、命名、manifest schema、AC-232/233 証拠計画。Human 承認と画像生成は未着手。詳細は [`docs/10_PIXEL_ASSET_SPEC.md`](./10_PIXEL_ASSET_SPEC.md)。
- **未確定:** `asset-manifest.ts` の**実体**（TypeScript ファイル未作成）、素材licenseの実記入、BGM/SE音源供給方法(§3-2)。FI-05のディレクトリ構成は `src/game/content/asset-manifest.ts` を将来配置として明記している。schema 草案は FI-10 §9。
- **保留期限:** ラスター接続は Style North Star Human Gate 後。BGM/SE は Work order step 7 着手直前までに確定すればよい。それまでWork order step 1は「asset pipeline確定」の部分が未完了のまま残る。

## 5. Not blocking Milestone B start

素材制作方針(§3-1)はHuman decision済み(強化placeholder先行)。ラスター向け Spec は FI-10 草案。残るBGM/SE権利処理方針(§3-2)とfood bullet pattern数(§3-3)、および asset-manifest.ts本体(§4)は未確定だが、いずれもWork order step 7以降(Sound mix、Content確定)または Style North Star Gate に関わる論点であり、Work order step 2〜6(単発kill演出からBoss phase/death演出まで)の着手を妨げない。Style North Star 承認前に素材量産へ進まない。
