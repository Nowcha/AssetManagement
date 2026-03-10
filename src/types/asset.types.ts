/** 資産クラスの種別 */
export type AssetClass =
  | 'stock_jp'      // 国内株式
  | 'stock_us'      // 米国株式
  | 'stock_other'   // その他外国株式
  | 'mutual_fund'   // 投資信託
  | 'etf'           // ETF
  | 'crypto'        // 仮想通貨
  | 'deposit'       // 預金・貯金
  | 'bond'          // 債券
  | 'real_estate'   // 不動産
  | 'insurance'     // 保険・個人年金
  | 'other'         // その他

/** 口座種別 */
export type AccountType =
  | 'taxable'       // 特定口座・一般口座
  | 'nisa'          // 旧NISA
  | 'nisa_growth'   // 新NISA 成長投資枠
  | 'nisa_reserve'  // 新NISA つみたて投資枠
  | 'ideco'         // iDeCo
  | 'dc'            // 企業型DC
  | 'bank'          // 銀行口座
  | 'other'         // その他

/** 通貨コード */
export type CurrencyCode = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'BTC' | 'ETH' | 'other'

/** 資産エンティティ */
export interface Asset {
  id: string                     // UUID v4
  name: string                   // 資産名・銘柄名
  ticker?: string                // ティッカーシンボル
  assetClass: AssetClass
  accountType: AccountType
  currency: CurrencyCode
  quantity: number               // 保有数量
  acquisitionPrice: number       // 移動平均取得単価（取引通貨建て）
  currentPrice: number           // 現在価格（取引通貨建て）
  currentPriceJpy: number        // 現在価格（JPY換算）
  currentPriceUpdatedAt?: string // ISO8601
  note?: string
  tags: string[]
  createdAt: string              // ISO8601
  updatedAt: string              // ISO8601
}

/** 資産集計（計算値） */
export interface AssetSummary {
  assetId: string
  totalValue: number             // 評価額合計 (JPY)
  totalCost: number              // 取得額合計 (JPY)
  unrealizedGain: number         // 含み損益 (JPY)
  unrealizedGainRate: number     // 含み損益率 (%)
}

/** 資産クラスの日本語ラベル */
export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock_jp: '国内株式',
  stock_us: '米国株式',
  stock_other: 'その他外国株式',
  mutual_fund: '投資信託',
  etf: 'ETF',
  crypto: '仮想通貨',
  deposit: '預金',
  bond: '債券',
  real_estate: '不動産',
  insurance: '保険・個人年金',
  other: 'その他',
}

/** 口座種別の日本語ラベル */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  taxable: '特定口座・一般口座',
  nisa: '旧NISA',
  nisa_growth: '新NISA（成長投資枠）',
  nisa_reserve: '新NISA（つみたて投資枠）',
  ideco: 'iDeCo',
  dc: '企業型DC',
  bank: '銀行口座',
  other: 'その他',
}
