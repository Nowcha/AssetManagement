/**
 * TransactionForm - Dark-styled form for recording/editing buy/sell/dividend transactions.
 * - Supports inline new-asset creation via "＋ 新規資産として記録".
 * - Accepts defaultValues for editing existing transactions (isEditing=true hides the new-asset option).
 * - Shows comma-formatted helper text under numeric inputs.
 * - Exchange rate and fee are optional.
 * Uses React Hook Form + Zod validation with shouldUnregister: true.
 */
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionFormSchema, NEW_ASSET_SENTINEL, type TransactionFormData } from '@/utils/validators'
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction.types'
import { ASSET_CLASS_LABELS, ACCOUNT_TYPE_LABELS } from '@/types/asset.types'
import type { TransactionType } from '@/types/transaction.types'
import { useAssetStore } from '@/store/assetStore'
import { formatJpy, formatQuantity } from '@/utils/formatters'

export interface TransactionFormProps {
  /** Pre-populate form for editing an existing transaction */
  defaultValues?: Partial<TransactionFormData>
  /** Shorthand to pre-select an asset (ignored when defaultValues.assetId is set) */
  defaultAssetId?: string
  /** When true, hides the "新規資産として記録" option */
  isEditing?: boolean
  onSubmit: (data: TransactionFormData) => Promise<void>
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

/** Small right-aligned formatted value hint shown below a number input */
function NumericHint({ value, formatter }: { value: number; formatter: (v: number) => string }) {
  if (!value || isNaN(value)) return null
  return (
    <p className="mt-1 text-right text-xs" style={{ color: '#868F97' }}>
      {formatter(value)}
    </p>
  )
}

const inputBaseClass = 'input-dark'
const inputErrorClass = 'input-dark input-dark-error'

const TRANSACTION_TYPE_OPTIONS: { value: TransactionType; label: string }[] = (
  Object.entries(TRANSACTION_TYPE_LABELS) as [TransactionType, string][]
).map(([value, label]) => ({ value, label }))

/** Types that require quantity and price fields */
const QUANTITY_PRICE_TYPES: TransactionType[] = ['buy', 'sell', 'split']

/** Types that require foreign currency exchange rate */
const FOREIGN_CURRENCY_TYPES: TransactionType[] = ['buy', 'sell']

export function TransactionForm({
  defaultValues,
  defaultAssetId,
  isEditing = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TransactionFormProps) {
  const { assets } = useAssetStore()

  const today = new Date().toISOString().slice(0, 10)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting: formIsSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    shouldUnregister: true,
    defaultValues: {
      assetId: defaultValues?.assetId ?? defaultAssetId ?? '',
      type: defaultValues?.type ?? 'buy',
      date: defaultValues?.date ?? today,
      amount: defaultValues?.amount ?? 0,
      quantity: defaultValues?.quantity,
      price: defaultValues?.price,
      fee: defaultValues?.fee,
      exchangeRate: defaultValues?.exchangeRate,
      note: defaultValues?.note ?? '',
    },
  })

  const submitting = isSubmitting || formIsSubmitting
  const selectedType = useWatch({ control, name: 'type' })
  const selectedAssetId = useWatch({ control, name: 'assetId' })
  const watchedQuantity = useWatch({ control, name: 'quantity' })
  const watchedPrice = useWatch({ control, name: 'price' })
  const watchedExchangeRate = useWatch({ control, name: 'exchangeRate' })
  const watchedAmount = useWatch({ control, name: 'amount' })
  const watchedFee = useWatch({ control, name: 'fee' })
  const watchedNewCurrency = useWatch({ control, name: 'newAssetInfo.currency' })

  const isNewAsset = selectedAssetId === NEW_ASSET_SENTINEL
  const showQuantityPrice = QUANTITY_PRICE_TYPES.includes(selectedType)

  // Determine effective currency for exchange rate visibility
  const selectedAsset = assets.find((a) => a.id === selectedAssetId)
  const effectiveCurrency = isNewAsset
    ? (watchedNewCurrency ?? 'JPY')
    : (selectedAsset?.currency ?? 'JPY')

  const showExchangeRate =
    FOREIGN_CURRENCY_TYPES.includes(selectedType) &&
    (isNewAsset || selectedAsset != null) &&
    effectiveCurrency !== 'JPY'

