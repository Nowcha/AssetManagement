/**
 * Yahoo Finance Japan 非公式APIアダプター
 * 国内株・投資信託の価格取得
 * 注意: 非公式APIのため仕様変更リスクあり。エラー時は手動入力にフォールバック。
 */

const YF_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

interface YahooFinanceResult {
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
 * 国内株・ETF・投資信託の現在価格を取得
 * @param ticker - Yahoo Finance Japan ティッカー（例: "7203.T" for トヨタ、"0331418A.T" for 投信）
 */
export async function fetchJpPrice(ticker: string): Promise<number> {
  const url = `${YF_BASE_URL}/${encodeURIComponent(ticker)}?interval=1d&range=1d`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status.toString()}`)
  }

  const data = (await response.json()) as YahooFinanceResult

  if (data.chart.error || !data.chart.result?.[0]) {
    throw new Error(`銘柄 "${ticker}" の価格データが取得できませんでした`)
  }

  return data.chart.result[0].meta.regularMarketPrice
}

/**
 * 複数銘柄の価格を取得（エラーは個別に処理してスキップ）
 */
export async function fetchJpPrices(
  tickers: string[],
): Promise<Record<string, number>> {
  const results: Record<string, number> = {}

  await Promise.allSettled(
    tickers.map(async (ticker) => {
      try {
        results[ticker] = await fetchJpPrice(ticker)
      } catch {
        // 個別エラーはスキップ（手動入力にフォールバック）
      }
    }),
  )

  return results
}
