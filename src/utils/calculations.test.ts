import { describe, it, expect } from 'vitest'
import {
  calcMovingAveragePrice,
  calcAssetSummary,
  calcPortfolioTotals,
  calcRealizedGainForYear,
} from './calculations'
import type { Asset } from '@/types/asset.types'
import type { Transaction } from '@/types/transaction.types'

const makeAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: 'test-id',
  name: 'テスト株式',
  assetClass: 'stock_jp',
  accountType: 'taxable',
  currency: 'JPY',
  quantity: 100,
  acquisitionPrice: 1000,
  currentPrice: 1200,
  currentPriceJpy: 1200,
  tags: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('calcMovingAveragePrice', () => {
  it('初回購入時は購入単価がそのまま返る', () => {
    expect(calcMovingAveragePrice(0, 0, 100, 1000)).toBe(1000)
  })

  it('同一単価の追加購入では平均単価が変わらない', () => {
    expect(calcMovingAveragePrice(100, 1000, 50, 1000)).toBe(1000)
  })

  it('移動平均を正しく計算する', () => {
    // 100株@1000 + 100株@1200 → 平均1100
    expect(calcMovingAveragePrice(100, 1000, 100, 1200)).toBe(1100)
  })

  it('数量が0の場合は0を返す', () => {
    expect(calcMovingAveragePrice(0, 0, 0, 1000)).toBe(0)
  })
})

describe('calcAssetSummary', () => {
  it('含み益を正しく計算する（JPY資産）', () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1000, currentPrice: 1200, currentPriceJpy: 1200 })
    const summary = calcAssetSummary(asset)
    expect(summary.totalValue).toBe(120000)
    expect(summary.totalCost).toBe(100000)
    expect(summary.unrealizedGain).toBe(20000)
    expect(summary.unrealizedGainRate).toBe(20)
  })

  it('含み損を正しく計算する（JPY資産）', () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1000, currentPrice: 800, currentPriceJpy: 800 })
    const summary = calcAssetSummary(asset)
    expect(summary.unrealizedGain).toBe(-20000)
    expect(summary.unrealizedGainRate).toBe(-20)
  })

  it('取得コストが0の場合の損益率は0', () => {
    const asset = makeAsset({ quantity: 0, acquisitionPrice: 0, currentPriceJpy: 1000 })
    const summary = calcAssetSummary(asset)
    expect(summary.unrealizedGainRate).toBe(0)
  })

  it('USD建て資産の取得コストを現在の為替レートでJPY換算する', () => {
    // 取得単価 100 USD、現在価格 200 USD、為替レート 150 JPY/USD（シンプルな整数値）
    // 評価額:  10 × 200 × 150 = 300,000 JPY
    // 取得コスト: 10 × 100 × 150 = 150,000 JPY（USD → JPY換算必須）
    // 損益: 300,000 - 150,000 = 150,000 JPY (+100%)
    const asset = makeAsset({
      currency: 'USD',
      quantity: 10,
      acquisitionPrice: 100,
      currentPrice: 200,
      currentPriceJpy: 30000,  // 200 × 150 JPY/USD
    })
    const summary = calcAssetSummary(asset)

    expect(summary.totalValue).toBe(300000)
    expect(summary.totalCost).toBe(150000)  // 10 × 100 × (30000/200) = 10 × 100 × 150
    expect(summary.unrealizedGain).toBe(150000)
    expect(summary.unrealizedGainRate).toBe(100)
  })

  it('USD建て資産の損益率は為替レートに依存しない（外貨ベースの損益率と一致する）', () => {
    // 損益率は (現在価格 - 取得単価) / 取得単価 × 100
    // 為替レートが変わっても損益率は変わらない
    const asset = makeAsset({
      currency: 'USD',
      quantity: 100,
      acquisitionPrice: 100,   // 100 USD
      currentPrice: 150,       // 150 USD
      currentPriceJpy: 22500,  // 150 × 150 JPY/USD
    })
    const summary = calcAssetSummary(asset)
    // 損益率は 50%（150/100 - 1 = 0.5）
    expect(summary.unrealizedGainRate).toBeCloseTo(50, 5)
  })

  it('currentPriceが0の場合は除算エラーを起こさずfallbackする', () => {
    // 価格未取得の USD 資産 (currentPrice=0, currentPriceJpy=0)
    // 0除算を防ぐため acquisitionPrice をそのまま totalCost に使う
    const asset = makeAsset({
      currency: 'USD',
      quantity: 10,
      acquisitionPrice: 100,
      currentPrice: 0,
      currentPriceJpy: 0,
    })
    const summary = calcAssetSummary(asset)
    // totalValue = 10 × 0 = 0, totalCost = 10 × 100 = 1000
    expect(summary.totalValue).toBe(0)
    expect(summary.totalCost).toBe(1000)
    // unrealizedGain = 0 - 1000 = -1000（価格未取得なので表示上は意味のない値）
    expect(summary.unrealizedGain).toBe(-1000)
  })
})

describe('calcPortfolioTotals', () => {
  it('複数資産の合計を正しく計算する', () => {
    const assets = [
      makeAsset({ id: '1', quantity: 100, acquisitionPrice: 1000, currentPriceJpy: 1200 }),
      makeAsset({ id: '2', quantity: 50, acquisitionPrice: 2000, currentPriceJpy: 2500 }),
    ]
    const totals = calcPortfolioTotals(assets)
    expect(totals.totalValueJpy).toBe(120000 + 125000)
    expect(totals.totalCostJpy).toBe(100000 + 100000)
    expect(totals.totalUnrealizedGain).toBe(45000)
  })

  it('資産が空の場合は全て0', () => {
    const totals = calcPortfolioTotals([])
    expect(totals.totalValueJpy).toBe(0)
    expect(totals.totalCostJpy).toBe(0)
    expect(totals.totalUnrealizedGainRate).toBe(0)
  })
})

describe('calcRealizedGainForYear', () => {
  const makeTransaction = (overrides: Partial<Transaction>): Transaction => ({
    id: 'tx-1',
    assetId: 'asset-1',
    type: 'buy',
    date: '2024-01-15',
    amount: 0,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  })

  it('returns 0 when there are no transactions', () => {
    expect(calcRealizedGainForYear([], 2024)).toBe(0)
  })

  it('sums sell transactions for the specified year', () => {
    const txs = [
      makeTransaction({ id: 'tx-1', type: 'sell', date: '2024-03-01', amount: 50000 }),
      makeTransaction({ id: 'tx-2', type: 'sell', date: '2024-06-01', amount: 30000 }),
    ]
    expect(calcRealizedGainForYear(txs, 2024)).toBe(80000)
  })

  it('includes dividend transactions', () => {
    const txs = [
      makeTransaction({ id: 'tx-1', type: 'dividend', date: '2024-04-01', amount: 10000 }),
    ]
    expect(calcRealizedGainForYear(txs, 2024)).toBe(10000)
  })

  it('excludes buy transactions', () => {
    const txs = [
      makeTransaction({ id: 'tx-1', type: 'buy', date: '2024-01-01', amount: 100000 }),
    ]
    expect(calcRealizedGainForYear(txs, 2024)).toBe(0)
  })

  it('excludes transactions from different years', () => {
    const txs = [
      makeTransaction({ id: 'tx-1', type: 'sell', date: '2023-12-01', amount: 50000 }),
      makeTransaction({ id: 'tx-2', type: 'sell', date: '2024-01-01', amount: 20000 }),
    ]
    expect(calcRealizedGainForYear(txs, 2024)).toBe(20000)
  })
})
