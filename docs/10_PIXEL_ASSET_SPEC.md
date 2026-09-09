# FATインベーダー — Pixel Asset Specification

**Document ID:** FI-10
**Version:** 1.0
**Status:** Style North Star 設計草案（画像未生成・Human Gate待ち）
**Depends on:** FI-01, FI-02, FI-04, FI-05, FI-07, FI-08, FI-09
**Last updated:** 2026-09-10
**Base main SHA:** `7e054d91e4ec2d7639df49dd974e784cd8de90bb`

## 0. Purpose and non-goals

この文書の目的は、AI画像生成へ渡せる**実装可能な Pixel Asset Specification** と **Style North Star** の構成を確定することである。

今回の成果物は文書だけである。次は行わない。

- 画像生成、sprite / PNG / atlas の追加
- ゲームコード、GameBalance、演出タイミング、hitbox の変更
- PR #4 で確定した Game Feel の変更（通常撃破、Boss 3-beat、FAT OVER 約2.6秒）
- Style North Star 承認前の素材量産
- merge / Deploy

読み取り対象の実ファイル名（依頼文の別名との対応）:

| 依頼上の名前 | リポジトリ上の実体 |
| --- | --- |
| `docs/01_PRODUCT_VISION.md` | `docs/01_PRODUCT_SPEC.md`（FI-01） |
| `docs/03_LEVEL_AND_CONTENT_PLAN.md` | `docs/03_CORE_LOOP.md`（FI-03） |

## 1. Investigation snapshot (code as of `7e054d9`)

### 1.1 Texture keys and runtime display sizes

すべての現行テクスチャはファイルではなく `src/game/entities/textures.ts` の `ensurePlaceholderTextures()` が Phaser Graphics から生成する。`public/` は存在せず、BootScene は asset preload を行わない。

Phaser 設定（`src/game/config.ts`）: 論理解像度 `390×844`、`pixelArt: true`、`antialias: false`、scale mode `FIT`、autoCenter。sprite に `setDisplaySize` は使っておらず、表示サイズ = 生成 canvas サイズ（FAT OVER / Boss death の一時 scale を除く）。

| Asset ID | Texture key | 現行 canvas / 表示 | 生成内容 | GameBalance 参照 |
| --- | --- | ---: | --- | --- |
| `player` | `tex-player` | 40×40 | 角丸 cyan 矩形 + 目2点 | `player.spriteSize = 40` |
| `enemy.fryScout` | `tex-enemy-fry-scout` | 28×28 | 角丸 amber 矩形 | `enemy.fryScout.spriteSize = 28` |
| `boss.kingBurgerMini` | `tex-boss-king-burger-mini` | 96×72 | 角丸 pink 矩形 + amber 帯 | `boss.kingBurgerMini` 96×72 |
| `bullet.playerShot` | `tex-bullet-player` | 6×16 | cyan 細長矩形 | `bullet.playerShot.size = 6`（幅の意図。物理には未適用） |
| `bullet.fry` | `tex-bullet-fry` | 14×14 | outline 付き coral 円 | `bullet.fry.size = 12`（物理には未適用） |
| `pickup.placeholder` | `tex-pickup-placeholder` | 22×22 | lime 円 | 未使用（Power-up 未実装） |
| `vfx.particle` | `tex-vfx-particle` | 8×8 | amber 円 | physics なし |
| `vfx.fragment` | `tex-vfx-fragment` | 8×6 | outline 付き amber 矩形 | physics なし |

コード対応:

- keys: `src/game/entities/textures.ts` `TextureKey`
- Player spawn: `GameScene` `PLAYER_Y = LOGICAL_HEIGHT * 0.86`、中央 X、左右 margin 24
- Enemy map: `Enemy.ts` `TEXTURE_BY_ENEMY.fryScout`
- Boss map: `Boss.ts` `TEXTURE_BY_BOSS.kingBurgerMini`
- 発射: `GameScene.firePlayerShot` / `updateEnemyFire` / `bossFire`

FI-04 §6.2 の最終 canvas（Player 48×48、通常敵 40×40、Boss 160×128以内）は**現行 runtime と不一致**。本仕様の安全な既定は現行サイズを維持する（§11）。

### 1.2 Visual bounds vs physics hitbox

Arcade Physics。重力なし。callback 内で破壊しない。

