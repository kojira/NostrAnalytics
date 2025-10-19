# Nostr Analytics

Nostr上の言語別アクティブユーザー数（DAU/WAU/MAU/YAU）を計測・可視化するWebアプリケーションです。

## 特徴

- 🌐 **言語別分析**: whatlangを使った自動言語検出
- 📊 **複数メトリクス**: DAU（日次）、WAU（週次）、MAU（月次）、YAU（年次）
- 🚀 **高速処理**: Rust + WASMによる高速計算
- 💾 **キャッシュ機能**: IndexedDBによる結果キャッシュ
- 🔐 **NIP-07対応**: ブラウザ拡張機能で安全に署名
- 📡 **結果発行**: 独自kind (30080) でリレーに保存

## アーキテクチャ

```
Frontend (React + TypeScript)
    ↓
WASM Module (Rust)
    ↓
rust-nostr + whatlang
    ↓
Nostr Relays
```

詳細は [docs/architecture.md](docs/architecture.md) を参照してください。

## セットアップ

### 必要なツール

- Node.js 18+
- Rust 1.70+
- wasm-pack

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd NostrAnalytics

# Rust依存のビルド確認
cargo check

# WASMビルド（今後実装）
# cd crates/analytics
# wasm-pack build --target web

# フロントエンドの依存インストール
cd frontend
npm install
```

### 開発サーバーの起動

```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 使い方

### 1. 設定

1. **リレー選択**: 分析対象のNostrリレーを追加
2. **言語選択**: 分析したい言語を選択（複数可）
3. **期間選択**: 分析期間を指定（プリセットまたはカスタム）
4. **メトリクス選択**: DAU/WAU/MAU/YAUから選択

### 2. 分析実行

「分析開始」ボタンをクリックすると、以下の処理が実行されます：

1. 言語インデックス構築（過去の投稿から言語を判定）
2. 活動イベント収集（全kindのイベントを取得）
3. メトリクス計算（スライディングウィンドウで集計）
4. グラフ表示

結果はIndexedDBにキャッシュされ、次回は高速に表示されます。

### 3. 結果の発行

NIP-07対応のブラウザ拡張機能（Alby、nos2x等）をインストールした状態で：

1. 「リレーに発行」ボタンをクリック
2. 拡張機能で署名を承認
3. 結果がkind: 30080イベントとしてリレーに発行されます

## 独自kind仕様

分析結果はkind: 30080（Parameterized Replaceable Event）として発行されます。

詳細は [docs/custom-kind-spec.md](docs/custom-kind-spec.md) を参照してください。

### 例

```json
{
  "kind": 30080,
  "tags": [
    ["d", "dau-ja-day-1-1704067200-1711929600-v1"],
    ["l", "ja"],
    ["r", "wss://relay.damus.io"],
    ["algo", "lang=whatlang@0.16;act=all-kinds;elig=lifetime"],
    ["gran", "day"],
    ["wdays", "1"],
    ["app", "nostr-analytics/0.1.0"]
  ],
  "content": "{\"version\":1,\"metric\":\"dau\",\"language\":\"ja\",...}"
}
```

## ディレクトリ構成

```
NostrAnalytics/
├── crates/
│   └── analytics/          # Rust解析エンジン（WASM）
│       ├── src/
│       │   ├── lib.rs
│       │   ├── analytics.rs
│       │   ├── relay_client.rs
│       │   ├── language.rs
│       │   ├── types.rs
│       │   ├── error.rs
│       │   └── utils.rs
│       └── Cargo.toml
├── frontend/               # React フロントエンド
│   ├── src/
│   │   ├── components/     # UIコンポーネント
│   │   ├── pages/          # ページ
│   │   ├── services/       # サービス層
│   │   ├── state/          # 状態管理
│   │   ├── types/          # 型定義
│   │   └── wasm/           # WASMラッパー
│   ├── package.json
│   └── vite.config.ts
├── docs/                   # ドキュメント
│   ├── architecture.md
│   └── custom-kind-spec.md
├── Cargo.toml              # Workspaceルート
└── README.md
```

## 技術スタック

### Frontend
- React 18
- TypeScript
- Vite
- Zustand（状態管理）
- Recharts（グラフ）
- Dexie（IndexedDB）

### Backend (WASM)
- Rust 2021
- rust-nostr 0.36
- whatlang 0.16
- wasm-bindgen

## 開発

### Rustコードのテスト

```bash
cd crates/analytics
cargo test
```

### WASMビルド

```bash
cd crates/analytics
wasm-pack build --target web
```

### フロントエンドのビルド

```bash
cd frontend
npm run build
```

## メトリクス定義

### DAU (Daily Active Users)
1日間（UTC 0:00-23:59）にアクティブだったユーザー数

### WAU (Weekly Active Users)
7日間にアクティブだったユーザー数

### MAU (Monthly Active Users)
30日間にアクティブだったユーザー数

### YAU (Yearly Active Users)
365日間にアクティブだったユーザー数

**アクティブの定義**:
- 対象期間に何らかのkindのイベントを投稿
- かつ、過去に分析対象言語で投稿したことがある

## ライセンス

MIT

## 貢献

Issue、Pull Requestを歓迎します。

## 参考

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [rust-nostr](https://github.com/rust-nostr/nostr)
- [whatlang](https://github.com/greyblake/whatlang-rs)
- [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md)
- [NIP-33](https://github.com/nostr-protocol/nips/blob/master/33.md)