  // Auto-compute amount (JPY) from quantity × price [× exchangeRate] for buy/sell/split
  const qty = watchedQuantity ?? 0
  const prc = watchedPrice ?? 0
  const rate = watchedExchangeRate ?? 0
  const computedAmount = showExchangeRate && rate > 0
    ? qty * prc * rate
    : qty * prc

  useEffect(() => {
    if (!showQuantityPrice) return
    setValue('amount', computedAmount, { shouldValidate: false })
  }, [showQuantityPrice, computedAmount, setValue])

  const handleFormSubmit = handleSubmit(async (data: TransactionFormData) => {
    await onSubmit(data)
  })

  return (
    <form onSubmit={(e) => { void handleFormSubmit(e); }} noValidate aria-label="取引登録フォーム">
      <div className="space-y-5">
        {/* Asset selection */}
        <FieldWrapper label="資産" htmlFor="assetId" error={errors.assetId?.message} required>
          <select
            id="assetId"
            aria-required="true"
            {...register('assetId')}
            className={errors.assetId ? inputErrorClass : inputBaseClass}
          >
            <option value="">-- 資産を選択 --</option>
            {!isEditing && (
              <option value={NEW_ASSET_SENTINEL}>＋ 新規資産として記録</option>
            )}
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
                {asset.ticker ? ` (${asset.ticker})` : ''}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Inline new-asset fields (shown only when creating a new asset) */}
        {isNewAsset && (
          <div
            className="glass-card space-y-4 rounded-lg p-4"
            style={{ borderLeft: '2px solid #FFA16C' }}
          >
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: '#FFA16C', letterSpacing: '0.08em' }}>
              新規資産情報
            </p>

            <FieldWrapper label="資産名" htmlFor="newAssetInfo.name" error={errors.newAssetInfo?.name?.message} required>
              <input
                id="newAssetInfo.name"
                type="text"
                placeholder="例: トヨタ自動車、eMAXIS Slim 全世界株式"
                aria-required="true"
                {...register('newAssetInfo.name')}
                className={errors.newAssetInfo?.name ? inputErrorClass : inputBaseClass}
              />
            </FieldWrapper>

            <FieldWrapper label="ティッカー / コード" htmlFor="newAssetInfo.ticker" error={errors.newAssetInfo?.ticker?.message}>
              <input
                id="newAssetInfo.ticker"
                type="text"
                placeholder="例: 7203.T、AAPL（任意）"
                {...register('newAssetInfo.ticker')}
                className={errors.newAssetInfo?.ticker ? inputErrorClass : inputBaseClass}
              />
            </FieldWrapper>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrapper label="資産クラス" htmlFor="newAssetInfo.assetClass" error={errors.newAssetInfo?.assetClass?.message} required>
                <select
                  id="newAssetInfo.assetClass"
                  aria-required="true"
                  {...register('newAssetInfo.assetClass')}
                  className={errors.newAssetInfo?.assetClass ? inputErrorClass : inputBaseClass}
                >
                  <option value="">-- 選択 --</option>
                  {Object.entries(ASSET_CLASS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FieldWrapper>

              <FieldWrapper label="口座種別" htmlFor="newAssetInfo.accountType" error={errors.newAssetInfo?.accountType?.message} required>
                <select
                  id="newAssetInfo.accountType"
                  aria-required="true"
                  {...register('newAssetInfo.accountType')}
                  className={errors.newAssetInfo?.accountType ? inputErrorClass : inputBaseClass}
                >
                  <option value="">-- 選択 --</option>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FieldWrapper>
            </div>

            <FieldWrapper label="通貨" htmlFor="newAssetInfo.currency" error={errors.newAssetInfo?.currency?.message} required>
              <select
                id="newAssetInfo.currency"
                aria-required="true"
                {...register('newAssetInfo.currency')}
                className={errors.newAssetInfo?.currency ? inputErrorClass : inputBaseClass}
              >
                <option value="">-- 選択 --</option>
                <option value="JPY">JPY（円）</option>
                <option value="USD">USD（米ドル）</option>
                <option value="EUR">EUR（ユーロ）</option>
                <option value="GBP">GBP（英ポンド）</option>
                <option value="BTC">BTC（ビットコイン）</option>
                <option value="ETH">ETH（イーサリアム）</option>
                <option value="other">その他</option>
              </select>
            </FieldWrapper>
          </div>
        )}

