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
 *
 * 外貨建て資産（USD等）は acquisitionPrice が外貨建てのため、
 * currentPrice / currentPriceJpy から算出した現在の為替レートで JPY 換算する。
 * （現在レートで換算するのは国内証券会社の一般的な表示方法と同じ）
 */
export function calcAssetSummary(asset: Asset): AssetSummary {
  const totalValue = asset.quantity * asset.currentPriceJpy

  // 外貨建て資産の取得単価を JPY 換算する
  // 現在価格（外貨）と現在価格（JPY）の比から為替レートを逆算
  const acquisitionPriceJpy =
    asset.currency === 'JPY' || asset.currentPrice <= 0
      ? asset.acquisitionPrice
      : asset.acquisitionPrice * (asset.currentPriceJpy / asset.currentPrice)

  const totalCost = asset.quantity * acquisitionPriceJpy
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
