/**
 * Simulation page - モンテカルロ資産シミュレーション
 * 将来資産を1000試行のモンテカルロ法でシミュレート
 */
import { useState } from 'react'
import { useAssetStore } from '@/store/assetStore'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useSimulation } from '@/hooks/useSimulation'
import { SimulationChart } from '@/components/charts/SimulationChart'
import { formatJpy } from '@/utils/formatters'
import type { SimulationParams } from '@/hooks/useSimulation'

// ---------------------------------------------------------------------------
// プリセット（代表的な運用パターン）
// ---------------------------------------------------------------------------

interface Preset {
  label: string
  expectedAnnualReturn: number
  stdDev: number
}

const PRESETS: Preset[] = [
  { label: '定期預金', expectedAnnualReturn: 0.003, stdDev: 0.001 },
  { label: '債券中心', expectedAnnualReturn: 0.03, stdDev: 0.05 },
  { label: 'バランス型', expectedAnnualReturn: 0.05, stdDev: 0.12 },
  { label: '株式中心', expectedAnnualReturn: 0.07, stdDev: 0.18 },
  { label: '全世界株式', expectedAnnualReturn: 0.09, stdDev: 0.22 },
]

// ---------------------------------------------------------------------------
// 入力フィールド
// ---------------------------------------------------------------------------

