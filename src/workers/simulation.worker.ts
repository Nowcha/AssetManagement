/**
 * モンテカルロシミュレーション Web Worker
 * メインスレッドをブロックしないようにオフロード
 */
import type {
  SimulationWorkerInput,
  SimulationWorkerOutput,
  SimulationResult,
} from '@/types/simulation.types'

self.onmessage = (event: MessageEvent<SimulationWorkerInput>) => {
  const result = runMonteCarlo(event.data)
  const output: SimulationWorkerOutput = { result }
  self.postMessage(output)
}

function runMonteCarlo(input: SimulationWorkerInput): SimulationResult {
  const {
    initialAmount,
    monthlyContribution,
    expectedAnnualReturn,
    stdDev,
    years,
    trials,
    targetAmount,
  } = input

  const monthlyReturn = expectedAnnualReturn / 12
  const monthlyStdDev = stdDev / Math.sqrt(12)
  const months = years * 12

  // 各試行の最終資産額を記録
  const allPaths: number[][] = []
  let successCount = 0

  for (let t = 0; t < trials; t++) {
    const path: number[] = [initialAmount]
    let current = initialAmount

    for (let m = 0; m < months; m++) {
      // 正規乱数生成（Box-Muller変換）
      const u1 = Math.random()
      const u2 = Math.random()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const monthlyRet = monthlyReturn + monthlyStdDev * z

      current = current * (1 + monthlyRet) + monthlyContribution

      // 月次記録は年次のみ（メモリ節約）
      if ((m + 1) % 12 === 0) {
        path.push(Math.max(0, current))
      }
    }

    allPaths.push(path)
    if (current >= targetAmount) successCount++
  }

  // パーセンタイル計算（各年時点）
  const numYearPoints = years + 1
  const percentiles = {
    p10: new Array<number>(numYearPoints).fill(0),
    p25: new Array<number>(numYearPoints).fill(0),
    p50: new Array<number>(numYearPoints).fill(0),
    p75: new Array<number>(numYearPoints).fill(0),
    p90: new Array<number>(numYearPoints).fill(0),
  }

  for (let y = 0; y < numYearPoints; y++) {
    const values = allPaths.map((path) => path[y] ?? 0).sort((a, b) => a - b)
    percentiles.p10[y] = quantile(values, 0.1)
    percentiles.p25[y] = quantile(values, 0.25)
    percentiles.p50[y] = quantile(values, 0.5)
    percentiles.p75[y] = quantile(values, 0.75)
    percentiles.p90[y] = quantile(values, 0.9)
  }

  return {
    goalId: '',
    runAt: new Date().toISOString(),
    trials,
    years,
    percentiles,
    successProbability: successCount / trials,
  }
}

function quantile(sortedArr: number[], q: number): number {
  const idx = (sortedArr.length - 1) * q
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  const weight = idx - lower
  return sortedArr[lower] * (1 - weight) + (sortedArr[upper] ?? sortedArr[lower]) * weight
}
