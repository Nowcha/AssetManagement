/**
 * Settings page - アプリ設定画面
 * 表示設定 / 価格連携 / セキュリティ / データ管理
 */
import { useState, useRef } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useUiStore } from '@/store/uiStore'
import { useAssetStore } from '@/store/assetStore'
import { Modal } from '@/components/common/Modal'
import {
  generateSalt,
  deriveKey,
  createVerifier,
  verifyPassword,
} from '@/utils/crypto'
import { loadAllAssets, saveAsset, loadAllTransactions, saveTransaction } from '@/utils/dbService'
import { db } from '@/utils/db'
import type { Asset } from '@/types/asset.types'
import type { Transaction } from '@/types/transaction.types'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: '#FFA16C' }}>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs" style={{ color: '#868F97' }}>
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => { onChange(!checked); }}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      style={{
        backgroundColor: checked ? '#FFA16C' : 'rgba(255,255,255,0.1)',
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Password Dialog
// ---------------------------------------------------------------------------

interface PasswordDialogProps {
  isOpen: boolean
  title: string
  description: string
  onConfirm: (password: string) => Promise<void>
  onCancel: () => void
  requireConfirm?: boolean
}

function PasswordDialog({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  requireConfirm = false,
}: PasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (requireConfirm && password !== confirm) {
      setError('パスワードが一致しません')
      return
    }

    setIsLoading(true)
    try {
      await onConfirm(password)
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '処理に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setPassword('')
    setConfirm('')
    setError('')
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={handleCancel}
        aria-hidden="true"
      />
      <div
        className="animate-fade-in relative z-10 w-full max-w-sm rounded-xl p-6"
        style={{
          background: 'rgba(17,17,17,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
        }}
      >
        <h2 className="mb-2 text-base font-semibold text-white">{title}</h2>
        <p className="mb-4 text-xs" style={{ color: '#868F97' }}>
          {description}
        </p>

        <div className="space-y-3">
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit() }}
            className="input-dark w-full"
            autoFocus
          />
          {requireConfirm && (
            <input
              type="password"
              placeholder="パスワード（確認）"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit() }}
              className="input-dark w-full"
            />
          )}
          {error && (
            <p className="text-xs" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={handleCancel} className="btn-ghost">
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading}
            className="btn-accent"
          >
            {isLoading ? '処理中...' : '確定'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------

export function Settings() {
  const { settings, updateSettings, lock } = useSettingsStore()
  const { addToast } = useUiStore()
  const { assets } = useAssetStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dialog state
  const [showEnableEncDialog, setShowEnableEncDialog] = useState(false)
  const [showDisableEncDialog, setShowDisableEncDialog] = useState(false)
  const [showChangePassDialog, setShowChangePassDialog] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showAlphaKey, setShowAlphaKey] = useState(false)
  const [showJQuantsKey, setShowJQuantsKey] = useState(false)
  const [alphaKeyDraft, setAlphaKeyDraft] = useState(settings.alphaVantageApiKey ?? '')
  const [jQuantsDraft, setJQuantsDraft] = useState(settings.jQuantsRefreshToken ?? '')

  // ---------------------------------------------------------------------------
  // Encryption helpers
  // ---------------------------------------------------------------------------

  const handleEnableEncryption = async (password: string) => {
    const salt = generateSalt()
    const key = await deriveKey(password, salt)
    const { data, iv } = await createVerifier(key)

    updateSettings({
      isEncryptionEnabled: true,
      encryptionSaltHex: salt,
      encryptionKeyVerifier: JSON.stringify({ data, iv }),
    })

    setShowEnableEncDialog(false)
    addToast({ type: 'success', message: '暗号化を有効化しました。アプリを再起動後に有効になります。' })
  }

  const handleDisableEncryption = async (password: string) => {
    const salt = settings.encryptionSaltHex
    const verifierRaw = settings.encryptionKeyVerifier

    if (!salt || !verifierRaw) {
      throw new Error('暗号化設定が見つかりません')
    }

    const verifier = JSON.parse(verifierRaw) as { data: string; iv: string }
    const key = await deriveKey(password, salt)
    const valid = await verifyPassword(key, verifier.data, verifier.iv)

    if (!valid) {
      throw new Error('パスワードが正しくありません')
    }

    updateSettings({
      isEncryptionEnabled: false,
      encryptionSaltHex: undefined,
      encryptionKeyVerifier: undefined,
    })

    setShowDisableEncDialog(false)
    addToast({ type: 'success', message: '暗号化を無効化しました' })
  }

  const handleChangePassword = async (newPassword: string) => {
    const salt = generateSalt()
    const key = await deriveKey(newPassword, salt)
    const { data, iv } = await createVerifier(key)

    updateSettings({
      encryptionSaltHex: salt,
      encryptionKeyVerifier: JSON.stringify({ data, iv }),
    })

    setShowChangePassDialog(false)
    // Re-lock to force unlock with new password
    lock()
    addToast({ type: 'success', message: 'パスワードを変更しました。新しいパスワードで再ログインしてください。' })
  }

  // ---------------------------------------------------------------------------
  // API key save
  // ---------------------------------------------------------------------------

  const saveAlphaKey = () => {
    updateSettings({ alphaVantageApiKey: alphaKeyDraft.trim() || undefined })
    addToast({ type: 'success', message: 'Alpha Vantage APIキーを保存しました' })
    setShowAlphaKey(false)
  }

  const saveJQuantsKey = () => {
    updateSettings({ jQuantsRefreshToken: jQuantsDraft.trim() || undefined })
    addToast({ type: 'success', message: 'J-Quants リフレッシュトークンを保存しました' })
    setShowJQuantsKey(false)
  }

  // ---------------------------------------------------------------------------
  // Backup export/import
  // ---------------------------------------------------------------------------

  const handleExport = async () => {
    try {
      const [dbAssets, dbTransactions] = await Promise.all([
        loadAllAssets(),
        loadAllTransactions(),
      ])

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        assets: dbAssets,
        transactions: dbTransactions,
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asset-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      updateSettings({ lastBackupAt: new Date().toISOString() })
      addToast({ type: 'success', message: 'バックアップをエクスポートしました' })
    } catch {
      addToast({ type: 'error', message: 'エクスポートに失敗しました' })
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const backup = JSON.parse(text) as {
        version: number
        assets?: Asset[]
        transactions?: Transaction[]
      }

      if (backup.version !== 1) {
        addToast({ type: 'error', message: '対応していないバックアップ形式です' })
        return
      }

      if (backup.assets) {
        await Promise.all(backup.assets.map((a) => saveAsset(a)))
      }
      if (backup.transactions) {
        await Promise.all(backup.transactions.map((t) => saveTransaction(t)))
      }

      addToast({ type: 'success', message: 'バックアップをインポートしました。ページを再読み込みしてください。' })
    } catch {
      addToast({ type: 'error', message: 'インポートに失敗しました（JSONの形式を確認してください）' })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ---------------------------------------------------------------------------
  // Data reset
  // ---------------------------------------------------------------------------

  const handleReset = async () => {
    try {
      await db.assets.clear()
      await db.transactions.clear()
      await db.snapshots.clear()
      updateSettings({
        isEncryptionEnabled: false,
        encryptionSaltHex: undefined,
        encryptionKeyVerifier: undefined,
        alphaVantageApiKey: undefined,
        jQuantsRefreshToken: undefined,
        lastBackupAt: undefined,
      })
      setShowResetModal(false)
      addToast({ type: 'success', message: 'すべてのデータをリセットしました。ページを再読み込みしてください。' })
    } catch {
      addToast({ type: 'error', message: 'リセットに失敗しました' })
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasAlphaKey = Boolean(settings.alphaVantageApiKey)
  const hasJQuantsKey = Boolean(settings.jQuantsRefreshToken)

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-white">設定</h2>

      {/* ── 表示設定 ── */}
      <SectionCard title="表示設定">
        <SettingRow label="表示通貨" description="評価額の表示に使用する通貨">
          <div className="flex gap-2">
            {(['JPY', 'USD'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { updateSettings({ displayCurrency: c }); }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                style={
                  settings.displayCurrency === c
                    ? { background: '#FFA16C', color: '#000' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#868F97' }
                }
              >
                {c}
              </button>
            ))}
          </div>
        </SettingRow>
      </SectionCard>

      {/* ── 価格連携 ── */}
      <SectionCard title="価格連携">
        <SettingRow
          label="価格自動更新"
          description="設定した間隔で外部APIから最新価格を取得します"
        >
          <Toggle
            checked={settings.priceAutoRefresh}
            onChange={(v) => { updateSettings({ priceAutoRefresh: v }); }}
          />
        </SettingRow>

        {settings.priceAutoRefresh && (
          <SettingRow label="更新間隔（分）" description="最短15分を推奨">
            <select
              value={settings.priceRefreshIntervalMinutes}
              onChange={(e) =>
                { updateSettings({ priceRefreshIntervalMinutes: parseInt(e.target.value, 10) }); }
              }
              className="input-dark w-28 py-1.5 text-sm"
            >
              {[15, 30, 60, 120, 360].map((m) => (
                <option key={m} value={m}>
                  {m}分
                </option>
              ))}
            </select>
          </SettingRow>
        )}

        <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="mb-3 text-xs font-medium" style={{ color: '#868F97' }}>
            APIキー設定
          </p>

          {/* Alpha Vantage */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Alpha Vantage</p>
                <p className="text-xs" style={{ color: '#868F97' }}>
                  米国株価格取得（無料・25req/日）
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasAlphaKey && (
                  <span className="text-xs" style={{ color: '#22c55e' }}>
                    設定済
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setShowAlphaKey(!showAlphaKey); }}
                  className="btn-ghost text-xs"
                >
                  {showAlphaKey ? '閉じる' : '設定'}
                </button>
              </div>
            </div>
            {showAlphaKey && (
              <div className="mt-2 flex gap-2">
                <input
                  type="password"
                  placeholder="APIキーを入力"
                  value={alphaKeyDraft}
                  onChange={(e) => { setAlphaKeyDraft(e.target.value); }}
                  className="input-dark flex-1 py-1.5 text-sm"
                />
                <button type="button" onClick={saveAlphaKey} className="btn-accent text-xs">
                  保存
                </button>
              </div>
            )}
          </div>

          {/* J-Quants */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">J-Quants（JPX公式）</p>
                <p className="text-xs" style={{ color: '#868F97' }}>
                  国内株価格取得（無料・要ユーザー登録）
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasJQuantsKey && (
                  <span className="text-xs" style={{ color: '#22c55e' }}>
                    設定済
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setShowJQuantsKey(!showJQuantsKey); }}
                  className="btn-ghost text-xs"
                >
                  {showJQuantsKey ? '閉じる' : '設定'}
                </button>
              </div>
            </div>
            {showJQuantsKey && (
              <div className="mt-2 flex gap-2">
                <input
                  type="password"
                  placeholder="リフレッシュトークンを入力"
                  value={jQuantsDraft}
                  onChange={(e) => { setJQuantsDraft(e.target.value); }}
                  className="input-dark flex-1 py-1.5 text-sm"
                />
                <button type="button" onClick={saveJQuantsKey} className="btn-accent text-xs">
                  保存
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs" style={{ color: '#4B5563' }}>
          ※ APIキーはIndexedDBに保存されます。共有PCでのご使用はご注意ください。
        </p>
      </SectionCard>

      {/* ── セキュリティ ── */}
      <SectionCard title="セキュリティ">
        <SettingRow
          label="データ暗号化"
          description={
            settings.isEncryptionEnabled
              ? 'AES-256-GCM（有効）- 起動時にパスワードが必要です'
              : '無効 - データは平文でIndexedDBに保存されます'
          }
        >
          {settings.isEncryptionEnabled ? (
            <span className="text-xs font-medium" style={{ color: '#22c55e' }}>
              有効
            </span>
          ) : (
            <span className="text-xs font-medium" style={{ color: '#868F97' }}>
              無効
            </span>
          )}
        </SettingRow>

        {settings.isEncryptionEnabled ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowChangePassDialog(true); }}
              className="btn-ghost text-xs"
            >
              パスワードを変更
            </button>
            <button
              type="button"
              onClick={() => { setShowDisableEncDialog(true); }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{
                background: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              暗号化を無効化
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setShowEnableEncDialog(true); }}
            className="btn-accent text-xs"
          >
            暗号化を有効化
          </button>
        )}

        {settings.isEncryptionEnabled && (
          <SettingRow
            label="自動ロック（分）"
            description="操作なしで経過した後、自動的にロックします（0=無効）"
          >
            <select
              value={settings.autoLockMinutes}
              onChange={(e) =>
                { updateSettings({ autoLockMinutes: parseInt(e.target.value, 10) }); }
              }
              className="input-dark w-24 py-1.5 text-sm"
            >
              {[0, 5, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? '無効' : `${m.toString()}分`}
                </option>
              ))}
            </select>
          </SettingRow>
        )}
      </SectionCard>

      {/* ── データ管理 ── */}
      <SectionCard title="データ管理">
        <SettingRow
          label="JSONバックアップ"
          description={
            settings.lastBackupAt
              ? `最終バックアップ: ${new Date(settings.lastBackupAt).toLocaleDateString('ja-JP')}`
              : 'バックアップ未実施'
          }
        >
          <div className="flex gap-2">
            <button type="button" onClick={() => void handleExport()} className="btn-ghost text-xs">
              エクスポート
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost text-xs"
            >
              インポート
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => void handleImport(e)}
            />
          </div>
        </SettingRow>

        <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <SettingRow
            label="データリセット"
            description="全資産・取引履歴・スナップショットを削除します（元に戻せません）"
          >
            <button
              type="button"
              onClick={() => { setShowResetModal(true); }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{
                background: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              リセット
            </button>
          </SettingRow>
        </div>
      </SectionCard>

      {/* ── アプリ情報 ── */}
      <div className="text-center text-xs" style={{ color: '#4B5563' }}>
        <p>AssetManagement v0.4.0</p>
        <p>データはすべてブラウザ（IndexedDB）に保存されます</p>
        <p className="mt-1">
          登録資産数: {assets.length}件
        </p>
      </div>

      {/* ── Dialogs ── */}
      <PasswordDialog
        isOpen={showEnableEncDialog}
        title="暗号化を有効化"
        description="パスワードを設定します。紛失するとデータを復元できません。8文字以上で設定してください。"
        onConfirm={handleEnableEncryption}
        onCancel={() => { setShowEnableEncDialog(false); }}
        requireConfirm
      />

      <PasswordDialog
        isOpen={showDisableEncDialog}
        title="暗号化を無効化"
        description="現在のパスワードを入力して暗号化を無効化します。"
        onConfirm={handleDisableEncryption}
        onCancel={() => { setShowDisableEncDialog(false); }}
      />

      <PasswordDialog
        isOpen={showChangePassDialog}
        title="パスワードを変更"
        description="新しいパスワードを入力してください。変更後は新しいパスワードで再ログインが必要です。"
        onConfirm={handleChangePassword}
        onCancel={() => { setShowChangePassDialog(false); }}
        requireConfirm
      />

      <Modal
        isOpen={showResetModal}
        title="データをリセットしますか？"
        onConfirm={() => void handleReset()}
        onCancel={() => { setShowResetModal(false); }}
        confirmLabel="すべて削除する"
        confirmVariant="danger"
      >
        <p>全資産・取引履歴・スナップショットが削除されます。</p>
        <p className="mt-2 font-semibold" style={{ color: '#ef4444' }}>
          この操作は取り消せません。
        </p>
      </Modal>
    </div>
  )
}
