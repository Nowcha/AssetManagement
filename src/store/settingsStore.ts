import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/types/settings.types'
import { DEFAULT_SETTINGS } from '@/types/settings.types'

interface SettingsState {
  settings: AppSettings
  /** 暗号化有効かつ未ロック解除の状態（永続化しない） */
  isLocked: boolean
  /** 現在のセッションで使用する暗号化キー（永続化しない） */
  cryptoKey: CryptoKey | null
  updateSettings: (patch: Partial<AppSettings>) => void
  lock: () => void
  unlock: (key?: CryptoKey) => void
  setKey: (key: CryptoKey | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      isLocked: false,
      cryptoKey: null,

      updateSettings: (patch) =>
        set((state) => ({
          settings: { ...state.settings, ...patch },
        })),

      lock: () => set({ isLocked: true, cryptoKey: null }),

      unlock: (key) => set({ isLocked: false, cryptoKey: key ?? null }),

      setKey: (key) => set({ cryptoKey: key }),
    }),
    {
      name: 'asset-mgmt-settings',
      // isLocked と cryptoKey はセッション状態なので永続化しない
      partialize: (state) => ({ settings: state.settings }),
      onRehydrateStorage: () => (state) => {
        // ページ読み込み時、暗号化が有効なら再ロック
        if (state?.settings.isEncryptionEnabled) {
          state.isLocked = true
        }
      },
    },
  ),
)