function NumberInput({
  label,
  description,
  value,
  onChange,
  suffix,
  min,
  max,
  step,
}: {
  label: string
  description?: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-white">
        {label}
      </label>
      {description && (
        <p className="mb-1.5 text-xs" style={{ color: '#868F97' }}>
          {description}
        </p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step ?? 1}
          className="input-dark w-full"
        />
        {suffix && (
          <span className="flex-shrink-0 text-sm" style={{ color: '#868F97' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 結果サマリーカード
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="mb-1 text-xs" style={{ color: '#868F97' }}>
        {label}
      </p>
      <p
        className="font-amount text-lg font-bold"
        style={{ color: color ?? '#fff' }}
      >
        {value}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// メインページ
// ---------------------------------------------------------------------------

export function Simulation() {
  const { assets } = useAssetStore()
  const { summary } = usePortfolio()
  const { result, isRunning, error, runSimulation, reset } = useSimulation()

  const currentTotal = summary?.totalValueJpy ?? 0

  const [params, setParams] = useState<SimulationParams>({
    initialAmount: Math.round(currentTotal),
    monthlyContribution: 50_000,
    expectedAnnualReturn: 0.05,
    stdDev: 0.12,
    years: 20,
    targetAmount: 30_000_000,
  })
  const [selectedPreset, setSelectedPreset] = useState<number>(2) // バランス型

  const setParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }))
    reset()
  }

  const applyPreset = (i: number) => {
    const p = PRESETS[i]
    if (!p) return
    setSelectedPreset(i)
    setParams((prev) => ({
      ...prev,
      expectedAnnualReturn: p.expectedAnnualReturn,
      stdDev: p.stdDev,
    }))
    reset()
  }

  const handleRun = () => {
    runSimulation(params)
  }

  const finalYearValues = result
    ? {
        p10: result.percentiles.p10[result.years] ?? 0,
        p50: result.percentiles.p50[result.years] ?? 0,
        p90: result.percentiles.p90[result.years] ?? 0,
      }
    : null

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">シミュレーション</h2>
        {result && (
          <p className="text-xs" style={{ color: '#4B5563' }}>
            {result.trials.toLocaleString('ja-JP')}試行 × {result.years}年
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── 設定パネル ── */}
        <div className="glass-card space-y-5 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#FFA16C' }}>
            パラメーター設定
          </h3>

          <NumberInput
            label="現在の資産額"
            description={
              assets.length > 0 ? `ポートフォリオ合計: ${formatJpy(currentTotal)}` : undefined
            }
            value={params.initialAmount}
            onChange={(v) => setParam('initialAmount', v)}
            suffix="円"
            min={0}
            step={10000}
          />

          <NumberInput
            label="月次積立額"
            value={params.monthlyContribution}
            onChange={(v) => setParam('monthlyContribution', v)}
            suffix="円/月"
            min={0}
            step={1000}
          />

          <NumberInput
            label="目標金額"
            value={params.targetAmount}
            onChange={(v) => setParam('targetAmount', v)}
            suffix="円"
            min={0}
            step={100000}
          />

          <NumberInput
            label="運用期間"
            value={params.years}
            onChange={(v) => setParam('years', Math.min(40, Math.max(1, Math.round(v))))}
            suffix="年"
            min={1}
            max={40}
            step={1}
          />

          {/* プリセット */}
          <div>
            <p className="mb-2 text-sm font-medium text-white">運用スタイル</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(i)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                  style={
                    selectedPreset === i
                      ? { background: '#FFA16C', color: '#000' }
                      : { background: 'rgba(255,255,255,0.06)', color: '#868F97' }
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="期待年率リターン"
              value={Math.round(params.expectedAnnualReturn * 1000) / 10}
              onChange={(v) => setParam('expectedAnnualReturn', v / 100)}
              suffix="%"
              min={-20}
              max={50}
              step={0.1}
            />
            <NumberInput
              label="年率標準偏差"
              value={Math.round(params.stdDev * 1000) / 10}
              onChange={(v) => setParam('stdDev', Math.max(0, v / 100))}
              suffix="%"
              min={0}
              max={100}
              step={0.1}
            />
          </div>

          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="btn-accent w-full justify-center"
            style={{ opacity: isRunning ? 0.6 : 1 }}
          >
            {isRunning ? '計算中...' : 'シミュレーション実行'}
          </button>

          {error && (
            <p className="text-xs" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        {/* ── 結果パネル ── */}
        <div className="space-y-4 lg:col-span-3">
          {/* 空状態 */}
          {!result && !isRunning && (
            <div
              className="glass-card flex flex-col items-center justify-center py-20"
              style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
            >
              <p className="text-sm" style={{ color: '#868F97' }}>
                左のパネルでパラメーターを設定して
              </p>
              <p className="mt-1 text-sm" style={{ color: '#868F97' }}>
                「シミュレーション実行」をクリックしてください
              </p>
            </div>
          )}

          {/* 計算中 */}
          {isRunning && (
            <div className="glass-card flex flex-col items-center justify-center py-20">
              <div
                className="mb-3 h-8 w-8 animate-spin rounded-full border-2"
                style={{ borderColor: 'rgba(255,161,108,0.2)', borderTopColor: '#FFA16C' }}
              />
              <p className="text-sm" style={{ color: '#868F97' }}>
                1,000試行 × {params.years}年を計算中...
              </p>
            </div>
          )}

          {/* 結果表示 */}
          {result && (
            <>
              {/* 達成確率バナー */}
              <div
                className="glass-card flex items-center justify-between p-5"
                style={{
                  background:
                    result.successProbability >= 0.5
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                }}
              >
                <div>
                  <p className="text-xs uppercase tracking-widest" style={{ color: '#868F97' }}>
                    目標達成確率
                  </p>
                  <p
                    className="font-amount mt-1 text-4xl font-bold"
                    style={{
                      color: result.successProbability >= 0.5 ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {Math.round(result.successProbability * 100).toString()}%
                  </p>
                  <p className="mt-1 text-xs" style={{ color: '#868F97' }}>
                    目標: {formatJpy(params.targetAmount)} / {params.years}年後
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: '#4B5563' }}>
                    月次積立: {formatJpy(params.monthlyContribution)}
                  </p>
                  <p className="text-xs" style={{ color: '#4B5563' }}>
                    期待リターン: {(params.expectedAnnualReturn * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs" style={{ color: '#4B5563' }}>
                    標準偏差: {(params.stdDev * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* 統計サマリー */}
              {finalYearValues && (
                <div className="grid grid-cols-3 gap-3">
                  <StatCard
                    label={`${params.years}年後 悲観 (10%)`}
                    value={formatJpy(finalYearValues.p10)}
                    color="#ef4444"
                  />
                  <StatCard
                    label={`${params.years}年後 中央値`}
                    value={formatJpy(finalYearValues.p50)}
                    color="#FFA16C"
                  />
                  <StatCard
                    label={`${params.years}年後 楽観 (90%)`}
                    value={formatJpy(finalYearValues.p90)}
                    color="#22c55e"
                  />
                </div>
              )}

              {/* チャート */}
              <div className="glass-card p-5">
                <p className="mb-1 text-sm font-semibold text-white">資産推移予測</p>
                <p className="mb-4 text-xs" style={{ color: '#868F97' }}>
                  緑: 楽観（75%ile / 90%ile）　橙: 中央値（50%ile）　赤: 悲観（25%ile / 10%ile）
                </p>
                <SimulationChart result={result} targetAmount={params.targetAmount} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 免責事項（必須表示） */}
      <div
        className="rounded-lg p-4 text-sm"
        style={{
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.18)',
          color: '#fbbf24',
        }}
      >
        本シミュレーション結果は情報提供を目的としたものであり、投資勧誘・助言・推奨を行うものではありません。
        投資判断は自己責任でお願いします。
        シミュレーションは過去データや統計的仮定に基づいており、将来の運用成果を保証するものではありません。
      </div>
    </div>
  )
}
