/**
 * AssetList - Pro-style dark table with sort, edit, delete actions
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssetStore } from '@/store/assetStore'
import { useUiStore } from '@/store/uiStore'
import { useAssets } from '@/hooks/useAssets'
import { usePriceSync, isSyncable } from '@/hooks/usePriceSync'
import { Modal } from '@/components/common/Modal'
import { calcAssetSummary } from '@/utils/calculations'
import { formatJpy, formatQuantity, formatGainRate } from '@/utils/formatters'
import { ASSET_CLASS_LABELS, ACCOUNT_TYPE_LABELS } from '@/types/asset.types'
import type { Asset } from '@/types/asset.types'

type SortKey = 'name' | 'assetClass' | 'accountType' | 'quantity' | 'totalValue' | 'unrealizedGain'
type SortOrder = 'asc' | 'desc'

function getSortValue(asset: Asset, key: SortKey): number | string {
  const summary = calcAssetSummary(asset)
  switch (key) {
    case 'name': return asset.name
    case 'assetClass': return asset.assetClass
    case 'accountType': return asset.accountType
    case 'quantity': return asset.quantity
    case 'totalValue': return summary.totalValue
    case 'unrealizedGain': return summary.unrealizedGain
    default: return ''
  }
}

// Asset class badge colors
const CLASS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  国内株式: { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa' },
  外国株式: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  投資信託: { bg: 'rgba(255,161,108,0.15)', text: '#FFA16C' },
  ETF: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  債券: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
  不動産: { bg: 'rgba(244,114,182,0.15)', text: '#f472b6' },
  仮想通貨: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  現金: { bg: 'rgba(134,143,151,0.15)', text: '#868F97' },
  その他: { bg: 'rgba(134,143,151,0.12)', text: '#868F97' },
}

function AssetClassBadge({ label }: { label: string }) {
  const colors = CLASS_BADGE_COLORS[label] ?? CLASS_BADGE_COLORS['その他']
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  )
}

export function AssetList() {
  const navigate = useNavigate()
  const { assets } = useAssetStore()
  const { openModal, closeModal, activeModal, modalPayload } = useUiStore()
  const { removeAsset } = useAssets()
  const { syncSingleAsset, syncingAssetIds } = usePriceSync()

  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortOrder('asc')
      return key
    })
  }, [])

  const sortedAssets = [...assets].sort((a, b) => {
    const aVal = getSortValue(a, sortKey)
    const bVal = getSortValue(b, sortKey)
    const cmp = typeof aVal === 'string' && typeof bVal === 'string'
      ? aVal.localeCompare(bVal, 'ja')
      : (aVal as number) - (bVal as number)
    return sortOrder === 'asc' ? cmp : -cmp
  })

  const handleEditClick = useCallback((id: string) => {
    navigate(`/assets/${id}`)
  }, [navigate])

  const handleDeleteClick = useCallback((asset: Asset) => {
    openModal('asset-delete', asset)
  }, [openModal])

  const handleDeleteConfirm = useCallback(async () => {
    const asset = modalPayload as Asset | null
    if (!asset) return
    setIsDeleting(true)
    try {
      await removeAsset(asset.id)
    } finally {
      setIsDeleting(false)
      closeModal()
    }
  }, [modalPayload, removeAsset, closeModal])

  const SortIndicator = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      <span aria-hidden="true" className="ml-1 text-[10px]" style={{ color: '#FFA16C' }}>
        {sortOrder === 'asc' ? '▲' : '▼'}
      </span>
    ) : null

  // Sortable header cell
  const SortTh = ({
    col,
    children,
    align = 'left',
  }: {
    col: SortKey
    children: React.ReactNode
    align?: 'left' | 'right'
  }) => (
    <th
      scope="col"
      className="cursor-pointer select-none transition-colors"
      style={{ textAlign: align }}
      onClick={() => { handleSort(col); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(col); } }}
      tabIndex={0}
      aria-sort={sortKey === col ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="hover:text-white transition-colors">
        {children}
        <SortIndicator col={col} />
      </span>
    </th>
  )

  if (assets.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl py-16"
        style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
      >
        <p className="text-base" style={{ color: '#868F97' }}>資産が登録されていません</p>
        <p className="mt-2 text-sm" style={{ color: '#4B5563' }}>
          「資産を追加」ボタンから最初の資産を登録してください
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full table-auto" role="table" aria-label="資産一覧">
            <thead>
              <tr>
                <SortTh col="name">資産名 / ティッカー</SortTh>
                <SortTh col="assetClass">クラス</SortTh>
                <SortTh col="accountType">口座</SortTh>
                <SortTh col="quantity" align="right">保有数量</SortTh>
                <th scope="col" style={{ textAlign: 'right' }}>取得単価</th>
                <th scope="col" style={{ textAlign: 'right' }}>現在価格</th>
                <SortTh col="totalValue" align="right">評価額 (JPY)</SortTh>
                <SortTh col="unrealizedGain" align="right">損益 / 損益率</SortTh>
                <th scope="col" style={{ textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map((asset) => {
                const summary = calcAssetSummary(asset)
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
                    <td>
                      <AssetClassBadge label={ASSET_CLASS_LABELS[asset.assetClass]} />
                    </td>
                    <td style={{ color: '#868F97' }}>
                      {ACCOUNT_TYPE_LABELS[asset.accountType]}
                    </td>
                    <td className="text-right font-amount" style={{ color: '#ffffff' }}>
                      {formatQuantity(asset.quantity)}
                    </td>
                    <td className="text-right font-amount" style={{ color: '#868F97' }}>
                      {formatQuantity(asset.acquisitionPrice, 2)}
                      <span className="ml-1 text-[11px]" style={{ color: '#4B5563' }}>
                        {asset.currency}
                      </span>
                    </td>
                    <td className="text-right font-amount" style={{ color: '#868F97' }}>
                      {formatQuantity(asset.currentPrice, 2)}
                      <span className="ml-1 text-[11px]" style={{ color: '#4B5563' }}>
                        {asset.currency}
                      </span>
                    </td>
                    <td className="text-right font-amount font-medium text-white">
                      {formatJpy(summary.totalValue)}
                    </td>
                    <td className="text-right">
                      <div className="font-amount text-sm font-medium" style={{ color: gainColor }}>
                        {formatJpy(summary.unrealizedGain)}
                      </div>
                      <div className="font-amount text-xs" style={{ color: gainColor }}>
                        {formatGainRate(summary.unrealizedGainRate)}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        {isSyncable(asset) && (
                          <button
                            type="button"
                            onClick={() => { void syncSingleAsset(asset.id); }}
                            disabled={syncingAssetIds.has(asset.id)}
                            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                            style={{
                              color: '#60a5fa',
                              background: 'rgba(96,165,250,0.08)',
                              opacity: syncingAssetIds.has(asset.id) ? 0.6 : 1,
                            }}
                            aria-label={`${asset.name}の価格を更新`}
                          >
                            {syncingAssetIds.has(asset.id) ? '更新中' : '更新'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { handleEditClick(asset.id); }}
                          className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                          style={{
                            color: '#FFA16C',
                            background: 'rgba(255,161,108,0.08)',
                          }}
                          aria-label={`${asset.name}を編集`}
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleDeleteClick(asset); }}
                          className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                          style={{
                            color: '#ef4444',
                            background: 'rgba(239,68,68,0.08)',
                          }}
                          aria-label={`${asset.name}を削除`}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={activeModal === 'asset-delete'}
        title="資産を削除しますか？"
        onConfirm={() => { void handleDeleteConfirm(); }}
        onCancel={closeModal}
        confirmLabel={isDeleting ? '削除中...' : '削除する'}
        cancelLabel="キャンセル"
        confirmVariant="danger"
      >
        <p>
          「{(modalPayload as Asset | null)?.name ?? ''}」を削除します。
          この操作は取り消せません。
        </p>
      </Modal>
    </>
  )
}
