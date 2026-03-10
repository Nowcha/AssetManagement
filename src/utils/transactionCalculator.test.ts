/**
 * Unit tests for transactionCalculator.ts
 * Tests buy/sell/split transaction application to assets
 */
import { describe, it, expect } from 'vitest'
import {
  applyBuyTransaction,
  applySellTransaction,
  applySplitTransaction,
} from './transactionCalculator'
import type { Asset } from '@/types/asset.types'
import type { TransactionFormData } from '@/utils/validators'

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
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
  }
}

function makeBuyTx(overrides: Partial<TransactionFormData> = {}): TransactionFormData {
  return {
    assetId: 'asset-1',
    type: 'buy',
    date: '2024-06-01',
    quantity: 50,
    price: 1200,
    amount: 60000,
    ...overrides,
  }
}

function makeSellTx(overrides: Partial<TransactionFormData> = {}): TransactionFormData {
  return {
    assetId: 'asset-1',
    type: 'sell',
    date: '2024-06-01',
    quantity: 30,
    price: 1500,
    amount: 45000,
    ...overrides,
  }
}

describe('applyBuyTransaction', () => {
  it('increases quantity by the purchased amount', () => {
    const asset = makeAsset({ quantity: 100 })
    const tx = makeBuyTx({ quantity: 50 })
    const result = applyBuyTransaction(asset, tx, 1)
    expect(result.quantity).toBe(150)
  })

  it('calculates moving average acquisition price correctly', () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1000 })
    const tx = makeBuyTx({ quantity: 100, price: 1200 })
    const result = applyBuyTransaction(asset, tx, 1)
    // (100 * 1000 + 100 * 1200) / 200 = 1100
    expect(result.acquisitionPrice).toBe(1100)
  })

  it('sets acquisitionPrice to buyPrice when starting from zero quantity', () => {
    const asset = makeAsset({ quantity: 0, acquisitionPrice: 0 })
    const tx = makeBuyTx({ quantity: 50, price: 1500 })
    const result = applyBuyTransaction(asset, tx, 1)
    expect(result.acquisitionPrice).toBe(1500)
    expect(result.quantity).toBe(50)
  })

  it('applies exchange rate to currentPriceJpy for foreign currency assets', () => {
    const asset = makeAsset({ currency: 'USD', currentPriceJpy: 0 })
    const tx = makeBuyTx({ price: 100, quantity: 10 }) // USD 100/share
    const result = applyBuyTransaction(asset, tx, 150) // rate: 150
    expect(result.currentPriceJpy).toBe(15000) // 100 * 150
  })

  it('does not change currentPriceJpy when buy price is 0', () => {
    const asset = makeAsset({ currentPriceJpy: 1200 })
    const tx = makeBuyTx({ price: 0, quantity: 10 })
    const result = applyBuyTransaction(asset, tx, 1)
    expect(result.currentPriceJpy).toBe(1200) // unchanged
  })

  it('uses 0 quantity when tx.quantity is undefined', () => {
    const asset = makeAsset({ quantity: 100 })
    const tx = makeBuyTx({ quantity: undefined })
    const result = applyBuyTransaction(asset, tx, 1)
    expect(result.quantity).toBe(100) // no change
  })

  it('updates updatedAt timestamp', () => {
    const asset = makeAsset({ updatedAt: '2024-01-01T00:00:00Z' })
    const tx = makeBuyTx({ quantity: 10, price: 1000 })
    const result = applyBuyTransaction(asset, tx, 1)
    expect(result.updatedAt).not.toBe('2024-01-01T00:00:00Z')
  })

  it('does not modify the original asset', () => {
    const asset = makeAsset({ quantity: 100 })
    const tx = makeBuyTx({ quantity: 50 })
    applyBuyTransaction(asset, tx, 1)
    expect(asset.quantity).toBe(100)
  })
})

describe('applySellTransaction', () => {
  it('decreases quantity by the sold amount', () => {
    const asset = makeAsset({ quantity: 100 })
    const tx = makeSellTx({ quantity: 30 })
    const result = applySellTransaction(asset, tx)
    expect(result.quantity).toBe(70)
  })

  it('does not let quantity go below 0', () => {
    const asset = makeAsset({ quantity: 10 })
    const tx = makeSellTx({ quantity: 50 }) // selling more than held
    const result = applySellTransaction(asset, tx)
    expect(result.quantity).toBe(0)
  })

  it('does not change acquisitionPrice', () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1000 })
    const tx = makeSellTx({ quantity: 30 })
    const result = applySellTransaction(asset, tx)
    expect(result.acquisitionPrice).toBe(1000)
  })

  it('uses 0 quantity when tx.quantity is undefined', () => {
    const asset = makeAsset({ quantity: 100 })
    const tx = makeSellTx({ quantity: undefined })
    const result = applySellTransaction(asset, tx)
    expect(result.quantity).toBe(100) // no change
  })

  it('updates updatedAt timestamp', () => {
    const asset = makeAsset({ updatedAt: '2024-01-01T00:00:00Z' })
    const tx = makeSellTx({ quantity: 10 })
    const result = applySellTransaction(asset, tx)
    expect(result.updatedAt).not.toBe('2024-01-01T00:00:00Z')
  })

  it('does not modify the original asset', () => {
    const asset = makeAsset({ quantity: 100 })
    const tx = makeSellTx({ quantity: 30 })
    applySellTransaction(asset, tx)
    expect(asset.quantity).toBe(100)
  })
})

describe('applySplitTransaction', () => {
  it('multiplies quantity by the split ratio', () => {
    const asset = makeAsset({ quantity: 100 })
    const result = applySplitTransaction(asset, 2)
    expect(result.quantity).toBe(200)
  })

  it('divides acquisitionPrice by the split ratio', () => {
    const asset = makeAsset({ acquisitionPrice: 1000 })
    const result = applySplitTransaction(asset, 2)
    expect(result.acquisitionPrice).toBe(500)
  })

  it('handles non-integer split ratios (e.g. 3-for-2)', () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1500 })
    const result = applySplitTransaction(asset, 1.5)
    expect(result.quantity).toBe(150)
    expect(result.acquisitionPrice).toBeCloseTo(1000)
  })

  it('returns the original asset unchanged when splitRatio is 0', () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1000 })
    const result = applySplitTransaction(asset, 0)
    expect(result.quantity).toBe(100)
    expect(result.acquisitionPrice).toBe(1000)
  })

  it('returns the original asset unchanged when splitRatio is negative', () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1000 })
    const result = applySplitTransaction(asset, -1)
    expect(result).toBe(asset) // same reference
  })

  it('updates updatedAt timestamp', () => {
    const asset = makeAsset({ updatedAt: '2024-01-01T00:00:00Z' })
    const result = applySplitTransaction(asset, 2)
    expect(result.updatedAt).not.toBe('2024-01-01T00:00:00Z')
  })

  it('does not modify the original asset', () => {
    const asset = makeAsset({ quantity: 100 })
    applySplitTransaction(asset, 2)
    expect(asset.quantity).toBe(100)
  })
})
