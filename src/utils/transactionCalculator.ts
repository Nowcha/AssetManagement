/**
 * Transaction calculator utilities
 * Applies buy/sell/split transactions to asset quantities and average acquisition prices
 */
import type { Asset } from '@/types/asset.types'
import type { TransactionFormData } from '@/utils/validators'
import { calcMovingAveragePrice } from '@/utils/calculations'

/**
 * Apply a buy transaction to an asset.
 * Updates the moving average acquisition price and quantity.
 * @param asset Current asset state
 * @param tx Transaction form data (type must be 'buy')
 * @param exchangeRate Exchange rate to JPY at the time of purchase (1 for JPY-denominated assets)
 * @returns New asset with updated quantity, acquisitionPrice, and acquisitionPriceJpy
 */
export function applyBuyTransaction(
  asset: Asset,
  tx: TransactionFormData,
  exchangeRate: number,
): Asset {
  const buyQuantity = tx.quantity ?? 0
  const buyPrice = tx.price ?? 0
  const buyPriceJpy = buyPrice * exchangeRate

  const newQuantity = asset.quantity + buyQuantity

  // Moving average in native currency (e.g. USD)
  const newAvgPrice = calcMovingAveragePrice(
    asset.quantity,
    asset.acquisitionPrice,
    buyQuantity,
    buyPrice,
  )

  // Moving average in JPY using the exchange rate at the time of each purchase.
  // For existing assets without acquisitionPriceJpy, fall back to native price as-is
  // (will be corrected next time a buy transaction is recorded).
  const prevAvgPriceJpy = asset.acquisitionPriceJpy ?? asset.acquisitionPrice * exchangeRate
  const newAvgPriceJpy = calcMovingAveragePrice(
    asset.quantity,
    prevAvgPriceJpy,
    buyQuantity,
    buyPriceJpy,
  )

  const now = new Date().toISOString()
  return {
    ...asset,
    quantity: newQuantity,
    acquisitionPrice: newAvgPrice,
    acquisitionPriceJpy: newAvgPriceJpy,
    currentPriceJpy: buyPriceJpy > 0 ? buyPriceJpy : asset.currentPriceJpy,
    updatedAt: now,
  }
}

/**
 * Apply a sell transaction to an asset.
 * Reduces quantity; acquisition price remains unchanged (moving average method).
 * @param asset Current asset state
 * @param tx Transaction form data (type must be 'sell')
 * @returns New asset with updated quantity
 */
export function applySellTransaction(asset: Asset, tx: TransactionFormData): Asset {
  const sellQuantity = tx.quantity ?? 0
  const newQuantity = Math.max(0, asset.quantity - sellQuantity)

  const now = new Date().toISOString()
  return {
    ...asset,
    quantity: newQuantity,
    updatedAt: now,
  }
}

/**
 * Apply a stock split to an asset.
 * Adjusts quantity and acquisition price proportionally.
 * @param asset Current asset state
 * @param splitRatio The ratio to multiply quantity by (e.g., 2 for a 2-for-1 split)
 * @returns New asset with adjusted quantity and acquisitionPrice
 */
export function applySplitTransaction(asset: Asset, splitRatio: number): Asset {
  if (splitRatio <= 0) return asset

  const newQuantity = asset.quantity * splitRatio
  // Price per share decreases proportionally
  const newAcquisitionPrice = asset.acquisitionPrice / splitRatio
  const newAcquisitionPriceJpy =
    asset.acquisitionPriceJpy !== undefined
      ? asset.acquisitionPriceJpy / splitRatio
      : undefined

  const now = new Date().toISOString()
  return {
    ...asset,
    quantity: newQuantity,
    acquisitionPrice: newAcquisitionPrice,
    acquisitionPriceJpy: newAcquisitionPriceJpy,
    updatedAt: now,
  }
}
