/**
 * Tests for PortfolioTimeline component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PortfolioTimeline, formatXAxis, formatYAxis, CustomTooltip } from './index'
import type { PortfolioSnapshot } from '@/types/portfolio.types'

// Mock recharts to avoid ResizeObserver issues in jsdom
vi.mock('recharts', async () => {
  const React = await import('react')
  return {
    AreaChart: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'area-chart' }, children),
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  }
})

function makeSnapshot(id: string, totalValueJpy: number): PortfolioSnapshot {
  return {
    id,
    recordedAt: `${id}T00:00:00.000Z`,
    totalValueJpy,
    totalCostJpy: totalValueJpy * 0.8,
    breakdown: [],
  }
}

describe('PortfolioTimeline - empty / insufficient data', () => {
  it('shows "データ蓄積中..." when snapshots array is empty', () => {
    render(<PortfolioTimeline snapshots={[]} />)
    expect(screen.getByText('データ蓄積中...')).toBeInTheDocument()
  })

  it('shows "データ蓄積中..." when there is only 1 snapshot', () => {
    render(<PortfolioTimeline snapshots={[makeSnapshot('2024-01-01', 100000)]} />)
    expect(screen.getByText('データ蓄積中...')).toBeInTheDocument()
  })

  it('does not show period filter buttons when data is insufficient', () => {
    render(<PortfolioTimeline snapshots={[]} />)
    // Buttons should not be interactive (rendered as spans)
    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })
})

describe('PortfolioTimeline - with sufficient data', () => {
  const multipleSnapshots = [
    makeSnapshot('2024-01-01', 100000),
    makeSnapshot('2024-01-02', 110000),
    makeSnapshot('2024-01-03', 105000),
  ]

  it('renders the chart when there are 2+ snapshots', () => {
    render(<PortfolioTimeline snapshots={multipleSnapshots} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders period filter buttons', () => {
    render(<PortfolioTimeline snapshots={multipleSnapshots} />)
    expect(screen.getByRole('button', { name: '1M' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3M' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '6M' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1Y' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument()
  })

  it('ALL button is active by default', () => {
    render(<PortfolioTimeline snapshots={multipleSnapshots} />)
    const allButton = screen.getByRole('button', { name: 'ALL' })
    // Active button has bg-accent-subtle class
    expect(allButton.className).toContain('bg-accent-subtle')
  })

  it('switches active period when a button is clicked', async () => {
    const user = userEvent.setup()
    render(<PortfolioTimeline snapshots={multipleSnapshots} />)

    const btn1M = screen.getByRole('button', { name: '1M' })
    await user.click(btn1M)

    expect(btn1M.className).toContain('bg-accent-subtle')

    const btnAll = screen.getByRole('button', { name: 'ALL' })
    // ALL should no longer be active
    expect(btnAll.className).not.toContain('bg-accent-subtle')
  })

  it('renders all 5 period filter labels', () => {
    render(<PortfolioTimeline snapshots={multipleSnapshots} />)
    const periods = ['1M', '3M', '6M', '1Y', 'ALL']
    for (const label of periods) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })
})

describe('formatXAxis', () => {
  it('formats date string to M/D', () => {
    expect(formatXAxis('2024-03-05')).toBe('3/5')
  })

  it('formats January correctly', () => {
    expect(formatXAxis('2024-01-01')).toBe('1/1')
  })

  it('formats December correctly', () => {
    expect(formatXAxis('2024-12-31')).toBe('12/31')
  })
})

describe('formatYAxis', () => {
  it('returns 万 unit for values >= 10000', () => {
    expect(formatYAxis(10000)).toBe('1万')
    expect(formatYAxis(50000)).toBe('5万')
    expect(formatYAxis(1000000)).toBe('100万')
  })

  it('returns JPY format for values < 10000', () => {
    const result = formatYAxis(5000)
    expect(result).toMatch(/5,000/)
  })
})

describe('PortfolioTimeline CustomTooltip', () => {
  it('returns null when active is false', () => {
    const { container } = render(<CustomTooltip active={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when payload is empty', () => {
    const { container } = render(<CustomTooltip active={true} payload={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders tooltip with date and value', () => {
    const payload = [{
      payload: { recordedAt: '2024-03-15T00:00:00.000Z', totalValueJpy: 1500000 },
    }]
    render(<CustomTooltip active={true} payload={payload} />)
    expect(screen.getByText(/2024\/03\/15/)).toBeInTheDocument()
    expect(screen.getByText(/1,500,000/)).toBeInTheDocument()
  })
})
