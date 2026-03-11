/**
 * usePriceSync - 外部API連携による資産価格同期フック
 *
 * 対応API:
 *   - 仮想通貨:              CoinGecko (APIキー不要・CORS対応)
 *   - 国内株・ETF・投資信託: Yahoo Finance v8 Chart API (APIキー不要)
 *   - 米国株:                Yahoo Finance v8 Chart API (APIキー不要)
 *   - 為替:                  Frankfurter API (APIキー不要・CORS対応)
 *
 * Yahoo Finance ティッカー形式（自動変換・ユーザー入力はそのままでOK）:
 *   - 国内株・ETF: "{証券コード}.T"  例: "7203.T" (Toyota), "9433.T" (KDDI)
 *   - 米国株:      "{symbol}"        例: "AAPL", "MSFT"
 *
 * CORS戦略: 直接アクセスを試み、ブロックされた場合は corsproxy.io 経由にフォールバック。
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useAssetStore } from '@/store/assetStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useUiStore } from '@/store/uiStore'
import { saveAsset } from '@/utils/dbService'
import { fetchCryptoPrices, CRYPTO_TICKER_TO_ID } from '@/api/coinGecko'
import { fetchRate } from '@/api/frankfurter'
import { fetchYahooPrice } from '@/api/yahooFinance'
import type { Asset, AssetClass } from '@/types/asset.types'

export interface PriceSyncResult {
  updatedCount: number
  failedCount: number
  lastSyncAt: string
}

/** Asset classes that support automatic price fetching */
export const AUTO_SYNC_ASSET_CLASSES: AssetClass[] = [
  'stock_jp', 'stock_us', 'etf', 'mutual_fund', 'crypto',
]

/** Returns true if this asset's price can be fetched automatically */
export function isSyncable(asset: Asset): boolean {
  return AUTO_SYNC_ASSET_CLASSES.includes(asset.assetClass) && !!asset.ticker?.trim()
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
      // Yahoo Finance: USD 建て → JPY 換算
      const priceUsd = await fetchYahooPrice(ticker, 'us')
      return priceUsd * usdToJpy
    }

    case 'stock_jp':
    case 'etf':
    case 'mutual_fund': {
      if (!ticker) return null
      // Yahoo Finance: JPY 建てでそのまま返す
      return await fetchYahooPrice(ticker, 'jp')
    }

    // 預金・債券・不動産・保険・その他は手動管理
    default:
      return null
  }
}

/** USD/JPY レートを取得（失敗時はフォールバック値を返す） */
async function getUsdToJpy(): Promise<number> {
  try {
    return await fetchRate('USD', 'JPY')
  } catch {
    return 150
  }
}

export function usePriceSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncingAssetIds, setSyncingAssetIds] = useState<Set<string>>(new Set())
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { assets, updateAsset } = useAssetStore()
  const { settings, cryptoKey } = useSettingsStore()
  const { addToast } = useUiStore()

  /** 取得した価格をストアとDBに反映する共通処理 */
  const applyPrice = useCallback(async (
    asset: Asset,
    priceJpy: number,
    usdToJpy: number,
  ): Promise<void> => {
    const now = new Date().toISOString()
    const priceInCurrency = asset.currency === 'USD' ? priceJpy / usdToJpy : priceJpy
    const updated: Partial<Asset> = {
      currentPrice: priceInCurrency,
      currentPriceJpy: priceJpy,
      currentPriceUpdatedAt: now,
      updatedAt: now,
    }
    updateAsset(asset.id, updated)
    await saveAsset({ ...asset, ...updated }, cryptoKey ?? undefined)
  }, [updateAsset, cryptoKey])

  /**
   * 全資産の価格を一括同期する。
   */
  const syncPrices = useCallback(async (): Promise<PriceSyncResult> => {
    if (isSyncing) {
      return { updatedCount: 0, failedCount: 0, lastSyncAt: lastSyncAt ?? '' }
    }

    setIsSyncing(true)
    setSyncError(null)

    let updatedCount = 0
    let failedCount = 0

    try {
      const usdToJpy = await getUsdToJpy()

      // 全資産を並列処理（Yahoo Finance はレート制限が緩やか）
      await Promise.allSettled(
        assets.map(async (asset) => {
          try {
            const priceJpy = await fetchPriceJpy(asset, usdToJpy)
            if (priceJpy === null) return // 対応なし・手動管理

            await applyPrice(asset, priceJpy, usdToJpy)
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
  }, [isSyncing, lastSyncAt, assets, applyPrice, addToast])

  /**
   * 単一資産の価格を更新する。
   * ティッカー未設定や非対応クラスの場合はエラートーストを表示。
   */
  const syncSingleAsset = useCallback(async (assetId: string): Promise<void> => {
    const asset = useAssetStore.getState().assets.find((a) => a.id === assetId)
    if (!asset) return
    if (syncingAssetIds.has(assetId)) return

    setSyncingAssetIds((prev) => new Set(prev).add(assetId))

    try {
      const usdToJpy = await getUsdToJpy()
      const priceJpy = await fetchPriceJpy(asset, usdToJpy)

      if (priceJpy === null) {
        addToast({
          type: 'error',
          message: `「${asset.name}」は自動取得に対応していません（ティッカー・資産クラスを確認してください）`,
        })
        return
      }

      await applyPrice(asset, priceJpy, usdToJpy)
      const now = new Date().toISOString()
      setLastSyncAt(now)
      addToast({ type: 'success', message: `「${asset.name}」の価格を更新しました` })
    } catch (err) {
      const message = err instanceof Error ? err.message : `「${asset.name}」の価格更新に失敗しました`
      addToast({ type: 'error', message })
    } finally {
      setSyncingAssetIds((prev) => {
        const next = new Set(prev)
        next.delete(assetId)
        return next
      })
    }
  }, [syncingAssetIds, applyPrice, addToast])

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

  return { isSyncing, syncingAssetIds, lastSyncAt, syncError, syncPrices, syncSingleAsset }
}