| Entity | Visual canvas | Physics body | Offset | 設定箇所 |
| --- | ---: | ---: | --- | --- |
| Player | 40×40 | 24×28（幅 60% × 高さ 70%。高さ計算も `spriteSize` 基準） | (8, 6) | `Player.ts` + `GameBalance.player.hitboxWidthRatio/HeightRatio` |
| FRY SCOUT | 28×28 | 23.8×23.8（canvas の 85%） | (2.1, 2.1) | `Enemy.ts` 固定 `hitboxRatio = 0.85` |
| KING BURGER | 96×72 | 81.6×61.2（85%） | (7.2, 5.4) | `Boss.ts` |
| Player bullet | 6×16 | **テクスチャ全体 6×16** | 0 | `fireProjectile` は `setSize` しない |
| FRY bullet | 14×14 | **テクスチャ全体 14×14** | 0 | 同上。`bullets.fry.size = 12` は未使用 |
| VFX particle / fragment | 8×8 / 8×6 | なし | — | `FeedbackSystem` は `Image` |

Appearance tier は `setTint` のみ。FAT OVER は `setScale(1.18, 0.82)` のみ。どちらも body size を変えない（AC-117 / FI-08 §10）。Boss death の squash / blink / hide も display-only（`Boss.updateBossDeathPresentation`）。

Depth（`display.ts`）: actor 2、playerBullet 3、vfx 4、enemyBullet 5。敵弾は VFX より前面。

### 1.3 Player appearance tiers

Domain（`calorie.ts` / FI-02 §5.2 / AC-116）:

| CALORIE | Tier | 現行表示 | Gameplay |
| --- | --- | --- | --- |
| 0–24 | `light` | tint `#53F6FF` | なし |
| 25–49 | `rounded` | tint `#8FF2FF` | なし |
| 50–74 | `heavy` | tint `#BFE9FF` | なし |
| 75–99 | `overflowing` | tint `#FFD7DC` | 移動速度 ×0.92 |
| ≥100 | FAT OVER | tint `#FFD7DC` + squash scale + caption 約 2.6s | 入力・射撃・被弾・score・CALORIE 停止 |

同一 `tex-player` を使い、専用 sprite は無い。Result の D〜SS は文字プレースホルダのみ（`ResultScene.appearancePlaceholder`）。

### 1.4 Stage 1 roster (implemented)

| 役割 | Content id | 実装 | 弾 | 備考 |
| --- | --- | --- | --- | --- |
| 通常敵 | `fryScout` | HP 1、score 100、編隊 2×4=8 | `fry` | DONUT DRIFTER / SODA TANK は未実装 |
| Boss | `kingBurgerMini` | HP 30、2 phase（50% で 1発→3-way） | `fry` | FI-02 の KING BURGER HP 45 / 3 phase より簡易 |
| Player 弾 | `playerShot` | 速度 680、damage 1、間隔 180ms | — | METABOLIC SHOT |
| 食べ物弾 | `fry` | CALORIE 10、速度 190 | — | Milestone B は FRY 1種のまま（FI-09 §3-3） |

Wave: `waves.stage1Wave1` のみ。Boss 警告 900ms → intro 1000ms → active → 3-beat death。Power-up / 背景パララックス / BGM / SE は未実装。

### 1.5 Animation frames

現行コードに Phaser Animation、spritesheet、frame 切替は無い。

| 表現 | 現行の実現 | 最終ドットで必須か |
| --- | --- | --- |
| Player idle / move / shoot | 静止 1 枚 + 移動は位置のみ | North Star 承認後。初回実装は idle 1 フレームで可 |
| Player hit | alpha 0.5 を 120ms | shader/tint 継続可（FI-04） |
| Player appearance | tint 4 種 | **4 体の専用 sprite が最終必須**（AC-305） |
| FAT OVER | squash 2.6s + 文言 | **タイミング非変更**。専用 pose シートは任意・Human Gate |
| Enemy idle / attack tell | 静止 1 枚 | North Star 後。初回は idle 1 フレーム可 |
| Boss idle / phase / death | 静止 + death は squash/blink/hide + VFX | **3-beat 非変更**。death シートは任意 |
| Kill / muzzle / shockwave | Graphics + pooled Image | 本仕様の North Star 対象外 |

### 1.6 Public assets and Vite base path

| 項目 | 現状 |
| --- | --- |
| `public/` | 未作成 |
| Runtime 画像 | なし（Graphics 生成） |
| Vite `base` | `process.env.BASE_PATH ?? '/'`（`vite.config.ts`） |
| Pages deploy | `BASE_PATH=/fat-invader/`（`.github/workflows/deploy.yml`） |
| Production URL | `https://omatsu1301-collab.github.io/fat-invader/` |
| Boot preload | なし |

将来のランタイムパスは必ず `import.meta.env.BASE_URL` 経由にする。例: `/fat-invader/assets/sprites/player/player_tier_light.png`。ルート相対 `/assets/...` は Pages で 404 になる（AC-007 / AC-433）。

### 1.7 Manifest and license gap

