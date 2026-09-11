# FATインベーダー — Pixel Asset Specification

**Document ID:** FI-10
**Version:** 1.3 (North Star 5 still concepts Human APPROVED; processed-runtime Gate pending)
**Status:** 5 still concepts Human APPROVED（2026-09-10）。processed / public runtime 統合済み。runtime visual Human Gate 待ち（AC-232 / AC-233 PENDING）
**Depends on:** FI-01, FI-02, FI-04, FI-05, FI-07, FI-08, FI-09
**Last updated:** 2026-09-10
**Base main SHA (spec origin):** `7e054d91e4ec2d7639df49dd974e784cd8de90bb`
**Integration branch base:** `e70bf11a71937103333585c6abde90e8e9d30be8`

## 0. Purpose and non-goals

この文書は Pixel Asset Specification / Style North Star と、Human 採用済み 5 still の決定論的加工・統合契約を定義する。

本サイクルで行うこと:

- raw → canonical master → processed runtime → public runtime
- Boot preload、manifest、Player light tint 修正、player bullet body 明示
- AC-232 / AC-233 用の証拠提示（Human PASS は宣言しない）

行わないこと:

- 新規 AI 画像生成、animation、Player 残り 3 tier
- Game Feel / hitbox 比率 / Boss 3-beat / FAT OVER 2.6s の変更
- Ready / merge / Deploy

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

FI-04 §6.2 の最終 canvas（Player 48×48、通常敵 40×40、Boss 160×128以内）は**現行 runtime と不一致**。North Star pilot の runtime canvas は現行サイズを維持する（§11 確定）。最終サイズ変更は実装後の Visual Gate で別判断する。

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
| Player 弾 | `playerShot` | 速度 680、damage 1、間隔 180ms | — | 見た目はくしゃ紙弾。内部 weaponId `metabolicShot` は互換残置 |
| 食べ物弾 | `fry` | CALORIE 10、速度 190 | — | Milestone B は FRY 1種のまま（FI-09 §3-3） |

Wave: `waves.stage1Wave1` のみ。Boss 警告 900ms → intro 1000ms → active → 3-beat death。Power-up / 背景パララックス / BGM / SE は未実装。

### 1.5 Animation frames

現行コードに Phaser Animation、spritesheet、frame 切替は無い。

| 表現 | 現行の実現 | 最終ドットで必須か |
| --- | --- | --- |
| Player idle / move / shoot | 静止 1 枚 + 移動は位置のみ | North Star 承認後。初回実装は idle 1 フレームで可 |
| Player hit | alpha 0.5 を 120ms | shader/tint 継続可（FI-04） |
| Player appearance | tint 4 種 | **4 体の専用 sprite が最終必須**（AC-305） |
| FAT OVER | squash 2.6s + 文言 | **タイミング非変更**。専用 pose sheet は作らず、現行 squash を維持 |
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
| `assets-src/` raw / masters / processed | なし |
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
- **Pixels:** 内部 anti-alias 禁止。Sprite内部とoutlineはalpha 255、外部背景はalpha 0。中間alpha 1〜254は禁止。Glowや半透明表現はruntime VFXへ委譲する。
- **Fringe:** 透明縁に `#FFFFFF` / マatting 色を残さない。
- **Scale:** runtime で非整数 scale しない。Canonical master は runtime の整数 4×。Raw source の解像度は固定しない。
- **Pivot:** 全フレーム同一。既定は canvas 中心（Phaser origin 0.5, 0.5）。透明余白をフレーム間で変えない。

### 3.3 Tone (FI-08)

- 食べ物はおいしそう。腐敗・汚物・病気で悪役化しない。
- Player の太い段階を汚い・怠惰・無能にしない。顔・装備・目の元気さを落とさない。
- 実在 brand / 包装 / マスコットを模倣しない。
- 医学的 kcal や体脂肪の「正確な」描写をしない。

## 4. Silhouette rules (AC-213)

色を落としたグレースケール / 1bit でも、Player 弾と食べ物弾が区別できること。

