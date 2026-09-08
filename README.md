# FAT INVADER (FATインベーダー)

高カロリー食品の「誘惑」を避けながら撃退する、3〜5分の2Dアーケードシューティング。詳細な仕様は [`docs/`](./docs) と [`CLAUDE.md`](./CLAUDE.md) を参照。

> 本作のCALは架空のゲーム値です。食べ物に罪はありません。

## Status

**Milestone A — Vertical Slice: 完了 (Human Gate 1 PASS).** Title → Play → 1 Stage（FRY SCOUT 編隊 → KING BURGER 簡易ボス）→ Stage Clear / FAT OVER → Result → Retry が一本のRunとして通しで遊べる。仮素材・図形ベース。Human Gate 1（採用判断）はPC操作・コア体験・Boss進行を含めて正式PASS。公開版（GitHub Pages）でのProduction Smoke TestもPASS済み。

現在: **Milestone B — Game Feel and Art Vertical Slice** 準備中。詳細は [`docs/06_IMPLEMENTATION_ROADMAP.md`](./docs/06_IMPLEMENTATION_ROADMAP.md) §5、Art asset inventoryは [`docs/09_ART_ASSET_INVENTORY.md`](./docs/09_ART_ASSET_INVENTORY.md) を参照。

## Requirements

- Node.js 20 以上
- npm 10 以上

## Setup

```bash
npm install
npm run dev
```

`http://localhost:5173` を開く。

## Commands

| Command             | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | 開発サーバー起動                                            |
| `npm run build`     | 本番ビルド（`dist/`）。ビルド後に E2E bridge 不在を自動検証 |
| `npm run preview`   | 本番ビルドをローカルでプレビュー                            |
| `npm run typecheck` | TypeScript strict モードでの型検査                          |
| `npm run lint`      | oxlint による静的解析                                       |
| `npm run format`    | Prettier によるフォーマット                                 |
| `npm run test`      | Vitest による unit / integration test                       |
| `npm run test:e2e`  | Playwright による E2E test（Desktop / Mobile）              |
| `npm run verify`    | typecheck → lint → test → build を一括実行                  |

## Controls

- **Desktop:** `← →` / `A D` で移動、`Space` / `J` で射撃、`Esc` / `P` でポーズ、`Space` / `Enter` で開始・Retry確定。
- **Mobile:** 画面をドラッグして移動、自動射撃、右上ボタンでポーズ。

## Deploy

GitHub Pages: `https://omatsu1301-collab.github.io/fat-invader/`（`main` への push で自動デプロイ）。

## Architecture

Vite + TypeScript (strict) + Phaser。React や他ゲームエンジンは v0.1 では不採用。詳細は [`docs/05_TECHNICAL_ARCHITECTURE.md`](./docs/05_TECHNICAL_ARCHITECTURE.md)。

## Credits

- Game engine: [Phaser](https://phaser.io/)
- 素材・ライセンス記録は Milestone C 以降 `docs` / manifest に追記予定。
