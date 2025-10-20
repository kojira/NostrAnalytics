# 開発ガイド

## 環境セットアップ

### 必須ツール

1. **Rust** (1.70以上)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

2. **wasm-pack**
```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

3. **Node.js** (18以上)
```bash
# macOS (Homebrew)
brew install node

# または nvm を使用
nvm install 18
nvm use 18
```

### プロジェクトのクローン

```bash
git clone <repository-url>
cd NostrAnalytics
```

## 開発ワークフロー

### 1. Rustコードの開発

```bash
# 構文チェック
cargo check

# テスト実行
cargo test

# フォーマット
cargo fmt

# Linter
cargo clippy
```

### 2. WASMビルド

```bash
# macOSの場合（LLVMが必要）
cd crates/analytics
CC=clang AR=llvm-ar wasm-pack build --target web --out-dir ../../frontend/src/wasm/pkg

# Linuxの場合
cd crates/analytics
wasm-pack build --target web --out-dir ../../frontend/src/wasm/pkg

# またはスクリプト使用
./scripts/build-wasm.sh
```

### 3. フロントエンド開発

```bash
cd frontend

# 依存インストール
pnpm install

# 開発サーバー起動
pnpm run dev

# ビルド
pnpm run build

# Lint
pnpm run lint
```

### 4. コミット前チェック（重要！）

**コミット前に必ず実行してください:**

```bash
# プロジェクトルートで実行
./scripts/pre-commit-check.sh
```

このスクリプトは以下をチェックします:
- ✅ Rustのフォーマット (`cargo fmt`)
- ✅ Clippyの警告 (`cargo clippy`)
- ✅ Rustのテスト (`cargo test`)
- ✅ WASMビルド (`wasm-pack build`)
- ✅ フロントエンドビルド (`pnpm run build`)

すべてのチェックが通ったら、コミット・プッシュできます:

```bash
git add -A
git commit -m "your commit message"
git push origin main
```

**注意**: このスクリプトを実行せずにコミットすると、GitHub ActionsのCIで失敗する可能性があります。

## ディレクトリ構造

```
NostrAnalytics/
├── crates/
│   └── analytics/              # Rust WASM モジュール
│       ├── src/
│       │   ├── lib.rs          # エントリーポイント
│       │   ├── analytics.rs    # メイン解析ロジック
│       │   ├── relay_client.rs # リレー通信
│       │   ├── language.rs     # 言語検出
│       │   ├── types.rs        # 型定義
│       │   ├── error.rs        # エラー型
│       │   └── utils.rs        # ユーティリティ
│       ├── tests/              # テスト
│       └── Cargo.toml
├── frontend/
│   ├── src/
│   │   ├── components/         # Reactコンポーネント
│   │   ├── pages/              # ページ
│   │   ├── services/           # サービス層
│   │   ├── state/              # 状態管理 (Zustand)
│   │   ├── types/              # TypeScript型定義
│   │   └── wasm/               # WASMラッパー
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── docs/                       # ドキュメント
├── scripts/                    # ビルドスクリプト
└── README.md
```

## コーディング規約

### Rust

- **フォーマット**: `cargo fmt` を使用
- **Linter**: `cargo clippy` の警告をすべて解決
- **命名**:
  - 関数: `snake_case`
  - 型: `PascalCase`
  - 定数: `SCREAMING_SNAKE_CASE`
- **ドキュメント**: public APIには必ずdocコメントを付ける

### TypeScript

- **フォーマット**: ESLintの設定に従う
- **命名**:
  - 変数・関数: `camelCase`
  - コンポーネント: `PascalCase`
  - 定数: `SCREAMING_SNAKE_CASE`
  - 型・インターフェース: `PascalCase`
- **型**: `any`の使用を避け、適切な型を定義

### コミットメッセージ

```
<type>: <subject>

<body>

<footer>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（フォーマット等）
- `refactor`: リファクタリング
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

**例**:
```
feat: add language filter to metrics computation

- Implement language-based user filtering
- Add tests for language index
- Update documentation

Closes #123
```

## テスト

### Rustテスト

```bash
# すべてのテスト
cargo test

# 特定のテスト
cargo test test_epoch_day_conversion

# 統合テスト
cargo test --test integration_test

# WASMテスト（要wasm-pack）
cd crates/analytics
wasm-pack test --headless --firefox
```

### フロントエンドテスト

```bash
cd frontend

# ユニットテスト（今後追加予定）
npm test

# E2Eテスト（今後追加予定）
npm run test:e2e
```

## デバッグ

### Rust

```bash
# デバッグビルド
cargo build

# ログ出力（開発時）
RUST_LOG=debug cargo run
```

### WASM

ブラウザの開発者ツールでコンソールログを確認：

```rust
use crate::utils::console_log;

console_log!("Debug message: {}", value);
```

### フロントエンド

```typescript
// ブラウザコンソールで確認
console.log('Debug:', data);

// React DevToolsを使用
```

## パフォーマンス最適化

### Rust/WASM

1. **リリースビルド**:
```bash
wasm-pack build --release --target web
```

2. **最適化設定** (Cargo.toml):
```toml
[profile.release]
opt-level = "z"  # サイズ最適化
lto = true       # Link Time Optimization
codegen-units = 1
```

3. **メモリ管理**:
- 大きなデータ構造はチャンク分割
- 不要なクローンを避ける
- イテレータを活用

### フロントエンド

1. **コード分割**:
```typescript
const Component = lazy(() => import('./Component'));
```

2. **メモ化**:
```typescript
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
```

3. **仮想化**:
大きなリストには react-window を使用

## トラブルシューティング

### WASMビルドエラー

```bash
# wasm-packの再インストール
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# キャッシュクリア
cargo clean
rm -rf target/
```

### フロントエンドビルドエラー

```bash
# node_modulesの再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュクリア
rm -rf .vite dist
```

### リレー接続エラー

- WebSocketがブロックされていないか確認
- CORSポリシーを確認
- リレーURLが正しいか確認（`wss://`で始まる）

## CI/CD

GitHub Actionsで自動テスト・ビルドを実行：

- `.github/workflows/ci.yml`

プッシュ時に自動実行：
- Rustのフォーマット・Lintチェック
- テスト実行
- WASMビルド
- フロントエンドビルド

## リリースプロセス

1. バージョン更新
```bash
# Cargo.toml
version = "0.2.0"

# package.json
"version": "0.2.0"
```

2. CHANGELOG.md更新

3. タグ作成
```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

4. GitHub Releasesでリリースノート作成

## 参考資料

- [Rust Book](https://doc.rust-lang.org/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
- [React Documentation](https://react.dev/)
- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [rust-nostr Documentation](https://docs.rs/nostr/)