| 欠品 | 状態 |
| --- | --- |
| `src/game/content/asset-manifest.ts` | 未作成（FI-05 は将来配置を予告） |
| 素材 license / source / 生成条件 | なし。README Credits は「Milestone C 以降に追記予定」 |
| `assets-src/` master | なし |
| AC-440 | 外部素材ゼロのため暫定充足。ラスター導入時に必須 |

FI-09 が残した未確定のうち、**ラスター向け manifest schema・配置・命名・生成条件の記録方法** を本文書で確定する。BGM/SE 音源供給は対象外（FI-09 §3-2 のまま）。

## 2. Locked constraints (do not reopen in art PRs)

次は Creative Director の確定済み判断である。Pixel 工程はこれを壊さない。

| 項目 | 確定 | 出典 |
| --- | --- | --- |
| 通常敵 単体撃破 feel | Human PASS「ちょうどいい」非変更 | AC-230、Gate 2 |
| 通常敵 連続撃破 feel | Human PASS「ちょうどいい」非変更 | AC-231 |
| Boss death | 3-beat 非変更「めっちゃいいね」 | Gate 2 follow-up |
| FAT OVER | squash + caption 約 2.6s（`fatOverHoldMs: 2600`） | Gate 2 follow-up |
| AC-232 / AC-233 | 最終ドット後に再判定 | Gate 2 |
| Milestone B food bullet | FRY 1 種 | FI-09 §3-3 |
| 強化 placeholder 先行 | ラスターは差し替え可能な key で後置き | FI-09 §3-1 |
| 風刺の矛先 | 人の体型ではなく採点文化。食べ物には愛嬌 | FI-08 |

## 3. Shared visual grammar

FI-04 を実装可能な生成条件へ落とす。可読性が派手さに勝つ。

### 3.1 Palette (closed set)

Sprite 内部は次のコアパレットと、各資産の許容拡張（§5）のみ。補間色・写真的グラデーション禁止。

| Role | Hex | Sprite での使い方 |
| --- | --- | --- |
| Void | `#090615` | 使わない（背景色。透過にすること） |
| Deep plum | `#21102F` | **唯一のアウトライン**、目、影の最暗 |
| Player cyan | `#53F6FF` | Player 本体、味方弾コア |
| Burn lime | `#B9FF4A` | Pickup / 成功。North Star 本体には使わない |
| Danger coral | `#FF4F64` | 敵弾の危険リング、被弾強調。食べ物の主色にはしない |
| Food amber | `#FFB33D` | 揚げ物、ポテト、スコア色 |
| Sweets pink | `#FF71C8` | 菓子。FRY / Burger の主色にはしない |
| Milk cream | `#FFF0D2` | ハイライト、バンズ明部、目のハイライト |
| UI muted | `#9D93B5` | Sprite 内では影の中間 1 段までに限定 |

許容拡張（North Star 4 体）:

- Potato flesh: `#FFD27A`
- Fry container red (generic, not a chain): `#C43B3B`
- Burger patty: `#6B3A22`
- Pickle: `#7CB342`
- White of bun sesame / salt: `#FFF0D2` のみ（純白 `#FFFFFF` は禁止。fringe と誤認するため）

### 3.2 Outline, light, camera, transparency

- **Outline:** runtime 1px の `#21102F`。途切れない。半透明アウトライン禁止。
- **Light:** 画面左上 45°。ハイライトは 1〜2 段。金属反射や SSAO 風禁止。
- **Camera:** 正射影に近いアーケード正面。わずかな 3/4（上面が 1〜2px 見える程度）。遠近法・地面影の長いドロップシャドウ禁止。
- **Facing:** Player は上（敵方向）。敵・Boss は下（Player 方向）。弾の進行方向がシルエットで分かること。
- **Pixels:** 内部 anti-alias 禁止。中間 alpha（1〜254）は **アウトライン外側の 0 のみ**。Glow は sprite に焼かず VFX へ委譲。
- **Fringe:** 透明縁に `#FFFFFF` / マatting 色を残さない。
- **Scale:** runtime で非整数 scale しない。Master は runtime の整数倍（既定 4×）。
- **Pivot:** 全フレーム同一。既定は canvas 中心（Phaser origin 0.5, 0.5）。透明余白をフレーム間で変えない。

### 3.3 Tone (FI-08)

- 食べ物はおいしそう。腐敗・汚物・病気で悪役化しない。
- Player の太い段階を汚い・怠惰・無能にしない。顔・装備・目の元気さを落とさない。
- 実在 brand / 包装 / マスコットを模倣しない。
- 医学的 kcal や体脂肪の「正確な」描写をしない。

## 4. Silhouette rules (AC-213)

色を落としたグレースケール / 1bit でも、Player 弾と食べ物弾が区別できること。

