/**
 * Frankfurter API アダプター（無料、APIキー不要）
 * https://www.frankfurter.app/
 */

const BASE_URL = 'https://api.frankfurter.app'

/** 最新の為替レートを取得（JPY建て） */
export async function fetchExchangeRates(
  baseCurrency: string = 'JPY',
): Promise<Record<string, number>> {
  const url = `${BASE_URL}/latest?from=${baseCurrency}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status.toString()}`)
  }

  const data = (await response.json()) as { rates: Record<string, number> }
  return data.rates
}

/** 特定通貨ペアのレートを取得（例: USD → JPY） */
export async function fetchRate(from: string, to: string): Promise<number> {
  const url = `${BASE_URL}/latest?from=${from}&to=${to}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status.toString()}`)
  }

  const data = (await response.json()) as { rates: Record<string, number> }
  return data.rates[to] ?? 1
}
