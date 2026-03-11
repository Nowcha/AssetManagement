/**
 * Yahoo Finance 非公式APIアダプター（国内株・米国株共通）
 * エンドポイント: https://query1.finance.yahoo.com/v8/finance/chart/{ticker}
 *
 * ティッカー形式:
 *   - 国内株・ETF: "{証券コード}.T"  例: "7203.T"（トヨタ）
 *   - 投資信託:    "{ファンドコード}.T"
 *   - 米国株:      そのまま          例: "AAPL", "SPY"
 *
 * 注意: 非公式APIのため仕様変更リスクあり。エラー時は手動入力にフォールバック。
 */

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number
        currency: string
      }
    }> | null
    error: { code: string; description: string } | null
  }
}

/**
 * 単一銘柄の現在価格を取得（通貨はそのまま返す）
 * @param ticker - Yahoo Finance ティッカー（例: "7203.T", "AAPL"）
 * @returns 現在価格（銘柄の建値通貨）
 */
export async function fetchStockPrice(ticker: string): Promise<number> {
  const url = `${YF_BASE}/${encodeURIComponent(ticker)}?interval=1d&range=1d`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status.toString()} (${ticker})`)
  }

  const data = (await response.json()) as YahooChartResponse

  const result = data.chart.result?.[0]
  if (data.chart.error !== null || !result) {
    throw new Error(`銘柄 "${ticker}" の価格データが取得できませんでした`)
  }

  return result.meta.regularMarketPrice
}

/**
 * 複数銘柄の価格を並列取得（個別エラーはスキップ）
 * @param tickers - ティッカーの配列
 * @returns { [ticker]: price } のマップ
 */
export async function fetchStockPrices(
  tickers: string[],
): Promise<Record<string, number>> {
  const results: Record<string, number> = {}

  await Promise.allSettled(
    tickers.map(async (ticker) => {
      try {
        results[ticker] = await fetchStockPrice(ticker)
      } catch {
        // 個別エラーはスキップ（手動入力にフォールバック）
      }
    }),
  )

  return results
}

/**
 * 国内株・ETF・投資信託向けのティッカー正規化
 * 証券コードのみ渡した場合に ".T" サフィックスを付与する
 */
export function normalizeJpTicker(ticker: string): string {
  return ticker.includes('.') ? ticker : `${ticker}.T`
}