| | Player bullet (`tex-bullet-player`) | Food bullet (`tex-bullet-fry`) |
| --- | --- | --- |
| 基本形 | 細い縦針。先端が尖る | 短い食品塊。丸みまたはポテトの矩形 |
| アスペクト | 高さ ≫ 幅（6×16） | 幅 ≳ 高さ、または 1:1 に近い（14×14） |
| 輪郭 | 細く鋭い。外接矩形に隙間が多い | 太い dark outline が全周。外接矩形をほぼ埋める |
| 内部 | cyan コア + 白に近い先端 1〜2px | 食材の帯（ポテトの揚げ目）1〜2 本。ハイライトは小さい |
| 禁止 | 丸い塊、食べ物の凹凸、太い outline | 針・レーザー・縦長スラッシュ |

判定テスト（実装前の加工チェック）:

1. スプライトを `#21102F` 一色に塗り、390×844 の Void 上に並べる。
2. Player 弾と FRY 弾を 32px 以上離して配置。
3. 0.3 秒以内にどちらが味方弾か言えること。

VFX particle（8×8 未満、半透明、hitbox なし）は敵弾より小さく、outline を持たない。

## 5. Style North Star

量産前に次の 5 still だけを生成・加工し、Human が「この絵柄で進めてよい」と承認する。5 枚以外を先に作らない。

承認対象:

1. Player Light idle
2. FRY SCOUT idle
3. FRY bullet
4. Player bullet（対比用。AC-213）
5. KING BURGER idle

### 5.1 Player Light — `pixel.player.light.idle`

- **読み:** 丸みのある人型宇宙戦士。性別・人種を固定しすぎない。顔は目 2 点 + 口。胸の前に小型トレーニング砲。
- **色:** 装甲 `#53F6FF`、outline `#21102F`、ハイライト `#FFF0D2`。
- **ポーズ:** 正面向きやや上。両足は揃えても可。砲口は上。
- **可視 footprint:** canvas 40×40 のうちおおよそ 32×34。上下左右に 2〜4px の透明余白。
- **維持（全 tier 共通、後続生成時）:** 同じ顔間隔、同じ砲、同じ cyan 家系。Tier 差は胴の幅と輪郭の誇張だけ。
- **禁止:** 筋肉の写実、ブランドロゴ、痩せ称賛の encircling 計測 UI、汚れた衣類。Overflowing / FAT OVER でも武器を落とさない。
- **AI prompt kernel (EN):** `tiny 40x40 pixel art astronaut with round cute silhouette, two-dot eyes, small training cannon pointing up, cyan armor #53F6FF, 1px #21102F outline, top-left highlight, transparent background, no anti-alias, no brand logos, dignified not skinny-worship`

後続 tier（North Star 承認後）:

| Tier | Silhouette | 禁止 |
| --- | --- | --- |
| Rounded | 胴 +10〜15% | 顔を小さくしない |
| Heavy | 胴 +25〜35%、まだ機敏 | 汗・汚れ・破れ |
| Overflowing | 最大誇張。愛嬌と装備は維持 | 「敗北した体」記号、伏せた目 |

### 5.2 FRY SCOUT — `pixel.enemy.fryScout.idle`

- **読み:** 赤い紙容器に入ったフライの斥候。ポテトの槍、細い脚。編隊の基本兵。
- **色:** 容器 `#C43B3B`、ポテト `#FFB33D` / `#FFD27A`、脚 `#21102F`。
- **ポーズ:** 容器が本体。脚は 2 本、2〜3px。槍は下向き（Player 方向）または斜め下。
- **可視 footprint:** 28×28 のうちおおよそ 24×24。
- **禁止:** マクドナルド風アーチ、英語 wordmark、油汚れを汚物として描くこと。腐敗色（緑黒）禁止。

### 5.3 FRY bullet — `pixel.bullet.fry`

- **読み:** 避けたいのにおいしそうなポテト 1 本。危険物なので coral の外輪を 1px 持ってよいが、主色は amber。
- **形:** 短いフライ。両端が丸い。斜め 0〜20° まで。針にしない。
- **canvas:** 14×14。食品が 10×10 以上を占める。
- **禁止:** 抽象光球のまま（現行 placeholder からの脱却が AC-233 の対象）、cyan、細長いレーザー。

### 5.4 Player bullet — `pixel.bullet.playerShot`

- **読み:** METABOLIC SHOT。cyan コア + 先端の明るい 1〜2px。細長い。
- **形:** 幅 4〜6px、高さ 14〜16px のカプセルまたは尖塔。食べ物の凹凸なし。
- **禁止:** 丸、アウトライン過多で FRY と相似になること。

### 5.5 KING BURGER — `pixel.boss.kingBurger.idle`

