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
 * @param exchangeRate Exchange rate to JPY (1 for JPY-denominated assets)
 * @returns New asset with updated quantity and acquisitionPrice
 */
export function applyBuyTransaction(
  asset: Asset,
  tx: TransactionFormData,
  exchangeRate: number,
): Asset {
  const buyQuantity = tx.quantity ?? 0
  const buyPrice = tx.price ?? 0

  const newQuantity = asset.quantity + buyQuantity
  const newAvgPrice = calcMovingAveragePrice(
    asset.quantity,
    asset.acquisitionPrice,
    buyQuantity,
    buyPrice,
  )

  // Update currentPriceJpy based on the buy price and exchange rate
  const newCurrentPriceJpy = buyPrice * exchangeRate

  const now = new Date().toISOString()
  return {
    ...asset,
    quantity: newQuantity,
    acquisitionPrice: newAvgPrice,
    currentPriceJpy: newCurrentPriceJpy > 0 ? newCurrentPriceJpy : asset.currentPriceJpy,
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

  const now = new Date().toISOString()
  return {
    ...asset,
    quantity: newQuantity,
    acquisitionPrice: newAcquisitionPrice,
    updatedAt: now,
  }
}
