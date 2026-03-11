/**
 * PortfolioTimeline - Line chart showing total portfolio value over time
 */
import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatJpy } from '@/utils/formatters'
import type { PortfolioSnapshot } from '@/types/portfolio.types'

export interface PortfolioTimelineProps {
  snapshots: PortfolioSnapshot[]
}

type PeriodKey = '1M' | '3M' | '6M' | '1Y' | 'ALL'

const PERIODS: Array<{ key: PeriodKey; label: string; days: number }> = [
  { key: '1M',  label: '1M',  days: 30  },
  { key: '3M',  label: '3M',  days: 90  },
  { key: '6M',  label: '6M',  days: 180 },
  { key: '1Y',  label: '1Y',  days: 365 },
  { key: 'ALL', label: 'ALL', days: 0   },
]

// eslint-disable-next-line react-refresh/only-export-components -- utility functions used in tests
export function formatXAxis(dateStr: string): string {
  const date = new Date(dateStr)
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${m.toString()}/${d.toString()}`
}

// eslint-disable-next-line react-refresh/only-export-components -- utility functions used in tests
export function formatYAxis(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}万`
  }
  return formatJpy(value)
}

// Custom tooltip
interface TooltipEntry {
  payload: { recordedAt: string; totalValueJpy: number }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
}

export function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  const date = new Date(item.recordedAt)
  const label = `${date.getFullYear().toString()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="font-amount text-sm text-white">{formatJpy(item.totalValueJpy)}</p>
    </div>
  )
}

export function PortfolioTimeline({ snapshots }: PortfolioTimelineProps) {
  const [period, setPeriod] = useState<PeriodKey>('ALL')

  const filteredData = useMemo(() => {
    const selected = PERIODS.find((p) => p.key === period)
    if (!selected || selected.days === 0) return snapshots

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - selected.days)
    return snapshots.filter((s) => new Date(s.recordedAt) >= cutoff)
  }, [snapshots, period])

  if (snapshots.length <= 1) {
    return (
      <div className="flex h-[280px] flex-col gap-4">
        {/* Period filter buttons (disabled) */}
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <span
              key={p.key}
              className="rounded-md px-3 py-1 text-xs text-ink-secondary opacity-50"
            >
              {p.label}
            </span>
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-ink-secondary">データ蓄積中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Period filter buttons */}
      <div className="flex items-center gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => { setPeriod(p.key); }}
            className={
              period === p.key
                ? 'rounded-md bg-accent-subtle px-3 py-1 text-xs text-accent'
                : 'rounded-md px-3 py-1 text-xs text-ink-secondary hover:text-white'
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Area chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={filteredData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="id"
            tickFormatter={formatXAxis}
            tick={{ fill: '#868F97', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: '#868F97', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="totalValueJpy"
            stroke="#FFA16C"
            strokeWidth={2}
            fill="#FFA16C"
            fillOpacity={0.08}
            dot={false}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
