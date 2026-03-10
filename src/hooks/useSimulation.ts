/**
 * useSimulation - モンテカルロシミュレーション Web Worker ラッパーフック
 * 計算は simulation.worker.ts にオフロードしてメインスレッドをブロックしない
 */
import { useState, useCallback, useRef } from 'react'
import type {
  SimulationWorkerInput,
  SimulationWorkerOutput,
  SimulationResult,
} from '@/types/simulation.types'

export interface SimulationParams {
  initialAmount: number       // 現在の資産額 (JPY)
  monthlyContribution: number // 月次積立額 (JPY)
  expectedAnnualReturn: number // 期待年率リターン (e.g. 0.05 = 5%)
  stdDev: number              // 年率標準偏差 (e.g. 0.15 = 15%)
  years: number               // 運用期間（年）
  targetAmount: number        // 目標金額 (JPY)
}

const TRIALS = 1000

export function useSimulation() {
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const runSimulation = useCallback((params: SimulationParams): void => {
    // 前回のWorkerが走っていれば終了
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    setIsRunning(true)
    setError(null)

    try {
      const worker = new Worker(
        new URL('../workers/simulation.worker.ts', import.meta.url),
        { type: 'module' },
      )
      workerRef.current = worker

      const input: SimulationWorkerInput = {
        initialAmount: params.initialAmount,
        monthlyContribution: params.monthlyContribution,
        expectedAnnualReturn: params.expectedAnnualReturn,
        stdDev: params.stdDev,
        years: params.years,
        trials: TRIALS,
        targetAmount: params.targetAmount,
      }

      worker.onmessage = (e: MessageEvent<SimulationWorkerOutput>) => {
        setResult(e.data.result)
        setIsRunning(false)
        workerRef.current = null
      }

      worker.onerror = (e) => {
        setError(`シミュレーションエラー: ${e.message}`)
        setIsRunning(false)
        workerRef.current = null
      }

      worker.postMessage(input)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'シミュレーションの開始に失敗しました')
      setIsRunning(false)
    }
  }, [])

  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setResult(null)
    setError(null)
    setIsRunning(false)
  }, [])

  return { result, isRunning, error, runSimulation, reset }
}