| | Player bullet (`tex-bullet-player`) くしゃ紙弾 | Food bullet (`tex-bullet-fry`) 黄金フライ弾 |
| --- | --- | --- |
| 基本形 | 不規則でギザギザしたクリーム紙の塊（丸めた健診結果） | 密に揃えた短い黄金フライの束 |
| アスペクト | canvas 12×16。opaque は概ね 12×12 を縦中央配置 | canvas 14×14。opaque 概ね 12×12、外接は 1:1 に近い |
| 輪郭 | 紙の折れ・突起。細長い針や巻物にしない | 太い dark outline。食品塊 |
| 内部 | `#FFF0D2` / muted の紙質。文字は runtime で読ませない | amber / potato / coral の揚げ目 |
| 禁止 | スクロール、タバコ、石、ポップコーン、エネルギー球、食品化 | 縦針、レーザー、単独の長いポテト |

判定テスト: 0.3 秒以内にどちらが味方弾か言えること。証拠は `docs/evidence/ac213-bullet-silhouette-*.png`。

## 5. Style North Star

Human が 2026-09-10 に採用した 5 still concepts（画像概念 PASS）:

1. 三日坊主号 — `pixel.player.sannichibouzu.idle`
2. FRY SCOUT — `pixel.enemy.fryScout.idle`
3. くしゃ紙弾 — `pixel.bullet.playerCrumpledCheckup`
4. 黄金フライ弾 — `pixel.bullet.goldenFry`
5. KING BURGER — `pixel.boss.kingBurger.idle`

### Rejected concepts — do not restore

- futuristic cyan astronaut Player / Player Light astronaut
- METABOLIC SHOT energy bullet（見た目）。内部 event id `metabolicShot` は互換のため残置可
- rolled-paper 健診ロール

ユーモアの標的は、三日坊主の過剰な決意と即席装備であり、身体そのものではない。Player は有能・愛嬌・尊厳を保つ。

### 5.1 三日坊主号 — `pixel.player.sannichibouzu.idle`

- **読み:** 太鼓腹の会社員が自作エアロバイク車両に乗り、決意の表情。赤ネクタイ鉢巻、白シャツ、大きなフライホイール、書類発射器。
- **canvas:** runtime 40×40 / master 160×160。可視最大 38×38。
- **hitbox:** 24×28 @ (8,6) 不変。
- **色:** cyan 装甲を使わない。cream / potato / patty / coral / muted / plum。
- **tier:** 本 PR は 1 still。`light` は clearTint。他 tier は暫定 tint。残り 3 tier sprite は out of scope。

### 5.2 FRY SCOUT — `pixel.enemy.fryScout.idle`

- 赤い紙容器、ポテト、細い脚。runtime 28×28。hitbox 現行 85%。

### 5.3 くしゃ紙弾 — `pixel.bullet.playerCrumpledCheckup`

Canonical copy（UI 未配線。`docs/content/flavor-copy-north-star.md`）:

> 「まぁ、次には良くなってる」と丸めてきた、歴代の健診結果。三日坊主号の主砲弾。

- **形:** 不規則な紙の塊。巻物・エネルギー弾にしない。
- **canvas:** 12×16 / master 48×64。
- **body:** **6×16 @ (3,0)**（見た目と独立）。

### 5.4 黄金フライ弾 — `pixel.bullet.goldenFry`

- 密な黄金フライ束。14×14 canvas。body 14×14。

### 5.5 KING BURGER — `pixel.boss.kingBurger.idle`

- 王冠ピクルスの多層バーガー。96×72。key `tex-boss-king-burger-mini` リネームしない。death は既存 3-beat。

## 6. Asset catalog

列の意味:

- **Runtime size:** Phaser に載せる canvas。現行 hitbox 計算の基準と一致させる（§11 確定）。
- **Master size:** canonical master PNG。runtime × 4。raw source ではない。
- **Frames (NS):** Style North Star で今作る枚数（各 1 still）。
- **Frames (later):** 承認後の最大。animation 量産はしない。コード接続は別 PR。

### 6.1 North Star pack (generate only after Human approval of this spec)

