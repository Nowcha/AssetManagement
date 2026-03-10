import { useSettingsStore } from '@/store/settingsStore'

export function Unlock() {
  const { unlock } = useSettingsStore()

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#090909' }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold"
            style={{ backgroundColor: '#FFA16C', color: '#000' }}
          >
            A
          </div>
          <h1 className="text-xl font-semibold text-white">AssetManagement</h1>
        </div>

        <p className="mb-6 text-center text-sm" style={{ color: '#868F97' }}>
          パスワードを入力してロックを解除してください
        </p>

        <button
          type="button"
          onClick={unlock}
          className="btn-accent w-full justify-center"
        >
          ロック解除（開発用）
        </button>
      </div>
    </div>
  )
}
