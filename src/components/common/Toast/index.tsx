/**
 * Toast notification component - Fey-style dark design
 * Displays toasts from uiStore at the bottom-right corner.
 * Automatically dismisses after 3 seconds.
 */
import { useEffect, useCallback } from 'react'
import { useUiStore } from '@/store/uiStore'
import type { Toast } from '@/store/uiStore'

const TOAST_DURATION_MS = 3000

// Left border colors and icon styles per toast type
const TOAST_CONFIG: Record<
  Toast['type'],
  { borderColor: string; iconColor: string; iconBg: string; icon: string }
> = {
  success: {
    borderColor: '#22c55e',
    iconColor: '#22c55e',
    iconBg: 'rgba(34,197,94,0.15)',
    icon: '✓',
  },
  error: {
    borderColor: '#ef4444',
    iconColor: '#ef4444',
    iconBg: 'rgba(239,68,68,0.15)',
    icon: '✕',
  },
  info: {
    borderColor: '#60a5fa',
    iconColor: '#60a5fa',
    iconBg: 'rgba(96,165,250,0.15)',
    icon: 'i',
  },
  warning: {
    borderColor: '#fbbf24',
    iconColor: '#fbbf24',
    iconBg: 'rgba(251,191,36,0.15)',
    icon: '!',
  },
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const config = TOAST_CONFIG[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, TOAST_DURATION_MS)

    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <div
      role="alert"
      aria-live="polite"
      className="animate-toast-in flex min-w-72 max-w-sm items-center gap-3 rounded-xl pr-4 shadow-2xl"
      style={{
        background: 'rgba(17,17,17,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `4px solid ${config.borderColor}`,
        backdropFilter: 'blur(16px)',
        paddingTop: '12px',
        paddingBottom: '12px',
        paddingLeft: '14px',
      }}
    >
      {/* Type icon */}
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ backgroundColor: config.iconBg, color: config.iconColor }}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      {/* Message */}
      <span className="flex-1 text-sm text-white">{toast.message}</span>

      {/* Close button */}
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="ml-1 flex-shrink-0 text-xs transition-colors"
        style={{ color: '#4B5563' }}
        aria-label="通知を閉じる"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore()

  const handleRemove = useCallback(
    (id: string) => {
      removeToast(id)
    },
    [removeToast],
  )

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2"
      aria-label="通知一覧"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={handleRemove} />
      ))}
    </div>
  )
}
