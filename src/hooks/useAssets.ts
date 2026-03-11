/**
 * useAssets - Custom hook bridging IndexedDB (dbService) and Zustand assetStore.
 * Provides CRUD operations for assets with error handling via toast notifications.
 */
import { useCallback } from 'react'
import { useAssetStore } from '@/store/assetStore'
import { useUiStore } from '@/store/uiStore'
import { saveAsset, loadAllAssets, deleteAsset } from '@/utils/dbService'
import type { AssetFormData } from '@/utils/validators'
import type { Asset } from '@/types/asset.types'

/** Generate a simple UUID v4 using crypto.randomUUID (available in modern browsers) */
function generateId(): string {
  return crypto.randomUUID()
}

/** Build a full Asset object from form data */
function buildAsset(id: string, data: AssetFormData, now: string): Asset {
  return {
    id,
    name: data.name,
    ticker: data.ticker,
    assetClass: data.assetClass,
    accountType: data.accountType,
    currency: data.currency,
    quantity: data.quantity,
    acquisitionPrice: data.acquisitionPrice,
    currentPrice: data.currentPrice,
    // currentPriceJpy: for non-JPY currencies a conversion would be needed;
    // in Sprint 4, price sync will handle this. For now use currentPrice directly.
    currentPriceJpy: data.currentPrice,
    note: data.note,
    tags: data.tags,
    createdAt: now,
    updatedAt: now,
  }
}

export function useAssets() {
  const { setAssets, addAsset: storeAddAsset, updateAsset: storeUpdateAsset, removeAsset: storeRemoveAsset, setLoading } = useAssetStore()
  const { addToast } = useUiStore()

  /**
   * Load all assets from IndexedDB and populate the Zustand store.
   * Called on app initialization.
   */
  const loadAssets = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const assets = await loadAllAssets()
      setAssets(assets)
    } catch (err) {
      const message = err instanceof Error ? err.message : '資産データの読み込みに失敗しました'
      addToast({ type: 'error', message })
    } finally {
      setLoading(false)
    }
  }, [setAssets, setLoading, addToast])

  /**
   * Add a new asset: generates a UUID, saves to DB, and adds to the store.
   */
  const addAsset = useCallback(async (data: AssetFormData): Promise<void> => {
    const id = generateId()
    const now = new Date().toISOString()
    const asset = buildAsset(id, data, now)

    try {
      await saveAsset(asset)
      storeAddAsset(asset)
      addToast({ type: 'success', message: '資産を登録しました' })
    } catch (err) {
      const message = err instanceof Error ? err.message : '資産の登録に失敗しました'
      addToast({ type: 'error', message })
      throw err
    }
  }, [storeAddAsset, addToast])

  /**
   * Update an existing asset by ID: merges patch into stored asset, saves to DB, updates store.
   */
  const updateAsset = useCallback(async (id: string, data: Partial<AssetFormData>): Promise<void> => {
    // Retrieve the current asset from the store to merge
    const currentAssets = useAssetStore.getState().assets
    const existing = currentAssets.find((a) => a.id === id)
    if (!existing) {
      addToast({ type: 'error', message: '更新対象の資産が見つかりません' })
      return
    }

    const updatedAt = new Date().toISOString()
    const updated: Asset = {
      ...existing,
      ...data,
      // Sync currentPriceJpy with currentPrice if updated (Sprint 4 will do proper conversion)
      currentPriceJpy: data.currentPrice ?? existing.currentPriceJpy,
      updatedAt,
    }

    try {
      await saveAsset(updated)
      storeUpdateAsset(id, updated)
      addToast({ type: 'success', message: '資産を更新しました' })
    } catch (err) {
      const message = err instanceof Error ? err.message : '資産の更新に失敗しました'
      addToast({ type: 'error', message })
      throw err
    }
  }, [storeUpdateAsset, addToast])

  /**
   * Remove an asset by ID from both DB and store.
   */
  const removeAsset = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteAsset(id)
      storeRemoveAsset(id)
      addToast({ type: 'success', message: '資産を削除しました' })
    } catch (err) {
      const message = err instanceof Error ? err.message : '資産の削除に失敗しました'
      addToast({ type: 'error', message })
      throw err
    }
  }, [storeRemoveAsset, addToast])

  return { loadAssets, addAsset, updateAsset, removeAsset }
}
