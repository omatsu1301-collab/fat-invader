# FATインベーダー — Tone, Satire, and Content Boundaries

**Document ID:** FI-08  
**Version:** 1.0  
**Status:** Creative and Ethical Baseline  
**Depends on:** FI-01, FI-02, FI-04

## 1. Creative Position

FATインベーダーは、ダイエットを正しく教える教材ではない。また、太っている人を罰し、痩せている人を称賛するゲームでもない。

笑いの対象は、次の過剰さである。

- 食欲を「敵」と呼びながら、食品広告には抗えない矛盾。
- 体脂肪や体型を、人格や努力の総合得点のように扱う文化。
- 健康を語りながら、極端な身体へ際限なく進ませる評価装置。
- `CHEAT DAY`、`FAT BURN`、`SHREDDED` など、身体を商品コピーへ変える言葉。

プレイヤー自身の身体や実在する体型は笑いの標的にしない。

## 2. One-sentence Tone Rule

> 食べ物には愛を、評価装置には毒を、主人公には尊厳を。

迷った場合はこの順で判断する。

## 3. Tone Mix

| Ingredient | Target share | Meaning |
| --- | ---: | --- |
| Arcade exhilaration | 45% | まず遊んで気持ちいい |
| Absurd comedy | 30% | 概念と戦うほど馬鹿馬鹿しい |
| Satire | 20% | 採点文化の暴走が見える |
| Unease | 5% | S / SSで笑いが少し引っかかる |

風刺が説明臭くなり、ゲームのテンポを止める場合は短くする。毒を消すのではなく、文字数を減らす。

## 4. The Target / Not the Target

### Satire targets

- 数字で人間の価値を決めたがるUI。
- 「もっと痩せればもっと偉い」という無限階段。
- 食品を悪魔化しながら消費を煽る広告文化。
- 健康と美の名で極端さを売る商業言語。
- Playerを褒めるはずが、最後には物理法則まで壊すRanking system。

### Never targets

- 太っている人、痩せている人、筋肉質な人など実在の身体。
- 摂食障害や治療中の人。
- 障害、病気、年齢、性別、人種。
- 食べること自体、食べ物を楽しむこと。
- ダイエットに失敗した個人の意志や人格。

## 5. Core Satirical Arc

### Early game

表面上は「高カロリー軍団を倒し、誘惑を避ける」明快なパロディ。Playerはシステムの言葉を素直に受け取れる。

### Mid game

Combo calloutが `FAT BURN`、`SHREDDED` と過剰になる。CHEAT DAYは強力だが、自動的にCALORIEを加える。健康語彙がゲーム都合の矛盾を見せ始める。

### Result

D〜Aまでは広告的な褒め言葉。Sで `BODY FAT 3% — WARNING`、SSで人体そのものが消え、評価装置が壊れる。最高評価が「最も健康」ではなく「尺度の破綻」になる。

これは長い解説で伝えず、短いcopy、warning、visual escalationで見せる。

## 6. Vocabulary Rules

### Preferred

- 誘惑
- CALORIE（架空ゲージとして大文字）
- FAT OVER
- FAT BURN
- SHREDDED
- ABSURDLY LEAN
- WARNING
- ERROR
- 仕上がりすぎ
- 評価不能
- 物理法則を突破
- 食べ放題という概念

### Use carefully

- デブ、肥満、醜い、怠惰、自己管理不足。
- 痩せればモテる、太れば嫌われる。
- 罪悪感、罰、失敗。
- 実在の体脂肪率や体重を正常・異常として断定する表現。

原則として「デブ」等をPlayerへ直接投げない。敵名やシステム名でも、侮辱が主目的なら不採用。

### Prohibited

- 実在集団への蔑称。
- 摂食障害を笑う表現。
- 嘔吐、下剤、飢餓、自傷をPower-upや攻略法にする。
- 現実の食事制限・運動量を推奨する文章。
- 医学的診断、健康保証、カロリー消費保証。
- 「太いから価値がない」「痩せているから人格的に上」という因果。

## 7. Naming Convention

名前は一目で役割が分かり、2〜3語以内。

### Enemies

食品名 + 役職 / 動作。

- FRY SCOUT
- DONUT DRIFTER
- SODA TANK
- CAKE CASTER
- KING BURGER
- PIZZA MOTHER
- KING CALORIE

実在商標や商品固有名を使わない。

### Preferred arsenal names (player-facing)

- くしゃ紙弾（三日坊主号の主砲弾）
- PROTEIN BEAM
- CARDIO DRIVE
- FAT BURN BOMB

Internal/event ids may retain legacy `metabolicShot` for compatibility; that string is not player-facing copy.

## 8. Copy Baseline

### Title

