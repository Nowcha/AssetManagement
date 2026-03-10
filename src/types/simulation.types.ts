/** 目標設定 */
export interface Goal {
  id: string
  name: string                   // 例: "老後資金"
  targetAmount: number           // 目標金額 (JPY)
  targetDate: string             // ISO8601 date
  monthlyContribution: number    // 月次積立額 (JPY)
  expectedAnnualReturn: number   // 期待年率リターン (e.g., 0.05 = 5%)
  stdDev: number                 // 年率標準偏差 (e.g., 0.15 = 15%)
  inflationRate: number          // インフレ率 (e.g., 0.02 = 2%)
  createdAt: string
  updatedAt: string
}

/** モンテカルロシミュレーション結果 */
export interface SimulationResult {
  goalId: string
  runAt: string
  trials: number                 // 試行回数（通常 1000）
  years: number
  percentiles: {
    p10: number[]                // 悲観シナリオ
    p25: number[]
    p50: number[]                // 中央値
    p75: number[]
    p90: number[]                // 楽観シナリオ
  }
  successProbability: number     // 目標達成確率 (0-1)
}

/** Web Worker への送信メッセージ */
export interface SimulationWorkerInput {
  initialAmount: number
  monthlyContribution: number
  expectedAnnualReturn: number
  stdDev: number
  years: number
  trials: number
  targetAmount: number
}

/** Web Worker からの返信メッセージ */
export interface SimulationWorkerOutput {
  result: SimulationResult
}
