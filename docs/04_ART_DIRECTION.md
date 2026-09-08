# FATインベーダー — Art and Audio Direction

**Document ID:** FI-04  
**Version:** 1.0  
**Status:** Implementation Baseline  
**Depends on:** FI-01, FI-02, FI-08

## 1. Visual Thesis

> 深夜のネオンゲームセンターに、高カロリー食品の軍団と筋トレ広告が同時に侵入したような世界。

レトロゲームの輪郭を持つが、懐古再現にはしない。16-bit風の制約、現代的な色・光・画面効果、食べ物の艶とおいしさ、過剰なフィットネス広告の記号を衝突させる。

## 2. Art Principles

優先順位:

1. **Gameplay readability** — 敵弾、Player、Player弾、Pickupが瞬時に区別できる。
2. **Appetizing danger** — 食べ物は危険物でありながら、質感はおいしそう。
3. **Escalating spectacle** — コンボとBossで画面の祝祭性が上がる。
4. **Comic silhouette** — 小さくてもキャラクター性が分かる。
5. **Satirical excess** — 広告的な身体賛美を、行き過ぎるほど誇張する。

可読性と派手さが衝突した場合は可読性を取る。

## 3. Style

- 2D pixel art / pixel-inspired。
- 論理解像度390×844を基準に、Nearest Neighborで拡大。
- Sprite内部は硬いピクセル輪郭、外側のGlow・Particleは滑らかな表現を許可。
- 写実ではなく、食べ物の主要特徴を2〜4個へ圧縮したカリカチュア。
- 太い暗色輪郭、明るい食材色、1〜2段のハイライト。
- UI文字はピクセル系Display fontと、可読性の高い日本語Sansの併用。

## 4. Color System

### 4.1 Core palette

| Role | Color | Usage |
| --- | --- | --- |
| Void | `#090615` | 背景の最暗部 |
| Deep plum | `#21102F` | 背景グラデーション |
| Player cyan | `#53F6FF` | Player、味方弾、操作ガイド |
| Burn lime | `#B9FF4A` | Power-up、成功、FAT BURN |
| Danger coral | `#FF4F64` | 敵弾輪郭、被弾、CALORIE高値 |
| Food amber | `#FFB33D` | 揚げ物、Score、爆発 |
| Sweets pink | `#FF71C8` | 菓子敵、Combo演出 |
| Milk cream | `#FFF0D2` | 主文字、食材ハイライト |
| UI muted | `#9D93B5` | 補助文字 |

色覚差に配慮し、味方・敵・Pickupを色だけで区別しない。

### 4.2 Ownership of colors

- Player bullets: cyan core + white tip、細長い。
- Enemy bullets: warm color + dark outline、丸いまたは食べ物形状。
- Pickups: lime halo + 固有アイコン、ゆっくり脈動。
- Non-interactive particles: 半透明、hitboxなし、敵弾より小さい。

## 5. Character Direction

### 5.1 Player

主人公は性別・人種を固定しすぎない、丸みのある人型宇宙戦士。顔は目2点＋口程度。武器は身体の前に構える小型トレーニング砲。

外見Tierが変わっても、次を維持する。

- 同じ人物と分かる顔・色・装備。
- すべてのTierで有能かつ愛嬌がある。
- 「太い姿＝汚い、怠惰、敗北」の記号を使わない。
- Tier差はシルエットの誇張として表現する。
- 当たり判定はTierで変えない。

### 5.2 Result appearances

Rank D〜SSは優劣の写実表現ではなく、ゲーム内評価装置が暴走していく連作として描く。

- D: 食べ物弾を抱えて帰還した、満腹で堂々とした姿。
- C: ごく普通に立つ姿。
- B: わずかに引き締まったヒーローポーズ。
- A: 漫画的アスリート。
- S: 筋肉と陰影が広告のように過剰、警告表示を添える。
- SS: 人体を超え、発光する幾何学的存在。ルッキズムの物差し自体が壊れる。

### 5.3 Enemy personality

敵は食品そのものの魅力を損なわない。腐敗・汚物・病気の表現で悪役化しない。傲慢な王、陽気な群れ、派手なショーマンとして描く。