- **読み:** 王冠ピクルスを載せた多層バーガーの王。尊大で愛嬌がある。厚いシルエット。
- **層（下から）:** バンズ、パティ、チーズまたはピックル、バンズ、王冠。96×72 で 4〜5 層が読めること。
- **色:** バンズ `#FFB33D` / `#FFF0D2`、パティ `#6B3A22`、ピックル `#7CB342`。Sweets pink は主色にしない（現行 placeholder の pink は捨てる）。
- **ポーズ:** 正面、わずかに上から。目またはチーズの「視線」が下の Player を見る。
- **可視 footprint:** 幅 80〜88、高さ 58〜66 を目安。画面幅 390 の約 22〜25%（FI-04 の 35〜42% は将来サイズ移行時）。
- **死亡アニメ:** このシートに焼かない。3-beat は既存 VFX のまま。
- **禁止:** 実在チェーンのロゴ・包装、腐ったパティ、昆虫。

## 6. Asset catalog

列の意味:

- **Runtime size:** Phaser に載せる canvas。現行 hitbox 計算の基準と一致させる既定値。
- **Master size:** 編集用 PNG。runtime × 4。
- **Frames (NS):** Style North Star で今作る枚数。
- **Frames (later):** 承認後の最大。コード接続は別 PR。

### 6.1 North Star pack (generate only after Human approval of this spec)

| ID | Texture key | 用途 | Runtime | Master | NS frames | Later frames | Pivot | Hitbox (immutable this cycle) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `pixel.player.light.idle` | `tex-player` | Player Light | 40×40 | 160×160 | 1 | idle 4 / move 2–4 / shoot 2 / hit 2 | center | 24×28 @ offset (8,6) |
| `pixel.enemy.fryScout.idle` | `tex-enemy-fry-scout` | Stage 1 雑魚 | 28×28 | 112×112 | 1 | idle 4 / attack tell 2–4 | center | 23.8×23.8 @ (2.1,2.1) |
| `pixel.boss.kingBurger.idle` | `tex-boss-king-burger-mini` | Stage 1 Boss | 96×72 | 384×288 | 1 | idle 4–8 / tell 4+ / phase 6+ | center | 81.6×61.2 @ (7.2,5.4) |
| `pixel.bullet.playerShot` | `tex-bullet-player` | 味方弾 | 6×16 | 24×64 | 1 | 1（回転不要） | center | 6×16 full texture |
| `pixel.bullet.fry` | `tex-bullet-fry` | 敵弾 FRY | 14×14 | 56×56 | 1 | 1〜2（任意の 90° 未満ゆらぎ） | center | 14×14 full texture |

key 名 `tex-boss-king-burger-mini` はコード互換のため残す。リネームはコード PR かつ Human 承認。

### 6.2 Same-cycle follow-on (after North Star stills PASS, still no mass Stage 2/3)

| ID | Texture key 方針 | Runtime | Master | Frames | 備考 |
| --- | --- | ---: | ---: | ---: | --- |
| `pixel.player.rounded.idle` | `tex-player` の frame または `tex-player-rounded` | 40×40 | 160×160 | 1→idle 4 | hitbox 不変 |
| `pixel.player.heavy.idle` | 同上 | 40×40 | 160×160 | 1→idle 4 | 同上 |
| `pixel.player.overflowing.idle` | 同上 | 40×40 | 160×160 | 1→idle 4 | 速度 -8% 以外の能力差を描かない |
| `pixel.player.fatOver.pose` | 任意 | 40×40 | 160×160 | 0（既定） | 既定は現行 squash を維持。差し替えは Human Gate |

FAT OVER 専用シートを足しても `fatOverHoldMs` と「満腹につき、いったん帰還。」は変えない。

### 6.3 Explicitly out of this Pixel Art design cycle

画像も仕様の量産対象もしない。

- DONUT DRIFTER、SODA TANK、PIZZA CUTTER、CAKE CASTER
- PIZZA MOTHER、KING CALORIE
- DONUT / PIZZA SLICE / TAPIOCA / CAKE / SODA LASER 弾
- Power-up 3〜5 種、Result D〜SS、HUD frame、背景 3 層、BGM/SE
- Title ロゴの最終ドット版
- VFX particle / fragment のラスター化（現行生成テクスチャで Game Feel 確定済み）

欠品の正は引き続き FI-09。本仕様は Stage 1 North Star の作り方だけを閉じる。

## 7. Visual bounds vs hitbox independence

規則:

1. **Physics body は `GameBalance` / entity の現行 px 値を唯一の正とする。** ドットの塗り面積で body を追従させない。
2. Appearance tier、FAT OVER squash、Boss death squash で body を変えない。
3. 絵の「体型がはみ出す」部分は透明 canvas 内の視覚であり、hitbox を大きくしない（FI-08: 体型を不利そのものにしない）。
4. 敵弾 hitbox を見た目より小さくする FI-02 §8.1 は、**現行未実装**。縮小は dodge feel を変えるため別 Human Gate。本サイクルでは 14×14 のまま。
5. 最終 PNG の opaque 画素が hitbox より大きくてよい。逆に hitbox が透明領域に食い込んでよい。読み味は outline で担保する。
6. 実装接続時は `body.setSize` / `setOffset` をテクスチャ解像度から自動計算し直さない。現行数値を定数として残す。

```text
canvas  ≠  opaque pixels  ≠  arcade body
```

## 8. Directories, naming, pipeline stages

### 8.1 Three stages

```text
master     人が描く / AI が出すロスレス原画。ゲームに直接載せない
processed  palette 拘束・fringe 除去・整数縮小済み。レビュー用
runtime    Vite が配信し Phaser が load する最終 PNG（+ 将来 atlas）
```

### 8.2 Layout

```text
assets-src/                          # git 管理。Pages に出さない
  masters/
    player/player_tier_light_idle.png
    enemies/enemy_fry_scout_idle.png
    bosses/boss_king_burger_idle.png
    bullets/bullet_player.png
    bullets/bullet_fry.png
  prompts/
    <asset-id>.txt                   # 使用した正本プロンプト
  processing/
    <asset-id>.log.md                # 加工履歴
  licenses/
    <asset-id>.json                  # 下記 schema の 1 ファイルでも可

public/assets/                       # Vite が dist ルートへコピー
  sprites/player/player_tier_light.png
  sprites/enemies/enemy_fry_scout.png
  sprites/bosses/boss_king_burger.png
  sprites/bullets/bullet_player.png
  sprites/bullets/bullet_fry.png

src/game/content/asset-manifest.ts   # 実装 PR で追加。本 PR では schema のみ
```

`assets-src/` は git に含める（再現性と AC-440）。`public/assets` の未使用巨大原画は置かない。

FI-04 §11 の `assets/sprites/...` は意図パスである。実装上の配信ルートは **`public/assets/...`** とし、Phaser には `BASE_URL + 'assets/...'` で渡す。

### 8.3 File naming

```text
<role>_<subject>_<variant>_<anim>_<frame>.png

role:      player | enemy | boss | bullet | vfx | ui | bg
subject:   fry_scout | king_burger | player | fry | ...
variant:   light | rounded | heavy | overflowing | idle | ...
anim:      idle | move_l | move_r | shoot | hit | tell | death
frame:     00, 01, ... zero-padded
```

North Star still は `<anim>_<frame>` を省略して `_idle.png` でよい。

禁止: `final2`、`ai_output`、`chatgpt` をファイル名に含めない。履歴は manifest へ。

### 8.4 Phaser load contract (future implementation PR)

```text
scene.load.setBaseURL(import.meta.env.BASE_URL)
scene.load.image(TextureKey.player, 'assets/sprites/player/player_tier_light.png')
```

- Magic string パス禁止。`asset-manifest.ts` の path だけを読む。
- `TextureKey` の文字列は現行値を維持し、中身だけ差し替える。
- `pixelArt: true` を維持。texture に linear filter をかけない。
- 未ロード時は現行 `ensurePlaceholderTextures` を fallback に残してよい（欠品で Boot を止めない）。必須扱いへ上げるのは Human Gate 後。

## 9. Manifest schema

将来ファイル: `src/game/content/asset-manifest.ts`。本 PR では型だけを正とする。1 asset 1 レコード。

```ts
type PixelAssetId = string; // e.g. 'pixel.player.light.idle'

type AssetSourceMethod = 'human-drawn' | 'ai-generated' | 'hybrid' | 'placeholder';

type AssetLicense = {
  spdx: string; // e.g. 'CC0-1.0' | 'UNLICENSED' | 'LicenseRef-Internal'
  holder: string;
  url?: string;
  commercialOk: boolean;
  generativeModelTermsOk: boolean;
  notes: string;
};

type AssetSource = {
  method: AssetSourceMethod;
  tool?: string; // e.g. 'ChatGPT image', 'Aseprite'
  model?: string;
  promptPath?: string; // assets-src/prompts/...
  promptHash?: string; // sha256 of prompt text
  seed?: string;
  operator: string; // Human or agent id
  createdOn: string; // YYYY-MM-DD
};

type ProcessingStep = {
  at: string; // ISO date
  action: 'crop' | 'index-palette' | 'nearest-downscale' | 'defringe' | 'pivot-pad' | 'manual-pixel' | 'reject';
  operator: string;
  notes: string;
};

type PixelAssetRecord = {
  id: PixelAssetId;
  textureKey: string; // must match TextureKey.*
  role: 'player' | 'enemy' | 'boss' | 'bullet' | 'vfx' | 'ui' | 'bg';
  stage: 'master' | 'processed' | 'runtime';
  masterPath: string;
  processedPath?: string;
  runtimePath: string;
  runtimeWidth: number;
  runtimeHeight: number;
  masterWidth: number;
  masterHeight: number;
  frameCount: number;
  frameNames: string[];
  pivot: { x: number; y: number }; // 0..1
  hitbox: { width: number; height: number; offsetX: number; offsetY: number } | null;
  palette: string[]; // hex list actually used
  source: AssetSource;
  license: AssetLicense;
  processingHistory: ProcessingStep[];
  northStar: boolean;
  humanGate: 'unreviewed' | 'approved' | 'rejected' | 'deferred';
  replacesPlaceholder: boolean;
};
```

