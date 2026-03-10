/**
 * Tests for AssetAllocationPie component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssetAllocationPie, CustomTooltip } from './index'
import type { AssetAllocationPieProps } from './index'

// Mock recharts to avoid ResizeObserver issues in jsdom
vi.mock('recharts', async () => {
  const React = await import('react')
  return {
    PieChart: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'pie-chart' }, children),
    Pie: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'pie' }, children),
    Cell: () => React.createElement('div', { 'data-testid': 'cell' }),
    Tooltip: () => null,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  }
})

const sampleData: AssetAllocationPieProps['data'] = [
  { assetClass: 'stock_jp', label: '国内株式', valueJpy: 100000, ratio: 0.5,  color: '#FFA16C' },
  { assetClass: 'stock_us', label: '米国株式', valueJpy: 100000, ratio: 0.5,  color: '#60a5fa' },
]

describe('AssetAllocationPie', () => {
  it('renders empty state when data is empty', () => {
    render(<AssetAllocationPie data={[]} />)
    expect(screen.getByText('資産を登録してください')).toBeInTheDocument()
  })

  it('renders chart container when data is provided', () => {
    render(<AssetAllocationPie data={sampleData} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('renders legend labels', () => {
    render(<AssetAllocationPie data={sampleData} />)
    expect(screen.getByText('国内株式')).toBeInTheDocument()
    expect(screen.getByText('米国株式')).toBeInTheDocument()
  })

  it('renders legend percentages', () => {
    render(<AssetAllocationPie data={sampleData} />)
    // formatPercent(0.5) = "50.0%"
    const percentages = screen.getAllByText('50.0%')
    expect(percentages).toHaveLength(2)
  })

  it('renders legend amounts in JPY', () => {
    render(<AssetAllocationPie data={sampleData} />)
    // formatJpy(100000) returns locale-specific JPY (full-width ￥ in ja-JP)
    const amounts = screen.getAllByText(/100,000/)
    expect(amounts).toHaveLength(2)
  })

  it('renders colored dots for each legend item', () => {
    const { container } = render(<AssetAllocationPie data={sampleData} />)
    const dots = container.querySelectorAll('[style*="background-color"]')
    // Each legend item has a color dot
    expect(dots.length).toBeGreaterThanOrEqual(2)
  })

  it('renders single item correctly', () => {
    const singleItem: AssetAllocationPieProps['data'] = [
      { assetClass: 'deposit', label: '預金', valueJpy: 500000, ratio: 1.0, color: '#94a3b8' },
    ]
    render(<AssetAllocationPie data={singleItem} />)
    expect(screen.getByText('預金')).toBeInTheDocument()
    expect(screen.getByText('100.0%')).toBeInTheDocument()
  })
})

describe('CustomTooltip', () => {
  it('returns null when active is false', () => {
    const { container } = render(<CustomTooltip active={false} payload={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when payload is empty', () => {
    const { container } = render(<CustomTooltip active={true} payload={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when payload is undefined', () => {
    const { container } = render(<CustomTooltip active={true} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders tooltip content when active with payload', () => {
    const payload = [{
      payload: { label: '国内株式', valueJpy: 100000, ratio: 0.5, color: '#FFA16C' },
    }]
    render(<CustomTooltip active={true} payload={payload} />)
    expect(screen.getByText('国内株式')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText(/100,000/)).toBeInTheDocument()
  })
})
