/**
 * Unit tests for AssetForm component
 * Tests form rendering, submission, and validation error display
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssetForm } from './index'
import type { AssetFormData } from '@/utils/validators'

// Helper: fill in required fields with valid data
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.clear(screen.getByLabelText(/資産名/))
  await user.type(screen.getByLabelText(/資産名/), 'テスト株式')
  // assetClass, accountType, currency are selects with defaults
  // quantity
  await user.clear(screen.getByLabelText(/保有数量/))
  await user.type(screen.getByLabelText(/保有数量/), '100')
  // acquisitionPrice
  await user.clear(screen.getByLabelText(/取得単価/))
  await user.type(screen.getByLabelText(/取得単価/), '1000')
  // currentPrice
  await user.clear(screen.getByLabelText(/現在価格/))
  await user.type(screen.getByLabelText(/現在価格/), '1200')
}

describe('AssetForm rendering', () => {
  it('renders all required form fields', () => {
    render(
      <AssetForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/資産名/)).toBeInTheDocument()
    expect(screen.getByLabelText(/資産クラス/)).toBeInTheDocument()
    expect(screen.getByLabelText(/口座種別/)).toBeInTheDocument()
    expect(screen.getByLabelText(/通貨/)).toBeInTheDocument()
    expect(screen.getByLabelText(/保有数量/)).toBeInTheDocument()
    expect(screen.getByLabelText(/取得単価/)).toBeInTheDocument()
    expect(screen.getByLabelText(/現在価格/)).toBeInTheDocument()
    expect(screen.getByLabelText(/メモ/)).toBeInTheDocument()
  })

  it('renders submit and cancel buttons', () => {
    render(
      <AssetForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
  })

  it('populates defaultValues when provided', () => {
    const defaultValues: Partial<AssetFormData> = {
      name: 'デフォルト資産',
      ticker: 'TEST',
      currency: 'USD',
    }

    render(
      <AssetForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/資産名/)).toHaveValue('デフォルト資産')
    expect(screen.getByLabelText(/ティッカー/)).toHaveValue('TEST')
    expect(screen.getByLabelText(/通貨/)).toHaveValue('USD')
  })
})

describe('AssetForm validation', () => {
  it('shows required error when name is empty and form is submitted', async () => {
    const user = userEvent.setup()
    render(
      <AssetForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    // Clear name field and submit
    await user.clear(screen.getByLabelText(/資産名/))
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows validation error when name exceeds 100 characters', async () => {
    const user = userEvent.setup()
    render(
      <AssetForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText(/資産名/), 'a'.repeat(101))
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('100文字以内')
    })
  })
})

describe('AssetForm field error styles', () => {
  it('applies error class to name field when validation fails', async () => {
    const user = userEvent.setup()
    render(
      <AssetForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.clear(screen.getByLabelText(/資産名/))
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/資産名/)
      expect(nameInput.className).toContain('input-dark-error')
    })
  })

  it('shows ticker validation error when over 20 characters', async () => {
    const user = userEvent.setup()
    render(
      <AssetForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText(/ティッカー/), 'A'.repeat(21))
    await user.type(screen.getByLabelText(/資産名/), 'テスト')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.some((a) => a.textContent?.includes('20文字'))).toBe(true)
    })
  })
})

describe('AssetForm submission', () => {
  it('calls onSubmit with correct data when form is valid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AssetForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce()
    })

    const [data] = onSubmit.mock.calls[0] as [AssetFormData]
    expect(data.name).toBe('テスト株式')
    expect(data.quantity).toBe(100)
    expect(data.acquisitionPrice).toBe(1000)
    expect(data.currentPrice).toBe(1200)
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <AssetForm
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('disables submit button while isSubmitting is true', () => {
    render(
      <AssetForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={true}
      />,
    )

    expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled()
  })

  it('does not call onSubmit when form has validation errors', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AssetForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    // Leave name empty
    await user.clear(screen.getByLabelText(/資産名/))
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