検証ルール（実装 PR で unit test 化する）:

- `textureKey` が `TextureKey` に存在する。
- `runtimePath` が `assets/` で始まり、`/` 先頭ではない。
- `masterWidth === runtimeWidth * 4` かつ height も同様（例外は records で明示）。
- `hitbox` を持つなら値が `GameBalance` / 現行 entity と一致。
- `humanGate === 'approved'` のものだけ runtime 差替の候補。
- `license.generativeModelTermsOk === false` の AI 素材は runtime に出せない。

Credits 行の生成元はこの manifest とする（AC-440）。

## 10. Work order (generate → process → implement → Human Gate)

```text
0. 本仕様の Human 承認（Style North Star 文書 Gate）
     未承認なら画像を作らない
1. North Star 5 still だけ生成（master）
2. 加工: crop / palette index / nearest 4×→1× / defringe / pivot 統一
3. チェックリスト（§10.1）を processed に対して実施
4. Human visual Gate（4 問: 読める / おいしそう / 気持ちいい土台 / 侮辱でない）
5. 承認された still のみ public/assets へコピー + manifest 記入
6. 実装 PR（別）: BootScene preload、TextureKey 差し替え、fallback 維持
     GameBalance / hitbox / feel timings は変更しない
7. Desktop + Mobile で Title→Play→Kill→Boss→FAT OVER / Result を目視
8. AC-232 / AC-233 を Human 再判定（§12）
9. 承認後に限って Player 残り 3 tier など Stage 1 follow-on
10. Stage 2/3・背景・Result art は Milestone C。この順序を飛ばさない
```

画像生成 PR とコード接続 PR を混ぜない。Feel 調整 PR とも混ぜない。

### 10.1 Processed checklist

- [ ] 390×844 相当（論理 px）で輪郭が読める
- [ ] Nearest 拡大で滲みがない
- [ ] 透明縁に白 fringe がない
- [ ] パレット外色が無い（例外は manifest に hex を追加して Human 承認）
- [ ] Player 弾と FRY 弾が無彩色でも区別できる
- [ ] FRY SCOUT / KING BURGER が食品として魅力的
- [ ] Player Light が有能で愛嬌がある
- [ ] 実在 brand に見えない
- [ ] opaque 範囲が「次フレームも同じ pivot」で中央寄せ
- [ ] ファイルサイズと 4× master が揃っている

## 11. Defaults vs Human decisions

安全な既定（承認待ち中も文書としてはこれに従う）:

| 項目 | 既定 | 代替 | 影響 |
| --- | --- | --- | --- |
| Runtime canvas | 現行 40 / 28 / 96×72 / 6×16 / 14×14 | FI-04 の 48 / 40 / 160×128 | 見た目の占有率が変わる。hitbox を追従させなければ戦闘は不変だが、被弾しやすさの**体感**は変わる |
| Master 倍率 | 4× | 2× | 2× は AI ディテールが足りないリスク |
| 初回実装フレーム | 各 1 idle | FI-04 フル animation | コード量が走る。Feel 非変更なら 1 枚で足りる |
| FAT OVER 絵 | 現行 squash を維持 | 専用 pose sheet | 2.6s HOLD は不変でも印象が変わる |
| 敵弾 hitbox | テクスチャ全面 | 見た目の 70〜80% | **gameplay 変更**。art PR でやらない |
| Boss texture key | `tex-boss-king-burger-mini` 維持 | `tex-boss-king-burger` | コード変更 |
| 生成ツール | Human が指定するまで生成しない | — | 権利条項がツール依存 |

## 12. AC-232 / AC-233 evidence plan

いずれも最終ドット導入後の Human MUST。自動化だけでは PASS にしない。placeholder のまま再判定しない。

### AC-232 派手さが回避の妨げにならない

