/**
 * CoinGecko API アダプター（無料プラン、APIキー不要）
 * https://www.coingecko.com/api/documentation
 */

const BASE_URL = 'https://api.coingecko.com/api/v3'

export interface CoinPrice {
  id: string
  symbol: string
  current_price: number
  price_change_percentage_24h: number
}

/** 主要仮想通貨の現在価格を取得（JPY建て） */
export async function fetchCryptoPrices(
  coinIds: string[],
): Promise<Record<string, number>> {
  if (coinIds.length === 0) return {}

  const ids = coinIds.join(',')
  const url = `${BASE_URL}/simple/price?ids=${ids}&vs_currencies=jpy`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status.toString()}`)
  }

  const data = (await response.json()) as Record<string, { jpy: number }>

  const result: Record<string, number> = {}
  for (const [id, prices] of Object.entries(data)) {
    result[id] = prices.jpy
  }
  return result
}

/** ティッカーシンボルからCoinGecko IDへのマッピング */
export const CRYPTO_TICKER_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
}
