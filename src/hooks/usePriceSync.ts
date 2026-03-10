/**
 * usePriceSync - 外部API連携による資産価格同期フック
 *
 * 対応API:
 *   - 仮想通貨: CoinGecko (APIキー不要)
 *   - 国内株・ETF・投資信託: Yahoo Finance Japan (APIキー不要)
 *   - 米国株: Alpha Vantage (ユーザーAPIキー必要)
 *   - 為替: Frankfurter (APIキー不要)
 *
 * レート制限:
 *   - Alpha Vantage 無料プラン: 25req/day, 5req/min
 *   - CoinGecko 無料プラン: ~30req/min
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAssetStore } from '@/store/assetStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useUiStore } from '@/store/uiStore'
import { saveAsset } from '@/utils/dbService'
import { fetchCryptoPrices, CRYPTO_TICKER_TO_ID } from '@/api/coinGecko'
import { fetchRate } from '@/api/frankfurter'
import { fetchUsStockPrice } from '@/api/alphaVantage'
import { fetchJpPrices } from '@/api/yahooFinanceJP'
import type { Asset } from '@/types/asset.types'

export interface PriceSyncResult {
  updatedCount: number
  failedCount: number
  lastSyncAt: string
}

/** 資産の現在価格をAPIから取得してJPY換算で返す */
async function fetchPriceJpy(
  asset: Asset,
  alphaVantageKey: string,
  usdToJpy: number,
): Promise<number | null> {
  const ticker = asset.ticker?.trim()

  switch (asset.assetClass) {
    case 'crypto': {
      if (!ticker) return null
      const coinId = CRYPTO_TICKER_TO_ID[ticker.toUpperCase()]
      if (!coinId) return null
      const prices = await fetchCryptoPrices([coinId])
      const priceJpy = prices[coinId]
      return priceJpy ?? null
    }

    case 'stock_us': {
      if (!ticker || !alphaVantageKey) return null
      // Alpha Vantage はUSD建て → JPY換算
      const priceUsd = await fetchUsStockPrice(ticker, alphaVantageKey)
      return priceUsd * usdToJpy
    }

    case 'stock_jp':
    case 'etf':
    case 'mutual_fund': {
      if (!ticker) return null
      // Yahoo Finance Japan ティッカーは "7203.T" 形式
      const yTicker = ticker.includes('.') ? ticker : `${ticker}.T`
      const prices = await fetchJpPrices([yTicker])
      return prices[yTicker] ?? null
    }

    // 預金・債券・不動産・保険・その他は手動管理
    default:
      return null
  }
}

/** Alpha Vantage のレート制限対応: 1req/12秒 (5req/min) */
async function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function usePriceSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { assets, updateAsset } = useAssetStore()
  const { settings, cryptoKey } = useSettingsStore()
  const { addToast } = useUiStore()

  const syncPrices = useCallback(async (): Promise<PriceSyncResult> => {
    if (isSyncing) {
      return { updatedCount: 0, failedCount: 0, lastSyncAt: lastSyncAt ?? '' }
    }

    setIsSyncing(true)
    setSyncError(null)

    let updatedCount = 0
    let failedCount = 0

    try {
      // USD/JPY レートを先に取得
      let usdToJpy = 150 // フォールバック値
      try {
        usdToJpy = await fetchRate('USD', 'JPY')
      } catch {
        // Frankfurter がエラーでもフォールバック値で継続
      }

      const alphaVantageKey = settings.alphaVantageApiKey ?? ''

      // 米国株のみ Alpha Vantage → レート制限対応で逐次処理
      const usStocks = assets.filter(
        (a) => a.assetClass === 'stock_us' && a.ticker,
      )
      const otherAssets = assets.filter((a) => a.assetClass !== 'stock_us')

      // 米国株以外はすべてまとめて処理（CoinGecko は一括、Yahoo JP は個別だが並列可）
      await Promise.allSettled(
        otherAssets.map(async (asset) => {
          try {
            const priceJpy = await fetchPriceJpy(asset, alphaVantageKey, usdToJpy)
            if (priceJpy === null) return // 対応なし・手動管理

            const now = new Date().toISOString()
            const priceInCurrency =
              asset.currency === 'USD' ? priceJpy / usdToJpy : priceJpy

            const updated: Partial<Asset> = {
              currentPrice: priceInCurrency,
              currentPriceJpy: priceJpy,
              currentPriceUpdatedAt: now,
              updatedAt: now,
            }

            updateAsset(asset.id, updated)
            await saveAsset({ ...asset, ...updated }, cryptoKey ?? undefined)
            updatedCount++
          } catch {
            failedCount++
          }
        }),
      )

      // 米国株: Alpha Vantage 無料プラン 5req/min → 12秒ごとに1件
      for (const asset of usStocks) {
        try {
          const priceJpy = await fetchPriceJpy(asset, alphaVantageKey, usdToJpy)
          if (priceJpy !== null) {
            const now = new Date().toISOString()
            const priceUsd = priceJpy / usdToJpy

            const updated: Partial<Asset> = {
              currentPrice: priceUsd,
              currentPriceJpy: priceJpy,
              currentPriceUpdatedAt: now,
              updatedAt: now,
            }

            updateAsset(asset.id, updated)
            await saveAsset({ ...asset, ...updated }, cryptoKey ?? undefined)
            updatedCount++
          }
        } catch {
          failedCount++
        }

        // レート制限対応: 米国株が複数ある場合に間隔を空ける
        if (usStocks.indexOf(asset) < usStocks.length - 1) {
          await sleepMs(12_000)
        }
      }

      const now = new Date().toISOString()
      setLastSyncAt(now)

      if (updatedCount > 0) {
        addToast({
          type: 'success',
          message: `${updatedCount.toString()}件の価格を更新しました`,
        })
      }

      return { updatedCount, failedCount, lastSyncAt: now }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '価格同期に失敗しました'
      setSyncError(msg)
      addToast({ type: 'error', message: msg })
      return { updatedCount, failedCount, lastSyncAt: lastSyncAt ?? '' }
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, lastSyncAt, assets, settings.alphaVantageApiKey, cryptoKey, updateAsset, addToast])

  // 自動更新インターバル
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (settings.priceAutoRefresh && settings.priceRefreshIntervalMinutes > 0) {
      const ms = settings.priceRefreshIntervalMinutes * 60 * 1000
      intervalRef.current = setInterval(() => {
        void syncPrices()
      }, ms)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [settings.priceAutoRefresh, settings.priceRefreshIntervalMinutes, syncPrices])

  return { isSyncing, lastSyncAt, syncError, syncPrices }
}
