import { create } from 'zustand'
import type { Asset } from '@/types/asset.types'

interface AssetState {
  assets: Asset[]
  isLoading: boolean
  error: string | null
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, patch: Partial<Asset>) => void
  removeAsset: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useAssetStore = create<AssetState>()((set) => ({
  assets: [],
  isLoading: false,
  error: null,

  setAssets: (assets) => { set({ assets }); },

  addAsset: (asset) =>
    { set((state) => ({ assets: [...state.assets, asset] })); },

  updateAsset: (id, patch) =>
    { set((state) => ({
      assets: state.assets.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    })); },

  removeAsset: (id) =>
    { set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    })); },

  setLoading: (isLoading) => { set({ isLoading }); },

  setError: (error) => { set({ error }); },
}))
