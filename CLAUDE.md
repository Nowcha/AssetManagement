# AssetManagement - プロジェクト固有ルール

> グローバルルール（`%USERPROFILE%\.claude\CLAUDE.md`）を継承・拡張する。
> 競合する場合は本ファイルを優先する。

---

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| アプリ名 | AssetManagement（個人金融資産管理） |
| GitHub | https://github.com/Nowcha/AssetManagement |
| Pages URL | https://Nowcha.github.io/AssetManagement/ |
| Blueprint | BLUEPRINT.md |

---

## 技術スタック（確定）

```
React 18 + Vite 6 + TypeScript 5.x (strict)
Tailwind CSS 3.x
Zustand 4.x          # 状態管理
Dexie.js 4.x         # IndexedDB ORM
React Router v6      # SPA ルーティング
React Hook Form + Zod # フォーム・バリデーション
Recharts             # グラフ描画
vite-plugin-pwa      # PWA対応
Vitest + RTL         # テスト
```

---

## ディレクトリ構成（厳守）

```
src/
  components/
    common/       # Button, Modal, Toast, Table, LoadingSpinner
    layout/       # AppShell, Header, Sidebar
    charts/       # AssetAllocationPie, PortfolioTimeline, PerformanceBar
    assets/       # AssetCard, AssetForm, AssetList
    transactions/ # TransactionForm, TransactionList
    simulation/   # SimulationForm, SimulationChart
  hooks/          # useAssets, useTransactions, usePortfolio, useSimulation, usePriceSync, useEncryption
  store/          # assetStore, settingsStore, uiStore
  pages/          # Dashboard, Assets, Transactions, Performance, Simulation, Reports, Settings
  types/          # asset.types, transaction.types, portfolio.types, simulation.types, settings.types
  api/            # coinGecko, frankfurter, alphaVantage, jQuants, yahooFinanceJP
  utils/          # crypto, db, formatters, calculations, simulation, csv, validators
  workers/        # simulation.worker.ts（モンテカルロ計算 Web Worker）
```

---

## 外部API方針

| 対象 | API | APIキー | CORS |
|------|-----|---------|------|
| 仮想通貨 | CoinGecko Free | 不要 | OK |
| 為替レート | Frankfurter API | 不要 | OK |
| 米国株 | Alpha Vantage | ユーザー設定必須（無料） | OK |
| 国内株・ETF | J-Quants API（JPX公式） | ユーザー登録必須（無料） | OK |
| 投資信託 | Yahoo Finance Japan（非公式） | 不要 | 要確認 |

- APIキーはすべてユーザーが設定画面で入力し、暗号化してIndexedDBに保存する
- キーをソースコードにハードコードすること禁止
- 外部APIエラー時は手動入力にフォールバックする

---

## ビジネスロジック固有ルール

### 取得単価計算
- **移動平均法のみ**（総平均法は実装しない）
- 買付取引時: `新平均取得単価 = (現保有額 + 今回取得額) / (現保有数 + 今回数量)`

### 暗号化
- **任意**（初回起動時にスキップ可能）
- 有効時: Web Crypto API（AES-256-GCM + PBKDF2 100,000 iterations）
- CryptoJSは使用禁止（Web Crypto APIに統一）
- 暗号化なしでも全機能が使える

### シミュレーション
- モンテカルロ法（1000試行 × 最大40年）
- 計算は `src/workers/simulation.worker.ts` でWeb Workerオフロード
- 結果画面に必ず免責事項を表示:
  > 「本シミュレーション結果は情報提供を目的としたものであり、投資勧誘・助言・推奨を行うものではありません。投資判断は自己責任でお願いします。」

### UI言語
- 日本語のみ（i18n/多言語対応は実装しない）

---

## GitHub Pages デプロイ設定

```typescript
// vite.config.ts
base: '/AssetManagement/'
```

SPA の404問題: `public/404.html` に以下のリダイレクトスクリプトを配置
```html
<!-- GitHub Pages SPA redirect script -->
```

---

## セキュリティチェックリスト（PR前に確認）

- [ ] `innerHTML` / `dangerouslySetInnerHTML` を使用していない
- [ ] APIキー・パスワードをコード・ログに含めていない
- [ ] 金融データをIndexedDB以外（localStorage平文等）に保存していない
- [ ] 暗号化ありの場合、平文データをメモリに保持する時間を最小化している
- [ ] `npm audit` でCritical/Highがゼロ

---

## テスト方針

```
src/utils/       → 全関数に単体テスト（カバレッジ100%目標）
src/hooks/       → State変化・副作用の検証
src/components/  → propsレンダリング・ユーザーインタラクション
src/api/         → vi.mock でAPI呼び出しをモック
```

コミット・プッシュ前に必ず実行（pre-push フックで自動化済み）:
```bash
npx tsc --noEmit       # 型エラーを先に確認
npm run lint           # ESLint エラーを確認
npm run test:coverage  # テスト + ブランチカバレッジ 70% 以上を確認
```

> **初回セットアップ**: `git config core.hooksPath .githooks` を実行して pre-push フックを有効化すること。

---

## コミット規約（Conventional Commits）

```
feat(assets): add asset registration form
fix(crypto): fix IV reuse vulnerability
test(calculations): add moving average unit tests
chore(deps): update dexie to 4.0.8
```

スコープ例: `assets`, `transactions`, `portfolio`, `simulation`, `crypto`, `db`, `api`, `ui`, `pwa`

---

## コーディングアンチパターン（過去に CI を壊したパターン）

### テスト: RTL での DOM 値検証
```tsx
// ❌ 型アサーションで値を取得 — ESLint が "unnecessary assertion" と警告
expect((screen.getByLabelText(/取引日/) as HTMLInputElement).value).toBe('2024-06-15')

// ✅ getByDisplayValue（input/textarea）または toHaveValue（select/input）
expect(screen.getByDisplayValue('2024-06-15')).toBeInTheDocument()
expect(screen.getByRole('combobox', { name: /取引種別/ })).toHaveValue('sell')
```

### テスト: React Router フックを使うコンポーネント
```tsx
// ❌ useNavigate / useParams / useLocation を使うコンポーネントを Router なしでレンダリング
render(<TransactionList />)  // → "useNavigate() may be used only in the context of a <Router>"

// ✅ 必ず MemoryRouter でラップ
render(<MemoryRouter><TransactionList /></MemoryRouter>)
```

### テスト: 新規分岐を追加したらテストも追加
- 新しい `if` / 条件レンダリング / ternary を追加したら、その分岐をカバーするテストを同時に追加する
- CI のブランチカバレッジ閾値は **70%**（`vitest.config.ts` で設定）

### Zod: `z.preprocess` は使わない
```typescript
// ❌ z.preprocess は fee の型を unknown に推論させ、RHF の Resolver 型不一致を引き起こす
fee: z.preprocess((v) => isNaN(v) ? undefined : v, z.number().optional())

// ✅ スキーマはシンプルに保ち、変換は RHF の setValueAs で行う
// validators.ts:
fee: z.number().nonnegative().optional()
// TransactionForm/index.tsx:
{...register('fee', { setValueAs: (v: string) => v === '' ? undefined : Number(v) })}
```

### ESLint: 不要な `??` 演算子
```typescript
// ❌ TypeScript が number と推論している値に ?? を使うと ESLint エラー
const val = watchedAmount ?? 0   // amount は defaultValues で 0 なので number 確定

// ✅ ?? は型が T | undefined / T | null の場合にのみ使う
const val = watchedAmount
```
