/**
 * usePortfolio - Aggregates asset data into portfolio summary and breakdown data
 */
import { useMemo } from 'react'
import { useAssetStore } from '@/store/assetStore'
import { calcPortfolioTotals, calcAssetSummary } from '@/utils/calculations'
import { ASSET_CLASS_LABELS, ACCOUNT_TYPE_LABELS } from '@/types/asset.types'
import type { AssetClass, AccountType } from '@/types/asset.types'
import type { PortfolioSummary } from '@/types/portfolio.types'

/** Chart colors per asset class (Fey dark theme) */
const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  stock_jp:    '#FFA16C',
  stock_us:    '#60a5fa',
  stock_other: '#a78bfa',
  mutual_fund: '#34d399',
  etf:         '#fbbf24',
  crypto:      '#f472b6',
  deposit:     '#94a3b8',
  bond:        '#67e8f9',
  real_estate: '#86efac',
  insurance:   '#fdba74',
  other:       '#6b7280',
}

export interface AssetBreakdownItem {
  assetClass: AssetClass
  label: string
  valueJpy: number
  ratio: number
  color: string
}

export interface AccountBreakdownItem {
  accountType: AccountType
  label: string
  valueJpy: number
  ratio: number
}

export interface UsePortfolioResult {
  summary: PortfolioSummary | null
  assetBreakdown: AssetBreakdownItem[]
  accountBreakdown: AccountBreakdownItem[]
  isLoading: boolean
}

export function usePortfolio(): UsePortfolioResult {
  const { assets, isLoading } = useAssetStore()

  const result = useMemo((): Omit<UsePortfolioResult, 'isLoading'> => {
    if (assets.length === 0) {
      return { summary: null, assetBreakdown: [], accountBreakdown: [] }
    }

    const totals = calcPortfolioTotals(assets)
    const { totalValueJpy, totalCostJpy, totalUnrealizedGain, totalUnrealizedGainRate } = totals

    // --- Per-assetClass aggregation ---
    const assetClassMap = new Map<AssetClass, number>()
    const accountTypeMap = new Map<AccountType, number>()

    for (const asset of assets) {
      const summary = calcAssetSummary(asset)
      const prev = assetClassMap.get(asset.assetClass) ?? 0
      assetClassMap.set(asset.assetClass, prev + summary.totalValue)

      const prevAcc = accountTypeMap.get(asset.accountType) ?? 0
      accountTypeMap.set(asset.accountType, prevAcc + summary.totalValue)
    }

    // Build assetBreakdown sorted by value descending
    const assetBreakdown: AssetBreakdownItem[] = Array.from(assetClassMap.entries())
      .map(([assetClass, valueJpy]) => ({
        assetClass,
        label: ASSET_CLASS_LABELS[assetClass],
        valueJpy,
        ratio: totalValueJpy > 0 ? valueJpy / totalValueJpy : 0,
        color: ASSET_CLASS_COLORS[assetClass],
      }))
      .sort((a, b) => b.valueJpy - a.valueJpy)

    // Build accountBreakdown sorted by value descending
    const accountBreakdown: AccountBreakdownItem[] = Array.from(accountTypeMap.entries())
      .map(([accountType, valueJpy]) => ({
        accountType,
        label: ACCOUNT_TYPE_LABELS[accountType],
        valueJpy,
        ratio: totalValueJpy > 0 ? valueJpy / totalValueJpy : 0,
      }))
      .sort((a, b) => b.valueJpy - a.valueJpy)

    // Build PortfolioSummary (totalRealizedGain = 0 until Sprint with transactions)
    const summary: PortfolioSummary = {
      totalValueJpy,
      totalCostJpy,
      totalUnrealizedGain,
      totalUnrealizedGainRate,
      totalRealizedGain: 0,
      assetBreakdown: assetBreakdown.map(({ assetClass, valueJpy, ratio }) => ({
        assetClass,
        valueJpy,
        ratio,
      })),
      accountBreakdown: accountBreakdown.map(({ accountType, valueJpy, ratio }) => ({
        accountType,
        valueJpy,
        ratio,
      })),
      lastUpdatedAt: new Date().toISOString(),
    }

    return { summary, assetBreakdown, accountBreakdown }
  }, [assets])

  return { ...result, isLoading }
}
