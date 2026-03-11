/**
 * TransactionList - Filterable transaction history table with realized gain summary
 */
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactionStore } from '@/store/transactionStore'
import { useAssetStore } from '@/store/assetStore'
import { useUiStore } from '@/store/uiStore'
import { useTransactions } from '@/hooks/useTransactions'
import { Modal } from '@/components/common/Modal'
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction.types'
import type { TransactionType, Transaction } from '@/types/transaction.types'
import { calcRealizedGainForYear } from '@/utils/calculations'
import { formatJpy, formatDate, formatQuantity } from '@/utils/formatters'

type PeriodFilter = 'thisMonth' | '3months' | '6months' | 'thisYear' | 'all'
type RealizedGainPeriod = 'thisYear' | 'lastYear' | 'all'

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'thisMonth', label: '今月' },
  { value: '3months', label: '3ヶ月' },
  { value: '6months', label: '6ヶ月' },
  { value: 'thisYear', label: '今年' },
  { value: 'all', label: '全期間' },
]

const REALIZED_GAIN_PERIOD_OPTIONS: { value: RealizedGainPeriod; label: string }[] = [
  { value: 'thisYear', label: '今年' },
  { value: 'lastYear', label: '昨年' },
  { value: 'all', label: '全期間' },
]

function getTypeLabel(type: TransactionType): string {
  return TRANSACTION_TYPE_LABELS[type]
}

const TYPE_BADGE_COLORS: Partial<Record<TransactionType, { bg: string; text: string }>> = {
  buy: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  sell: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  dividend: { bg: 'rgba(255,161,108,0.15)', text: '#FFA16C' },
  deposit: { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa' },
  withdrawal: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  transfer: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
  split: { bg: 'rgba(134,143,151,0.15)', text: '#868F97' },
  fee: { bg: 'rgba(134,143,151,0.12)', text: '#868F97' },
}

function TypeBadge({ type }: { type: TransactionType }) {
  const colors = TYPE_BADGE_COLORS[type] ?? { bg: 'rgba(134,143,151,0.12)', text: '#868F97' }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {getTypeLabel(type)}
    </span>
  )
}

function filterByPeriod(transactions: Transaction[], period: PeriodFilter): Transaction[] {
  if (period === 'all') return transactions

  const now = new Date()
  let cutoff: Date

  switch (period) {
    case 'thisMonth':
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case '3months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      break
    case '6months':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      break
    case 'thisYear':
      cutoff = new Date(now.getFullYear(), 0, 1)
      break
  }

  return transactions.filter((tx) => new Date(tx.date) >= cutoff)
}