```text
FAT INVADER
誘惑を、撃ち落とせ。
```

### Stage intros

```text
STAGE 1 — BURGER DISTRICT
香りから逃げろ。

STAGE 2 — PIZZA ORBIT
チーズは重力を裏切る。

STAGE 3 — BUFFET APOCALYPSE
食べ放題という概念が来る。
```

### Player hit

```text
+10 CAL
誘惑、着弾。
```

`+550 kcal` のような現実らしい単位は避ける。HUDは架空値の `CAL` に統一し、TitleまたはCreditsへ「現実のカロリー値ではありません」と明記する。

### Combo

```text
5 — WARM UP
10 — FAT BURN
25 — SHREDDED
50 — ABSURDLY LEAN
```

### FAT OVER

採用候補:

```text
FAT OVER
満腹につき、いったん帰還。
```

避ける候補:

```text
太りすぎ。失格。
自己管理に失敗しました。
```

### Result ranks

```text
D  誘惑は強かった。君も生きている。
C  だいたい健康そう。たぶん。
B  数字が君を褒めはじめた。
A  仕上がっている。話が通じる範囲で。
S  BODY FAT 3% — WARNING
SS ERROR: 美が物理法則を突破
```

## 9. Food Representation

食品は魅力的に描く。油、艶、湯気、チーズの伸び、炭酸、クリームは視覚的報酬である。敵だから不味そうにする必要はない。

食べ物を悪と断定するのではなく、ゲーム上は「誘惑が攻撃してくる」という主観的な不条理として描く。CreditsまたはAboutの一行:

> 本作のCALは架空のゲーム値です。食べ物に罪はありません。

## 10. Body Representation

- Appearance tierで顔の表情、装備の格、勇敢さを劣化させない。
- D Rankにも専用の堂々としたPoseを与える。
- S / SSほど格好良くするだけでなく、不穏なWarningを増やす。
- 体型とhitboxを一致させない。ゲーム公平性と、体型を不利そのものにしないため。
- Result copyはPlayerを二人称で侮辱しない。
- 主人公が食べ物を楽しんだ形跡を、敗北の道徳的汚点にしない。

## 11. CHEAT DAY Rule

CHEAT DAYは、食事を「違反」とする思想を肯定するためではなく、ダイエット文化の用語とゲームのrisk/rewardを接続するために使う。

- 取得で強くなる。
- 同時にCALORIEが増える。
- 見た目は祝祭的で、おいしそう。
- Copyは罪悪感を煽らない。
- `CHEAT` を現実の生活指導として説明しない。

候補copy:

```text
CHEAT DAY
規則を破ると、なぜか強い。
```

## 12. Review Questions

新しいcopy、enemy、appearance、animationを追加するたび、次を問う。

1. 誰が笑われているか。
2. その対象は個人か、過剰な制度・広告・言説か。
3. 食べ物への愛は残っているか。
4. 低Rankの主人公に尊厳があるか。
5. 最高Rankが単なる「細いほど正義」に終わっていないか。
6. 医学的事実や健康助言と誤認されないか。
7. 説明しすぎてゲームの速度を殺していないか。

2が個人、4がNo、5がYesのいずれかなら修正する。

## 13. Tone Acceptance Examples

| Proposal | Decision | Reason |
| --- | --- | --- |
| 「満腹につき、いったん帰還」 | Accept | 状態を笑い、人格を責めない |
| 「デブになったので敗北」 | Reject | 身体を侮辱と敗北理由に直結 |
| SSで筋肉が光になり人体消失 | Accept | 評価尺度の暴走を視覚化 |
| Burger bossを腐らせて悪臭演出 | Reject | 食品への愛が消える |
| Burger bossが王冠で尊大に笑う | Accept | 食品の魅力と敵役の愛嬌が共存 |
| 実在ダイエット商品のパロディ | Reject by default | 商標・特定個人への依存 |
| 「本作のCALは架空値」 | Accept | 誤認防止、短い |

## 14. Escalation

Tone判断が割れた場合、AIは勝手に「安全な無味無臭」へ直さない。次の形でCreative Directorへ上げる。

```text
対象表現:
狙っている笑い:
笑いの標的:
不快・誤認リスク:
毒を保つ修正版A:
さらに攻める修正版B:
不採用案C:
```

ユーザーが採用するまで、公開版へ入れない。

## 15. Final Creative Test

作品を一文で説明したとき、次の両方が真なら成功。

- 「高カロリー食品を倒して痩せるゲーム」として即座に分かる。
- 最後まで遊ぶと「痩せれば痩せるほど正しい、という採点も少し狂っている」と分かる。

前者だけなら皮替え、後者だけなら説教である。FATインベーダーは、その間の危険で愉快な場所を狙う。