**Given** 最終 FRY SCOUT / FRY bullet / Player が載った Stage 1。
**When** Desktop 1440×900 と Mobile 390×844（参考で 360 幅）で通常撃破と連続撃破と Boss phase 2 の 3-way を遊ぶ。
**Then** 敵弾の外形を追い続けられる。Kill VFX が弾より前面に長く残らない（現行 depth 維持）。

証拠:

| 証拠 | 内容 |
| --- | --- |
| V | `docs/evidence/ac232-desktop.png` / `ac232-mobile.png`（viewport と commit SHA をファイル名または隣接 txt に） |
| V | 無彩色化（または outline 強調）した戦闘 1 枚。弾が残っていること |
| H | Creative Director の採用 / 修正 / 保留 |
| R | particle cap 320、enemyBullet depth > vfx が維持されていること（コード非変更が原則） |

維持するもの: 通常撃破の particle / hit stop / shake（AC-230/231）。落とすなら VFX opacity / lifetime のみで、combat 数値は触らない。

### AC-233 食べ物が危険かつおいしそう

**Given** North Star の FRY SCOUT、FRY bullet、KING BURGER。
**When** 静止画と 10 秒程度の戦闘動画を並べる。
**Then** 「おいしそう」と「当たると CAL が増える危険物」が同時に成立する。腐敗や侮辱ではない。

証拠:

| 証拠 | 内容 |
| --- | --- |
| V | 3 体 + FRY 弾の連絡シート（palette 付き） |
| V | グレースケール版（§4 テスト） |
| H | 「危険かつおいしそう」の採用文言 |
| R | manifest の source/license。実在 brand チェック |

Gate パッケージは FI-04 §15 に寄せ、最低でも Mobile 通常戦闘・Desktop 通常戦闘・Player 被弾・Boss が画面内にいる 1 枚を含む。

## 13. Mapping to existing code

| 仕様 ID | 現行コード | 接続時に触ってよいこと | 触ってはいけないこと |
| --- | --- | --- | --- |
| `tex-player` | `textures.ts`, `Player.ts`, `setAppearanceTint` | load した PNG を同 key で登録。tier を frame/key 分岐 | `hitboxWidthRatio`、spriteSize、FAT OVER scale/timing |
| `tex-enemy-fry-scout` | `Enemy.ts` `TEXTURE_BY_ENEMY` | 同上 | `hitboxRatio` 0.85、HP、発射間隔 |
| `tex-boss-king-burger-mini` | `Boss.ts`, `GameScene.startBossIntro` | 同上 | 3-beat、HP 30、phase 閾値 |
| `tex-bullet-player` | `GameScene.firePlayerShot` | 同上 | 速度 680、間隔 180、body 6×16 |
| `tex-bullet-fry` | `updateEnemyFire`, `bossFire` | 同上 | 速度 190、CAL 10、body 14×14 |
| VFX keys | `FeedbackSystem` | 変更しない既定 | flash / particle 数 / shake |
| `asset-manifest.ts` | 未存在 | 新規追加 | domain の score/calorie 式 |
| BootScene | 空の start Title | preload 追加 | Production への E2E bridge |

## 14. Open questions for Human

文書 Gate で明示してほしい項目。推奨は太字。

1. **本仕様を Style North Star の正として承認するか。** 承認前は生成しない。
2. Runtime canvas を現行サイズのままにするか、FI-04 §6.2 へ移行するか。**推奨: 現行維持。**
3. 生成ツールと商用条件（どのモデルで、出力の再配布が許されるか）。指定があるまで生成しない。
4. Player 4 tier を Light 承認後に順次作るか、4 枚同時か。**推奨: Light 承認後に 3 枚。**
5. FAT OVER を squash のままにするか、専用 pose を足すか。**推奨: squash 維持。**
6. `tex-boss-king-burger-mini` のリネームを許可するか。**推奨: このサイクルではしない。**
7. 敵弾 hitbox を FI-02 どおり小さくするか。**推奨: しない（gameplay）。**

BGM/SE 権利（FI-09 §3-2）は本仕様の対象外。音源方針は Sound mix 工程で別途。

## 15. Independent audit of this document

| Severity | Finding | Disposition |
| --- | --- | --- |
| — | 画像・コード・Feel 数値をこの PR で変えていない | PASS 条件 |
| Major 回避 | FI-04 canvas と実装サイズの矛盾を黙って片方へ寄せない | §11 で Human 判断化 |
| Major 回避 | Boss death / FAT OVER をアニメ枚数で上書きしない | §2, §5.5, §6.2 |
| Minor | `bullet.fry.size = 12` と texture 14 の不一致 | 記録のみ。hitbox は 14 |
| Minor | AC-117 の専用 integration test が薄い | コード非変更のため本 PR では触らない |

Critical / Major の未処理なし。未確定は §14 の Human Gate のみ。
