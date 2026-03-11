/**
 * usePriceSync - 外部API連携による資産価格同期フック
 *
 * 対応API:
 *   - 仮想通貨: CoinGecko (APIキー不要)
 *   - 国内株・ETF・投資信託・米国株: Yahoo Finance 非公式API (APIキー不要)
 *   - 為替: Frankfurter (APIキー不要)
 *
 * Yahoo Finance のティッカー:
 *   - 国内株: "7203.T"  米国株: "AAPL"
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAssetStore } from '@/store/assetStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useUiStore } from '@/store/uiStore'
import { saveAsset } from '@/utils/dbService'
import { fetchCryptoPrices, CRYPTO_TICKER_TO_ID } from '@/api/coinGecko'
import { fetchRate } from '@/api/frankfurter'
import { fetchStockPrice, normalizeJpTicker } from '@/api/yahooFinance'
import type { Asset } from '@/types/asset.types'

export interface PriceSyncResult {
  updatedCount: number
  failedCount: number
  lastSyncAt: string
}

/** 資産の現在価格をAPIから取得してJPY換算で返す */
async function fetchPriceJpy(
  asset: Asset,
  usdToJpy: number,
): Promise<number | null> {
  const ticker = asset.ticker?.trim()

  switch (asset.assetClass) {
    case 'crypto': {
      if (!ticker) return null
      const coinId = CRYPTO_TICKER_TO_ID[ticker.toUpperCase()]
      if (!coinId) return null
      const prices = await fetchCryptoPrices([coinId])
      return prices[coinId] ?? null
    }

    case 'stock_us': {
      if (!ticker) return null
      // Yahoo Finance は USD 建て → JPY 換算
      const priceUsd = await fetchStockPrice(ticker)
      return priceUsd * usdToJpy
    }

    case 'stock_jp':
    case 'etf':
    case 'mutual_fund': {
      if (!ticker) return null
      const yTicker = normalizeJpTicker(ticker)
      return await fetchStockPrice(yTicker)
    }

    // 預金・債券・不動産・保険・その他は手動管理
    default:
      return null
  }
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

      // 全資産を並列処理（Yahoo Finance はレート制限が緩やか）
      await Promise.allSettled(
        assets.map(async (asset) => {
          try {
            const priceJpy = await fetchPriceJpy(asset, usdToJpy)
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
  }, [isSyncing, lastSyncAt, assets, cryptoKey, updateAsset, addToast])

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
