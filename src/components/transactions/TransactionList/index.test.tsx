/**
 * Unit tests for TransactionList component
 * Tests filtering, rendering, and delete interaction
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { TransactionList } from './index'
import { useTransactionStore } from '@/store/transactionStore'
import { useAssetStore } from '@/store/assetStore'
import { useUiStore } from '@/store/uiStore'
import type { Transaction } from '@/types/transaction.types'
import type { Asset } from '@/types/asset.types'

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    name: 'テスト株式',
    assetClass: 'stock_jp',
    accountType: 'taxable',
    currency: 'JPY',
    quantity: 100,
    acquisitionPrice: 1000,
    currentPrice: 1200,
    currentPriceJpy: 1200,
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    assetId: 'asset-1',
    type: 'buy',
    date: '2024-01-15',
    quantity: 100,
    price: 1000,
    amount: 100000,
    fee: 500,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  useAssetStore.setState({ assets: [makeAsset()], isLoading: false, error: null })
  useTransactionStore.setState({ transactions: [], isLoading: false, error: null })
  useUiStore.setState({ activeModal: null, modalPayload: null, toasts: [] })
})

describe('TransactionList - empty state', () => {
  it('shows empty state message when no transactions', () => {
    render(<MemoryRouter><TransactionList /></MemoryRouter>)
    expect(screen.getByText(/取引が記録されていません/)).toBeInTheDocument()
  })
})

describe('TransactionList - with transactions', () => {
  beforeEach(() => {
    useTransactionStore.setState({
      transactions: [
        makeTransaction({ id: 'tx-1', type: 'buy', date: '2024-01-15', amount: 100000 }),
        makeTransaction({ id: 'tx-2', type: 'sell', date: '2024-06-01', amount: 50000 }),
        makeTransaction({ id: 'tx-3', type: 'dividend', date: '2024-06-15', amount: 5000 }),
      ],
    })
  })

  it('renders the transaction table', () => {
    render(<MemoryRouter><TransactionList /></MemoryRouter>)
    expect(screen.getByRole('table', { name: '取引履歴一覧' })).toBeInTheDocument()
  })

  it('displays all transactions by default', () => {
    render(<MemoryRouter><TransactionList /></MemoryRouter>)
    // All 3 transactions should have delete buttons
    const deleteButtons = screen.getAllByRole('button', { name: '取引を削除' })
    expect(deleteButtons).toHaveLength(3)
  })

  it('shows asset name in table rows', () => {
    render(<MemoryRouter><TransactionList /></MemoryRouter>)
    // Asset name should appear multiple times (once per transaction)
    const assetNames = screen.getAllByText('テスト株式')
    expect(assetNames.length).toBeGreaterThan(0)
  })

  it('displays transaction type badges', () => {
    render(<MemoryRouter><TransactionList /></MemoryRouter>)
    // Transaction types should appear as badge text in the table
    // (getAllByText handles multiple elements)
    const buyBadges = screen.getAllByText('買付')
    expect(buyBadges.length).toBeGreaterThan(0)
    const sellBadges = screen.getAllByText('売却')
    expect(sellBadges.length).toBeGreaterThan(0)
  })
})

describe('TransactionList - filtering', () => {
  beforeEach(() => {
    useAssetStore.setState({
      assets: [
        makeAsset({ id: 'asset-1', name: '株式A' }),
        makeAsset({ id: 'asset-2', name: '株式B' }),
      ],
    })
    useTransactionStore.setState({
      transactions: [
        makeTransaction({ id: 'tx-1', assetId: 'asset-1', type: 'buy', date: '2024-01-15' }),
        makeTransaction({ id: 'tx-2', assetId: 'asset-2', type: 'sell', date: '2024-06-01' }),
        makeTransaction({ id: 'tx-3', assetId: 'asset-1', type: 'dividend', date: '2024-06-15' }),
      ],
    })
  })

  it('filters by asset', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TransactionList /></MemoryRouter>)

    await user.selectOptions(screen.getByLabelText('資産フィルター'), 'asset-2')

    const deleteButtons = screen.getAllByRole('button', { name: '取引を削除' })
    expect(deleteButtons).toHaveLength(1)
  })

  it('filters by transaction type', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TransactionList /></MemoryRouter>)

    await user.selectOptions(screen.getByLabelText('取引種別フィルター'), 'buy')

    const deleteButtons = screen.getAllByRole('button', { name: '取引を削除' })
    expect(deleteButtons).toHaveLength(1)
  })

  it('shows no results message when filter matches nothing', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TransactionList /></MemoryRouter>)

    await user.selectOptions(screen.getByLabelText('取引種別フィルター'), 'withdrawal')

    expect(screen.getByText(/フィルター条件に一致する取引がありません/)).toBeInTheDocument()
  })
})

describe('TransactionList - delete interaction', () => {
  beforeEach(() => {
    useTransactionStore.setState({
      transactions: [makeTransaction({ id: 'tx-1' })],
    })
  })

  it('opens delete confirmation modal on delete button click', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TransactionList /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: '取引を削除' }))

    // Modal should open
    const { activeModal } = useUiStore.getState()
    expect(activeModal).toBe('transaction-delete')
  })
})

describe('TransactionList - realized gain summary', () => {
  beforeEach(() => {
    useTransactionStore.setState({
      transactions: [
        makeTransaction({ id: 'tx-1', type: 'buy', date: '2024-01-01', amount: 100000 }),
        makeTransaction({ id: 'tx-2', type: 'sell', date: '2024-06-01', amount: 50000 }),
        makeTransaction({ id: 'tx-3', type: 'dividend', date: '2024-06-15', amount: 5000 }),
      ],
    })
  })

  it('renders the realized gain summary section', () => {
    render(<MemoryRouter><TransactionList /></MemoryRouter>)
    expect(screen.getByText('確定損益サマリー')).toBeInTheDocument()
  })

  it('shows period tab buttons', () => {
    render(<MemoryRouter><TransactionList /></MemoryRouter>)
    expect(screen.getByRole('button', { name: '今年' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '昨年' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '全期間' })).toBeInTheDocument()
  })

  it('switches between period tabs', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TransactionList /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: '昨年' }))

    // Just verify the click doesn't throw
    expect(screen.getByRole('button', { name: '昨年' })).toBeInTheDocument()
  })
})
