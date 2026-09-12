# FAT INVADER (FATインベーダー)

高カロリー食品の「誘惑」を避けながら撃退する、3〜5分の2Dアーケードシューティング。詳細な仕様は [`docs/`](./docs) と [`CLAUDE.md`](./CLAUDE.md) を参照。

> 本作のCALは架空のゲーム値です。食べ物に罪はありません。

## Status

**Full Graybox v0.1 — Draft PR in progress (Fast Flow).**  
Title → Stage 1–3 → 3 Bosses → Run Clear / FAT OVER → Result → Retry が placeholder 中心で通し遊べる。

- North Star 5素材の pipeline / runtime 統合は `main` 済み（PR #6）。
- **Runtime Player** は Human 判断（2026-09-11）により三日坊主号ではなく「飛ぶ会社員」graybox silhouette。三日坊主号 asset は reference / future skin として保持。
- 追加 AI 画像生成・final art / BGM・SE 制作は停止中（仕組み先行）。
- 採用済み Game Feel（通常敵 kill / KING BURGER 3-beat / FAT OVER 2.6s）は非変更。

## Requirements

- Node.js 20 以上
- npm 10 以上

## Setup

```bash
npm ci
npm run dev
```

`http://localhost:5173` を開く。

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド（`dist/`）。ビルド後に E2E bridge 不在を自動検証 |
| `npm run preview` | 本番ビルドをローカルでプレビュー |
| `npm run typecheck` | TypeScript strict モードでの型検査 |
| `npm run lint` | oxlint による静的解析 |
| `npm run format` | Prettier によるフォーマット |
| `npm run test` | Vitest による unit / integration test |
| `npm run test:e2e` | Playwright による E2E test（Desktop / Mobile） |
| `npm run assets:verify` | North Star pixel asset 契約検証（CI でも実行） |
| `npm run verify` | typecheck → lint → test → build を一括実行 |

## Controls

- **Desktop:** `← →` / `A D` で移動、`Space` / `J` で射撃、`Esc` / `P` でポーズ、`Space` / `Enter` で開始・Retry確定。
- **Mobile:** 画面をドラッグして移動、自動射撃、右上ボタンでポーズ。
- **Title:** START / HOW TO PLAY / SETTINGS（BGM・SE・Shake・Reduced Effects）。

## Deploy

GitHub Pages: `https://omatsu1301-collab.github.io/fat-invader/`（`main` への push で自動デプロイ）。

## Architecture

Vite + TypeScript (strict) + Phaser。React や他ゲームエンジンは v0.1 では不採用。詳細は [`docs/05_TECHNICAL_ARCHITECTURE.md`](./docs/05_TECHNICAL_ARCHITECTURE.md)。

## Credits

- Game engine: [Phaser](https://phaser.io/)
- Pixel North Star / license: [`docs/09_ART_ASSET_INVENTORY.md`](./docs/09_ART_ASSET_INVENTORY.md), [`docs/10_PIXEL_ASSET_SPEC.md`](./docs/10_PIXEL_ASSET_SPEC.md)
