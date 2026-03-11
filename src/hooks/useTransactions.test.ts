/**
 * Unit tests for useTransactions hook
 * Tests CRUD operations and asset state synchronization
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTransactions } from './useTransactions'
import { useTransactionStore } from '@/store/transactionStore'
import { useAssetStore } from '@/store/assetStore'
import { useUiStore } from '@/store/uiStore'
import { db } from '@/utils/db'
import type { TransactionFormData } from '@/utils/validators'
import type { Asset } from '@/types/asset.types'

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

// Reset all stores and DB before each test
beforeEach(async () => {
  await db.assets.clear()
  await db.transactions.clear()
  useTransactionStore.setState({ transactions: [], isLoading: false, error: null })
  useAssetStore.setState({ assets: [], isLoading: false, error: null })
  useUiStore.setState({ activeModal: null, modalPayload: null, toasts: [] })
})

describe('useTransactions.loadTransactions', () => {
  it('loads transactions from IndexedDB into the store', async () => {
    // First add a transaction
    const asset = makeAsset()
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx())
    })

    // Reset store and reload
    useTransactionStore.setState({ transactions: [] })

    const { result: result2 } = renderHook(() => useTransactions())
    await act(async () => {
      await result2.current.loadTransactions()
    })

    const { transactions } = useTransactionStore.getState()
    expect(transactions).toHaveLength(1)
  })

  it('shows error toast on load failure', async () => {
    const { vi } = await import('vitest')
    const spy = vi.spyOn(db.transactions, 'toArray').mockRejectedValueOnce(new Error('DB error'))

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.loadTransactions()
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'error')).toBe(true)

    spy.mockRestore()
  })
})

describe('useTransactions.addTransactionAndUpdateAsset', () => {
  it('adds transaction to store and DB', async () => {
    const asset = makeAsset()
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx())
    })

    const { transactions } = useTransactionStore.getState()
    expect(transactions).toHaveLength(1)
    expect(transactions[0].type).toBe('buy')
    expect(transactions[0].assetId).toBe('asset-1')

    const records = await db.transactions.toArray()
    expect(records).toHaveLength(1)
  })

  it('updates asset quantity on buy transaction', async () => {
    const asset = makeAsset({ quantity: 100 })
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx({ quantity: 50 }))
    })

    const { assets } = useAssetStore.getState()
    expect(assets[0].quantity).toBe(150)
  })

  it('updates asset acquisition price on buy transaction using moving average', async () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1000 })
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx({ quantity: 100, price: 1200 }))
    })

    const { assets } = useAssetStore.getState()
    // (100 * 1000 + 100 * 1200) / 200 = 1100
    expect(assets[0].acquisitionPrice).toBe(1100)
  })

  it('decreases asset quantity on sell transaction', async () => {
    const asset = makeAsset({ quantity: 100 })
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset({
        assetId: 'asset-1',
        type: 'sell',
        date: '2024-06-01',
        quantity: 30,
        price: 1500,
        amount: 45000,
      })
    })

    const { assets } = useAssetStore.getState()
    expect(assets[0].quantity).toBe(70)
  })

  it('does not change asset on dividend transaction', async () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1000 })
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset({
        assetId: 'asset-1',
        type: 'dividend',
        date: '2024-06-01',
        amount: 5000,
      })
    })

    const { assets } = useAssetStore.getState()
    expect(assets[0].quantity).toBe(100)
    expect(assets[0].acquisitionPrice).toBe(1000)
  })

  it('shows success toast after adding transaction', async () => {
    const asset = makeAsset()
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx())
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'success')).toBe(true)
  })

  it('works even when asset is not found in store', async () => {
    // No asset in store - transaction should still be saved
    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx())
    })

    const { transactions } = useTransactionStore.getState()
    expect(transactions).toHaveLength(1)
  })
})

describe('useTransactions.removeTransactionAndUpdateAsset', () => {
  it('removes transaction from store and DB', async () => {
    const asset = makeAsset()
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx())
    })

    const txId = useTransactionStore.getState().transactions[0].id

    await act(async () => {
      await result.current.removeTransactionAndUpdateAsset(txId)
    })

    const { transactions } = useTransactionStore.getState()
    expect(transactions).toHaveLength(0)

    const records = await db.transactions.toArray()
    expect(records).toHaveLength(0)
  })

  it('shows success toast after removing transaction', async () => {
    const asset = makeAsset()
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx())
    })

    useUiStore.setState({ toasts: [] })
    const txId = useTransactionStore.getState().transactions[0].id

    await act(async () => {
      await result.current.removeTransactionAndUpdateAsset(txId)
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'success')).toBe(true)
  })

  it('recalculates asset quantity after removing a buy transaction', async () => {
    const asset = makeAsset({ quantity: 100, acquisitionPrice: 1000 })
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())

    // Add two buy transactions
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx({ quantity: 50, price: 1000 }))
    })
    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx({ quantity: 30, price: 1200 }))
    })

    // Remove the first transaction
    const firstTxId = useTransactionStore.getState().transactions[0].id
    await act(async () => {
      await result.current.removeTransactionAndUpdateAsset(firstTxId)
    })

    // After removing the first buy (50 @ 1000), only second buy (30 @ 1200) remains
    // Asset starts from 0 (reset), then adds 30 @ 1200
    const { assets } = useAssetStore.getState()
    expect(assets[0].quantity).toBe(30)
  })
})

describe('useTransactions.updateTransactionAndRecalculateAsset', () => {
  it('updates transaction fields in store and DB', async () => {
    const asset = makeAsset({ quantity: 0, acquisitionPrice: 0 })
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())

    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx({ quantity: 50, price: 1000, amount: 50000 }))
    })

    const txId = useTransactionStore.getState().transactions[0].id

    await act(async () => {
      await result.current.updateTransactionAndRecalculateAsset(txId, makeBuyTx({ quantity: 50, price: 1500, amount: 75000 }))
    })

    const updated = useTransactionStore.getState().transactions.find((t) => t.id === txId)
    expect(updated?.price).toBe(1500)
    expect(updated?.amount).toBe(75000)
  })

  it('recalculates asset acquisitionPrice after update', async () => {
    const asset = makeAsset({ quantity: 0, acquisitionPrice: 0 })
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())

    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx({ quantity: 100, price: 1000, amount: 100000 }))
    })

    const txId = useTransactionStore.getState().transactions[0].id

    await act(async () => {
      await result.current.updateTransactionAndRecalculateAsset(txId, makeBuyTx({ quantity: 100, price: 2000, amount: 200000 }))
    })

    const updatedAsset = useAssetStore.getState().assets.find((a) => a.id === 'asset-1')
    expect(updatedAsset?.acquisitionPrice).toBe(2000)
    expect(updatedAsset?.quantity).toBe(100)
  })

  it('shows success toast after update', async () => {
    const asset = makeAsset({ quantity: 0, acquisitionPrice: 0 })
    useAssetStore.setState({ assets: [asset] })

    const { result } = renderHook(() => useTransactions())

    await act(async () => {
      await result.current.addTransactionAndUpdateAsset(makeBuyTx())
    })

    const txId = useTransactionStore.getState().transactions[0].id
    useUiStore.setState({ toasts: [] })

    await act(async () => {
      await result.current.updateTransactionAndRecalculateAsset(txId, makeBuyTx({ price: 1500, amount: 75000 }))
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'success')).toBe(true)
  })

  it('does nothing when transaction id is not found', async () => {
    const { result } = renderHook(() => useTransactions())

    await act(async () => {
      await result.current.updateTransactionAndRecalculateAsset('non-existent-id', makeBuyTx())
    })

    expect(useTransactionStore.getState().transactions).toHaveLength(0)
  })
})
