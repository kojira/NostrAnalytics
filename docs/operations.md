# 運用手順

## デプロイ

### 静的サイトホスティング

このアプリケーションは完全にクライアントサイドで動作するため、静的サイトホスティングサービスにデプロイできます。

#### Vercel

1. **プロジェクトのビルド**
```bash
# WASMビルド
./scripts/build-wasm.sh

# フロントエンドビルド
cd frontend
npm run build
```

2. **Vercelにデプロイ**
```bash
cd frontend
npx vercel --prod
```

または、GitHubリポジトリと連携して自動デプロイを設定。

#### Netlify

1. **ビルド設定** (`netlify.toml`を作成)
```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. **デプロイ**
```bash
cd frontend
npx netlify deploy --prod
```

#### GitHub Pages

1. **ビルド**
```bash
./scripts/build-wasm.sh
cd frontend
npm run build
```

2. **gh-pagesブランチにデプロイ**
```bash
cd frontend
npx gh-pages -d dist
```

3. **GitHub設定**
- Settings → Pages → Source: gh-pages branch

### 環境変数

現在、環境変数は不要です。すべての設定はUIから行います。

## モニタリング

### パフォーマンス監視

1. **ブラウザDevTools**
   - Performance タブで処理時間を確認
   - Memory タブでメモリ使用量を確認
   - Network タブでリレー通信を確認

2. **Console ログ**
   - 開発モードでは詳細なログが出力されます
   - 本番環境では最小限のログのみ

### エラー追跡

ブラウザコンソールでエラーを確認：

```javascript
// エラーイベントをキャプチャ
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
```

Sentryなどのエラー追跡サービスの統合も可能です。

## バックアップ

### IndexedDBデータ

ユーザーのブラウザに保存されたキャッシュデータは、ブラウザのIndexedDBに格納されています。

**エクスポート**（開発者向け）:
```javascript
// ブラウザコンソールで実行
const db = await window.indexedDB.open('NostrAnalyticsDB');
// データをエクスポート
```

**クリア**:
UIの「キャッシュクリア」ボタンを使用するか、ブラウザの開発者ツールから手動でクリア。

### 設定データ

LocalStorageに保存された設定：

```javascript
// エクスポート
const settings = localStorage.getItem('nostr-analytics-storage');
console.log(JSON.parse(settings));

// インポート
localStorage.setItem('nostr-analytics-storage', JSON.stringify(settings));
```

## トラブルシューティング

### よくある問題

#### 1. リレーに接続できない

**症状**: 「リレー接続エラー」が表示される

**原因**:
- リレーがダウンしている
- ネットワーク接続の問題
- CORSポリシーの問題

**対処**:
1. 別のリレーを試す
2. ネットワーク接続を確認
3. ブラウザコンソールでエラー詳細を確認

#### 2. 分析が遅い

**症状**: 分析に非常に時間がかかる

**原因**:
- 期間が長すぎる（365日等）
- リレーの応答が遅い
- イベント数が多すぎる

**対処**:
1. 期間を短く設定（90日以下を推奨）
2. 応答の速いリレーを選択
3. キャッシュを活用（2回目以降は高速）

#### 3. NIP-07拡張機能が見つからない

**症状**: 「Nostr拡張機能が見つかりません」

**原因**:
- NIP-07対応拡張機能がインストールされていない

**対処**:
1. Alby、nos2x等の拡張機能をインストール
2. ブラウザを再起動
3. 拡張機能が有効になっているか確認

#### 4. メモリ不足エラー

**症状**: ブラウザがクラッシュまたはフリーズ

**原因**:
- 大量のイベントを一度に処理
- メモリリーク

**対処**:
1. ブラウザを再起動
2. 期間を短く設定
3. 他のタブを閉じる
4. キャッシュをクリア

#### 5. WASMロードエラー

**症状**: 「WASM module not initialized」

**原因**:
- WASMファイルが正しくビルドされていない
- ネットワークエラー

**対処**:
1. ページをリロード
2. ブラウザキャッシュをクリア
3. WASMを再ビルド

### ログ確認

開発モードでの詳細ログ：

```javascript
// ブラウザコンソールで実行
localStorage.setItem('debug', 'nostr-analytics:*');
```

## セキュリティ

### ベストプラクティス

1. **秘密鍵の管理**
   - 秘密鍵はNIP-07拡張機能のみで管理
   - アプリケーションは秘密鍵を保存しない
   - 署名は必ずユーザー承認が必要

2. **HTTPS使用**
   - 本番環境では必ずHTTPSを使用
   - WebSocketもWSS（暗号化）を使用

3. **依存関係の更新**
   - 定期的に依存パッケージを更新
   - セキュリティアドバイザリを確認

```bash
# 脆弱性チェック
npm audit

# 自動修正
npm audit fix
```

4. **XSS対策**
   - Reactの標準機能で自動エスケープ
   - `dangerouslySetInnerHTML`は使用しない

### セキュリティアップデート

重要なセキュリティアップデートは速やかに適用：

```bash
# Rust依存
cargo update

# Node依存
npm update
```

## パフォーマンスチューニング

### キャッシュ戦略

1. **TTL設定**
   - メトリクスキャッシュ: 7日（デフォルト）
   - 言語インデックス: 30日（デフォルト）

2. **キャッシュサイズ管理**
   - 自動的に期限切れキャッシュを削除
   - 必要に応じて手動クリア

### リレー選択

高速で信頼性の高いリレーを選択：

**推奨リレー**:
- `wss://relay.damus.io`
- `wss://nos.lol`
- `wss://relay.nostr.band`

**避けるべき**:
- 応答が遅いリレー
- 頻繁にダウンするリレー
- 古いイベントを保持していないリレー

### 期間設定

**推奨**:
- 初回分析: 30-90日
- 定期分析: 7-30日
- 長期トレンド: 180-365日（キャッシュ活用）

## メンテナンス

### 定期タスク

1. **依存関係の更新**（月次）
```bash
cargo update
cd frontend && npm update
```

2. **セキュリティ監査**（月次）
```bash
cargo audit
npm audit
```

3. **テスト実行**（リリース前）
```bash
cargo test
cd frontend && npm test
```

4. **ドキュメント更新**（機能追加時）
- README.md
- docs/
- CHANGELOG.md

### バージョン管理

セマンティックバージョニングを使用：

- **MAJOR**: 破壊的変更
- **MINOR**: 新機能追加（後方互換）
- **PATCH**: バグ修正

例: `0.1.0` → `0.2.0` → `1.0.0`

## サポート

### 問題報告

GitHubのIssueで報告：

**必要な情報**:
- ブラウザとバージョン
- エラーメッセージ
- 再現手順
- コンソールログ

### 機能リクエスト

GitHubのIssueで提案：

**テンプレート**:
```markdown
## 機能の説明
[機能の概要]

## ユースケース
[どのような場合に役立つか]

## 実装案
[可能であれば実装方法の提案]
```

## 参考資料

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [NIP-07 Specification](https://github.com/nostr-protocol/nips/blob/master/07.md)
- [rust-nostr Documentation](https://docs.rs/nostr/)
- [React Documentation](https://react.dev/)

