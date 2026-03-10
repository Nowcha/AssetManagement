/**
 * Unit tests for useAssets hook
 * Tests CRUD operations and store synchronization
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAssets } from './useAssets'
import { useAssetStore } from '@/store/assetStore'
import { useUiStore } from '@/store/uiStore'
import { db } from '@/utils/db'
import type { AssetFormData } from '@/utils/validators'

// Reset stores and DB before each test
beforeEach(async () => {
  await db.assets.clear()
  // Reset Zustand stores
  useAssetStore.setState({ assets: [], isLoading: false, error: null })
  useUiStore.setState({ activeModal: null, modalPayload: null, toasts: [] })
})

const sampleFormData: AssetFormData = {
  name: 'テスト株式',
  ticker: 'TEST',
  assetClass: 'stock_jp',
  accountType: 'taxable',
  currency: 'JPY',
  quantity: 100,
  acquisitionPrice: 1000,
  currentPrice: 1200,
  tags: [],
}

describe('useAssets.loadAssets', () => {
  it('loads assets from IndexedDB into the store', async () => {
    // Pre-populate DB
    const { result: addResult } = renderHook(() => useAssets())
    await act(async () => {
      await addResult.current.addAsset(sampleFormData)
    })

    // Reset store and reload
    useAssetStore.setState({ assets: [] })
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.loadAssets()
    })

    const { assets } = useAssetStore.getState()
    expect(assets).toHaveLength(1)
    expect(assets[0].name).toBe('テスト株式')
  })

  it('sets isLoading to false after loading', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.loadAssets()
    })

    const { isLoading } = useAssetStore.getState()
    expect(isLoading).toBe(false)
  })

  it('shows error toast on DB failure', async () => {
    const spy = vi.spyOn(db.assets, 'toArray').mockRejectedValueOnce(new Error('DB error'))

    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.loadAssets()
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'error')).toBe(true)

    spy.mockRestore()
  })
})

describe('useAssets.addAsset', () => {
  it('adds an asset to the store and DB', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.addAsset(sampleFormData)
    })

    const { assets } = useAssetStore.getState()
    expect(assets).toHaveLength(1)
    expect(assets[0].name).toBe('テスト株式')
    expect(assets[0].id).toBeTruthy()

    const records = await db.assets.toArray()
    expect(records).toHaveLength(1)
  })

  it('generates a unique id for each asset', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.addAsset(sampleFormData)
      await result.current.addAsset({ ...sampleFormData, name: '別の資産' })
    })

    const { assets } = useAssetStore.getState()
    expect(assets[0].id).not.toBe(assets[1].id)
  })

  it('shows success toast after adding', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.addAsset(sampleFormData)
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'success')).toBe(true)
  })

  it('shows error toast and rethrows on DB failure', async () => {
    const spy = vi.spyOn(db.assets, 'put').mockRejectedValueOnce(new Error('put failed'))

    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await expect(result.current.addAsset(sampleFormData)).rejects.toThrow('put failed')
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'error')).toBe(true)

    spy.mockRestore()
  })
})

describe('useAssets.updateAsset', () => {
  it('updates asset in store and DB', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.addAsset(sampleFormData)
    })

    const { assets } = useAssetStore.getState()
    const id = assets[0].id

    await act(async () => {
      await result.current.updateAsset(id, { name: '更新後の名前', currentPrice: 1500 })
    })

    const updated = useAssetStore.getState().assets[0]
    expect(updated.name).toBe('更新後の名前')
    expect(updated.currentPrice).toBe(1500)

    // DB should be updated too
    const records = await db.assets.toArray()
    expect(JSON.parse(records[0].data).name).toBe('更新後の名前')
  })

  it('shows error toast when asset id is not found', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.updateAsset('non-existent-id', { name: '更新' })
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'error')).toBe(true)
  })

  it('shows success toast after updating', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.addAsset(sampleFormData)
    })

    useUiStore.setState({ toasts: [] }) // clear previous toast
    const id = useAssetStore.getState().assets[0].id

    await act(async () => {
      await result.current.updateAsset(id, { name: '更新' })
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'success')).toBe(true)
  })
})

describe('useAssets.updateAsset (error paths)', () => {
  it('shows error toast and rethrows on DB failure during update', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.addAsset(sampleFormData)
    })

    const id = useAssetStore.getState().assets[0].id
    const spy = vi.spyOn(db.assets, 'put').mockRejectedValueOnce(new Error('update failed'))

    await act(async () => {
      await expect(result.current.updateAsset(id, { name: '更新' })).rejects.toThrow('update failed')
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'error')).toBe(true)

    spy.mockRestore()
  })
})

describe('useAssets.removeAsset', () => {
  it('removes asset from store and DB', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.addAsset(sampleFormData)
    })

    const id = useAssetStore.getState().assets[0].id

    await act(async () => {
      await result.current.removeAsset(id)
    })

    const { assets } = useAssetStore.getState()
    expect(assets).toHaveLength(0)

    const records = await db.assets.toArray()
    expect(records).toHaveLength(0)
  })

  it('shows success toast after removal', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.addAsset(sampleFormData)
    })

    useUiStore.setState({ toasts: [] })
    const id = useAssetStore.getState().assets[0].id

    await act(async () => {
      await result.current.removeAsset(id)
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'success')).toBe(true)
  })

  it('shows error toast and rethrows on DB failure', async () => {
    const { result } = renderHook(() => useAssets())
    await act(async () => {
      await result.current.addAsset(sampleFormData)
    })

    const id = useAssetStore.getState().assets[0].id
    const spy = vi.spyOn(db.assets, 'delete').mockRejectedValueOnce(new Error('delete failed'))

    await act(async () => {
      await expect(result.current.removeAsset(id)).rejects.toThrow('delete failed')
    })

    const { toasts } = useUiStore.getState()
    expect(toasts.some((t) => t.type === 'error')).toBe(true)

    spy.mockRestore()
  })
})
