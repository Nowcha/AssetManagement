/**
 * Reports page - 年間損益レポート・資産パフォーマンス一覧
 */
import { useState, useMemo } from 'react'
import { useAssetStore } from '@/store/assetStore'
import { useTransactionStore } from '@/store/transactionStore'
import { calcAssetSummary } from '@/utils/calculations'
import { exportAssetsToCSV, exportTransactionsToCSV } from '@/utils/csv'
import { formatJpy, formatGainJpy, formatGainRate, formatDate } from '@/utils/formatters'
import { ASSET_CLASS_LABELS } from '@/types/asset.types'
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAvailableYears(dates: string[]): number[] {
  const years = new Set(dates.map((d) => new Date(d).getFullYear()))
  return Array.from(years).sort((a, b) => b - a)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ title, action, children }: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-sm font-semibold text-white">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function Reports() {
  const { assets } = useAssetStore()
  const { transactions } = useTransactionStore()

  const availableYears = useMemo(() => {
    const txDates = transactions.map((t) => t.date)
    const years = getAvailableYears(txDates)
    if (years.length === 0) {
      return [new Date().getFullYear()]
    }
    return years
  }, [transactions])

  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[0] ?? new Date().getFullYear(),
  )

  // 年間取引サマリー
  const yearlyStats = useMemo(() => {
    const yearTxs = transactions.filter(
      (t) => new Date(t.date).getFullYear() === selectedYear,
    )

    const buyAmount = yearTxs
      .filter((t) => t.type === 'buy')
      .reduce((sum, t) => sum + t.amount, 0)

    const sellAmount = yearTxs
      .filter((t) => t.type === 'sell')
      .reduce((sum, t) => sum + t.amount, 0)

    const dividendAmount = yearTxs
      .filter((t) => t.type === 'dividend')
      .reduce((sum, t) => sum + t.amount, 0)

    const feeAmount = yearTxs
      .filter((t) => t.type === 'fee')
      .reduce((sum, t) => sum + t.amount, 0)

    const txCount = yearTxs.length

    // 確定損益: 売却金額 - 関連する買付コスト（簡易計算）
    const realizedGain = sellAmount + dividendAmount - feeAmount

    return { buyAmount, sellAmount, dividendAmount, feeAmount, realizedGain, txCount, yearTxs }
  }, [transactions, selectedYear])

  // 資産パフォーマンステーブル
  const assetPerformance = useMemo(() => {
    return assets.map((asset) => {
      const summary = calcAssetSummary(asset)
      return { asset, summary }
    }).sort((a, b) => b.summary.totalValue - a.summary.totalValue)
  }, [assets])

  // クラス別集計
  const classSummary = useMemo(() => {
    const map = new Map<string, { value: number; cost: number; gain: number }>()

    for (const { asset, summary } of assetPerformance) {
      const key = asset.assetClass
      const existing = map.get(key) ?? { value: 0, cost: 0, gain: 0 }
      map.set(key, {
        value: existing.value + summary.totalValue,
        cost: existing.cost + summary.totalCost,
        gain: existing.gain + summary.unrealizedGain,
      })
    }

    return Array.from(map.entries())
      .map(([cls, s]) => ({
        cls,
        label: ASSET_CLASS_LABELS[cls as keyof typeof ASSET_CLASS_LABELS] ?? cls,
        ...s,
        gainRate: s.cost !== 0 ? (s.gain / s.cost) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [assetPerformance])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">レポート</h2>

        {/* CSVエクスポート */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportAssetsToCSV(assets)}
            className="btn-ghost text-xs"
            disabled={assets.length === 0}
          >
            資産CSV
          </button>
          <button
            type="button"
            onClick={() => exportTransactionsToCSV(transactions)}
            className="btn-ghost text-xs"
            disabled={transactions.length === 0}
          >
            取引CSV
          </button>
        </div>
      </div>

      {/* ── 年度切替 ── */}
      <div className="flex items-center gap-3">
        <p className="text-sm" style={{ color: '#868F97' }}>
          対象年度:
        </p>
        <div className="flex gap-2">
          {availableYears.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setSelectedYear(y)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              style={
                selectedYear === y
                  ? { background: '#FFA16C', color: '#000' }
                  : { background: 'rgba(255,255,255,0.06)', color: '#868F97' }
              }
            >
              {y}年
            </button>
          ))}
        </div>
      </div>

      {/* ── 年間損益サマリー ── */}
      <SectionCard title={`${selectedYear}年 取引サマリー`}>
        <div className="grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {[
            { label: '買付合計', value: formatJpy(yearlyStats.buyAmount), color: '#60a5fa' },
            { label: '売却合計', value: formatJpy(yearlyStats.sellAmount), color: '#fff' },
            { label: '配当・分配金', value: formatJpy(yearlyStats.dividendAmount), color: '#22c55e' },
            { label: '手数料合計', value: formatJpy(yearlyStats.feeAmount), color: '#ef4444' },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 text-center"
              style={{ background: '#090909' }}
            >
              <p className="mb-1 text-xs" style={{ color: '#868F97' }}>
                {item.label}
              </p>
              <p className="font-amount text-base font-semibold" style={{ color: item.color }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs" style={{ color: '#868F97' }}>
              取引件数: {yearlyStats.txCount}件
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#868F97' }}>
              確定収益（売却+配当-手数料）
            </p>
            <p
              className="font-amount text-lg font-bold"
              style={{ color: yearlyStats.realizedGain >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {formatGainJpy(yearlyStats.realizedGain)}
            </p>
          </div>
        </div>

        {/* 年間取引リスト（最新20件） */}
        {yearlyStats.yearTxs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="data-table w-full" aria-label="年間取引履歴">
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left' }}>日付</th>
                  <th scope="col" style={{ textAlign: 'left' }}>種別</th>
                  <th scope="col" style={{ textAlign: 'left' }}>資産</th>
                  <th scope="col" style={{ textAlign: 'right' }}>金額</th>
                </tr>
              </thead>
              <tbody>
                {yearlyStats.yearTxs
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 20)
                  .map((tx) => {
                    const asset = assets.find((a) => a.id === tx.assetId)
                    return (
                      <tr key={tx.id}>
                        <td className="text-ink-secondary">{formatDate(tx.date)}</td>
                        <td>
                          <span
                            className="rounded px-1.5 py-0.5 text-xs"
                            style={{
                              background:
                                tx.type === 'buy'
                                  ? 'rgba(96,165,250,0.12)'
                                  : tx.type === 'sell'
                                    ? 'rgba(239,68,68,0.12)'
                                    : tx.type === 'dividend'
                                      ? 'rgba(34,197,94,0.12)'
                                      : 'rgba(255,255,255,0.06)',
                              color:
                                tx.type === 'buy'
                                  ? '#60a5fa'
                                  : tx.type === 'sell'
                                    ? '#ef4444'
                                    : tx.type === 'dividend'
                                      ? '#22c55e'
                                      : '#868F97',
                            }}
                          >
                            {TRANSACTION_TYPE_LABELS[tx.type]}
                          </span>
                        </td>
                        <td className="text-white">{asset?.name ?? tx.assetId.slice(0, 8)}</td>
                        <td className="text-right font-amount text-white">
                          {formatJpy(tx.amount)}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
            {yearlyStats.yearTxs.length > 20 && (
              <p
                className="px-5 py-3 text-center text-xs"
                style={{ color: '#4B5563', borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                {(yearlyStats.yearTxs.length - 20).toString()}件を省略（CSVエクスポートで全件確認できます）
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── クラス別含み損益 ── */}
      {classSummary.length > 0 && (
        <SectionCard title="資産クラス別パフォーマンス">
          <div className="overflow-x-auto">
            <table className="data-table w-full" aria-label="資産クラス別パフォーマンス">
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left' }}>クラス</th>
                  <th scope="col" style={{ textAlign: 'right' }}>評価額</th>
                  <th scope="col" style={{ textAlign: 'right' }}>取得額</th>
                  <th scope="col" style={{ textAlign: 'right' }}>含み損益</th>
                  <th scope="col" style={{ textAlign: 'right' }}>損益率</th>
                </tr>
              </thead>
              <tbody>
                {classSummary.map((row) => (
                  <tr key={row.cls}>
                    <td className="text-white">{row.label}</td>
                    <td className="text-right font-amount text-white">{formatJpy(row.value)}</td>
                    <td className="text-right font-amount text-ink-secondary">{formatJpy(row.cost)}</td>
                    <td
                      className="text-right font-amount text-sm font-medium"
                      style={{ color: row.gain >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {formatGainJpy(row.gain)}
                    </td>
                    <td
                      className="text-right font-amount text-sm font-medium"
                      style={{ color: row.gainRate >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {formatGainRate(row.gainRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── 保有資産一覧 ── */}
      {assetPerformance.length > 0 && (
        <SectionCard
          title="保有資産パフォーマンス"
          action={
            <p className="text-xs" style={{ color: '#4B5563' }}>
              {assetPerformance.length}件
            </p>
          }
        >
          <div className="overflow-x-auto">
            <table className="data-table w-full" aria-label="保有資産パフォーマンス一覧">
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left' }}>資産名</th>
                  <th scope="col" style={{ textAlign: 'left' }}>クラス</th>
                  <th scope="col" style={{ textAlign: 'right' }}>評価額</th>
                  <th scope="col" style={{ textAlign: 'right' }}>取得単価</th>
                  <th scope="col" style={{ textAlign: 'right' }}>現在価格</th>
                  <th scope="col" style={{ textAlign: 'right' }}>含み損益</th>
                  <th scope="col" style={{ textAlign: 'right' }}>損益率</th>
                  <th scope="col" style={{ textAlign: 'right' }}>価格更新日</th>
                </tr>
              </thead>
              <tbody>
                {assetPerformance.map(({ asset, summary }) => (
                  <tr key={asset.id}>
                    <td>
                      <div>
                        <p className="text-white">{asset.name}</p>
                        {asset.ticker && (
                          <p className="text-xs" style={{ color: '#4B5563' }}>
                            {asset.ticker}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className="rounded px-1.5 py-0.5 text-xs"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: '#868F97',
                        }}
                      >
                        {ASSET_CLASS_LABELS[asset.assetClass]}
                      </span>
                    </td>
                    <td className="text-right font-amount text-white">
                      {formatJpy(summary.totalValue)}
                    </td>
                    <td className="text-right font-amount text-ink-secondary">
                      {formatJpy(asset.acquisitionPrice)}
                    </td>
                    <td className="text-right font-amount text-white">
                      {formatJpy(asset.currentPriceJpy)}
                    </td>
                    <td
                      className="text-right font-amount text-sm font-medium"
                      style={{ color: summary.unrealizedGain >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {formatGainJpy(summary.unrealizedGain)}
                    </td>
                    <td
                      className="text-right font-amount text-sm font-medium"
                      style={{ color: summary.unrealizedGainRate >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {formatGainRate(summary.unrealizedGainRate)}
                    </td>
                    <td className="text-right text-xs" style={{ color: '#4B5563' }}>
                      {asset.currentPriceUpdatedAt
                        ? formatDate(asset.currentPriceUpdatedAt)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* 空状態 */}
      {assets.length === 0 && (
        <div
          className="flex flex-col items-center rounded-xl py-16"
          style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
        >
          <p className="text-base" style={{ color: '#868F97' }}>
            資産データがありません
          </p>
          <p className="mt-1 text-sm" style={{ color: '#4B5563' }}>
            資産を登録するとレポートが生成されます
          </p>
        </div>
      )}
    </div>
  )
}
