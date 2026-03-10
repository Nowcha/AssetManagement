/**
 * useSnapshot - Manages portfolio snapshot persistence and loading
 */
import { useState, useCallback } from 'react'
import { saveSnapshot, loadSnapshots, hasSnapshotToday } from '@/utils/snapshot'
import type { Asset } from '@/types/asset.types'
import type { PortfolioSnapshot } from '@/types/portfolio.types'

export interface UseSnapshotResult {
  snapshots: PortfolioSnapshot[]
  initializeSnapshots: (assets: Asset[]) => Promise<void>
  loadHistory: () => Promise<void>
}

export function useSnapshot(): UseSnapshotResult {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([])

  /**
   * Called on app start after assets are loaded.
   * Saves today's snapshot if not yet saved, then loads history.
   */
  const initializeSnapshots = useCallback(async (assets: Asset[]): Promise<void> => {
    try {
      const alreadySaved = await hasSnapshotToday()
      if (!alreadySaved && assets.length > 0) {
        await saveSnapshot(assets)
      }
      const history = await loadSnapshots()
      setSnapshots(history)
    } catch (err) {
      console.warn('Failed to initialize snapshots:', err)
    }
  }, [])

  /**
   * Reload snapshot history from IndexedDB.
   */
  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      const history = await loadSnapshots()
      setSnapshots(history)
    } catch (err) {
      console.warn('Failed to load snapshot history:', err)
    }
  }, [])

  return { snapshots, initializeSnapshots, loadHistory }
}
