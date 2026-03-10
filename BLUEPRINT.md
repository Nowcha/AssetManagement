# AssetManagement - Product Blueprint
## 個人金融資産管理アプリ 包括的開発ブループリント

**作成日**: 2026-03-10
**バージョン**: 1.0.0
**ステータス**: Draft - Ready for Team Review
**Studio Producer**: Claude Sonnet 4.6

---

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [ドリームチーム編成](#2-ドリームチーム編成)
3. [機能要件一覧](#3-機能要件一覧)
4. [非機能要件](#4-非機能要件)
5. [技術アーキテクチャ](#5-技術アーキテクチャ)
6. [データモデル](#6-データモデル)
7. [セキュリティ方針](#7-セキュリティ方針)
8. [開発ロードマップ](#8-開発ロードマップ)
9. [リスクと対策](#9-リスクと対策)
10. [成功指標（KPI）](#10-成功指標kpi)

---

## 1. エグゼクティブサマリー

### プロジェクト概要

AssetManagement は、複数の金融口座・投資商品を持つ個人投資家が、自身の資産状況を一元管理・可視化・分析できる Web アプリケーションである。ユーザーのすべての金融データはローカルデバイス上にのみ保存され、いかなる外部サーバーにも送信されないプライバシーファースト設計を採用する。

### 価値提案

| 課題 | AssetManagement の解決策 |
|------|--------------------------|
| 複数の証券口座・銀行口座をバラバラに管理している | 全資産を一つのダッシュボードで一元管理 |
| 資産全体のポートフォリオバランスが把握できない | 円グラフ・棒グラフによるリアルタイム資産配分可視化 |
| 老後資金や目標達成までの道筋が見えない | モンテカルロシミュレーションによる将来予測 |
| 金融データをクラウドに預けることへの不安 | 完全ローカル保存 + AES-256 暗号化 |
| 既存アプリの操作が複雑 | 直感的 UI、スマートフォン対応、オフライン動作 |

### 市場ポジション

- **ターゲット**: 複数の金融口座・投資商品を持つ個人投資家（20〜50代）
- **差別化要素**: プライバシーファースト（ゼロサーバー送信）、オープンソース、無料、PWA対応
- **競合**: マネーフォワード ME、家計簿アプリ各種（いずれもクラウド同期型）

### 技術サマリー

```
フレームワーク : React 18 + Vite 5
言語          : TypeScript 5.x (strict mode)
スタイリング   : Tailwind CSS 3.x
テスト        : Vitest + React Testing Library
デプロイ      : GitHub Pages (静的サイト)
データ保存    : IndexedDB (Dexie.js) + AES-256 暗号化
状態管理      : Zustand 4.x
```

---

## 2. ドリームチーム編成

### 選定方針

金融資産管理アプリの性質上、**セキュリティ・UX品質・法規制対応** を最優先に置き、フロントエンドのみの実装であっても設計品質が長期的な信頼性を左右するため、以下 8 エージェントを選定する。

### チーム構成

```
Studio Producer (オーケストレーター)
├── UX Architect        ─── アーキテクチャ全体設計・技術意思決定
├── UI Designer         ─── デザインシステム・コンポーネント仕様
├── UX Researcher       ─── ユーザーインサイト・ユーザビリティ検証
├── Frontend Developer  ─── React/TypeScript 実装
├── Security Engineer   ─── 金融データ暗号化・脆弱性対策
├── Sprint Prioritizer  ─── 機能優先度・スプリント計画
├── Legal Compliance    ─── 金融規制・個人情報保護法対応
└── Trend Researcher    ─── 競合分析・市場動向
```

### 各エージェントの役割・責任範囲

#### UX Architect
- **責任範囲**: フロントエンドアーキテクチャ設計、ディレクトリ構成策定、技術スタック選定・検証、パフォーマンス設計
- **主要成果物**: アーキテクチャ設計書、ADR（Architecture Decision Records）、Vite設定、ルーティング設計
- **意思決定権**: 状態管理ライブラリ選定、データ永続化方式、外部API統合方針

#### UI Designer
- **責任範囲**: デザインシステム構築、Tailwind CSS テーマ設定、コンポーネントライブラリ仕様、ダークモード対応
- **主要成果物**: カラーパレット定義、タイポグラフィシステム、アイコンセット選定、コンポーネント仕様書
- **意思決定権**: ビジュアルデザイン方針、UIコンポーネント粒度

#### UX Researcher
- **責任範囲**: ユーザーペルソナ定義、ユーザーフロー設計、情報アーキテクチャ（IA）、ユーザビリティテスト設計
- **主要成果物**: ペルソナドキュメント、ユーザーフロー図、IA サイトマップ、テストシナリオ
- **意思決定権**: ナビゲーション構造、機能の優先順位（ユーザー視点）

#### Frontend Developer
- **責任範囲**: React コンポーネント実装、カスタムフック開発、Vitest テスト作成、GitHub Pages デプロイ設定
- **主要成果物**: 全コンポーネント実装、テストスイート（カバレッジ 80%以上）、CI/CD パイプライン
- **意思決定権**: 実装詳細、コードパターン選択

#### Security Engineer
- **責任範囲**: IndexedDB 暗号化実装、CSP ヘッダー設計、依存ライブラリ脆弱性監査、セキュリティレビュー
- **主要成果物**: 暗号化ユーティリティ、セキュリティチェックリスト、npm audit 自動化
- **意思決定権**: 暗号化アルゴリズム選定、データ保護方式

#### Sprint Prioritizer
- **責任範囲**: 機能の MoSCoW 優先度付け、スプリント計画、バックログ管理、ベロシティ追跡
- **主要成果物**: プロダクトバックログ、スプリント計画書、リリース計画
- **意思決定権**: 各スプリントのスコープ、MVP 範囲

#### Legal Compliance Checker
- **責任範囲**: 個人情報保護法（改正 APPI）対応、金融商品取引法の適用範囲確認、利用規約・プライバシーポリシー草案
- **主要成果物**: コンプライアンスチェックリスト、免責事項文言、プライバシーポリシー
- **意思決定権**: 法律的リスクのある機能の実装可否

#### Trend Researcher
- **責任範囲**: 競合アプリ機能調査、個人投資家の動向分析、新興技術（AI資産分析）のベンチマーク
- **主要成果物**: 競合分析レポート、機能差別化提案、市場トレンドサマリー
- **意思決定権**: 差別化機能の提案

### 除外エージェントの理由

| エージェント | 除外理由 |
|---|---|
| Backend Architect | GitHub Pages 静的デプロイのためバックエンドなし。設計観点はUX Architectが兼務 |
| AI Engineer | MVP 段階では外部AI API の利用を避ける。シミュレーションは統計的手法で実装 |
| Data Engineer | データパイプラインは不要。ローカル IndexedDB のみのため Frontend Developer が担当 |
| Technical Writer | Sprint Prioritizer がドキュメント化戦略を担当。詳細はFrontend Developerが JSDoc で対応 |

---

## 3. 機能要件一覧

### 優先度凡例
- **Must Have (M)**: MVP に必須
- **Should Have (S)**: Phase 2 に含める
- **Could Have (C)**: Phase 3 以降
- **Won't Have (W)**: 今回のスコープ外

### Epic 1: 資産登録・管理

| ID | ユーザーストーリー | 優先度 | 受入条件 |
|----|--------------------|--------|----------|
| AS-001 | 投資家として、株式資産を銘柄・保有数量・取得単価で登録したい | M | 銘柄コード、数量、取得単価、取得日を入力できる。バリデーションエラーが明示される |
| AS-002 | 投資家として、投資信託をファンド名・評価額・保有口数で登録したい | M | ファンド名フリー入力、または CSV インポートに対応 |
| AS-003 | 投資家として、仮想通貨をコイン種別・保有量・取得価格で登録したい | M | BTC/ETH/その他のコインを選択入力できる |
| AS-004 | 投資家として、銀行預金・定期預金を金融機関名・残高で登録したい | M | 普通預金・定期預金の種別選択が可能 |
| AS-005 | 投資家として、不動産資産を物件名・評価額・購入価格で登録したい | S | 購入価格、現在評価額、物件名を入力できる |
| AS-006 | 投資家として、生命保険・個人年金を解約返戻金ベースで登録したい | S | 保険会社名、商品名、解約返戻金額を入力できる |
| AS-007 | 投資家として、登録した資産を編集・削除できる | M | 編集ダイアログ、削除確認ダイアログが表示される |
| AS-008 | 投資家として、資産にメモ・タグを付与して分類できる | C | 自由記述メモ、複数タグ付与が可能 |

### Epic 2: ポートフォリオダッシュボード

| ID | ユーザーストーリー | 優先度 | 受入条件 |
|----|--------------------|--------|----------|
| PF-001 | 投資家として、全資産の合計評価額をダッシュボードで即座に確認したい | M | ページ読み込み後 2 秒以内に合計額が表示される |
| PF-002 | 投資家として、資産クラス別の配分を円グラフで把握したい | M | 株式・投信・仮想通貨・預金・不動産・保険の比率が表示される |
| PF-003 | 投資家として、含み損益（評価損益・損益率）を一目で確認したい | M | 評価額、取得額、評価損益、損益率が色分けで表示される |
| PF-004 | 投資家として、ダッシュボードに資産更新日時を確認したい | M | 最終更新日時がヘッダーまたはカードに表示される |
| PF-005 | 投資家として、国内・海外・新興国の地域別配分を確認したい | S | 地域別配分の円グラフまたは棒グラフが表示される |
| PF-006 | 投資家として、ダッシュボードのウィジェット表示順をカスタマイズしたい | C | ドラッグ＆ドロップでウィジェット並び替えが可能 |

### Epic 3: パフォーマンス追跡

| ID | ユーザーストーリー | 優先度 | 受入条件 |
|----|--------------------|--------|----------|
| PT-001 | 投資家として、資産総額の時系列推移をグラフで確認したい | M | 1M・3M・6M・1Y・ALL の期間フィルターが動作する |
| PT-002 | 投資家として、個別資産の騰落率を一覧で比較したい | M | 騰落率でソート可能なテーブルが表示される |
| PT-003 | 投資家として、資産クラス別のパフォーマンスを比較したい | S | クラス別のパフォーマンス棒グラフが表示される |
| PT-004 | 投資家として、NISA・iDeCo 口座別にパフォーマンスを追跡したい | S | 口座種別フィルターが機能する |
| PT-005 | 投資家として、外部 API から株価・仮想通貨価格を自動取得したい | S | CoinGecko API から BTC/ETH 等の価格が自動更新される |

### Epic 4: 目標設定・シミュレーション

| ID | ユーザーストーリー | 優先度 | 受入条件 |
|----|--------------------|--------|----------|
| SIM-001 | 投資家として、老後資金の目標額と達成年齢を設定したい | S | 目標金額・達成目標年・月次積立額を入力できる |
| SIM-002 | 投資家として、期待リターン・標準偏差を入力して将来資産をシミュレーションしたい | S | モンテカルロ法（1000 回試行）でパーセンタイルグラフが生成される |
| SIM-003 | 投資家として、積立金額を変えてシミュレーション結果の変化を確認したい | S | スライダーで積立額変更時にグラフがリアルタイム更新される |
| SIM-004 | 投資家として、インフレ率を考慮した実質資産額でシミュレーションしたい | C | インフレ率入力欄とインフレ調整後グラフが表示される |

### Epic 5: 取引履歴管理

| ID | ユーザーストーリー | 優先度 | 受入条件 |
|----|--------------------|--------|----------|
| TX-001 | 投資家として、買付・売却・配当・分配金の取引を記録したい | M | 取引種別・日付・金額・数量を入力できる |
| TX-002 | 投資家として、取引履歴を日付・資産別にフィルタリングしたい | S | フィルター適用後にリストが即座に更新される |
| TX-003 | 投資家として、取引履歴から平均取得単価が自動計算されることを確認したい | S | FIFO または移動平均で取得単価が自動更新される |
| TX-004 | 投資家として、確定損益を年別に集計して確認したい | S | 年別・資産別の確定損益サマリーが表示される |

### Epic 6: データインポート・エクスポート

| ID | ユーザーストーリー | 優先度 | 受入条件 |
|----|--------------------|--------|----------|
| IE-001 | 投資家として、資産データを CSV でインポートしたい | S | CSV テンプレートのダウンロード、インポート後のプレビュー確認が可能 |
| IE-002 | 投資家として、資産データ・取引履歴を CSV でエクスポートしたい | S | UTF-8 BOM 付き CSV がダウンロードされる |
| IE-003 | 投資家として、月次レポートを PDF で出力したい | C | A4 フォーマットのサマリーレポートが生成される |
| IE-004 | 投資家として、全データをバックアップ用 JSON でエクスポート・インポートできる | S | データの完全バックアップと復元が可能 |

### Epic 7: アラート・通知

| ID | ユーザーストーリー | 優先度 | 受入条件 |
|----|--------------------|--------|----------|
| AL-001 | 投資家として、特定資産が目標価格に達したときにアラートを設定したい | C | 価格上限・下限のアラート設定が可能 |
| AL-002 | 投資家として、ポートフォリオのリバランスが必要になったらアラートを受けたい | C | 目標配分比率との乖離率閾値でアラートが発火する |

### Epic 8: アプリ設定

| ID | ユーザーストーリー | 優先度 | 受入条件 |
|----|--------------------|--------|----------|
| ST-001 | 投資家として、表示通貨（JPY/USD）を切り替えたい | S | 設定画面で通貨変更後に全ての金額表示が更新される |
| ST-002 | 投資家として、ダークモードに切り替えたい | S | ライト/ダーク/システム設定の 3 モードが切り替えられる |
| ST-003 | 投資家として、データ暗号化パスワードを設定・変更したい | M | パスワード強度インジケーター付き設定フォームが機能する |
| ST-004 | 投資家として、全データを削除してアプリをリセットできる | M | 二重確認ダイアログ（「DELETE」文字入力）が表示される |

---

## 4. 非機能要件

### 4.1 セキュリティ

| 要件ID | 要件 | 実装方針 |
|--------|------|----------|
| SEC-001 | 全金融データの暗号化保存 | AES-256-GCM + PBKDF2 (100,000 iterations) でユーザーパスワードから鍵導出 |
| SEC-002 | ゼロサーバー送信 | 外部API呼び出し以外の個人データ送信を完全禁止。CSP ヘッダーで制御 |
| SEC-003 | XSS 対策 | React の自動エスケープ + DOMPurify、innerHTML 禁止 |
| SEC-004 | 依存関係の脆弱性管理 | npm audit を CI で自動実行、Critical/High は即座にブロック |
| SEC-005 | セッション管理 | アプリ内パスワード認証（ローカル）、30 分非操作でロック |

### 4.2 パフォーマンス

| 要件ID | 要件 | 計測方法 |
|--------|------|----------|
| PERF-001 | 初回表示 (LCP) < 2 秒 | Lighthouse / WebPageTest で計測 |
| PERF-002 | インタラクション応答 < 100ms | React DevTools Profiler |
| PERF-003 | バンドルサイズ < 500KB (gzip) | Vite Bundle Analyzer |
| PERF-004 | IndexedDB 読み書き < 50ms（資産 1000 件） | Vitest でベンチマークテスト |

### 4.3 アクセシビリティ

| 要件ID | 要件 | 準拠基準 |
|--------|------|----------|
| A11Y-001 | キーボード操作で全機能にアクセス可能 | WCAG 2.1 AA - 2.1.1 |
| A11Y-002 | スクリーンリーダー対応（NVDA/VoiceOver） | WCAG 2.1 AA - 1.3.1, 4.1.2 |
| A11Y-003 | 色のコントラスト比 4.5:1 以上 | WCAG 2.1 AA - 1.4.3 |
| A11Y-004 | フォーム入力にラベルと説明文 | WCAG 2.1 AA - 1.3.1 |
| A11Y-005 | エラーメッセージの明示 | WCAG 2.1 AA - 3.3.1 |

### 4.4 対応環境・デバイス

| カテゴリ | 要件 |
|----------|------|
| ブラウザ | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| デバイス | PC (1280px+), タブレット (768px+), スマートフォン (375px+) |
| オフライン | PWA 対応、Service Worker でアプリシェルをキャッシュ |
| インストール | PWA としてホーム画面に追加可能 |

### 4.5 信頼性・保守性

| 要件ID | 要件 |
|--------|------|
| REL-001 | テストカバレッジ 80% 以上（ユーティリティは 100%） |
| REL-002 | TypeScript strict mode、ESLint エラーゼロ |
| REL-003 | GitHub Actions による CI（PR マージ前に自動テスト） |
| REL-004 | セマンティックバージョニング（semver）によるリリース管理 |

---

## 5. 技術アーキテクチャ

### 5.1 全体構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    React Application                         │ │
│  │                                                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │  Pages   │  │Components│  │  Hooks   │  │  Store   │   │ │
│  │  │(Router)  │  │(UI Layer)│  │(Business │  │(Zustand) │   │ │
│  │  │          │  │          │  │  Logic)  │  │          │   │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │ │
│  │       └─────────────┴──────────────┴──────────────┘         │ │
│  │                              │                               │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │               Service Layer (api/ + utils/)             │ │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐ │ │ │
│  │  │  │  Crypto     │  │  DB Service │  │  External API  │ │ │ │
│  │  │  │  (AES-256)  │  │  (Dexie.js) │  │  Adapter       │ │ │ │
│  │  │  └─────────────┘  └──────┬──────┘  └───────┬────────┘ │ │ │
│  │  └──────────────────────────┼──────────────────┼──────────┘ │ │
│  └─────────────────────────────┼──────────────────┼────────────┘ │
│                                │                  │              │
│  ┌─────────────────────────────┼──────┐            │              │
│  │        IndexedDB            │      │            │              │
│  │  (Encrypted with AES-256)   │      │            │              │
│  └─────────────────────────────┘      │            │              │
│                                        │            │              │
└────────────────────────────────────────┼────────────┼──────────────┘
                                         │            │
                            ┌────────────┴────────────┴──────────┐
                            │          External APIs (CORS)        │
                            │  ┌──────────────┐  ┌─────────────┐ │
                            │  │ CoinGecko API│  │ Exchange     │ │
                            │  │ (Crypto Price│  │ Rate API     │ │
                            │  └──────────────┘  └─────────────┘ │
                            └────────────────────────────────────┘
```

### 5.2 ディレクトリ構成

```
src/
├── components/              # 再利用可能な UI コンポーネント
│   ├── common/              # 汎用コンポーネント
│   │   ├── Button/
│   │   ├── Modal/
│   │   ├── Toast/
│   │   ├── Table/
│   │   └── LoadingSpinner/
│   ├── layout/              # レイアウトコンポーネント
│   │   ├── AppShell/        # ヘッダー・サイドバー統合
│   │   ├── Header/
│   │   └── Sidebar/
│   ├── charts/              # グラフコンポーネント (Recharts)
│   │   ├── AssetAllocationPie/
│   │   ├── PortfolioTimeline/
│   │   └── PerformanceBar/
│   ├── assets/              # 資産関連コンポーネント
│   │   ├── AssetCard/
│   │   ├── AssetForm/
│   │   └── AssetList/
│   ├── transactions/        # 取引履歴コンポーネント
│   │   ├── TransactionForm/
│   │   └── TransactionList/
│   └── simulation/          # シミュレーション
│       ├── SimulationForm/
│       └── SimulationChart/
│
├── hooks/                   # カスタムフック
│   ├── useAssets.ts         # 資産 CRUD
│   ├── useTransactions.ts   # 取引履歴
│   ├── usePortfolio.ts      # ポートフォリオ集計
│   ├── useSimulation.ts     # シミュレーション計算
│   ├── usePriceSync.ts      # 外部API価格同期
│   └── useEncryption.ts     # 暗号化/復号
│
├── store/                   # Zustand ストア
│   ├── assetStore.ts        # 資産データ
│   ├── settingsStore.ts     # アプリ設定
│   ├── uiStore.ts           # UI 状態（モーダル、通知等）
│   └── index.ts             # ストアのエクスポート集約
│
├── pages/                   # ページコンポーネント
│   ├── Dashboard/
│   ├── Assets/              # 資産一覧・詳細
│   ├── Transactions/
│   ├── Performance/
│   ├── Simulation/
│   ├── Reports/
│   └── Settings/
│
├── types/                   # TypeScript 型定義
│   ├── asset.types.ts
│   ├── transaction.types.ts
│   ├── portfolio.types.ts
│   ├── simulation.types.ts
│   └── settings.types.ts
│
├── api/                     # 外部 API 通信
│   ├── coinGecko.ts         # 仮想通貨価格
│   ├── exchangeRate.ts      # 為替レート
│   └── stockPrice.ts        # 株価（Alpha Vantage）
│
├── utils/                   # 純粋ユーティリティ関数
│   ├── crypto.ts            # AES-256-GCM 暗号化
│   ├── db.ts                # Dexie.js 初期化・スキーマ
│   ├── formatters.ts        # 通貨・数値フォーマット
│   ├── calculations.ts      # 損益計算・平均取得単価
│   ├── simulation.ts        # モンテカルロシミュレーション
│   ├── csv.ts               # CSV インポート・エクスポート
│   └── validators.ts        # Zod スキーマ
│
└── main.tsx                 # エントリーポイント
```

### 5.3 状態管理設計

**Zustand** を採用。Redux の冗長性を排除し、TypeScript との相性を重視。

```
Global State (Zustand)
├── assetStore
│   ├── assets: Asset[]           # 全資産データ（復号済み）
│   ├── isLoading: boolean
│   └── CRUD actions
├── settingsStore
│   ├── currency: 'JPY' | 'USD'
│   ├── theme: 'light' | 'dark' | 'system'
│   ├── isEncryptionEnabled: boolean
│   └── update actions
└── uiStore
    ├── activeModal: ModalType | null
    ├── notifications: Notification[]
    └── ui actions

Server State (TanStack Query - Optional Phase 2)
└── 外部APIデータキャッシュ（株価・仮想通貨価格）
```

### 5.4 ルーティング設計

React Router v6 を使用。

```
/                           → Dashboard（認証済みの場合）
/unlock                     → パスワードロック解除画面
/assets                     → 資産一覧
/assets/new                 → 資産登録
/assets/:id                 → 資産詳細・編集
/transactions               → 取引履歴
/transactions/new           → 取引記録
/performance                → パフォーマンス追跡
/simulation                 → シミュレーション
/reports                    → レポート
/settings                   → 設定
/settings/security          → セキュリティ設定
```

### 5.5 外部API統合方針

| API | 用途 | 制限 | 対策 |
|-----|------|------|------|
| CoinGecko API (Free) | BTC/ETH/主要コイン価格 | 30 req/min | クライアントサイドレート制限、キャッシュ 5 分 |
| exchangerate.host | 為替レート (JPY/USD/EUR) | 無制限 (Free tier) | 1 日 1 回更新 |
| Alpha Vantage (Free) | 米国株価 | 25 req/day | ユーザーが手動更新をトリガー |

---

## 6. データモデル

### 6.1 コアエンティティ

```typescript
// types/asset.types.ts

/** 資産クラスの種別 */
export type AssetClass =
  | 'stock_jp'       // 国内株式
  | 'stock_us'       // 米国株式
  | 'stock_other'    // その他外国株式
  | 'mutual_fund'    // 投資信託
  | 'etf'            // ETF
  | 'crypto'         // 仮想通貨
  | 'deposit'        // 預金・貯金
  | 'bond'           // 債券
  | 'real_estate'    // 不動産
  | 'insurance'      // 保険・個人年金
  | 'other';         // その他

/** 口座種別 */
export type AccountType =
  | 'taxable'        // 特定口座・一般口座
  | 'nisa'           // NISA（旧）
  | 'nisa_growth'    // 成長投資枠
  | 'nisa_reserve'   // つみたて投資枠
  | 'ideco'          // iDeCo
  | 'dc'             // 企業型 DC
  | 'bank'           // 銀行口座
  | 'other';         // その他

/** 通貨コード */
export type CurrencyCode = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'BTC' | 'ETH' | 'other';

/** 資産エンティティ */
export interface Asset {
  id: string;                    // UUID v4
  name: string;                  // 資産名・銘柄名
  ticker?: string;               // ティッカーシンボル（株式・ETF・仮想通貨）
  assetClass: AssetClass;        // 資産クラス
  accountType: AccountType;      // 口座種別
  currency: CurrencyCode;        // 取引通貨
  quantity: number;              // 保有数量（株数・口数・コイン数）
  acquisitionPrice: number;      // 平均取得単価（取引通貨建て）
  currentPrice: number;          // 現在価格（取引通貨建て）
  currentPriceJpy: number;       // 現在価格（JPY換算）
  currentPriceUpdatedAt?: Date;  // 価格最終更新日時
  note?: string;                 // メモ
  tags: string[];                // タグ
  createdAt: Date;               // 登録日時
  updatedAt: Date;               // 更新日時
}

/** 資産集計（計算値） */
export interface AssetSummary {
  assetId: string;
  totalValue: number;           // 評価額合計 (JPY)
  totalCost: number;            // 取得額合計 (JPY)
  unrealizedGain: number;       // 含み損益 (JPY)
  unrealizedGainRate: number;   // 含み損益率 (%)
}
```

```typescript
// types/transaction.types.ts

/** 取引種別 */
export type TransactionType =
  | 'buy'            // 買付
  | 'sell'           // 売却
  | 'dividend'       // 配当・分配金
  | 'deposit'        // 入金
  | 'withdrawal'     // 出金
  | 'transfer'       // 振替
  | 'split'          // 株式分割
  | 'fee';           // 手数料

/** 取引履歴エンティティ */
export interface Transaction {
  id: string;                    // UUID v4
  assetId: string;               // 関連資産 ID
  type: TransactionType;         // 取引種別
  date: Date;                    // 取引日
  quantity?: number;             // 数量（買付・売却）
  price?: number;                // 単価（取引通貨建て）
  amount: number;                // 金額（JPY換算）
  fee?: number;                  // 手数料（JPY）
  exchangeRate?: number;         // 為替レート（外貨取引の場合）
  note?: string;                 // メモ
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
// types/portfolio.types.ts

/** ポートフォリオスナップショット（時系列記録用） */
export interface PortfolioSnapshot {
  id: string;
  recordedAt: Date;              // 記録日時
  totalValueJpy: number;        // 資産合計 (JPY)
  totalCostJpy: number;         // 投資元本合計 (JPY)
  breakdown: {
    assetClass: AssetClass;
    valueJpy: number;
  }[];
}

/** ポートフォリオ集計結果（計算値） */
export interface PortfolioSummary {
  totalValueJpy: number;         // 資産合計
  totalCostJpy: number;          // 投資元本
  totalUnrealizedGain: number;   // 含み損益
  totalUnrealizedGainRate: number; // 含み損益率
  totalRealizedGain: number;     // 確定損益（年初来）
  assetBreakdown: {
    assetClass: AssetClass;
    valueJpy: number;
    ratio: number;               // 構成比 (0-1)
  }[];
  accountBreakdown: {
    accountType: AccountType;
    valueJpy: number;
    ratio: number;
  }[];
  lastUpdatedAt: Date;
}
```

```typescript
// types/simulation.types.ts

/** 目標設定 */
export interface Goal {
  id: string;
  name: string;                  // 目標名（例: "老後資金"）
  targetAmount: number;          // 目標金額 (JPY)
  targetDate: Date;              // 達成目標日
  monthlyContribution: number;   // 月次積立額 (JPY)
  expectedAnnualReturn: number;  // 期待年率リターン (e.g., 0.05 = 5%)
  stdDev: number;                // 年率標準偏差 (e.g., 0.15 = 15%)
  inflationRate: number;         // インフレ率 (e.g., 0.02 = 2%)
  createdAt: Date;
  updatedAt: Date;
}

/** モンテカルロシミュレーション結果 */
export interface SimulationResult {
  goalId: string;
  runAt: Date;
  trials: number;                // 試行回数（通常 1000）
  years: number;                 // シミュレーション期間
  percentiles: {
    p10: number[];               // 10パーセンタイル（悲観）
    p25: number[];               // 25パーセンタイル
    p50: number[];               // 中央値
    p75: number[];               // 75パーセンタイル
    p90: number[];               // 90パーセンタイル（楽観）
  };
  successProbability: number;    // 目標達成確率 (0-1)
}
```

```typescript
// types/settings.types.ts

/** アプリ設定 */
export interface AppSettings {
  displayCurrency: 'JPY' | 'USD';
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  isEncryptionEnabled: boolean;
  encryptionKeyHash?: string;    // パスワード検証用ハッシュ（平文は保存しない）
  autoLockMinutes: number;       // 自動ロックまでの時間（分）
  priceAutoRefresh: boolean;     // 価格自動更新
  priceRefreshIntervalMinutes: number;
  lastBackupAt?: Date;
}
```

### 6.2 IndexedDB スキーマ（Dexie.js）

```typescript
// utils/db.ts

import Dexie, { type Table } from 'dexie';

interface EncryptedRecord {
  id: string;
  data: string;   // AES-256-GCM 暗号化済み JSON
  iv: string;     // 初期化ベクター (Base64)
  updatedAt: number; // Unix timestamp (for Dexie index)
}

class AssetManagementDB extends Dexie {
  assets!: Table<EncryptedRecord>;
  transactions!: Table<EncryptedRecord>;
  snapshots!: Table<EncryptedRecord>;
  goals!: Table<EncryptedRecord>;
  settings!: Table<AppSettings>;  // 暗号化不要（機密情報を含まない）

  constructor() {
    super('AssetManagementDB');
    this.version(1).stores({
      assets:       'id, updatedAt',
      transactions: 'id, updatedAt',
      snapshots:    'id, updatedAt',
      goals:        'id, updatedAt',
      settings:     'key',
    });
  }
}

export const db = new AssetManagementDB();
```

---

## 7. セキュリティ方針

### 7.1 データ保護アーキテクチャ

```
ユーザー入力データ
      │
      ▼
┌─────────────────────┐
│  Zod バリデーション  │  ← 入力サニタイズ
└──────────┬──────────┘
           │
      ▼
┌─────────────────────┐
│  PBKDF2 鍵導出       │  ← パスワード + Salt (32 bytes, random)
│  100,000 iterations  │     → 256bit AES 鍵
│  SHA-256             │
└──────────┬──────────┘
           │
      ▼
┌─────────────────────┐
│  AES-256-GCM 暗号化  │  ← IV (12 bytes, random per record)
│  Web Crypto API      │     → 認証タグ付き暗号文
└──────────┬──────────┘
           │
      ▼
┌─────────────────────┐
│  IndexedDB 保存      │  ← 暗号化済みデータのみ保存
└─────────────────────┘
```

### 7.2 実装ガイドライン

#### 暗号化ユーティリティ（Web Crypto API 使用）

```typescript
// utils/crypto.ts の設計仕様

// キー導出：PBKDF2
// - ソルト: crypto.getRandomValues(new Uint8Array(32))
// - イテレーション: 100,000
// - ハッシュ: SHA-256
// - 出力: 256 bit AES-GCM キー

// 暗号化：AES-256-GCM
// - IV: crypto.getRandomValues(new Uint8Array(12))（レコードごとに生成）
// - 認証タグ: 128 bit（AES-GCM のデフォルト）

// 注意: Web Crypto API はブラウザネイティブのため外部ライブラリ不要
// CryptoJS は非推奨（Web Crypto API に置き換え済み）
```

### 7.3 Content Security Policy

```html
<!-- index.html meta タグ or GitHub Pages カスタムヘッダー -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self'
    https://api.coingecko.com
    https://api.exchangerate.host
    https://www.alphavantage.co;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

### 7.4 GitHub Pages セキュリティ制約と対策

| 制約 | 対策 |
|------|------|
| カスタム HTTP ヘッダー設定不可 | meta タグで CSP を設定 |
| HTTPS 強制（自動） | 追加対応不要 |
| ソースコードが公開 | API キーをソースに含めない、環境変数を使用 |
| Subresource Integrity | Vite ビルドで自動付与 |

### 7.5 APIキー管理

- Alpha Vantage の無料 API キーはユーザーが自身のキーを設定画面で入力
- キーは暗号化して IndexedDB に保存（平文での localStorage 保存は禁止）
- CoinGecko・exchangerate.host は認証不要のため問題なし

### 7.6 法的コンプライアンス

| 観点 | 内容 |
|------|------|
| 金融商品取引法 | 投資助言・推奨機能を実装しない。シミュレーションは「参考情報」として免責事項を明記 |
| 個人情報保護法（改正APPI） | 個人データはローカルのみ保存、外部送信なし。ユーザーがデータ削除権を完全行使可能 |
| プライバシーポリシー | Google Analytics 等のトラッキングを使用しない場合は簡略版で可 |

**必須免責事項文言（UI に表示）**:
> 本アプリが提供するシミュレーション・分析結果は情報提供を目的としたものであり、投資勧誘・助言・推奨を行うものではありません。投資判断は自己責任でお願いします。

---

## 8. 開発ロードマップ

### スプリント概要

```
Sprint 1 (Week 1-2) : プロジェクト基盤 + 資産登録 MVP
Sprint 2 (Week 3-4) : ダッシュボード + 基本グラフ
Sprint 3 (Week 5-6) : 取引履歴 + パフォーマンス追跡
Sprint 4 (Week 7-8) : 外部API連携 + 価格自動更新
Sprint 5 (Week 9-10): シミュレーション + レポート
Sprint 6 (Week 11-12): PWA + アクセシビリティ + 最終調整
```

### Sprint 1: プロジェクト基盤 + 資産登録 MVP

**目標**: 開発環境を整備し、資産の登録・表示・削除ができる状態にする

**タスク**:
- [ ] Vite + React + TypeScript プロジェクト初期化
- [ ] Tailwind CSS + カスタムテーマ設定
- [ ] ESLint + Prettier + Husky（pre-commit hook）設定
- [ ] GitHub Actions CI パイプライン（テスト + ビルド + デプロイ）
- [ ] Dexie.js セットアップ + DB スキーマ定義
- [ ] Web Crypto API 暗号化ユーティリティ実装 + テスト
- [ ] Zustand ストア基盤（assetStore, settingsStore）
- [ ] React Router v6 ルーティング設定
- [ ] AppShell レイアウト（ヘッダー + サイドバー）
- [ ] 資産登録フォーム（React Hook Form + Zod バリデーション）
- [ ] 資産一覧テーブル
- [ ] パスワード設定・ロック解除画面

**完了条件**:
- 資産を登録・編集・削除できる
- データが IndexedDB に暗号化保存される
- テストカバレッジ 80% 以上
- Lighthouse Performance スコア 90 以上

### Sprint 2: ダッシュボード + 基本グラフ

**目標**: ポートフォリオのサマリーと資産配分が視覚的に確認できる状態にする

**タスク**:
- [ ] Recharts 統合
- [ ] 資産配分円グラフコンポーネント（AssetAllocationPie）
- [ ] 総資産・含み損益サマリーカード
- [ ] 資産クラス別内訳テーブル
- [ ] ダッシュボードページ（PF-001 〜 PF-004）
- [ ] 損益計算ユーティリティ（calculations.ts）
- [ ] 数値・通貨フォーマットユーティリティ（formatters.ts）
- [ ] レスポンシブレイアウト対応（モバイル優先）
- [ ] ダークモード対応

**完了条件**:
- ダッシュボードで総資産・含み損益・資産配分が確認できる
- PC・タブレット・スマートフォンで正常表示
- ダークモードが動作する

### Sprint 3: 取引履歴 + パフォーマンス追跡

**目標**: 取引記録と時系列パフォーマンスが確認できる状態にする

**タスク**:
- [ ] 取引フォーム（TX-001）
- [ ] 取引履歴一覧・フィルター（TX-002）
- [ ] 平均取得単価自動計算（TX-003 - 移動平均法）
- [ ] 確定損益年別集計（TX-004）
- [ ] ポートフォリオスナップショット自動記録（日次）
- [ ] 資産総額時系列グラフ（PT-001 - Recharts LineChart）
- [ ] 期間フィルター（1M / 3M / 6M / 1Y / ALL）
- [ ] 個別資産騰落率テーブル（PT-002）
- [ ] CSV インポート（IE-001）
- [ ] CSV エクスポート（IE-002）

**完了条件**:
- 取引を記録すると資産評価額が更新される
- 時系列グラフに過去の資産推移が表示される

### Sprint 4: 外部API連携 + 価格自動更新

**目標**: 仮想通貨・株価・為替レートが自動取得される状態にする

**タスク**:
- [ ] CoinGecko API アダプター（BTC/ETH/主要コイン）
- [ ] exchangerate.host アダプター（USD/EUR/JPY）
- [ ] Alpha Vantage アダプター（米国株）
- [ ] 価格更新スケジューラー（usePriceSync フック）
- [ ] クライアントサイドレート制限（リクエストキュー）
- [ ] 価格更新エラーハンドリング・リトライ
- [ ] 価格更新状態の UI フィードバック（最終更新日時、更新中インジケーター）
- [ ] NISA / iDeCo 口座別パフォーマンス（PT-004）
- [ ] 設定画面（ST-001 〜 ST-004）
- [ ] JSONバックアップ エクスポート・インポート（IE-004）

**完了条件**:
- 仮想通貨の現在価格が自動更新される
- 外部APIエラー時もアプリが継続動作する

### Sprint 5: シミュレーション + レポート

**目標**: 将来資産シミュレーションと月次レポート出力ができる状態にする

**タスク**:
- [ ] モンテカルロシミュレーションエンジン（simulation.ts）
- [ ] 目標設定フォーム（SIM-001）
- [ ] シミュレーション結果グラフ（パーセンタイル帯域表示）
- [ ] 積立額スライダー（SIM-003）
- [ ] 達成確率表示
- [ ] 月次レポート生成（IE-003 - HTML→PDF）
- [ ] 免責事項 UI の実装
- [ ] クラス別パフォーマンス比較グラフ（PT-003）
- [ ] 地域別資産配分（PF-005）

**完了条件**:
- 目標金額と積立額を入力するとシミュレーショングラフが表示される
- 達成確率が計算される
- 月次サマリーがPDFで出力される

### Sprint 6: PWA + アクセシビリティ + 品質最終調整

**目標**: PWA対応、WCAG 2.1 AA 準拠、本番リリース品質の達成

**タスク**:
- [ ] Service Worker 実装（Vite PWA Plugin）
- [ ] Web App Manifest 設定
- [ ] オフライン対応（アプリシェルキャッシュ）
- [ ] WCAG 2.1 AA アクセシビリティ監査・修正
  - [ ] キーボードナビゲーション完全対応
  - [ ] ARIA ラベル・ロール付与
  - [ ] コントラスト比チェック
  - [ ] フォーカス可視化
- [ ] Lighthouse 監査・スコア改善（各指標 90 以上）
- [ ] E2E テスト主要フロー検証（Playwright）
- [ ] npm audit 脆弱性ゼロ確認
- [ ] プライバシーポリシー・利用規約ページ
- [ ] README.md 完成
- [ ] GitHub Pages 本番デプロイ

**完了条件**:
- Lighthouse: Performance 90+, Accessibility 90+, Best Practices 90+
- WCAG 2.1 AA 主要基準を満たす
- オフラインでダッシュボードが表示できる
- npm audit で Critical/High ゼロ

---

## 9. リスクと対策

### 技術リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 外部APIの仕様変更・廃止 | 高 | 中 | API アダプター層で抽象化。複数 API のフォールバック設計。手動価格入力を常に可能にする |
| IndexedDB のデータ破損 | 高 | 低 | 自動バックアップ（JSON エクスポート促進）。Dexie.js のトランザクション活用 |
| ブラウザ間の Web Crypto API 差異 | 中 | 低 | Vitest + jsdom でクロスブラウザ動作確認。MDN 互換性表を参照 |
| バンドルサイズ肥大化 | 中 | 中 | Vite Bundle Analyzer で定期監視。Recharts・Dexie.js の tree-shaking 確認 |
| モンテカルロ計算のメインスレッドブロック | 中 | 高 | Web Worker で計算処理をオフロード。1000 試行 × 30 年 = 大量計算 |

### セキュリティリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ユーザーがパスワードを忘れる | 高 | 高 | 「パスワードを忘れた場合はデータ削除後にリセット」を明示。定期バックアップを強く推奨 |
| パスワード総当たり攻撃 | 高 | 低 | PBKDF2 100,000 iterations で計算コストを高く設定 |
| 悪意ある Chrome 拡張による DOM 改ざん | 中 | 低 | 機密データを DOM に平文で表示しない設計 |
| 依存ライブラリのサプライチェーン攻撃 | 高 | 低 | npm audit 自動実行。package-lock.json をコミット管理 |

### 規制・法務リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 投資助言業法への抵触 | 高 | 低 | シミュレーション結果に免責事項を必ず表示。「推奨」「予測」等の断定表現を禁止 |
| 個人情報保護法への抵触 | 高 | 低 | ローカル保存のみでサーバー送信なし。分析ツールも一切使用しない |

### プロジェクトリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| スコープクリープ | 中 | 高 | MoSCoW 優先度を厳守。Sprint 5 以降の新機能リクエストはバックログに積む |
| テストカバレッジ不足による品質低下 | 高 | 中 | CI でカバレッジ 80% 未満のマージをブロック |
| GitHub Pages の制約（カスタムヘッダー不可） | 低 | 確実 | meta タグで CSP 設定。SPA ルーティングは 404.html リダイレクト方式で対応 |

---

## 10. 成功指標（KPI）

### 技術品質指標

| 指標 | 目標値 | 計測方法 |
|------|--------|----------|
| Lighthouse Performance | 90 以上 | GitHub Actions での自動計測 |
| Lighthouse Accessibility | 90 以上 | GitHub Actions での自動計測 |
| テストカバレッジ | 80% 以上（utils: 100%） | Vitest coverage report |
| TypeScript エラー | 0 件 | tsc --noEmit |
| ESLint エラー | 0 件 | npm run lint |
| npm audit Critical/High | 0 件 | npm audit |
| バンドルサイズ (gzip) | 500KB 以下 | Vite Bundle Analyzer |
| 初回表示 (LCP) | 2 秒以下 | WebPageTest |

### 機能完成度指標

| フェーズ | 指標 | 目標 |
|----------|------|------|
| MVP (Sprint 1-2) | Must Have ユーザーストーリー完了率 | 100% |
| Phase 2 (Sprint 3-4) | Should Have ユーザーストーリー完了率 | 80% 以上 |
| Phase 3 (Sprint 5-6) | 全機能テスト通過率 | 100% |

### ユーザー体験指標

| 指標 | 目標値 | 計測方法 |
|------|--------|----------|
| 資産登録完了までの操作ステップ | 5 ステップ以下 | UX ウォークスルーテスト |
| モバイルでのダッシュボード表示 | 文字切れ・崩れ 0 件 | 実機テスト（iOS Safari / Android Chrome） |
| キーボードのみでの全機能到達可能 | 100% | WCAG 監査 |

### セキュリティ指標

| 指標 | 目標値 |
|------|--------|
| 暗号化されずに保存される金融データ | 0 件 |
| 外部サーバーへの個人データ送信 | 0 件（API 価格取得を除く） |
| 脆弱性スキャン（Dependabot） | Critical/High 0 件 |

---

## Appendix A: 採用ライブラリ一覧

| ライブラリ | バージョン | 用途 | ライセンス |
|---|---|---|---|
| react | ^18.3.0 | UI フレームワーク | MIT |
| react-dom | ^18.3.0 | DOM レンダリング | MIT |
| react-router-dom | ^6.28.0 | SPA ルーティング | MIT |
| zustand | ^4.5.0 | 状態管理 | MIT |
| dexie | ^4.0.0 | IndexedDB ORM | Apache-2.0 |
| recharts | ^2.13.0 | グラフ描画 | MIT |
| react-hook-form | ^7.54.0 | フォーム管理 | MIT |
| zod | ^3.24.0 | バリデーション | MIT |
| tailwindcss | ^3.4.0 | CSS フレームワーク | MIT |
| vite | ^6.0.0 | ビルドツール | MIT |
| vite-plugin-pwa | ^0.21.0 | PWA 対応 | MIT |
| vitest | ^2.1.0 | テストランナー | MIT |
| @testing-library/react | ^16.0.0 | コンポーネントテスト | MIT |

## Appendix B: 参考競合分析サマリー（Trend Researcher）

| アプリ | 強み | 弱み | 差別化ポイント |
|--------|------|------|----------------|
| マネーフォワード ME | 口座連携の広さ | クラウド同期必須、有料プラン | ローカル保存でプライバシー保護 |
| MoneyTree | UI の美しさ | 外部依存、サービス終了リスク | オープンソース、自己ホスト可能 |
| 資産運用アプリ各種 | シンプルさ | 機能が限定的 | シミュレーション機能、多資産対応 |

**結論**: 「プライバシーを最優先にしつつ、機関投資家レベルの分析を個人に」というポジショニングが最も差別化できる。

---

*このドキュメントは AssetManagement プロジェクトの公式プロダクトブループリントです。*
*開発チームへの引き継ぎ時には本ドキュメントと合わせて各スプリントのチケット詳細を参照してください。*

---

**Studio Producer Review**
**Date**: 2026-03-10
**Portfolio ROI Target**: 開発コスト最小化（静的ホスティング）+ ユーザー信頼獲得によるブランド価値最大化
**Strategic Leadership**: Privacy-First FinTech のパイオニアポジション確立
