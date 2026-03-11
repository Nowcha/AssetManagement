import { create } from 'zustand'

export type ModalType =
  | 'asset-create'
  | 'asset-edit'
  | 'asset-delete'
  | 'transaction-create'
  | 'transaction-delete'
  | 'data-reset'
  | null

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

interface UiState {
  activeModal: ModalType
  modalPayload: unknown
  toasts: Toast[]
  openModal: (type: ModalType, payload?: unknown) => void
  closeModal: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUiStore = create<UiState>()((set) => ({
  activeModal: null,
  modalPayload: null,
  toasts: [],

  openModal: (type, payload = null) =>
    { set({ activeModal: type, modalPayload: payload }); },

  closeModal: () => { set({ activeModal: null, modalPayload: null }); },

  addToast: (toast) =>
    { set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: `${Date.now().toString()}-${Math.random().toString()}` },
      ],
    })); },

  removeToast: (id) =>
    { set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })); },
}))
