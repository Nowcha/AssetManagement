/**
 * Performance page - individual asset performance table, bar chart, and realized gain summary
 */
import { useState, useMemo } from 'react'
import { useAssetStore } from '@/store/assetStore'
import { useTransactionStore } from '@/store/transactionStore'
import { calcAssetSummary, calcRealizedGainForYear } from '@/utils/calculations'
import { formatJpy, formatGainRate, formatGainJpy } from '@/utils/formatters'
import { ASSET_CLASS_LABELS, ACCOUNT_TYPE_LABELS } from '@/types/asset.types'
import type { Asset } from '@/types/asset.types'
import type { AssetSummary } from '@/types/asset.types'
import { PerformanceBar } from '@/components/charts/PerformanceBar'

type SortKey = 'name' | 'assetClass' | 'totalValue' | 'totalCost' | 'unrealizedGain' | 'unrealizedGainRate'
type SortOrder = 'asc' | 'desc'
type RealizedGainPeriod = 'thisYear' | 'lastYear' | 'all'

const REALIZED_GAIN_PERIOD_OPTIONS: { value: RealizedGainPeriod; label: string }[] = [
  { value: 'thisYear', label: '今年' },
  { value: 'lastYear', label: '昨年' },
  { value: 'all', label: '全期間' },
]

function getSortValue(asset: Asset, summary: AssetSummary, key: SortKey): number | string {
  switch (key) {
    case 'name': return asset.name
    case 'assetClass': return ASSET_CLASS_LABELS[asset.assetClass]
    case 'totalValue': return summary.totalValue
    case 'totalCost': return summary.totalCost
    case 'unrealizedGain': return summary.unrealizedGain
    case 'unrealizedGainRate': return summary.unrealizedGainRate
    default: return ''
  }
}

export function Performance() {
  const { assets } = useAssetStore()
  const { transactions } = useTransactionStore()

  const [sortKey, setSortKey] = useState<SortKey>('unrealizedGainRate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [realizedGainPeriod, setRealizedGainPeriod] = useState<RealizedGainPeriod>('thisYear')

  const summaries = useMemo(() => assets.map(calcAssetSummary), [assets])

  const sortedData = useMemo(() => {
    return [...assets]
      .map((asset) => ({ asset, summary: calcAssetSummary(asset) }))
      .sort((a, b) => {
        const aVal = getSortValue(a.asset, a.summary, sortKey)
        const bVal = getSortValue(b.asset, b.summary, sortKey)
        const cmp =
          typeof aVal === 'string' && typeof bVal === 'string'
            ? aVal.localeCompare(bVal, 'ja')
            : (aVal as number) - (bVal as number)
        return sortOrder === 'asc' ? cmp : -cmp
      })
  }, [assets, sortKey, sortOrder])

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
        return Array.from(years).reduce(
          (sum, y) => sum + calcRealizedGainForYear(transactions, y),
          0,
        )
      }
    }
  }, [transactions, realizedGainPeriod])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return null
    return (
      <span aria-hidden="true" className="ml-1 text-[10px]" style={{ color: '#FFA16C' }}>
        {sortOrder === 'asc' ? '▲' : '▼'}
      </span>
    )
  }

  function SortTh({
    col,
    children,
    align = 'left',
  }: {
    col: SortKey
    children: React.ReactNode
    align?: 'left' | 'right'
  }) {
    return (
      <th
        scope="col"
        className="cursor-pointer select-none"
        style={{ textAlign: align }}
        onClick={() => { handleSort(col); }}
        aria-sort={
          sortKey === col ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'
        }
      >
        <span className="hover:text-white transition-colors">
          {children}
          <SortIndicator col={col} />
        </span>
      </th>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="animate-fade-in">
        <h2 className="mb-6 text-xl font-semibold text-white">パフォーマンス</h2>
        <div className="glass-card p-8 text-center">
          <p style={{ color: '#868F97' }}>資産が登録されていません</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-white">パフォーマンス</h2>

      {/* Individual asset performance table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#868F97' }}>
            個別資産 騰落率
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table
            className="data-table w-full table-auto"
            role="table"
            aria-label="個別資産パフォーマンス"
          >
            <thead>
              <tr>
                <SortTh col="name">資産名</SortTh>
                <SortTh col="assetClass">クラス</SortTh>
                <SortTh col="totalValue" align="right">評価額</SortTh>
                <SortTh col="totalCost" align="right">取得額</SortTh>
                <SortTh col="unrealizedGain" align="right">含み損益</SortTh>
                <SortTh col="unrealizedGainRate" align="right">損益率</SortTh>
                <th scope="col">口座</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(({ asset, summary }) => {
                const gainColor =
                  summary.unrealizedGain > 0
                    ? '#22c55e'
                    : summary.unrealizedGain < 0
                      ? '#ef4444'
                      : '#868F97'
                return (
                  <tr key={asset.id}>
                    <td>
                      <div className="font-medium text-white">{asset.name}</div>
                      {asset.ticker && (
                        <div className="mt-0.5 text-xs" style={{ color: '#4B5563' }}>
                          {asset.ticker}
                        </div>
                      )}
                    </td>
                    <td style={{ color: '#868F97' }}>
                      {ASSET_CLASS_LABELS[asset.assetClass]}
                    </td>
                    <td className="text-right font-amount font-medium text-white">
                      {formatJpy(summary.totalValue)}
                    </td>
                    <td className="text-right font-amount" style={{ color: '#868F97' }}>
                      {formatJpy(summary.totalCost)}
                    </td>
                    <td className="text-right font-amount font-medium" style={{ color: gainColor }}>
                      {formatGainJpy(summary.unrealizedGain)}
                    </td>
                    <td className="text-right font-amount font-semibold" style={{ color: gainColor }}>
                      {formatGainRate(summary.unrealizedGainRate)}
                    </td>
                    <td style={{ color: '#868F97' }}>
                      {ACCOUNT_TYPE_LABELS[asset.accountType]}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance bar chart */}
      <div className="glass-card p-5">
        <h3
          className="mb-4 text-sm font-semibold uppercase tracking-widest"
          style={{ color: '#868F97' }}
        >
          資産別パフォーマンス棒グラフ
        </h3>
        <PerformanceBar assets={assets} summaries={summaries} />
      </div>

      {/* Realized gain summary */}
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: '#868F97' }}
          >
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
    </div>
  )
}