| ID | Texture key | 用途 | Runtime | Master | NS frames | Later frames | Pivot | Hitbox (immutable this cycle) |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `pixel.player.sannichibouzu.idle` | `tex-player` | 三日坊主号 | 40×40 | 160×160 | 1 | out of scope | center | 24×28 @ offset (8,6) |
| `pixel.enemy.fryScout.idle` | `tex-enemy-fry-scout` | Stage 1 雑魚 | 28×28 | 112×112 | 1 | out of scope | center | 23.8×23.8 @ (2.1,2.1) |
| `pixel.boss.kingBurger.idle` | `tex-boss-king-burger-mini` | Stage 1 Boss | 96×72 | 384×288 | 1 | out of scope | center | 81.6×61.2 @ (7.2,5.4) |
| `pixel.bullet.playerCrumpledCheckup` | `tex-bullet-player` | くしゃ紙弾 | 12×16 | 48×64 | 1 | out of scope | center | **6×16 @ (3,0)** |
| `pixel.bullet.goldenFry` | `tex-bullet-fry` | 黄金フライ弾 | 14×14 | 56×56 | 1 | out of scope | center | 14×14 full texture |

key 名 `tex-boss-king-burger-mini` はリネームしない。animation 量産はしない。

### 6.2 Same-cycle follow-on (after North Star stills PASS, still no mass Stage 2/3)

| ID | Texture key 方針 | Runtime | Master | Frames | 備考 |
| --- | --- | ---: | ---: | ---: | --- |
| `pixel.player.rounded.idle` | `tex-player` の frame または `tex-player-rounded` | 40×40 | 160×160 | 1→idle 4 | hitbox 不変 |
| `pixel.player.heavy.idle` | 同上 | 40×40 | 160×160 | 1→idle 4 | 同上 |
| `pixel.player.overflowing.idle` | 同上 | 40×40 | 160×160 | 1→idle 4 | 速度 -8% 以外の能力差を描かない |
| `pixel.player.fatOver.pose` | 任意 | 40×40 | 160×160 | 0（確定） | **現行 squash を維持。** 専用 pose sheet は作らない |

FAT OVER は現行 `setScale(1.18, 0.82)` + caption 約 2.6s を維持する。`fatOverHoldMs` と「満腹につき、いったん帰還。」は変えない。

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
4. 敵弾 hitbox を見た目より小さくする FI-02 §8.1 は、**現行未実装**。本サイクルでは **14×14 のまま変更しない**（§11 確定。gameplay 非変更）。
5. 最終 PNG の opaque 画素が hitbox より大きくてよい。逆に hitbox が透明領域に食い込んでよい。読み味は outline で担保する。
6. 実装接続時は `body.setSize` / `setOffset` をテクスチャ解像度から自動計算し直さない。現行数値を定数として残す。

```text
canvas  ≠  opaque pixels  ≠  arcade body
```

## 8. Directories, naming, pipeline stages

### 8.1 Four stages

```text
raw source          AI画像生成から取得した原寸の未加工ファイル。解像度固定なし。上書きしない
canonical master    runtime の整数 4× へ crop / pad / nearest 変換した編集正本
processed runtime   palette / fringe / pivot / 透過を検証した runtime 寸法のレビュー用画像
public runtime      Human 承認済みの配信用画像（Vite → Phaser）
```

Raw source と canonical master を混同しない。AI 生出力を master 扱いしない。

### 8.2 Layout

```text
assets-src/                          # git 管理。Pages に出さない
  raw/
    player/player_tier_light_idle.png
    enemies/enemy_fry_scout_idle.png
    bosses/boss_king_burger_idle.png
    bullets/bullet_player.png
    bullets/bullet_fry.png
  masters/                           # canonical master (runtime × 4)
    player/player_tier_light_idle.png
    enemies/enemy_fry_scout_idle.png
    bosses/boss_king_burger_idle.png
    bullets/bullet_player.png
    bullets/bullet_fry.png
  processed/                         # processed runtime (runtime 寸法)
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

public/assets/                       # public runtime。Vite が dist ルートへコピー
  sprites/player/player_tier_light.png
  sprites/enemies/enemy_fry_scout.png
  sprites/bosses/boss_king_burger.png
  sprites/bullets/bullet_player.png
  sprites/bullets/bullet_fry.png

src/game/content/asset-manifest.ts   # 実装 PR で追加。本 PR では schema のみ
```