export function TransactionList() {
  const navigate = useNavigate()
  const { transactions } = useTransactionStore()
  const { assets } = useAssetStore()
  const { openModal, closeModal, activeModal, modalPayload } = useUiStore()
  const { removeTransactionAndUpdateAsset } = useTransactions()

  const [assetFilter, setAssetFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const [realizedGainPeriod, setRealizedGainPeriod] = useState<RealizedGainPeriod>('thisYear')
  const [isDeleting, setIsDeleting] = useState(false)

  const assetMap = useMemo(
    () => new Map(assets.map((a) => [a.id, a.name])),
    [assets],
  )

  const filteredTransactions = useMemo(() => {
    let result = [...transactions]

    if (assetFilter !== 'all') {
      result = result.filter((tx) => tx.assetId === assetFilter)
    }
    if (typeFilter !== 'all') {
      result = result.filter((tx) => tx.type === typeFilter)
    }
    result = filterByPeriod(result, periodFilter)

    // Sort newest first
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, assetFilter, typeFilter, periodFilter])

  const realizedGain = useMemo(() => {
    const now = new Date()
    const thisYear = now.getFullYear()

    switch (realizedGainPeriod) {
      case 'thisYear':
        return calcRealizedGainForYear(transactions, thisYear)
      case 'lastYear':
        return calcRealizedGainForYear(transactions, thisYear - 1)
      case 'all': {
        const years = new Set(transactions.map((tx) => new Date(tx.date).getFullYear()))
        return Array.from(years).reduce((sum, y) => sum + calcRealizedGainForYear(transactions, y), 0)
      }
    }
  }, [transactions, realizedGainPeriod])

  const handleDeleteClick = useCallback((tx: Transaction) => {
    openModal('transaction-delete', tx)
  }, [openModal])

  const handleDeleteConfirm = useCallback(async () => {
    const tx = modalPayload as Transaction | null
    if (!tx) return
    setIsDeleting(true)
    try {
      await removeTransactionAndUpdateAsset(tx.id)
    } finally {
      setIsDeleting(false)
      closeModal()
    }
  }, [modalPayload, removeTransactionAndUpdateAsset, closeModal])

  if (transactions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl py-16"
        style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
      >
        <p className="text-base" style={{ color: '#868F97' }}>取引が記録されていません</p>
        <p className="mt-2 text-sm" style={{ color: '#4B5563' }}>
          「取引を記録」ボタンから最初の取引を登録してください
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-3">
        {/* Asset filter */}
        <select
          value={assetFilter}
          onChange={(e) => { setAssetFilter(e.target.value); }}
          className="input-dark"
          style={{ width: 'auto', minWidth: '160px' }}
          aria-label="資産フィルター"
        >
          <option value="all">全資産</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); }}
          className="input-dark"
          style={{ width: 'auto', minWidth: '140px' }}
          aria-label="取引種別フィルター"
        >
          <option value="all">全種別</option>
          {(Object.entries(TRANSACTION_TYPE_LABELS) as [TransactionType, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>

        {/* Period filter */}
        <select
          value={periodFilter}
          onChange={(e) => { setPeriodFilter(e.target.value as PeriodFilter); }}
          className="input-dark"
          style={{ width: 'auto', minWidth: '120px' }}
          aria-label="期間フィルター"
        >
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Transaction table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full table-auto" role="table" aria-label="取引履歴一覧">
            <thead>
              <tr>
                <th scope="col">取引日</th>
                <th scope="col">資産名</th>
                <th scope="col">種別</th>
                <th scope="col" style={{ textAlign: 'right' }}>数量</th>
                <th scope="col" style={{ textAlign: 'right' }}>単価</th>
                <th scope="col" style={{ textAlign: 'right' }}>金額 (JPY)</th>
                <th scope="col" style={{ textAlign: 'right' }}>手数料</th>
                <th scope="col">メモ</th>
                <th scope="col" style={{ textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center" style={{ color: '#868F97' }}>
                    フィルター条件に一致する取引がありません
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ color: '#868F97' }}>{formatDate(tx.date)}</td>
                    <td>
                      <span className="font-medium text-white">
                        {assetMap.get(tx.assetId) ?? tx.assetId}
                      </span>
                    </td>
                    <td>
                      <TypeBadge type={tx.type} />
                    </td>
                    <td className="text-right font-amount" style={{ color: '#ffffff' }}>
                      {tx.quantity != null ? formatQuantity(tx.quantity) : '—'}
                    </td>
                    <td className="text-right font-amount" style={{ color: '#868F97' }}>
                      {tx.price != null ? formatQuantity(tx.price, 2) : '—'}
                    </td>
                    <td className="text-right font-amount font-medium text-white">
                      {formatJpy(tx.amount)}
                    </td>
                    <td className="text-right font-amount" style={{ color: '#868F97' }}>
                      {tx.fee != null ? formatJpy(tx.fee) : '—'}
                    </td>
                    <td
                      style={{
                        color: '#868F97',
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {tx.note ?? ''}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => { navigate(`/transactions/${tx.id}/edit`); }}
                          className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                          style={{
                            color: '#FFA16C',
                            background: 'rgba(255,161,108,0.08)',
                          }}
                          aria-label="取引を編集"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleDeleteClick(tx); }}
                          className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                          style={{
                            color: '#ef4444',
                            background: 'rgba(239,68,68,0.08)',
                          }}
                          aria-label="取引を削除"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Realized gain summary */}
      <div className="mt-6 glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#868F97' }}>
            確定損益サマリー
          </h3>
          <div className="flex gap-1">
            {REALIZED_GAIN_PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setRealizedGainPeriod(value); }}
                className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                style={
                  realizedGainPeriod === value
                    ? { background: 'rgba(255,161,108,0.2)', color: '#FFA16C' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#868F97' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: '#868F97' }}>
            売却・配当合計
          </span>
          <span
            className="text-2xl font-bold font-amount"
            style={{ color: realizedGain >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {realizedGain >= 0 ? '+' : ''}
            {formatJpy(realizedGain)}
          </span>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={activeModal === 'transaction-delete'}
        title="取引を削除しますか？"
        onConfirm={() => { void handleDeleteConfirm(); }}
        onCancel={closeModal}
        confirmLabel={isDeleting ? '削除中...' : '削除する'}
        cancelLabel="キャンセル"
        confirmVariant="danger"
      >
        <p>この取引を削除すると、資産の保有数量・取得単価が自動的に再計算されます。</p>
        <p className="mt-2 text-sm" style={{ color: '#868F97' }}>この操作は取り消せません。</p>
      </Modal>
    </>
  )
}
