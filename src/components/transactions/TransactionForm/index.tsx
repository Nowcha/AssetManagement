/**
 * TransactionForm - Dark-styled form for recording buy/sell/dividend transactions
 * Uses React Hook Form + Zod validation
 */
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionFormSchema, type TransactionFormData } from '@/utils/validators'
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction.types'
import type { TransactionType } from '@/types/transaction.types'
import { useAssetStore } from '@/store/assetStore'

export interface TransactionFormProps {
  defaultAssetId?: string
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
  defaultAssetId,
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
    formState: { errors, isSubmitting: formIsSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      assetId: defaultAssetId ?? '',
      type: 'buy',
      date: today,
      amount: 0,
    },
  })

  const submitting = isSubmitting || formIsSubmitting
  const selectedType = useWatch({ control, name: 'type' })
  const selectedAssetId = useWatch({ control, name: 'assetId' })

  const showQuantityPrice = QUANTITY_PRICE_TYPES.includes(selectedType)

  // Show exchange rate only for buy/sell on non-JPY assets
  const selectedAsset = assets.find((a) => a.id === selectedAssetId)
  const showExchangeRate =
    FOREIGN_CURRENCY_TYPES.includes(selectedType) &&
    selectedAsset != null &&
    selectedAsset.currency !== 'JPY'

  const handleFormSubmit = handleSubmit(async (data: TransactionFormData) => {
    await onSubmit(data)
  })

  return (
    <form onSubmit={handleFormSubmit} noValidate aria-label="取引登録フォーム">
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
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
                {asset.ticker ? ` (${asset.ticker})` : ''}
              </option>
            ))}
          </select>
        </FieldWrapper>

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
            </FieldWrapper>
          </div>
        )}

        {/* Amount (JPY) */}
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
        </FieldWrapper>

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
        </FieldWrapper>

        {/* Exchange rate (shown only for foreign currency buy/sell) */}
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
              placeholder="例: 150.25"
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
          {submitting ? '記録中...' : '取引を記録'}
        </button>
      </div>
    </form>
  )
}
