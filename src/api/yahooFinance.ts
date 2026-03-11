/**
 * Yahoo Finance Chart API Adapter
 *
 * yfinance (Python library) uses this same endpoint internally.
 * Reference: https://zenn.dev/investaitech/articles/c7814a7f1bccd2
 *
 * Endpoint: https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1d&interval=1d
 * Response: JSON with chart.result[0].meta.regularMarketPrice
 *
 * CORS strategy:
 *   1. Try direct access first (Yahoo Finance v8 supports CORS in most browsers)
 *   2. Fall back to corsproxy.io if blocked (uses correct ?url= format with encoding)
 *
 * Ticker formats:
 *   - Japan stocks/ETFs/mutual funds: "{code}.T"  e.g. "7203.T" (Toyota), "9433.T" (KDDI)
 *   - US stocks:                       "{symbol}"  e.g. "AAPL" (Apple), "MSFT"
 *
 * Input normalization (toYahooTicker):
 *   - "7203"       + jp → "7203.T"   (append .T)
 *   - "7203.T"     + jp → "7203.T"   (already correct)
 *   - "7203 東証.T" + jp → "7203.T"   (strip space/extra text)
 *   - "9433.jp"    + jp → "9433.T"   (migrate from old Stooq format)
 *   - "AAPL"       + us → "AAPL"     (unchanged)
 *   - "AAPL.US"    + us → "AAPL"     (remove .US suffix)
 */

const YF_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const CORS_PROXY_BASE = 'https://corsproxy.io'

// ---- Types ------------------------------------------------------------------

interface YahooChartMeta {
  currency: string
  symbol: string
  regularMarketPrice: number
  regularMarketTime?: number
}

interface YahooChartResponse {
  chart: {
    result: Array<{ meta: YahooChartMeta }> | null
    error: { code: string; description: string } | null
  }
}

export type YahooExchange = 'jp' | 'us'

// ---- Helpers ----------------------------------------------------------------

/**
 * Normalizes a user-entered ticker to Yahoo Finance format.
 */
export function toYahooTicker(ticker: string, exchange: YahooExchange): string {
  const base = ticker
    .trim()
    .split(/[\s\u3000]/)[0]       // strip full-width/half-width spaces and trailing text
    .replace(/\.[A-Za-z]+$/, '')  // remove any existing exchange suffix (.T, .jp, .US, etc.)

  return exchange === 'jp' ? `${base}.T` : base
}

/**
 * Builds the Yahoo Finance Chart API URL.
 */
function buildYahooUrl(ticker: string): string {
  return `${YF_CHART_BASE}/${encodeURIComponent(ticker)}?range=1d&interval=1d`
}

/**
 * Wraps a URL with the corsproxy.io CORS proxy.
 * Uses the correct ?url= parameter with URL encoding.
 */
export function withCorsProxy(targetUrl: string): string {
  return `${CORS_PROXY_BASE}/?url=${encodeURIComponent(targetUrl)}`
}

/**
 * Parses the Yahoo Finance Chart API JSON response and extracts the price.
 */
function parseYahooResponse(data: unknown, ticker: string): number {
  if (typeof data !== 'object' || data === null || !('chart' in data)) {
    throw new Error(`銘柄 "${ticker}" のレスポンス形式が不正です`)
  }

  const res = data as YahooChartResponse

  if (res.chart.error !== null) {
    throw new Error(`Yahoo Finance エラー: ${res.chart.error.description} (${ticker})`)
  }

  const result = res.chart.result?.[0]
  if (!result) {
    throw new Error(`銘柄 "${ticker}" のデータが見つかりません（ティッカーが正しいか確認してください）`)
  }

  const price = result.meta.regularMarketPrice
  if (typeof price !== 'number' || isNaN(price) || price <= 0) {
    throw new Error(
      `銘柄 "${ticker}" の価格データが無効です（上場廃止または取引停止の可能性があります）`,
    )
  }

  return price
}

// ---- Public API -------------------------------------------------------------

/**
 * Fetches the current market price for a ticker from Yahoo Finance.
 *
 * Tries direct access first. If CORS is blocked or the response is not ok,
 * automatically retries via corsproxy.io.
 *
 * @param ticker   - User-entered ticker (will be normalized via toYahooTicker)
 * @param exchange - Exchange type: 'jp' for Japan, 'us' for US
 * @returns Current price in native currency (JPY for Japan, USD for US stocks)
 */
export async function fetchYahooPrice(
  ticker: string,
  exchange: YahooExchange,
): Promise<number> {
  const normalizedTicker = toYahooTicker(ticker, exchange)
  const yahooUrl = buildYahooUrl(normalizedTicker)

  // Attempt 1: direct access (Yahoo Finance v8 supports CORS)
  const directRes = await fetch(yahooUrl).catch(() => null)
  if (directRes?.ok === true) {
    const data: unknown = await directRes.json()
    return parseYahooResponse(data, normalizedTicker)
  }

  // Attempt 2: CORS proxy fallback
  const proxyRes = await fetch(withCorsProxy(yahooUrl))
  if (!proxyRes.ok) {
    throw new Error(
      `価格取得エラー: HTTP ${proxyRes.status.toString()} (${normalizedTicker})`,
    )
  }

  const data: unknown = await proxyRes.json()
  return parseYahooResponse(data, normalizedTicker)
}