`assets-src/` は git に含める（再現性と AC-440）。`assets-src/raw/` は上書き禁止。`public/assets` の未使用巨大原画は置かない。

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
  termsUrl?: string; // e.g. OpenAI Terms of Use URL
  termsEffectiveOn?: string; // YYYY-MM-DD of terms version noted
  termsCheckedOn?: string; // YYYY-MM-DD when Human/agent recorded the check
  commercialOk: boolean;
  generativeModelTermsOk: boolean;
  similarityRiskReviewed: boolean; // third-party / brand likeness Human review done
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
  action:
    | 'ingest-raw'
    | 'crop'
    | 'pad'
    | 'nearest-to-master'
    | 'index-palette'
    | 'nearest-downscale'
    | 'defringe'
    | 'pivot-pad'
    | 'manual-pixel'
    | 'reject';
  operator: string;
  notes: string;
};

type PixelAssetRecord = {
  id: PixelAssetId;
  textureKey: string; // must match TextureKey.*
  role: 'player' | 'enemy' | 'boss' | 'bullet' | 'vfx' | 'ui' | 'bg';
  stage: 'raw' | 'canonical-master' | 'processed-runtime' | 'public-runtime';
  rawSourcePath: string;
  rawSourceWidth: number; // recorded as-generated; not forced to runtime × N
  rawSourceHeight: number;
  masterPath: string; // canonical master
  processedPath?: string; // processed runtime (review size)
  runtimePath: string; // public runtime under assets/
  runtimeWidth: number;
  runtimeHeight: number;
  masterWidth: number; // canonical master only
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
- **Canonical master のみ** `masterWidth === runtimeWidth * 4` かつ height も同様（例外は records で明示）。**Raw source にはこの検証を適用しない。**
- `rawSourcePath` / `rawSourceWidth` / `rawSourceHeight` が記録されている（AI 生成時）。
- AI 生成時は `license.termsUrl` / `termsEffectiveOn` / `termsCheckedOn` / `similarityRiskReviewed` が埋まっている。
- `hitbox` を持つなら値が `GameBalance` / 現行 entity と一致。
- `humanGate === 'approved'` のものだけ public runtime 差替の候補。
- `license.generativeModelTermsOk === false` の AI 素材は public runtime に出せない。

### 9.1 ChatGPT / OpenAI terms recording (not legal advice)

生成ツールは **ChatGPT 画像生成** とする（§11 確定）。manifest には次を記録する。法的保証とは表現しない。

| 記録項目 | 内容 |
| --- | --- |
| `termsUrl` | `https://openai.com/policies/row-terms-of-use/` |
| `termsEffectiveOn` | 確認時点で参照した Terms の発効日（YYYY-MM-DD） |
| `termsCheckedOn` | 本プロジェクトで規約を確認した日（YYYY-MM-DD） |
| 関係の要約（`notes`） | OpenAI との関係上、ユーザーが Output を所有する旨を記録する |
| 非独自性 | Output は非独自の場合がある旨を `notes` に残す |
| `similarityRiskReviewed` | 第三者の権利侵害・ブランド類似を Human review で確認したか |

Credits 行の生成元はこの manifest とする（AC-440）。

## 10. Work order (generate → process → implement → Human Gate)

```text
0. 本仕様の Human 承認（Style North Star 文書 Gate）— **PASS（2026-09-10）**
     承認範囲は文書・制作規則。5 still の絵柄は未承認
1. North Star 5 still だけを ChatGPT 画像生成で作成し assets-src/raw/ に保存（上書きしない）
2. raw → canonical master: crop / pad / nearest で runtime × 4 へ変換（assets-src/masters/）
3. master → processed runtime: palette index / nearest 4×→1× / defringe / pivot 統一
4. チェックリスト（§10.1）を processed runtime に対して実施
5. Human visual Gate（絵柄・可読性・食欲・風刺境界）
6. 承認された still のみ public/assets へコピー + manifest 記入
7. 実装 PR（別）: BootScene preload、TextureKey 差し替え、fallback 維持
     GameBalance / hitbox / feel timings は変更しない
8. Desktop + Mobile で Title→Play→Kill→Boss→FAT OVER / Result を目視
9. AC-232 / AC-233 を Human 再判定（§12）
10. Player Light 承認後に残り 3 tier（各 1 still）。animation 量産はしない
11. Stage 2/3・背景・Result art は Milestone C。この順序を飛ばさない
```

画像生成 PR とコード接続 PR を混ぜない。Feel 調整 PR とも混ぜない。

### 10.1 Processed checklist

- [ ] 390×844 相当（論理 px）で輪郭が読める
- [ ] Nearest 拡大で滲みがない
- [ ] 透明縁に白 fringe がない
- [ ] Sprite内部とoutlineはalpha 255、外部はalpha 0（中間alpha禁止）
- [ ] パレット外色が無い（例外は manifest に hex を追加して Human 承認）
- [ ] Player 弾（縦針）と FRY 弾（束 / 1:1 塊）がグレースケールおよび 1bit でも区別できる
- [ ] FRY SCOUT / KING BURGER が食品として魅力的
- [ ] Player Light が有能で愛嬌がある
- [ ] 実在 brand に見えない（similarityRiskReviewed）
- [ ] opaque 範囲が「次フレームも同じ pivot」で中央寄せ
- [ ] canonical master が runtime × 4（raw 寸法は問わない）
- [ ] rawSourcePath / termsUrl / termsEffectiveOn / termsCheckedOn が manifest にある

## 11. Technical decisions (locked)

次は本ドキュメント内で確定する。画像生成 PR・実装 PR で再オープンしない。最終 canvas サイズの変更だけは実装後 Visual Gate の別判断とする。

| 項目 | 確定内容 |
| --- | --- |
| North Star pilot runtime canvas | 現行サイズ維持（Player 40×40、FRY SCOUT 28×28、Boss 96×72、player bullet 6×16、FRY bullet 14×14） |
| FI-04 §6.2 へのサイズ移行 | 実装後の Visual Gate で別判断。本 pilot では行わない |
| Canonical master 倍率 | runtime × 4。raw source には適用しない |
| 生成ツール | ChatGPT 画像生成。Terms 記録は §9.1 |
| Player tiers | Player Light 承認後に残り 3 tier を制作 |
| 初回フレーム | 各 1 still。animation 量産はしない |
| FAT OVER | 現行 squash（`setScale(1.18, 0.82)`）+ 約 2.6s を維持。専用 pose sheet なし |
| Boss texture key | `tex-boss-king-burger-mini` をリネームしない |
| 敵弾 hitbox | 14×14 のまま変更しない |

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
| `asset-manifest.ts` | `src/game/content/asset-manifest.ts` | North Star 5 件 | domain の score/calorie 式 |
| BootScene | `preload()` loads BASE_URL assets | fallback placeholders if key missing | Production への E2E bridge |

## 14. Human Gate status

§11 の技術決定は再オープンしない。

| Gate | 状態 | 範囲 |
| --- | --- | --- |
| FI-10 文書 Gate | **PASS（2026-09-10）** | Style North Star 制作規則 |
| 5 still concept Gate | **PASS（2026-09-10）** | 三日坊主号 / FRY SCOUT / くしゃ紙弾 / 黄金フライ弾 / KING BURGER |
| processed-runtime visual Gate | **PENDING** | 実プレイ可読性・AC-213/232/233 |

Human が今判断すること:

1. runtime での三日坊主号の可読性と愛嬌
2. くしゃ紙弾と黄金フライ弾の即時区別
3. KING BURGER / FRY の食欲
4. VFX が弾を隠していないか（AC-232）
5. 食品 art が危険かつおいしそうか（AC-233）

AC-232 / AC-233 は Human 評価まで PENDING。

## 15. Independent audit of this document

| Severity | Finding | Disposition |
| --- | --- | --- |
| — | Game Feel / combat numbers 非変更 | PASS 条件 |
| Major 回避 | raw / master / processed / public 分離 | §8 |
| Major 回避 | playerShot body 6×16 @ (3,0) を視覚 12×16 から独立 | §5.3 / Projectile |
| Major 回避 | light tier clearTint（cyan wash 防止） | Player.ts |
| Minor | 40×40 ではバイク細部が潰れる場合あり | known limitation。再デザインしない |
| Minor | 内部 `metabolicShot` id 残置 | 互換。player-facing ではない |

## 16. Human adoption record

- **Date:** 2026-09-10
- **Concept decision:** PASS — 5 still concepts.
- **Rejected forever (this arc):** cyan astronaut、METABOLIC SHOT energy visual、健診ロール。
- **Integration:** deterministic process + Boot preload shipped in Draft PR; runtime Human Gate pending.
- **Canonical copy:** `docs/content/flavor-copy-north-star.md`
