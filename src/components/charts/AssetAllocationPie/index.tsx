/**
 * AssetAllocationPie - Donut chart showing portfolio allocation by asset class
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatJpy, formatPercent } from '@/utils/formatters'
import type { AssetClass } from '@/types/asset.types'

export interface AssetAllocationPieProps {
  data: Array<{
    assetClass: AssetClass
    label: string
    valueJpy: number
    ratio: number
    color: string
  }>
}

// Custom tooltip component
interface TooltipPayloadItem {
  payload: {
    label: string
    valueJpy: number
    ratio: number
    color: string
  }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

export function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      <p className="text-xs font-medium text-white">{item.label}</p>
      <p className="font-amount text-sm text-white">{formatJpy(item.valueJpy)}</p>
      <p className="text-xs text-ink-secondary">{formatPercent(item.ratio)}</p>
    </div>
  )
}

export function AssetAllocationPie({ data }: AssetAllocationPieProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center">
        <p className="text-sm text-ink-secondary">資産を登録してください</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
      {/* Donut chart */}
      <div className="flex-shrink-0" style={{ width: '100%', maxWidth: 220 }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="valueJpy"
              isAnimationActive={true}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.assetClass} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {data.map((item) => (
          <div key={item.assetClass} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-xs text-ink-secondary">{item.label}</span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="font-amount text-xs text-ink-secondary">
                {formatPercent(item.ratio)}
              </span>
              <span className="font-amount text-xs text-white">{formatJpy(item.valueJpy)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
