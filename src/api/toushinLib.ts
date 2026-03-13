/**
 * 投信総合検索ライブラリ API Adapter
 *
 * 提供元: 一般社団法人 投資信託協会 / FWG
 * Endpoint: https://toushin-lib.fwg.ne.jp/FdsWeb/FDST999900/fundDataSearch
 *
 * 仕様:
 *   - POST JSON でファンド検索・基準価額取得
 *   - APIキー不要
 *   - 対象: 国内公募投資信託
 *
 * 基準価額の単位:
 *   - API レスポンスの kijunKa は「円 / 1万口」
 *   - currentPrice として保存し、数量は「万口」単位で入力する運用を想定
 *
 * CORS戦略:
 *   1. 直接 POST (application/json) を試みる
 *      → toushin-lib は CORS 非対応のため preflight で失敗する場合が多い
 *   2. allorigins.win 経由 GET にフォールバック
 *      → API が GET クエリパラメータに対応していれば成功する
 *      → 対応していない場合はエラーとなり、ユーザーに手動入力を促す
 *
 * 価格取得（usePriceSync）では toushinLib を使用しない。
 * mutual_fund の価格は Yahoo Finance（ファンドコード+.T）で取得する。
 */

const TOUSHIN_SEARCH_URL =
  'https://toushin-lib.fwg.ne.jp/FdsWeb/FDST999900/fundDataSearch'
const ALLORIGINS_BASE = 'https://api.allorigins.win/raw'

// ---- Types ------------------------------------------------------------------

export interface ToushinFund {
  isinCd: string       // ISINコード (例: "JP90C000ABF2")
  fndsNm: string       // ファンド名
  unyoKaishaNm: string // 運用会社名
  kijunKa: number      // 基準価額 (円/1万口)
  kijunKaDt: string    // 基準価額日付 (YYYYMMDD)
}

interface ToushinSearchRequest {
  isinCd: string
  unyoKaishaNo: string
  fndsSearchWord: string
}

interface ToushinRawRow {
  isinCd?: unknown
  fndsNm?: unknown
  unyoKaishaNm?: unknown
  kijunKa?: unknown
  kijunKaDt?: unknown
}

interface ToushinApiResponse {
  rows?: ToushinRawRow[]
}

// ---- Helpers ----------------------------------------------------------------

/**
 * GET クエリパラメータ形式の URL を構築する。
 * allorigins.win 経由 GET フォールバック用。
 */
function buildGetUrl(body: ToushinSearchRequest): string {
  const params = new URLSearchParams({
    isinCd: body.isinCd,
    unyoKaishaNo: body.unyoKaishaNo,
    fndsSearchWord: body.fndsSearchWord,
  })
  return `${TOUSHIN_SEARCH_URL}?${params.toString()}`
}

/**
 * API リクエストを実行する。
 *
 * Attempt 1: 直接 POST (application/json)
 *   - toushin-lib が CORS 対応している環境では成功する
 * Attempt 2: allorigins.win 経由 GET
 *   - POST が CORS ブロックされた場合のフォールバック
 *   - toushin-lib が GET クエリパラメータに対応していれば成功する
 */
async function callToushinApi(body: ToushinSearchRequest): Promise<unknown> {
  // Attempt 1: direct POST
  const directRes = await fetch(TOUSHIN_SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null)
  if (directRes?.ok === true) {
    return await directRes.json()
  }

  // Attempt 2: allorigins.win GET (GET は preflight なし、異なるサーバー IP)
  const alloriginsUrl = `${ALLORIGINS_BASE}?url=${encodeURIComponent(buildGetUrl(body))}`
  const alloriginsRes = await fetch(alloriginsUrl)
  if (!alloriginsRes.ok) {
    throw new Error(`投信ライブラリAPI エラー: HTTP ${alloriginsRes.status.toString()}`)
  }
  return await alloriginsRes.json()
}

/**
 * API レスポンスをパースして ToushinFund の配列に変換する。
 */
function parseApiResponse(data: unknown): ToushinFund[] {
  if (typeof data !== 'object' || data === null || !('rows' in data)) return []

  const res = data as ToushinApiResponse
  if (!Array.isArray(res.rows)) return []

  return res.rows.flatMap((row: ToushinRawRow): ToushinFund[] => {
    const isinCd = typeof row.isinCd === 'string' ? row.isinCd.trim() : ''
    const fndsNm = typeof row.fndsNm === 'string' ? row.fndsNm.trim() : ''
    const unyoKaishaNm =
      typeof row.unyoKaishaNm === 'string' ? row.unyoKaishaNm.trim() : ''

    // kijunKa は number または数値文字列で来る場合がある
    const kijunKaRaw = row.kijunKa
    const kijunKa =
      typeof kijunKaRaw === 'number'
        ? kijunKaRaw
        : typeof kijunKaRaw === 'string'
          ? parseFloat(kijunKaRaw)
          : NaN

    const kijunKaDt =
      typeof row.kijunKaDt === 'string' ? row.kijunKaDt.trim() : ''

    if (!isinCd || !fndsNm || isNaN(kijunKa)) return []
    return [{ isinCd, fndsNm, unyoKaishaNm, kijunKa, kijunKaDt }]
  })
}

// ---- Public API -------------------------------------------------------------

/**
 * ファンド名またはISINコードでファンドを検索する。
 *
 * @param query - 検索キーワード（ファンド名の一部）または ISINコード
 * @returns 検索結果のファンド一覧
 */
export async function searchFunds(query: string): Promise<ToushinFund[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  // ISINコードっぽいもの（JP90Cで始まる、または12文字英数字）はコード検索
  const isIsin = /^JP90C[0-9A-Z]{7}$/i.test(trimmed) || /^JP[0-9A-Z]{10}$/i.test(trimmed)

  const body: ToushinSearchRequest = isIsin
    ? { isinCd: trimmed.toUpperCase(), unyoKaishaNo: '0', fndsSearchWord: '' }
    : { isinCd: '', unyoKaishaNo: '0', fndsSearchWord: trimmed }

  const data = await callToushinApi(body)
  return parseApiResponse(data)
}

/**
 * ISINコードを指定してファンドの基準価額（円/1万口）を取得する。
 *
 * @param isinCd - ISINコード (例: "JP90C000ABF2")
 * @returns 基準価額（円 / 1万口）
 */
export async function fetchFundPrice(isinCd: string): Promise<number> {
  const funds = await searchFunds(isinCd.trim())

  if (funds.length === 0) {
    throw new Error(
      `ファンド "${isinCd}" のデータが見つかりません（ISINコードを確認してください）`,
    )
  }

  const { kijunKa } = funds[0]
  if (isNaN(kijunKa) || kijunKa <= 0) {
    throw new Error(`ファンド "${isinCd}" の基準価額が無効です`)
  }

  return kijunKa
}

/**
 * 基準価額日付 (YYYYMMDD) を表示用文字列 (YYYY/MM/DD) に変換する。
 */
export function formatKijunKaDt(kijunKaDt: string): string {
  if (!/^\d{8}$/.test(kijunKaDt)) return kijunKaDt
  return `${kijunKaDt.slice(0, 4)}/${kijunKaDt.slice(4, 6)}/${kijunKaDt.slice(6, 8)}`
}
