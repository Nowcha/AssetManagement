/**
 * Assets page - handles routes for asset list, new asset, and edit asset
 * Routes:
 *   /assets       → AssetList + "Add asset" button
 *   /assets/new   → AssetForm for creation
 *   /assets/:id   → AssetForm for editing with defaultValues
 */
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { useAssetStore } from '@/store/assetStore'
import { useAssets } from '@/hooks/useAssets'
import { AssetList } from '@/components/assets/AssetList'
import { AssetForm } from '@/components/assets/AssetForm'
import type { AssetFormData } from '@/utils/validators'

// --- Sub-pages ---

function AssetListPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">資産管理</h2>
        <Link to="/assets/new" className="btn-accent">
          + 資産を追加
        </Link>
      </div>
      <AssetList />
    </div>
  )
}

function NewAssetPage() {
  const navigate = useNavigate()
  const { addAsset } = useAssets()

  const handleSubmit = async (data: AssetFormData) => {
    await addAsset(data)
    navigate('/assets')
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/assets"
          className="text-sm transition-colors hover:text-white"
          style={{ color: '#868F97' }}
          aria-label="資産一覧に戻る"
        >
          ← 一覧に戻る
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
        <h2 className="text-xl font-semibold text-white">資産を登録</h2>
      </div>
      <div className="glass-card p-6">
        <AssetForm
          onSubmit={handleSubmit}
          onCancel={() => { navigate('/assets'); }}
        />
      </div>
    </div>
  )
}

function EditAssetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { assets } = useAssetStore()
  const { updateAsset } = useAssets()

  const asset = assets.find((a) => a.id === id)

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p style={{ color: '#868F97' }}>資産が見つかりません</p>
        <Link
          to="/assets"
          className="mt-4 text-sm hover:underline"
          style={{ color: '#FFA16C' }}
        >
          資産一覧に戻る
        </Link>
      </div>
    )
  }

  const defaultValues: Partial<AssetFormData> = {
    name: asset.name,
    ticker: asset.ticker ?? '',
    assetClass: asset.assetClass,
    accountType: asset.accountType,
    currency: asset.currency,
    quantity: asset.quantity,
    acquisitionPrice: asset.acquisitionPrice,
    currentPrice: asset.currentPrice,
    note: asset.note ?? '',
    tags: asset.tags,
  }

  const handleSubmit = async (data: AssetFormData) => {
    await updateAsset(asset.id, data)
    navigate('/assets')
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/assets"
          className="text-sm transition-colors hover:text-white"
          style={{ color: '#868F97' }}
          aria-label="資産一覧に戻る"
        >
          ← 一覧に戻る
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
        <h2 className="text-xl font-semibold text-white">資産を編集</h2>
      </div>
      <div className="glass-card p-6">
        <AssetForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => { navigate('/assets'); }}
        />
      </div>
    </div>
  )
}

// --- Main export ---

export function Assets() {
  return (
    <Routes>
      <Route index element={<AssetListPage />} />
      <Route path="new" element={<NewAssetPage />} />
      <Route path=":id" element={<EditAssetPage />} />
    </Routes>
  )
}
