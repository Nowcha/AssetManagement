/**
 * Generic confirmation modal component - Fey dark design
 * Used for delete confirmations and other user confirmations
 */
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  title: string
  children: ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'danger' | 'primary'
}

export function Modal({
  isOpen,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  confirmVariant = 'primary',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Trap focus and handle Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Focus the dialog
    dialogRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmStyle =
    confirmVariant === 'danger'
      ? {
          background: 'rgba(239,68,68,0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239,68,68,0.3)',
        }
      : {
          background: '#FFA16C',
          color: '#000',
          border: 'none',
        }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="animate-fade-in relative z-10 w-full max-w-md rounded-xl p-6 focus:outline-none"
        style={{
          background: 'rgba(17,17,17,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
        }}
      >
        <h2
          id="modal-title"
          className="mb-3 text-base font-semibold text-white"
        >
          {title}
        </h2>

        <div className="mb-6 text-sm" style={{ color: '#868F97' }}>
          {children}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={confirmStyle}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