| Enemy | Visual hooks |
| --- | --- |
| FRY SCOUT | 赤い紙容器、ポテトの槍、細い脚 |
| DONUT DRIFTER | 艶のあるアイシング、中央穴、回転 |
| SODA TANK | 氷入りカップ、太いストロー、泡の装甲 |
| PIZZA CUTTER | 三角形、伸びるチーズ、カッター状回転 |
| CAKE CASTER | クリーム帽子、苺の杖、層構造 |
| KING BURGER | 王冠ピクルス、厚い多層シルエット |
| PIZZA MOTHER | 円盤型、8切れの羽、中央チーズ眼 |
| KING CALORIE | 複数料理が合体した巨大な宴会怪獣 |

## 6. Sprite Specifications

### 6.1 Technical format

- Master: lossless PNG with transparency。
- Runtime atlas: PNG + JSON atlas。必要に応じWebPを比較するが、pixel edgeと互換性を優先。
- Color space: sRGB。
- Anti-aliasing: Sprite内部はoff。
- 透明余白は統一し、Pivotをmanifestに明記。
- Runtimeで画像の縦横比を変形しない。

### 6.2 Baseline sizes at logical resolution

| Asset | Canvas | Visible footprint |
| --- | ---: | ---: |
| Player | 48×48 | 約36×38 |
| Normal enemy | 40×40 | 約28〜36 |
| Heavy enemy | 56×56 | 約42〜50 |
| Boss | 160×128以内 | 画面幅35〜42% |
| Enemy bullet | 12〜28 | pattern依存 |
| Pickup | 28×28 | 約22×22 |
| Explosion sheet frame | 48×48 / 96×96 | 対象規模別 |

### 6.3 Minimum animation set

Player:

- idle 4 frames
- move-left / move-right 各2〜4 frames、または傾き＋thruster animation
- shoot 2 frames
- hit 2 frames
- FAT OVER 6〜10 frames
- appearance tier 4体

Normal enemy:

- idle 4 frames
- attack tell 2〜4 frames
- hit flashはshader/tintでも可
- deathは共通VFXと破片で構成可

Boss:

- idle 4〜8 frames
- attack tell 4 frames以上
- phase change 6 frames以上
- death 10 frames以上または分解演出

## 7. Backgrounds

背景は3層以内のparallaxを基本とする。

### Stage 1 — BURGER DISTRICT

- ネオン看板、紙包み、グリルの熱気。
- 暗い紫＋アンバー。
- 危険弾の赤橙と競合しないよう背景彩度を下げる。

### Stage 2 — PIZZA ORBIT

- 宇宙に浮くピザ店看板、回転するチーズ衛星。
- 深い紺＋トマト赤のアクセント。
- 回転背景は遅くし、弾幕との錯視を避ける。

### Stage 3 — BUFFET APOCALYPSE

- 無限に続く料理台、熱と光、崩壊するメニュー表示。
- 暗紫から警告赤へ段階変化。
- Final Boss Rageで背景の看板が `ALL YOU CAN EAT` から `ALL YOU CAN DODGE` へ壊れる。

## 8. VFX Language

### 8.1 Normal enemy kill

- 2 frames white flash。
- 25ms hit stop。
- 食材色の爆発Particle 12〜18。
- 2〜5個の大きめpixel fragments。
- `+score` popup。
- Combo tierに応じ2〜4px相当のShake。

### 8.2 Boss kill

- 外側から内側へ連続小爆発。
- 最終爆発前に80ms hit stop。
- 250〜400ms Slow Motion。
- Shockwave 1〜2枚。
- 残存弾を光点へ変換。
- Final Bossのみ短いCamera zoom。

### 8.3 Screen shake budget

- 同時Shakeは合算せず、強度を上限へclamp。
- Normal kill: 1.5〜3px、70ms。
- Player hit: 4px、100ms。
- Boss phase: 3px、120ms。
- Boss death: 6px、250ms。
- Reduced: 上記25%。Off: 0。

### 8.4 Flash safety

- 全画面白フラッシュの連続使用を避ける。
- 通常撃破は対象Sprite中心。
- 全画面フラッシュはBoss death等へ限定。
- Reduced Effects時は白面積と輝度を抑える。

