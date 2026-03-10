/**
 * PerformanceBar - Bar chart showing unrealized gain/loss rate per asset
 * Uses Recharts BarChart with gain/loss color coding
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts'
import type { AssetSummary } from '@/types/asset.types'
import type { Asset } from '@/types/asset.types'
import { formatJpy, formatGainRate } from '@/utils/formatters'

interface PerformanceBarDataItem {
  name: string
  shortName: string
  rate: number
  gain: number
}

interface PerformanceBarProps {
  assets: Asset[]
  summaries: AssetSummary[]
}

interface CustomTooltipPayload {
  payload: PerformanceBarDataItem
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null

  const item = (payload[0] as unknown as CustomTooltipPayload).payload
  const gainColor = item.rate >= 0 ? '#22c55e' : '#ef4444'

  return (
    <div
      className="rounded-lg p-3 text-sm shadow-lg"
      style={{
        background: 'rgba(20,20,20,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        minWidth: '180px',
      }}
    >
      <p className="mb-2 font-medium text-white">{item.name}</p>
      <div className="flex items-center justify-between gap-4">
        <span style={{ color: '#868F97' }}>損益率</span>
        <span className="font-amount font-semibold" style={{ color: gainColor }}>
          {formatGainRate(item.rate)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4">
        <span style={{ color: '#868F97' }}>含み損益</span>
        <span className="font-amount" style={{ color: gainColor }}>
          {formatJpy(item.gain)}
        </span>
      </div>
    </div>
  )
}

const GAIN_COLOR = '#22c55e'
const LOSS_COLOR = '#ef4444'

/** Truncate asset name for X axis display */
function shortName(name: string, maxLen = 8): string {
  return name.length > maxLen ? name.slice(0, maxLen) + '…' : name
}

export function PerformanceBar({ assets, summaries }: PerformanceBarProps) {
  const data: PerformanceBarDataItem[] = summaries
    .map((s) => {
      const asset = assets.find((a) => a.id === s.assetId)
      if (!asset) return null
      return {
        name: asset.name,
        shortName: shortName(asset.name),
        rate: s.unrealizedGainRate,
        gain: s.unrealizedGain,
      }
    })
    .filter((item): item is PerformanceBarDataItem => item !== null)
    .sort((a, b) => b.rate - a.rate)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12" style={{ color: '#868F97' }}>
        表示できる資産データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="shortName"
          tick={{ fill: '#868F97', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          tick={{ fill: '#868F97', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
          {data.map((item, index) => (
            <Cell
              key={`cell-${String(index)}`}
              fill={item.rate >= 0 ? GAIN_COLOR : LOSS_COLOR}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
