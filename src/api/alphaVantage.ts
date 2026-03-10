/**
 * Alpha Vantage API アダプター（米国株、無料プラン25req/day）
 * https://www.alphavantage.co/documentation/
 * APIキーはユーザーが設定画面で入力
 */

const BASE_URL = 'https://www.alphavantage.co/query'

interface GlobalQuote {
  '01. symbol': string
  '05. price': string
  '09. change': string
  '10. change percent': string
}

/** 米国株の現在価格を取得（USD建て） */
export async function fetchUsStockPrice(
  ticker: string,
  apiKey: string,
): Promise<number> {
  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status.toString()}`)
  }

  const data = (await response.json()) as { 'Global Quote': GlobalQuote }
  const quote = data['Global Quote']

  if (!quote || !quote['05. price']) {
    throw new Error(`銘柄 "${ticker}" の価格データが取得できませんでした`)
  }

  return parseFloat(quote['05. price'])
}
