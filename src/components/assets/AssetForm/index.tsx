/**
 * AssetForm - Dark-styled registration and editing form for assets
 * Uses React Hook Form + Zod validation
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { assetFormSchema, type AssetFormData } from '@/utils/validators'
import { ASSET_CLASS_LABELS, ACCOUNT_TYPE_LABELS } from '@/types/asset.types'
import type { AssetClass, AccountType, CurrencyCode } from '@/types/asset.types'
import { formatJpy, formatUsd, formatQuantity } from '@/utils/formatters'

function formatAssetAmount(value: number, currency: string): string {
  if (currency === 'JPY') return formatJpy(value)
  if (currency === 'USD') return formatUsd(value)
  const formatted = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 8 }).format(value)
  return `${formatted} ${currency}`
}

const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: 'JPY', label: '日本円 (JPY)' },
  { value: 'USD', label: '米ドル (USD)' },
  { value: 'EUR', label: 'ユーロ (EUR)' },
  { value: 'GBP', label: '英ポンド (GBP)' },
  { value: 'BTC', label: 'ビットコイン (BTC)' },
  { value: 'ETH', label: 'イーサリアム (ETH)' },
  { value: 'other', label: 'その他' },
]

export interface AssetFormProps {
  defaultValues?: Partial<AssetFormData>
  onSubmit: (data: AssetFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

interface FieldWrapperProps {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

function FieldWrapper({ label, htmlFor, error, required, children }: FieldWrapperProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium uppercase tracking-widest"
        style={{ color: '#868F97', letterSpacing: '0.08em' }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: '#ef4444' }} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}
    </div>
  )
}

const inputBaseClass = 'input-dark'
const inputErrorClass = 'input-dark input-dark-error'

export function AssetForm({ defaultValues, onSubmit, onCancel, isSubmitting = false }: AssetFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting: formIsSubmitting },
  } = useForm<AssetFormData, unknown, AssetFormData>({
    // Cast resolver to handle the tags type mismatch between zod inference and explicit type
    resolver: zodResolver(assetFormSchema) as Resolver<AssetFormData, unknown, AssetFormData>,
    defaultValues: {
      name: '',
      ticker: '',
      assetClass: 'stock_jp',
      accountType: 'taxable',
      currency: 'JPY',
      quantity: 0,
      acquisitionPrice: 0,
      currentPrice: 0,
      note: '',
      tags: [],
      ...defaultValues,
    },
  })

  const submitting = isSubmitting || formIsSubmitting

  const [watchedQuantity, watchedAcquisitionPrice, watchedCurrentPrice, watchedCurrency] =
    watch(['quantity', 'acquisitionPrice', 'currentPrice', 'currency'])

  const acquisitionTotal = watchedQuantity * watchedAcquisitionPrice
  const currentTotal = watchedQuantity * watchedCurrentPrice

  const handleFormSubmit = handleSubmit(async (data: AssetFormData) => {
    await onSubmit(data)
  })

  return (
    <form onSubmit={(e) => { void handleFormSubmit(e); }} noValidate aria-label="資産登録フォーム">
      <div className="space-y-5">
        {/* Asset name */}
        <FieldWrapper label="資産名" htmlFor="name" error={errors.name?.message} required>
          <input
            id="name"
            type="text"
            placeholder="例: トヨタ自動車、S&P500 ETF"
            aria-required="true"
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
            className={errors.name ? inputErrorClass : inputBaseClass}
          />
        </FieldWrapper>

        {/* Ticker symbol */}
        <FieldWrapper label="ティッカー / 銘柄コード" htmlFor="ticker" error={errors.ticker?.message}>
          <input
            id="ticker"
            type="text"
            placeholder="例: 7203, SPY, BTC"
            {...register('ticker')}
            className={errors.ticker ? inputErrorClass : inputBaseClass}
          />
        </FieldWrapper>

        {/* Asset class and account type - 2 columns */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="資産クラス" htmlFor="assetClass" error={errors.assetClass?.message} required>
            <select
              id="assetClass"
              aria-required="true"
              {...register('assetClass')}
              className={errors.assetClass ? inputErrorClass : inputBaseClass}
            >
              {(Object.entries(ASSET_CLASS_LABELS) as [AssetClass, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="口座種別" htmlFor="accountType" error={errors.accountType?.message} required>
            <select
              id="accountType"
              aria-required="true"
              {...register('accountType')}
              className={errors.accountType ? inputErrorClass : inputBaseClass}
            >
              {(Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FieldWrapper>
        </div>

        {/* Currency */}
        <FieldWrapper label="通貨" htmlFor="currency" error={errors.currency?.message} required>
          <select
            id="currency"
            aria-required="true"
            {...register('currency')}
            className={errors.currency ? inputErrorClass : inputBaseClass}
          >
            {CURRENCY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Quantity, acquisition price, current price - 3 columns */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper label="保有数量" htmlFor="quantity" error={errors.quantity?.message} required>
            <input
              id="quantity"
              type="number"
              step="any"
              min="0"
              aria-required="true"
              {...register('quantity', { valueAsNumber: true })}
              className={errors.quantity ? inputErrorClass : inputBaseClass}
            />
          </FieldWrapper>

          <FieldWrapper label="取得単価" htmlFor="acquisitionPrice" error={errors.acquisitionPrice?.message} required>
            <input
              id="acquisitionPrice"
              type="number"
              step="any"
              min="0"
              aria-required="true"
              {...register('acquisitionPrice', { valueAsNumber: true })}
              className={errors.acquisitionPrice ? inputErrorClass : inputBaseClass}
            />
          </FieldWrapper>

          <FieldWrapper label="現在価格" htmlFor="currentPrice" error={errors.currentPrice?.message} required>
            <input
              id="currentPrice"
              type="number"
              step="any"
              min="0"
              aria-required="true"
              {...register('currentPrice', { valueAsNumber: true })}
              className={errors.currentPrice ? inputErrorClass : inputBaseClass}
            />
          </FieldWrapper>
        </div>

        {/* Computed totals display */}
        <div className="glass-card rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#868F97', letterSpacing: '0.08em' }}>
            評価額（自動計算）
          </p>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: '#868F97' }}>取得総額</span>
            <span className="font-amount">
              {formatQuantity(watchedQuantity)} × {formatAssetAmount(watchedAcquisitionPrice, watchedCurrency)}
              {' = '}
              <span style={{ color: '#FFA16C' }}>{formatAssetAmount(acquisitionTotal, watchedCurrency)}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: '#868F97' }}>評価額</span>
            <span className="font-amount">
              {formatQuantity(watchedQuantity)} × {formatAssetAmount(watchedCurrentPrice, watchedCurrency)}
              {' = '}
              <span style={{ color: '#22c55e' }}>{formatAssetAmount(currentTotal, watchedCurrency)}</span>
            </span>
          </div>
        </div>

        {/* Note */}
        <FieldWrapper label="メモ" htmlFor="note" error={errors.note?.message}>
          <textarea
            id="note"
            rows={3}
            placeholder="任意のメモを入力"
            {...register('note')}
            className={errors.note ? inputErrorClass : inputBaseClass}
          />
        </FieldWrapper>
      </div>

      {/* Form actions */}
      <div className="mt-7 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="btn-ghost"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-accent"
          aria-busy={submitting}
        >
          {submitting ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
