# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2024-01-15

### Added

#### Core Features
- 言語別アクティブユーザー分析機能（DAU/WAU/MAU/YAU）
- whatlangによる自動言語検出（ISO 639-1対応）
- 全kindイベントを対象としたアクティビティ追跡
- 過去投稿言語に基づくユーザー適格性判定

#### Frontend
- React 18 + TypeScript + Viteによるモダンなフロントエンド
- リレー選択UI（複数リレー対応）
- 言語選択UI（20言語以上対応）
- 期間選択UI（プリセット + カスタム）
- メトリクス選択UI（DAU/WAU/MAU/YAU）
- Rechartsによる時系列グラフ表示
- 進捗表示機能
- NIP-07連携による結果発行機能

#### Backend (WASM)
- Rust + rust-nostr + whatlangによる高速解析エンジン
- wasm-bindgenによるJavaScript連携
- チャンク分割による大規模データ処理
- 重複排除とストリーミング集計

#### Storage
- IndexedDBによる結果キャッシュ（Dexie使用）
- TTL付きキャッシュ管理（メトリクス: 7日、言語インデックス: 30日）
- LocalStorageによる設定永続化（Zustand persist）

#### Custom Kind
- kind: 30080（Parameterized Replaceable Event）の実装
- 詳細なタグ設定（d, l, r, algo, gran, wdays, app）
- JSON形式のcontent（バージョン管理対応）

#### Documentation
- アーキテクチャ設計書
- 独自kind仕様書
- 開発ガイド
- 運用手順書
- README with usage instructions

#### Testing & CI
- Rustユニットテスト（言語検出、型変換等）
- 統合テスト（言語インデックス、メトリクス計算）
- GitHub Actions CI設定
  - Rustフォーマット・Lintチェック
  - テスト実行
  - WASMビルド
  - フロントエンドビルド

#### Developer Experience
- WASMビルドスクリプト
- ホットリロード対応開発サーバー
- TypeScript型安全性
- ESLint設定

### Technical Details

#### Dependencies
- rust-nostr 0.36
- whatlang 0.16
- React 18.2
- Recharts 2.10
- Dexie 3.2
- Zustand 4.4

#### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- NIP-07対応拡張機能必須（結果発行時）

#### Performance
- 90日間の分析を数秒で完了（キャッシュ利用時）
- メモリ効率的なストリーミング処理
- 段階的な進捗表示

### Known Limitations
- 日次粒度のみ対応（時間単位は未対応）
- 言語検出はwhatlangのみ（複数検出器は未対応）
- kind別フィルタリング未対応（全kind対象）
- YAU（365日）は処理に時間がかかる場合あり

### Security
- 秘密鍵はNIP-07拡張機能のみで管理
- アプリケーション内に秘密鍵を保存しない
- 署名は必ずユーザー承認が必要
- XSS対策（React標準機能）

## [0.0.1] - 2024-01-01

### Added
- Initial project setup
- Basic project structure

---

## Release Notes

### v0.1.0 - Initial Release

Nostr Analytics の最初のリリースです。言語別のアクティブユーザー数（DAU/WAU/MAU/YAU）を計測し、グラフ表示できます。

**主な機能**:
- 🌐 20以上の言語に対応した自動言語検出
- 📊 DAU/WAU/MAU/YAUの複数メトリクス同時表示
- 🚀 Rust + WASMによる高速処理
- 💾 IndexedDBによる結果キャッシュ
- 🔐 NIP-07による安全な署名
- 📡 独自kind (30080) でリレーに結果を発行

**使い方**:
1. リレー、言語、期間、メトリクスを選択
2. 「分析開始」ボタンをクリック
3. グラフで結果を確認
4. （オプション）NIP-07でリレーに発行

**既知の問題**:
- YAU（365日）の計算に時間がかかる場合があります
- 一部のリレーで接続が不安定な場合があります

**次のバージョンで予定**:
- 時間単位の粒度対応
- kind別フィルタリング
- パフォーマンス改善
- エクスポート機能

---

[Unreleased]: https://github.com/yourusername/NostrAnalytics/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/NostrAnalytics/releases/tag/v0.1.0
[0.0.1]: https://github.com/yourusername/NostrAnalytics/releases/tag/v0.0.1

