/**
 * useTransactions - Custom hook bridging IndexedDB (dbService) and Zustand transactionStore.
 * Provides CRUD operations for transactions, with automatic asset quantity/price updates.
 */
import { useCallback, useState } from 'react'
import { useTransactionStore } from '@/store/transactionStore'
import { useAssetStore } from '@/store/assetStore'
import { useUiStore } from '@/store/uiStore'
import {
  saveTransaction,
  loadAllTransactions,
  deleteTransaction,
  loadTransactionsByAsset,
} from '@/utils/dbService'
import { saveAsset } from '@/utils/dbService'
import { applyBuyTransaction, applySellTransaction, applySplitTransaction } from '@/utils/transactionCalculator'
import { calcMovingAveragePrice } from '@/utils/calculations'
import type { TransactionFormData } from '@/utils/validators'
import type { Transaction } from '@/types/transaction.types'
import type { Asset } from '@/types/asset.types'

function generateId(): string {
  return crypto.randomUUID()
}

export function useTransactions() {
  const { transactions, setTransactions, addTransaction, removeTransaction } = useTransactionStore()
  const { updateAsset } = useAssetStore()
  const { addToast } = useUiStore()
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Load all transactions from IndexedDB and populate the Zustand store.
   */
  const loadTransactions = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      const txs = await loadAllTransactions()
      setTransactions(txs)
    } catch (err) {
      const message = err instanceof Error ? err.message : '取引データの読み込みに失敗しました'
      addToast({ type: 'error', message })
    } finally {
      setIsLoading(false)
    }
  }, [setTransactions, addToast])

  /**
   * Add a new transaction and update the associated asset's quantity/price.
   */
  const addTransactionAndUpdateAsset = useCallback(async (data: TransactionFormData): Promise<void> => {
    const id = generateId()
    const now = new Date().toISOString()

    const tx: Transaction = {
      id,
      assetId: data.assetId,
      type: data.type,
      date: data.date,
      quantity: data.quantity,
      price: data.price,
      amount: data.amount,
      fee: data.fee,
      exchangeRate: data.exchangeRate,
      note: data.note,
      createdAt: now,
      updatedAt: now,
    }

    // Find the associated asset from the store
    const currentAssets = useAssetStore.getState().assets
    const asset = currentAssets.find((a) => a.id === data.assetId)

    try {
      await saveTransaction(tx)
      addTransaction(tx)

      // Update asset based on transaction type
      if (asset) {
        let updatedAsset: Asset | null = null

        if (data.type === 'buy') {
          const exchangeRate = data.exchangeRate ?? 1
          updatedAsset = applyBuyTransaction(asset, data, exchangeRate)
        } else if (data.type === 'sell') {
          updatedAsset = applySellTransaction(asset, data)
        } else if (data.type === 'split') {
          // For split, quantity field holds the split ratio
          const splitRatio = data.quantity ?? 1
          updatedAsset = applySplitTransaction(asset, splitRatio)
        }
        // dividend, deposit, withdrawal, transfer, fee: asset unchanged

        if (updatedAsset) {
          await saveAsset(updatedAsset)
          updateAsset(asset.id, updatedAsset)
        }
      }

      addToast({ type: 'success', message: '取引を記録しました' })
    } catch (err) {
      const message = err instanceof Error ? err.message : '取引の記録に失敗しました'
      addToast({ type: 'error', message })
      throw err
    }
  }, [addTransaction, updateAsset, addToast])

  /**
   * Remove a transaction and recalculate the associated asset's quantity/price
   * by replaying all remaining transactions for that asset.
   */
  const removeTransactionAndUpdateAsset = useCallback(async (txId: string): Promise<void> => {
    const currentTx = useTransactionStore.getState().transactions.find((t) => t.id === txId)

    try {
      await deleteTransaction(txId)
      removeTransaction(txId)

      // Recalculate asset state by replaying remaining transactions
      if (currentTx) {
        const assetId = currentTx.assetId
        const currentAssets = useAssetStore.getState().assets
        const originalAsset = currentAssets.find((a) => a.id === assetId)

        if (originalAsset) {
          // Load all remaining transactions for this asset
          const remainingTxs = await loadTransactionsByAsset(assetId)

          // Sort by date ascending to replay in order
          remainingTxs.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          )

          // Reset asset to zero state and replay
          const resetAsset: Asset = {
            ...originalAsset,
            quantity: 0,
            acquisitionPrice: 0,
          }

          const recalculated = remainingTxs.reduce((acc: Asset, tx: Transaction) => {
            if (tx.type === 'buy' && tx.quantity != null && tx.price != null) {
              const newQty = acc.quantity + tx.quantity
              const newAvg = calcMovingAveragePrice(
                acc.quantity,
                acc.acquisitionPrice,
                tx.quantity,
                tx.price,
              )
              return { ...acc, quantity: newQty, acquisitionPrice: newAvg }
            } else if (tx.type === 'sell' && tx.quantity != null) {
              return { ...acc, quantity: Math.max(0, acc.quantity - tx.quantity) }
            } else if (tx.type === 'split' && tx.quantity != null) {
              return {
                ...acc,
                quantity: acc.quantity * tx.quantity,
                acquisitionPrice: acc.quantity > 0 ? acc.acquisitionPrice / tx.quantity : 0,
              }
            }
            return acc
          }, resetAsset)

          const finalAsset: Asset = { ...recalculated, updatedAt: new Date().toISOString() }
          await saveAsset(finalAsset)
          updateAsset(assetId, finalAsset)
        }
      }

      addToast({ type: 'success', message: '取引を削除しました' })
    } catch (err) {
      const message = err instanceof Error ? err.message : '取引の削除に失敗しました'
      addToast({ type: 'error', message })
      throw err
    }
  }, [removeTransaction, updateAsset, addToast])

  return {
    transactions,
    isLoading,
    loadTransactions,
    addTransactionAndUpdateAsset,
    removeTransactionAndUpdateAsset,
  }
}
