/**
 * Unlock page - パスワード入力によるロック解除画面
 * 暗号化が有効な場合、起動時にこの画面が表示される
 */
import { useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { deriveKey, verifyPassword } from '@/utils/crypto'

export function Unlock() {
  const { settings, unlock } = useSettingsStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleUnlock = async () => {
    setError('')
    if (!password) {
      setError('パスワードを入力してください')
      return
    }

    const salt = settings.encryptionSaltHex
    const verifierRaw = settings.encryptionKeyVerifier

    if (!salt || !verifierRaw) {
      setError('暗号化設定が見つかりません。設定画面で再設定してください。')
      return
    }

    setIsLoading(true)
    try {
      const verifier = JSON.parse(verifierRaw) as { data: string; iv: string }
      const key = await deriveKey(password, salt)
      const valid = await verifyPassword(key, verifier.data, verifier.iv)

      if (!valid) {
        setError('パスワードが正しくありません')
        return
      }

      unlock(key)
    } catch {
      setError('ロック解除に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

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

        <p className="mb-5 text-center text-sm" style={{ color: '#868F97' }}>
          パスワードを入力してロックを解除してください
        </p>

        <div className="space-y-3">
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleUnlock()
            }}
            className="input-dark w-full"
            autoFocus
            disabled={isLoading}
          />

          {error && (
            <p className="text-xs" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleUnlock()}
          disabled={isLoading}
          className="btn-accent mt-5 w-full justify-center"
          style={{ opacity: isLoading ? 0.6 : 1 }}
        >
          {isLoading ? '確認中...' : 'ロック解除'}
        </button>

        <p className="mt-4 text-center text-xs" style={{ color: '#4B5563' }}>
          パスワードを忘れた場合、データを復元することはできません
        </p>
      </div>
    </div>
  )
}
