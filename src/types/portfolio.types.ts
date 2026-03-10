import type { AssetClass, AccountType } from './asset.types'

/** ポートフォリオスナップショット（時系列記録用） */
export interface PortfolioSnapshot {
  id: string
  recordedAt: string             // ISO8601
  totalValueJpy: number
  totalCostJpy: number
  breakdown: Array<{
    assetClass: AssetClass
    valueJpy: number
  }>
}

/** ポートフォリオ集計結果（計算値） */
export interface PortfolioSummary {
  totalValueJpy: number
  totalCostJpy: number
  totalUnrealizedGain: number
  totalUnrealizedGainRate: number
  totalRealizedGain: number      // 確定損益（年初来）
  assetBreakdown: Array<{
    assetClass: AssetClass
    valueJpy: number
    ratio: number                // 構成比 (0-1)
  }>
  accountBreakdown: Array<{
    accountType: AccountType
    valueJpy: number
    ratio: number
  }>
  lastUpdatedAt: string
}
