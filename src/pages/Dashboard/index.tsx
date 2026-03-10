/**
 * Dashboard page - Sprint 2 full implementation
 * Hero banner + allocation pie + timeline chart + asset-class breakdown table
 */
import { Link } from 'react-router-dom'
import { useAssetStore } from '@/store/assetStore'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useSnapshot } from '@/hooks/useSnapshot'
import { calcAssetSummary } from '@/utils/calculations'
import { formatJpy, formatGainRate, formatGainJpy, formatPercent, formatDateTime } from '@/utils/formatters'
import { AssetAllocationPie } from '@/components/charts/AssetAllocationPie'
import { PortfolioTimeline } from '@/components/charts/PortfolioTimeline'

export function Dashboard() {
  const { assets, isLoading } = useAssetStore()
  const { summary, assetBreakdown, isLoading: portfolioLoading } = usePortfolio()
  const { snapshots } = useSnapshot()

  if (isLoading || portfolioLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-ink-secondary">読み込み中...</p>
      </div>
    )
  }

  const isGain = (summary?.totalUnrealizedGain ?? 0) >= 0
  const gainColor = isGain ? '#22c55e' : '#ef4444'

  return (
    <div className="animate-fade-in space-y-6">

      {/* === Hero section === */}
      <div
        className="glass-card relative overflow-hidden p-6"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,161,108,0.08) 0%, rgba(255,255,255,0.03) 60%, rgba(255,255,255,0.04) 100%)',
        }}
      >
        {/* Decorative glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,161,108,0.08) 0%, transparent 70%)',
          }}
        />

        <p
          className="mb-1 text-xs font-medium uppercase tracking-widest text-ink-secondary"
          style={{ letterSpacing: '0.08em' }}
        >
          ポートフォリオ総資産
        </p>

        {/* Total value */}
        <div className="flex flex-wrap items-end gap-4">
          <p className="font-amount text-4xl font-bold text-white">
            {summary ? formatJpy(summary.totalValueJpy) : '—'}
          </p>

          {summary && (
            <div
              className="mb-1 flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
              style={{
                backgroundColor: isGain
                  ? 'rgba(34,197,94,0.12)'
                  : 'rgba(239,68,68,0.12)',
                color: gainColor,
              }}
            >
              <span>{isGain ? '▲' : '▼'}</span>
              <span className="font-amount">
                {formatGainJpy(summary.totalUnrealizedGain)}
              </span>
              <span className="font-amount">
                ({formatGainRate(summary.totalUnrealizedGainRate)})
              </span>
            </div>
          )}
        </div>

        {/* Sub info */}
        <div className="mt-3 flex flex-wrap gap-4">
          {summary && (
            <p className="text-sm text-ink-secondary">
              投資元本:&nbsp;
              <span className="font-amount text-white">{formatJpy(summary.totalCostJpy)}</span>
            </p>
          )}
          <p className="text-xs text-ink-muted">
            最終更新: {summary ? formatDateTime(summary.lastUpdatedAt) : '—'}
          </p>
        </div>
      </div>

      {/* === Empty state === */}
      {assets.length === 0 && (
        <div
          className="flex flex-col items-center rounded-xl py-16"
          style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
        >
          <p className="mb-2 text-base text-ink-secondary">まだ資産が登録されていません</p>
          <p className="mb-6 text-sm text-ink-muted">
            最初の資産を登録してポートフォリオを構築しましょう
          </p>
          <Link to="/assets/new" className="btn-accent">
            最初の資産を登録する
          </Link>
        </div>
      )}

      {/* === Chart section (2-column grid) === */}
      {assets.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Asset allocation pie */}
          <div className="glass-card p-5">
            <p className="mb-4 text-sm font-semibold text-white">資産配分</p>
            <AssetAllocationPie data={assetBreakdown} />
          </div>

          {/* Portfolio timeline */}
          <div className="glass-card p-5">
            <p className="mb-4 text-sm font-semibold text-white">資産推移</p>
            <PortfolioTimeline snapshots={snapshots} />
          </div>
        </div>
      )}

      {/* === Asset class breakdown table === */}
      {assets.length > 0 && assetBreakdown.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-sm font-semibold text-white">クラス別内訳</p>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table w-full" aria-label="資産クラス別内訳">
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left' }}>クラス</th>
                  <th scope="col" style={{ textAlign: 'right' }}>評価額</th>
                  <th scope="col" style={{ textAlign: 'right' }}>構成比</th>
                  <th scope="col" style={{ textAlign: 'right' }}>含み損益</th>
                  <th scope="col" style={{ textAlign: 'right' }}>損益率</th>
                </tr>
              </thead>
              <tbody>
                {assetBreakdown.map((item) => {
                  // Aggregate unrealized gain for this class
                  const classAssets = assets.filter((a) => a.assetClass === item.assetClass)
                  const classGain = classAssets.reduce((sum, a) => {
                    const s = calcAssetSummary(a)
                    return sum + s.unrealizedGain
                  }, 0)
                  const classCost = classAssets.reduce((sum, a) => {
                    const s = calcAssetSummary(a)
                    return sum + s.totalCost
                  }, 0)
                  const classGainRate = classCost !== 0 ? (classGain / classCost) * 100 : 0
                  const classIsGain = classGain >= 0
                  const classGainColor = classIsGain ? '#22c55e' : '#ef4444'

                  return (
                    <tr key={item.assetClass}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-white">{item.label}</span>
                        </div>
                      </td>
                      <td className="text-right font-amount text-white">
                        {formatJpy(item.valueJpy)}
                      </td>
                      <td className="text-right font-amount text-ink-secondary">
                        {formatPercent(item.ratio)}
                      </td>
                      <td
                        className="text-right font-amount text-sm font-medium"
                        style={{ color: classGainColor }}
                      >
                        {formatGainJpy(classGain)}
                      </td>
                      <td
                        className="text-right font-amount text-sm font-medium"
                        style={{ color: classGainColor }}
                      >
                        {formatGainRate(classGainRate)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div
            className="flex justify-end px-5 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Link to="/assets" className="text-xs text-accent hover:text-white transition-colors">
              資産一覧を見る →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
