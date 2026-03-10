/**
 * SimulationChart - モンテカルロシミュレーション結果チャート
 * Recharts AreaChart でパーセンタイルバンドを描画
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { SimulationResult } from '@/types/simulation.types'

interface Props {
  result: SimulationResult
  targetAmount: number
}

interface ChartDataPoint {
  year: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

function formatYAxis(value: number): string {
  if (value >= 1_0000_0000) return `${(value / 1_0000_0000).toFixed(0)}億`
  if (value >= 1_000_0000) return `${(value / 1_000_0000).toFixed(0)}千万`
  if (value >= 100_0000) return `${(value / 100_0000).toFixed(0)}百万`
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}万`
  return value.toLocaleString('ja-JP')
}

function formatTooltipValue(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)
}

export function SimulationChart({ result, targetAmount }: Props) {
  const data: ChartDataPoint[] = result.percentiles.p50.map((_, i) => ({
    year: i,
    p10: Math.round(result.percentiles.p10[i] ?? 0),
    p25: Math.round(result.percentiles.p25[i] ?? 0),
    p50: Math.round(result.percentiles.p50[i] ?? 0),
    p75: Math.round(result.percentiles.p75[i] ?? 0),
    p90: Math.round(result.percentiles.p90[i] ?? 0),
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="sim-p90" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="sim-p75" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="sim-p25" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="sim-p10" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />

        <XAxis
          dataKey="year"
          tick={{ fill: '#868F97', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v.toString()}年`}
        />

        <YAxis
          tick={{ fill: '#868F97', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
          width={56}
        />

        <Tooltip
          contentStyle={{
            background: 'rgba(17,17,17,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#868F97', marginBottom: 4 }}
          labelFormatter={(v: number) => `${v.toString()}年後`}
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              p90: '楽観 (90%ile)',
              p75: '上位 (75%ile)',
              p50: '中央値 (50%ile)',
              p25: '下位 (25%ile)',
              p10: '悲観 (10%ile)',
            }
            return [formatTooltipValue(value), labels[name] ?? name]
          }}
        />

        {targetAmount > 0 && (
          <ReferenceLine
            y={targetAmount}
            stroke="#FFA16C"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{
              value: '目標',
              fill: '#FFA16C',
              fontSize: 11,
              position: 'right',
            }}
          />
        )}

        {/* 楽観バンド */}
        <Area
          type="monotone"
          dataKey="p90"
          stroke="#22c55e"
          strokeWidth={1.5}
          fill="url(#sim-p90)"
          strokeOpacity={0.7}
          dot={false}
          activeDot={false}
        />
        <Area
          type="monotone"
          dataKey="p75"
          stroke="#22c55e"
          strokeWidth={1}
          fill="url(#sim-p75)"
          strokeOpacity={0.4}
          dot={false}
          activeDot={false}
        />

        {/* 中央値（メインライン） */}
        <Area
          type="monotone"
          dataKey="p50"
          stroke="#FFA16C"
          strokeWidth={2.5}
          fill="none"
          dot={false}
          activeDot={{ r: 4, fill: '#FFA16C', strokeWidth: 0 }}
        />

        {/* 悲観バンド */}
        <Area
          type="monotone"
          dataKey="p25"
          stroke="#ef4444"
          strokeWidth={1}
          fill="url(#sim-p25)"
          strokeOpacity={0.4}
          dot={false}
          activeDot={false}
        />
        <Area
          type="monotone"
          dataKey="p10"
          stroke="#ef4444"
          strokeWidth={1.5}
          fill="url(#sim-p10)"
          strokeOpacity={0.7}
          dot={false}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