## 9. UI Direction

### 9.1 HUD

- 左上: Score。
- 中央上: Combo。0時は弱くするか非表示。
- 右上: Pause。
- Score下または画面上部: CALORIE gauge。
- Gaugeは0〜60 cyan/lime、60〜85 amber、85〜100 coralへ。
- `CALORIE` は常時ラベル表示し、色だけで状態を伝えない。

### 9.2 Typography

- 英数字Display: 太いpixel font。商用利用・再配布条件を記録。
- 日本語本文: system sansまたはライセンス確認済み可読フォント。
- 重要数値は桁変化で幅が揺れないtabular数字を優先。
- Text outlineまたはshadowで背景から分離。

### 9.3 Copy density

戦闘中の中央表示は原則1行、12文字程度まで。長文説明はTitle / Resultだけに置く。

## 10. Audio Direction

### 10.1 Music

- 140〜170 BPM相当の短いloop。
- chiptune core + modern bass / percussion。
- Combo 25以上でlayer追加、50以上で高音layerまたはtempo感を増す。
- 実BPMの変更で同期を壊すより、Stemまたはfilter切替を優先。
- Bossは同一テーマの圧縮版または専用loop。

### 10.2 Sound effects

- Player shot: 短く軽い。連射時に耳を刺さない。
- Enemy hit: attackの芯を作る。
- Kill: 低域＋食材固有音の組合せ。
- Player hit: Killと混同しない低い警告音。
- Power-up: 音階上昇。
- Combo tier: 1秒未満のvoice / sting。
- UI: 小さく乾いたclick。

### 10.3 Voice limits

- Player shot: 同時3 voiceまで。
- Enemy hit: 同時5 voiceまで。
- Explosion: 同時4 voiceまで。古い音をsteal可。
- Callout: 同時1、上位tierを優先。

## 11. Asset Naming and Manifest

```text
assets/
  sprites/player/player_tier_0.png
  sprites/enemies/enemy_fry_scout.png
  sprites/bosses/boss_king_burger.png
  sprites/bullets/bullet_fry.png
  sprites/powerups/powerup_protein.png
  backgrounds/stage_01_bg.png
  ui/hud_calorie_frame.png
  audio/bgm/stage_01.ogg
  audio/se/enemy_kill_01.ogg
```

`asset-manifest.ts` にid、path、frame size、animation、license noteを集約する。Magic stringでpathを参照しない。

## 12. Placeholder Strategy

Milestone Aでは図形・簡易Spriteを許可する。ただし次を守る。

- Player / enemy / bullets / pickupの形と色を明確に分ける。
- Placeholder pathとfinal asset pathは同じidで差し替え可能にする。
- 仮素材の完成度向上に時間を使わない。
- Milestone B開始時にArt asset inventoryを作成し、欠品を明示する。

## 13. Asset Acceptance Checklist

- 390×844で輪郭が読める。
- 敵弾が背景Particleと混同しない。
- 4 appearance tiersが同一人物に見える。
- どの体型も侮辱的・不潔・無能に描かれていない。
- Bossの攻撃予告が静止画でも判別できる。
- Nearest scalingで滲みがない。
- 透明縁に白いfringeがない。
- 素材の権利・出典・生成条件がmanifestまたはcreditsに記録される。

## 14. Prohibited Visual Shortcuts

- 実在チェーンのロゴ、包装、マスコットの模倣。
- 脂肪を汚物・病原体としてだけ描く表現。
- 体型と知性・清潔さ・人間性を結びつける表現。
- 敵弾より明るく大きい常設背景Particle。
- 常時の色収差、強いBlur、過剰なCamera movement。
- AI生成画像の不統一な解像感を、そのまま寄せ集めること。

## 15. Human Art Gate

次の4枚と10秒程度の動画を同時に提示する。

1. Mobile通常戦闘。
2. Desktop通常戦闘。
3. Combo 50以上の高密度戦闘。
4. ResultのD / A / SS比較。
5. 通常敵3体撃破→Player被弾→Boss演出の短い動画。

判断項目は「読みやすいか」「おいしそうか」「気持ちいいか」「風刺が嫌な侮辱へ落ちていないか」の4点とする。

