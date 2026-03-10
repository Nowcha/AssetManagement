/**
 * Unit tests for usePortfolio hook
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePortfolio } from './usePortfolio'
import { useAssetStore } from '@/store/assetStore'
import type { Asset } from '@/types/asset.types'

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'a1',
    name: 'テスト株式',
    assetClass: 'stock_jp',
    accountType: 'taxable',
    currency: 'JPY',
    quantity: 100,
    acquisitionPrice: 1000,
    currentPrice: 1200,
    currentPriceJpy: 1200,
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  useAssetStore.setState({ assets: [], isLoading: false, error: null })
})

describe('usePortfolio - empty state', () => {
  it('returns null summary and empty breakdowns when no assets', () => {
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.summary).toBeNull()
    expect(result.current.assetBreakdown).toHaveLength(0)
    expect(result.current.accountBreakdown).toHaveLength(0)
  })

  it('returns isLoading from store', () => {
    useAssetStore.setState({ isLoading: true })
    const { result } = renderHook(() => usePortfolio())
    expect(result.current.isLoading).toBe(true)
  })
})

describe('usePortfolio - with assets', () => {
  it('calculates totalValueJpy correctly', () => {
    const assets = [
      makeAsset({ id: 'a1', quantity: 100, currentPriceJpy: 1200, acquisitionPrice: 1000 }),
      makeAsset({ id: 'a2', quantity: 50,  currentPriceJpy: 2000, acquisitionPrice: 1800 }),
    ]
    useAssetStore.setState({ assets })

    const { result } = renderHook(() => usePortfolio())
    // 100*1200 + 50*2000 = 120000 + 100000 = 220000
    expect(result.current.summary?.totalValueJpy).toBe(220000)
  })

  it('calculates totalCostJpy correctly', () => {
    const assets = [
      makeAsset({ id: 'a1', quantity: 100, currentPriceJpy: 1200, acquisitionPrice: 1000 }),
    ]
    useAssetStore.setState({ assets })

    const { result } = renderHook(() => usePortfolio())
    expect(result.current.summary?.totalCostJpy).toBe(100 * 1000)
  })

  it('calculates unrealized gain correctly', () => {
    const assets = [
      makeAsset({ id: 'a1', quantity: 100, currentPriceJpy: 1200, acquisitionPrice: 1000 }),
    ]
    useAssetStore.setState({ assets })

    const { result } = renderHook(() => usePortfolio())
    // (1200 - 1000) * 100 = 20000
    expect(result.current.summary?.totalUnrealizedGain).toBe(20000)
    // 20000 / 100000 * 100 = 20%
    expect(result.current.summary?.totalUnrealizedGainRate).toBeCloseTo(20)
  })

  it('builds assetBreakdown per asset class', () => {
    const assets = [
      makeAsset({ id: 'a1', assetClass: 'stock_jp', quantity: 100, currentPriceJpy: 1000, acquisitionPrice: 800 }),
      makeAsset({ id: 'a2', assetClass: 'stock_us', quantity: 10,  currentPriceJpy: 5000, acquisitionPrice: 4000 }),
    ]
    useAssetStore.setState({ assets })

    const { result } = renderHook(() => usePortfolio())
    const breakdown = result.current.assetBreakdown
    expect(breakdown).toHaveLength(2)

    const us = breakdown.find((b) => b.assetClass === 'stock_us')
    expect(us?.valueJpy).toBe(50000)
    // 50000 / (100000 + 50000) = 1/3
    expect(us?.ratio).toBeCloseTo(1 / 3)
    expect(us?.label).toBe('米国株式')
    expect(us?.color).toBe('#60a5fa')
  })

  it('sorts assetBreakdown by valueJpy descending', () => {
    const assets = [
      makeAsset({ id: 'a1', assetClass: 'deposit',  quantity: 1, currentPriceJpy: 100,   acquisitionPrice: 100 }),
      makeAsset({ id: 'a2', assetClass: 'stock_us', quantity: 1, currentPriceJpy: 50000, acquisitionPrice: 40000 }),
      makeAsset({ id: 'a3', assetClass: 'stock_jp', quantity: 1, currentPriceJpy: 1000,  acquisitionPrice: 800 }),
    ]
    useAssetStore.setState({ assets })

    const { result } = renderHook(() => usePortfolio())
    const breakdown = result.current.assetBreakdown
    expect(breakdown[0].assetClass).toBe('stock_us')
    expect(breakdown[1].assetClass).toBe('stock_jp')
    expect(breakdown[2].assetClass).toBe('deposit')
  })

  it('builds accountBreakdown per account type', () => {
    const assets = [
      makeAsset({ id: 'a1', accountType: 'nisa',    quantity: 100, currentPriceJpy: 1000, acquisitionPrice: 800 }),
      makeAsset({ id: 'a2', accountType: 'taxable', quantity: 50,  currentPriceJpy: 2000, acquisitionPrice: 1500 }),
    ]
    useAssetStore.setState({ assets })

    const { result } = renderHook(() => usePortfolio())
    const breakdown = result.current.accountBreakdown
    expect(breakdown).toHaveLength(2)

    const nisa = breakdown.find((b) => b.accountType === 'nisa')
    expect(nisa?.valueJpy).toBe(100000)
    expect(nisa?.label).toBe('旧NISA')
  })

  it('aggregates multiple assets of the same class', () => {
    const assets = [
      makeAsset({ id: 'a1', assetClass: 'stock_jp', quantity: 100, currentPriceJpy: 1000, acquisitionPrice: 800 }),
      makeAsset({ id: 'a2', assetClass: 'stock_jp', quantity: 200, currentPriceJpy: 500,  acquisitionPrice: 400 }),
    ]
    useAssetStore.setState({ assets })

    const { result } = renderHook(() => usePortfolio())
    const breakdown = result.current.assetBreakdown
    expect(breakdown).toHaveLength(1)
    // 100*1000 + 200*500 = 100000 + 100000 = 200000
    expect(breakdown[0].valueJpy).toBe(200000)
    expect(breakdown[0].ratio).toBeCloseTo(1)
  })

  it('ratio sums to approximately 1 across all classes', () => {
    const assets = [
      makeAsset({ id: 'a1', assetClass: 'stock_jp', quantity: 100, currentPriceJpy: 1000, acquisitionPrice: 800 }),
      makeAsset({ id: 'a2', assetClass: 'stock_us', quantity: 50,  currentPriceJpy: 2000, acquisitionPrice: 1500 }),
      makeAsset({ id: 'a3', assetClass: 'deposit',  quantity: 1,   currentPriceJpy: 30000, acquisitionPrice: 30000 }),
    ]
    useAssetStore.setState({ assets })

    const { result } = renderHook(() => usePortfolio())
    const totalRatio = result.current.assetBreakdown.reduce((sum, b) => sum + b.ratio, 0)
    expect(totalRatio).toBeCloseTo(1)
  })
})
