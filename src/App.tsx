import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { Assets } from '@/pages/Assets'
import { Transactions } from '@/pages/Transactions'
import { Performance } from '@/pages/Performance'
import { Simulation } from '@/pages/Simulation'
import { Reports } from '@/pages/Reports'
import { Settings } from '@/pages/Settings'
import { Unlock } from '@/pages/Unlock'
import { ToastContainer } from '@/components/common/Toast'
import { useSettingsStore } from '@/store/settingsStore'
import { useAssets } from '@/hooks/useAssets'
import { useAssetStore } from '@/store/assetStore'
import { useSnapshot } from '@/hooks/useSnapshot'
import { useTransactions } from '@/hooks/useTransactions'
import { usePriceSync } from '@/hooks/usePriceSync'

function AppContent() {
  const { settings, isLocked } = useSettingsStore()
  const { loadAssets } = useAssets()
  const { assets } = useAssetStore()
  const { initializeSnapshots } = useSnapshot()
  const { loadTransactions } = useTransactions()

  // 暗号化が無効な場合は常にロック解除状態
  const locked = settings.isEncryptionEnabled ? isLocked : false

  // Load assets and transactions from IndexedDB on mount
  useEffect(() => {
    if (!locked) {
      void loadAssets()
      void loadTransactions()
    }
  }, [locked, loadAssets, loadTransactions])

  // Save/load snapshots once assets are available
  useEffect(() => {
    if (assets.length > 0 && !locked) {
      void initializeSnapshots(assets)
    }
  }, [assets, locked, initializeSnapshots])

  return (
    <>
      {locked ? (
        <Routes>
          <Route path="/unlock" element={<Unlock />} />
          <Route path="*" element={<Navigate to="/unlock" replace />} />
        </Routes>
      ) : (
        <AppShell>
          <PriceSyncInitializer />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets/*" element={<Assets />} />
            <Route path="/transactions/*" element={<Transactions />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings/*" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      )}
      <ToastContainer />
    </>
  )
}

/** 価格自動更新インターバルを管理するコンポーネント（副作用のみ、何も描画しない） */
function PriceSyncInitializer() {
  // usePriceSync内でpriceAutoRefreshとintervalを監視してタイマーを設定する
  usePriceSync()
  return null
}

function App() {
  return (
    <BrowserRouter basename="/AssetManagement">
      <AppContent />
    </BrowserRouter>
  )
}

export default App
