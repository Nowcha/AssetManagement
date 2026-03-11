import { z } from 'zod'

/** 資産登録フォームのスキーマ */
export const assetFormSchema = z.object({
  name: z.string().min(1, '資産名を入力してください').max(100, '100文字以内で入力してください'),
  ticker: z.string().max(20, '20文字以内で入力してください').optional(),
  assetClass: z.enum([
    'stock_jp', 'stock_us', 'stock_other', 'mutual_fund', 'etf',
    'crypto', 'deposit', 'bond', 'real_estate', 'insurance', 'other',
  ], { errorMap: () => ({ message: '資産クラスを選択してください' }) }),
  accountType: z.enum([
    'taxable', 'nisa', 'nisa_growth', 'nisa_reserve',
    'ideco', 'dc', 'bank', 'other',
  ], { errorMap: () => ({ message: '口座種別を選択してください' }) }),
  currency: z.enum(['JPY', 'USD', 'EUR', 'GBP', 'BTC', 'ETH', 'other']),
  quantity: z.number({ invalid_type_error: '数量を入力してください' })
    .nonnegative('0以上の数値を入力してください'),
  acquisitionPrice: z.number({ invalid_type_error: '取得単価を入力してください' })
    .nonnegative('0以上の数値を入力してください'),
  currentPrice: z.number({ invalid_type_error: '現在価格を入力してください' })
    .nonnegative('0以上の数値を入力してください'),
  note: z.string().max(500, '500文字以内で入力してください').optional(),
  tags: z.array(z.string()).default([]),
})

// Explicitly define AssetFormData to ensure tags is always string[] (not optional)
export type AssetFormData = {
  name: string
  ticker?: string
  assetClass: 'stock_jp' | 'stock_us' | 'stock_other' | 'mutual_fund' | 'etf' | 'crypto' | 'deposit' | 'bond' | 'real_estate' | 'insurance' | 'other'
  accountType: 'taxable' | 'nisa' | 'nisa_growth' | 'nisa_reserve' | 'ideco' | 'dc' | 'bank' | 'other'
  currency: 'JPY' | 'USD' | 'EUR' | 'GBP' | 'BTC' | 'ETH' | 'other'
  quantity: number
  acquisitionPrice: number
  currentPrice: number
  note?: string
  tags: string[]
}

/** Sentinel value used when the user wants to create a new asset inline from the transaction form */
export const NEW_ASSET_SENTINEL = '__new__'

/** Schema for the inline new-asset fields embedded inside the transaction form */
const newAssetInfoSchema = z.object({
  name: z.string().min(1, '資産名を入力してください').max(100, '100文字以内で入力してください'),
  ticker: z.string().max(20, '20文字以内で入力してください').optional(),
  assetClass: z.enum([
    'stock_jp', 'stock_us', 'stock_other', 'mutual_fund', 'etf',
    'crypto', 'deposit', 'bond', 'real_estate', 'insurance', 'other',
  ], { errorMap: () => ({ message: '資産クラスを選択してください' }) }),
  accountType: z.enum([
    'taxable', 'nisa', 'nisa_growth', 'nisa_reserve',
    'ideco', 'dc', 'bank', 'other',
  ], { errorMap: () => ({ message: '口座種別を選択してください' }) }),
  currency: z.enum(['JPY', 'USD', 'EUR', 'GBP', 'BTC', 'ETH', 'other']),
  note: z.string().max(500, '500文字以内で入力してください').optional(),
})

export type NewAssetInfo = z.infer<typeof newAssetInfoSchema>

/** 取引登録フォームのスキーマ */
export const transactionFormSchema = z.object({
  /** Existing asset UUID, or NEW_ASSET_SENTINEL ('__new__') for inline creation */
  assetId: z.string().refine(
    (val) => val === NEW_ASSET_SENTINEL || val.length > 0,
    { message: '資産を選択してください' },
  ),
  /** Present only when assetId === NEW_ASSET_SENTINEL */
  newAssetInfo: newAssetInfoSchema.optional(),
  type: z.enum(['buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'transfer', 'split', 'fee']),
  date: z.string().min(1, '日付を入力してください'),
  quantity: z.number().positive('0より大きい数値を入力してください').optional(),
  price: z.number().nonnegative('0以上の数値を入力してください').optional(),
  amount: z.number({ invalid_type_error: '金額を入力してください' })
    .nonnegative('0以上の数値を入力してください'),
  fee: z.number().nonnegative().optional(),
  exchangeRate: z.number().positive().optional(),
  note: z.string().max(500).optional(),
})

export type TransactionFormData = z.infer<typeof transactionFormSchema>

/** パスワードフォームのスキーマ */
export const passwordFormSchema = z.object({
  password: z.string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, '128文字以内で入力してください'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
})

export type PasswordFormData = z.infer<typeof passwordFormSchema>
