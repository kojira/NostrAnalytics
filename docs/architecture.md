# アーキテクチャ設計

## 概要

Nostr Analytics は、Nostr プロトコル上のイベントを分析し、言語別のアクティブユーザー数（DAU/WAU/MAU/YAU）を計測するシステムです。

## システム構成

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   UI Layer   │  │  State Mgmt  │  │   Services   │  │
│  │  Components  │  │   (Zustand)  │  │  (Nostr/DB)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                │                 │           │
│           └────────────────┴─────────────────┘           │
│                          │                               │
│                    ┌─────▼─────┐                        │
│                    │   WASM    │                        │
│                    │  Module   │                        │
│                    └─────┬─────┘                        │
└──────────────────────────┼──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │    Rust     │
                    │  Analytics  │
                    │   Engine    │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
      ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐
      │  rust-    │  │ whatlang│  │  Relay    │
      │  nostr    │  │         │  │  Clients  │
      └───────────┘  └─────────┘  └───────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                  ┌─────▼─────┐               ┌────────▼────────┐
                  │   Nostr   │               │     Nostr       │
                  │  Relays   │               │    Relays       │
                  │  (Read)   │               │   (Write)       │
                  └───────────┘               └─────────────────┘
```

## コンポーネント詳細

### 1. Frontend Layer

#### UI Components
- **RelaySelector**: リレーの追加・削除・管理
- **LanguageSelector**: 分析対象言語の選択
- **DateRangeSelector**: 分析期間の設定
- **MetricsSelector**: メトリクス（DAU/WAU/MAU/YAU）の選択
- **AnalysisControl**: 分析実行・キャッシュ管理
- **MetricsChart**: 結果のグラフ表示（Recharts）
- **NostrPublisher**: NIP-07を使った結果発行

#### State Management (Zustand)
- グローバル設定（リレー、言語、期間、メトリクス）
- 分析状態（進捗、結果）
- NIP-07連携状態（公開鍵）
- LocalStorageへの永続化

#### Services
- **nostr.ts**: NIP-07連携、イベント作成・署名・発行
- **db.ts**: IndexedDB操作（Dexie）、キャッシュ管理
- **languages.ts**: 言語マスタデータ

### 2. WASM Module

Rustで実装された解析エンジンをWASMにコンパイルし、JavaScriptから呼び出し可能にします。

**公開API**:
- `init_analytics(relays: string[])`
- `build_language_index(options: LanguageIndexOptions): Promise<LanguageIndexResult>`
- `compute_metrics(options: MetricsOptions): Promise<MetricDataPoint[]>`
- `abort_all()`

### 3. Rust Analytics Engine

#### モジュール構成

```
crates/analytics/
├── src/
│   ├── lib.rs           # WASM bindgen エントリーポイント
│   ├── analytics.rs     # メイン解析ロジック
│   ├── relay_client.rs  # リレー通信
│   ├── language.rs      # 言語検出（whatlang）
│   ├── types.rs         # データ型定義
│   ├── error.rs         # エラー型
│   └── utils.rs         # ユーティリティ
```

#### 主要処理フロー

1. **言語インデックス構築**
   - 指定期間のイベント（kind:1等）を取得
   - whatlangで言語検出（信頼度閾値適用）
   - pubkey → 言語集合のマップを構築
   - IndexedDBにキャッシュ

2. **活動イベント収集**
   - 全kindのイベントを期間で取得
   - 重複排除（event id）
   - pubkey × 日付の活動マップを構築

3. **メトリクス計算**
   - スライディングウィンドウで集計
   - 言語フィルタ適用（U_lang ∩ A(period)）
   - 日次データポイント生成

### 4. Storage Layer

#### IndexedDB (Dexie)
- **metrics**: 計算済みメトリクスのキャッシュ
  - キー: `relays + languages + period + windowDays`
  - TTL: 7日（デフォルト）
- **languageIndex**: 言語インデックスのキャッシュ
  - キー: `relays + period`
  - TTL: 30日（デフォルト）

#### LocalStorage
- UI設定（Zustand persist）
- 公開鍵（NIP-07）

## データフロー

### 分析実行フロー

```
1. ユーザーが設定を入力
   ↓
2. 「分析開始」ボタンクリック
   ↓
3. キャッシュ確認（IndexedDB）
   ├─ ヒット → キャッシュから読み込み
   └─ ミス → 以下を実行
       ↓
4. 言語インデックス構築（WASM）
   - リレーからイベント取得
   - whatlangで言語検出
   - pubkey → 言語マップ作成
   ↓
5. メトリクス計算（WASM）
   - 全kindイベント取得
   - 活動マップ作成
   - スライディングウィンドウ集計
   ↓
6. 結果をIndexedDBにキャッシュ
   ↓
7. UIに結果表示（グラフ）
```

### 結果発行フロー

```
1. 「リレーに発行」ボタンクリック
   ↓
2. NIP-07で公開鍵取得
   ↓
3. 各メトリクス×言語でイベント作成
   - kind: 30080
   - tags: d, l, r, algo, gran, wdays, app
   - content: JSON（counts配列等）
   ↓
4. NIP-07で署名
   ↓
5. 各リレーにWebSocketで送信
   ↓
6. 完了通知
```

## 非機能要件

### パフォーマンス
- チャンク分割による段階的取得（メモリ制約対応）
- IndexedDBキャッシュによる再計算回避
- Web Workerでの非同期処理（UI非ブロッキング）

### スケーラビリティ
- 365日×複数リレーでも動作
- イベント数上限設定可能
- 段階的進捗表示

### 信頼性
- リレー接続失敗時の部分結果保持
- タイムアウト設定
- エラーハンドリング

### セキュリティ
- 秘密鍵はNIP-07拡張機能のみで管理
- 署名はユーザー操作時のみ要求
- XSS対策（React標準）

## 技術スタック

### Frontend
- React 18
- TypeScript
- Vite
- Zustand (状態管理)
- Recharts (グラフ)
- Dexie (IndexedDB)

### Backend (WASM)
- Rust 2021
- rust-nostr 0.36
- whatlang 0.16
- wasm-bindgen
- serde/serde_json

### 開発ツール
- wasm-pack
- ESLint
- TypeScript Compiler

