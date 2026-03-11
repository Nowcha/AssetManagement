/**
 * Stooq API アダプター
 * https://stooq.com
 *
 * Stooq 自体は CORS ヘッダーを返さないため、corsproxy.io 経由でアクセスする。
 * corsproxy.io はオープンソースの無料 CORS プロキシ（APIキー不要）。
 * https://github.com/nicnocquee/corsproxy.io
 *
 * ティッカー形式（自動変換・ユーザー入力はそのままでOK）:
 *   - 国内株・ETF: "{証券コード}.jp"  例: "9433.jp"（KDDI）
 *   - 米国株:      "{symbol}.us"       例: "aapl.us"（Apple）
 *
 * エンドポイント: https://stooq.com/q/l/?s={ticker}&f=sd2t2ohlcvn&e=csv
 * レスポンス: CSV
 *   行0 (ヘッダー): Symbol,Date,Time,Open,High,Low,Close,Volume,Name
 *   行1 (データ):   9433.JP,2026-03-11,,3200.0,3210.0,3185.0,3195.0,1234567,KDDI
 *
 * データ不在時: Close 列が "N/D" になるため isNaN チェックが必要。
 */

const STOOQ_BASE = 'https://stooq.com/q/l'

/**
 * CORS プロキシ経由でリクエスト URL を構築する。
 * corsproxy.io はターゲット URL を ? の後に URL エンコードして渡す形式。
 */
function withCorsProxy(targetUrl: string): string {
  return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
}

export type StooqExchange = 'jp' | 'us'

/**
 * ユーザー入力ティッカーを Stooq 形式に正規化する
 *
 * - "9433"       → "9433.jp"
 * - "9433.T"     → "9433.jp"
 * - "9433 東証"  → "9433.jp"  ← スペース以降を除去
 * - "AAPL"       → "aapl.us"
 * - "AAPL.US"    → "aapl.us"
 */
export function toStooqTicker(ticker: string, exchange: StooqExchange): string {
  const base = ticker
    .trim()
    .split(/[\s\u3000]/)[0]  // スペース（全角含む）以降を除去
    .replace(/\.[A-Za-z]+$/, '')  // 既存の取引所サフィックスを除去
  return `${base}.${exchange}`
}

/**
 * 単一銘柄の現在価格（終値）を取得する
 *
 * @param ticker   - 資産に登録されたティッカー（例: "9433.T", "9433", "AAPL"）
 * @param exchange - 取引所区分 'jp' または 'us'
 * @returns 現在価格（建値通貨）
 * @throws 取得失敗またはデータ不在の場合
 */
export async function fetchStooqPrice(
  ticker: string,
  exchange: StooqExchange,
): Promise<number> {
  const stooqTicker = toStooqTicker(ticker, exchange)
  const targetUrl = `${STOOQ_BASE}/?s=${encodeURIComponent(stooqTicker)}&f=sd2t2ohlcvn&e=csv`
  const url = withCorsProxy(targetUrl)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Stooq API error: ${response.status.toString()} (${stooqTicker})`)
  }

  const csv = await response.text()
  const lines = csv.trim().split('\n')

  // 最低2行必要: ヘッダー + データ行
  if (lines.length < 2) {
    throw new Error(`銘柄 "${ticker}" のデータが取得できませんでした`)
  }

  // CSV列: Symbol(0), Date(1), Time(2), Open(3), High(4), Low(5), Close(6), Volume(7), Name(8)
  const parts = lines[1].split(',')
  const close = parseFloat(parts[6] ?? '')

  // Stooq はデータ不在時に "N/D" を返す → parseFloat が NaN になる
  if (isNaN(close) || close <= 0) {
    throw new Error(
      `銘柄 "${ticker}" の価格データが無効です（ティッカーが正しいか、上場廃止でないか確認してください）`,
    )
  }

  return close
}
