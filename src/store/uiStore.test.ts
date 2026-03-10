/**
 * Unit tests for uiStore
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'

beforeEach(() => {
  useUiStore.setState({ activeModal: null, modalPayload: null, toasts: [] })
})

describe('uiStore.openModal / closeModal', () => {
  it('opens a modal with type', () => {
    useUiStore.getState().openModal('asset-delete')
    expect(useUiStore.getState().activeModal).toBe('asset-delete')
  })

  it('opens a modal with payload', () => {
    const payload = { id: '123', name: 'テスト' }
    useUiStore.getState().openModal('asset-delete', payload)
    expect(useUiStore.getState().modalPayload).toEqual(payload)
  })

  it('closes a modal and resets payload', () => {
    useUiStore.getState().openModal('asset-delete', { id: '1' })
    useUiStore.getState().closeModal()
    expect(useUiStore.getState().activeModal).toBeNull()
    expect(useUiStore.getState().modalPayload).toBeNull()
  })
})

describe('uiStore.addToast / removeToast', () => {
  it('adds a toast with a generated id', () => {
    useUiStore.getState().addToast({ type: 'success', message: '成功しました' })
    const { toasts } = useUiStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].id).toBeTruthy()
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('成功しました')
  })

  it('adds multiple toasts', () => {
    useUiStore.getState().addToast({ type: 'success', message: 'A' })
    useUiStore.getState().addToast({ type: 'error', message: 'B' })
    expect(useUiStore.getState().toasts).toHaveLength(2)
  })

  it('removes a toast by id', () => {
    useUiStore.getState().addToast({ type: 'info', message: 'Info' })
    const id = useUiStore.getState().toasts[0].id
    useUiStore.getState().removeToast(id)
    expect(useUiStore.getState().toasts).toHaveLength(0)
  })

  it('does not remove other toasts when removing by id', () => {
    useUiStore.getState().addToast({ type: 'success', message: 'A' })
    useUiStore.getState().addToast({ type: 'error', message: 'B' })
    const firstId = useUiStore.getState().toasts[0].id
    useUiStore.getState().removeToast(firstId)
    const { toasts } = useUiStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('B')
  })

  it('supports all toast types', () => {
    const types = ['success', 'error', 'info', 'warning'] as const
    types.forEach((type) => {
      useUiStore.getState().addToast({ type, message: type })
    })
    const { toasts } = useUiStore.getState()
    expect(toasts).toHaveLength(4)
    types.forEach((type, i) => {
      expect(toasts[i].type).toBe(type)
    })
  })
})