        {/* Transaction type */}
        <FieldWrapper label="取引種別" htmlFor="type" error={errors.type?.message} required>
          <select
            id="type"
            aria-required="true"
            {...register('type')}
            className={errors.type ? inputErrorClass : inputBaseClass}
          >
            {TRANSACTION_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FieldWrapper>

        {/* Transaction date */}
        <FieldWrapper label="取引日" htmlFor="date" error={errors.date?.message} required>
          <input
            id="date"
            type="date"
            aria-required="true"
            {...register('date')}
            className={errors.date ? inputErrorClass : inputBaseClass}
          />
        </FieldWrapper>

        {/* Quantity and price (buy/sell/split only) */}
        {showQuantityPrice && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrapper label="数量" htmlFor="quantity" error={errors.quantity?.message} required>
              <input
                id="quantity"
                type="number"
                step="any"
                min="0"
                aria-required="true"
                {...register('quantity', { valueAsNumber: true })}
                className={errors.quantity ? inputErrorClass : inputBaseClass}
              />
              <NumericHint value={qty} formatter={(v) => formatQuantity(v)} />
            </FieldWrapper>

            <FieldWrapper label="単価" htmlFor="price" error={errors.price?.message} required>
              <input
                id="price"
                type="number"
                step="any"
                min="0"
                aria-required="true"
                {...register('price', { valueAsNumber: true })}
                className={errors.price ? inputErrorClass : inputBaseClass}
              />
              <NumericHint value={prc} formatter={(v) => formatQuantity(v, 2)} />
            </FieldWrapper>
          </div>
        )}

        {/* Amount (JPY) - auto-computed for buy/sell/split, manual for other types */}
        {showQuantityPrice ? (
          <>
            {/* Hidden registered input keeps the value in sync for form submission */}
            <input type="hidden" {...register('amount', { valueAsNumber: true })} />
            {/* Computed display */}
            <div className="glass-card rounded-lg p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest" style={{ color: '#868F97', letterSpacing: '0.08em' }}>
                金額（自動計算）
              </p>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#868F97' }}>
                  {showExchangeRate
                    ? `${formatQuantity(qty)} × ${prc.toLocaleString('ja-JP')} × ${rate > 0 ? rate.toLocaleString('ja-JP') : '—'} 円/外貨`
                    : `${formatQuantity(qty)} × ${prc.toLocaleString('ja-JP')}`}
                </span>
                <span className="font-amount text-base" style={{ color: '#FFA16C' }}>
                  {formatJpy(computedAmount)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <FieldWrapper label="金額 (JPY)" htmlFor="amount" error={errors.amount?.message} required>
            <input
              id="amount"
              type="number"
              step="any"
              min="0"
              aria-required="true"
              {...register('amount', { valueAsNumber: true })}
              className={errors.amount ? inputErrorClass : inputBaseClass}
            />
            <NumericHint value={watchedAmount} formatter={formatJpy} />
          </FieldWrapper>
        )}

        {/* Fee */}
        <FieldWrapper label="手数料 (JPY)" htmlFor="fee" error={errors.fee?.message}>
          <input
            id="fee"
            type="number"
            step="any"
            min="0"
            placeholder="任意"
            {...register('fee', { valueAsNumber: true })}
            className={errors.fee ? inputErrorClass : inputBaseClass}
          />
          <NumericHint value={watchedFee ?? 0} formatter={formatJpy} />
        </FieldWrapper>

        {/* Exchange rate (shown only for foreign currency buy/sell) — optional */}
        {showExchangeRate && (
          <FieldWrapper
            label="為替レート (円/外貨)"
            htmlFor="exchangeRate"
            error={errors.exchangeRate?.message}
          >
            <input
              id="exchangeRate"
              type="number"
              step="any"
              min="0"
              placeholder="任意 — 例: 150.25"
              {...register('exchangeRate', { valueAsNumber: true })}
              className={errors.exchangeRate ? inputErrorClass : inputBaseClass}
            />
          </FieldWrapper>
        )}

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
          {submitting ? '記録中...' : isEditing ? '取引を更新' : '取引を記録'}
        </button>
      </div>
    </form>
  )
}
