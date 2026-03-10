/**
 * 資産計算ユーティリティ
 * 移動平均法による取得単価計算など
 */
import type { Asset, AssetSummary } from '@/types/asset.types'
import type { Transaction } from '@/types/transaction.types'

/**
 * 移動平均法で新しい平均取得単価を計算
 * @param currentQuantity 現在の保有数量
 * @param currentAvgPrice 現在の平均取得単価
 * @param buyQuantity 今回の購入数量
 * @param buyPrice 今回の購入単価
 */
export function calcMovingAveragePrice(
  currentQuantity: number,
  currentAvgPrice: number,
  buyQuantity: number,
  buyPrice: number,
): number {
  const totalQuantity = currentQuantity + buyQuantity
  if (totalQuantity === 0) return 0
  return (currentQuantity * currentAvgPrice + buyQuantity * buyPrice) / totalQuantity
}

/**
 * 個別資産のサマリーを計算
 */
export function calcAssetSummary(asset: Asset): AssetSummary {
  const totalValue = asset.quantity * asset.currentPriceJpy
  const totalCost = asset.quantity * asset.acquisitionPrice
  const unrealizedGain = totalValue - totalCost
  const unrealizedGainRate = totalCost !== 0 ? (unrealizedGain / totalCost) * 100 : 0

  return {
    assetId: asset.id,
    totalValue,
    totalCost,
    unrealizedGain,
    unrealizedGainRate,
  }
}

/**
 * 全資産のポートフォリオサマリーを計算
 */
export function calcPortfolioTotals(assets: Asset[]): {
  totalValueJpy: number
  totalCostJpy: number
  totalUnrealizedGain: number
  totalUnrealizedGainRate: number
} {
  const summaries = assets.map(calcAssetSummary)
  const totalValueJpy = summaries.reduce((sum, s) => sum + s.totalValue, 0)
  const totalCostJpy = summaries.reduce((sum, s) => sum + s.totalCost, 0)
  const totalUnrealizedGain = totalValueJpy - totalCostJpy
  const totalUnrealizedGainRate =
    totalCostJpy !== 0 ? (totalUnrealizedGain / totalCostJpy) * 100 : 0

  return { totalValueJpy, totalCostJpy, totalUnrealizedGain, totalUnrealizedGainRate }
}

/**
 * 年間確定損益を計算（売却取引から）
 */
export function calcRealizedGainForYear(
  transactions: Transaction[],
  year: number,
): number {
  return transactions
    .filter((tx) => {
      const txYear = new Date(tx.date).getFullYear()
      return txYear === year && (tx.type === 'sell' || tx.type === 'dividend')
    })
    .reduce((sum, tx) => sum + tx.amount, 0)
}
