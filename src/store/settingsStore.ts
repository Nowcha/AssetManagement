import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings } from '@/types/settings.types'
import { DEFAULT_SETTINGS } from '@/types/settings.types'

interface SettingsState {
  settings: AppSettings
  isLocked: boolean              // 暗号化有効かつ未ロック解除の状態
  updateSettings: (patch: Partial<AppSettings>) => void
  lock: () => void
  unlock: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      isLocked: false,

      updateSettings: (patch) =>
        set((state) => ({
          settings: { ...state.settings, ...patch },
        })),

      lock: () => set({ isLocked: true }),

      unlock: () => set({ isLocked: false }),
    }),
    {
      name: 'asset-mgmt-settings',
      // isLockedはセッション状態なので永続化しない
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
)
