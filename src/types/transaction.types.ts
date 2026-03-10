/** 取引種別 */
export type TransactionType =
  | 'buy'        // 買付
  | 'sell'       // 売却
  | 'dividend'   // 配当・分配金
  | 'deposit'    // 入金
  | 'withdrawal' // 出金
  | 'transfer'   // 振替
  | 'split'      // 株式分割
  | 'fee'        // 手数料

/** 取引履歴エンティティ */
export interface Transaction {
  id: string
  assetId: string
  type: TransactionType
  date: string             // ISO8601 date (YYYY-MM-DD)
  quantity?: number        // 数量（買付・売却時）
  price?: number           // 単価（取引通貨建て）
  amount: number           // 金額（JPY換算）
  fee?: number             // 手数料（JPY）
  exchangeRate?: number    // 為替レート（外貨取引時）
  note?: string
  createdAt: string
  updatedAt: string
}

/** 取引種別の日本語ラベル */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  buy: '買付',
  sell: '売却',
  dividend: '配当・分配金',
  deposit: '入金',
  withdrawal: '出金',
  transfer: '振替',
  split: '株式分割',
  fee: '手数料',
}
