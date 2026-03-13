import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  searchFunds,
  fetchFundPrice,
  formatKijunKaDt,
  type ToushinFund,
} from './toushinLib'

// ---- Helpers ----------------------------------------------------------------

const MOCK_FUND: ToushinFund = {
  isinCd: 'JP90C000ABF2',
  fndsNm: 'eMAXIS Slim 全世界株式（オール・カントリー）',
  unyoKaishaNm: '三菱UFJアセットマネジメント',
  kijunKa: 25000,
  kijunKaDt: '20240301',
}

function mockFetchSuccess(body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  }))
}

function mockFetchFail(): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

// ---- searchFunds ------------------------------------------------------------

describe('searchFunds', () => {
  it('空文字を渡すと空配列を返す', async () => {
    const result = await searchFunds('')
    expect(result).toEqual([])
  })

  it('スペースのみを渡すと空配列を返す', async () => {
    const result = await searchFunds('   ')
    expect(result).toEqual([])
  })

  it('ファンド名で検索すると結果を返す', async () => {
    mockFetchSuccess({ rows: [MOCK_FUND] })

    const result = await searchFunds('eMAXIS Slim')
    expect(result).toHaveLength(1)
    expect(result[0].isinCd).toBe('JP90C000ABF2')
    expect(result[0].fndsNm).toBe('eMAXIS Slim 全世界株式（オール・カントリー）')
    expect(result[0].kijunKa).toBe(25000)
  })

  it('ISINコードで検索すると isinCd でリクエストを送る', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rows: [MOCK_FUND] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await searchFunds('JP90C000ABF2')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { isinCd: string; fndsSearchWord: string }
    expect(body.isinCd).toBe('JP90C000ABF2')
    expect(body.fndsSearchWord).toBe('')
  })

  it('ファンド名検索では fndsSearchWord でリクエストを送る', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rows: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await searchFunds('eMAXIS')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { isinCd: string; fndsSearchWord: string }
    expect(body.isinCd).toBe('')
    expect(body.fndsSearchWord).toBe('eMAXIS')
  })

  it('直接アクセスが失敗した場合は allorigins.win GET でリトライする', async () => {
    let callCount = 0
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 403 })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ rows: [MOCK_FUND] }),
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await searchFunds('JP90C000ABF2')
    expect(result).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    const [proxyUrl] = mockFetch.mock.calls[1] as [string]
    expect(proxyUrl).toContain('allorigins.win')
    expect(proxyUrl).toContain(encodeURIComponent('https://toushin-lib.fwg.ne.jp'))
  })

  it('直接アクセスが例外になった場合も allorigins.win GET でリトライする', async () => {
    let callCount = 0
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new Error('Network error'))
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ rows: [MOCK_FUND] }),
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await searchFunds('eMAXIS')
    expect(result).toHaveLength(1)
  })

  it('kijunKa が文字列数値でも正しくパースする', async () => {
    mockFetchSuccess({
      rows: [{ ...MOCK_FUND, kijunKa: '25000' }],
    })

    const result = await searchFunds('eMAXIS')
    expect(result[0].kijunKa).toBe(25000)
  })

  it('kijunKa が無効な行は除外される', async () => {
    mockFetchSuccess({
      rows: [
        MOCK_FUND,
        { isinCd: 'JP90CXXXXXX', fndsNm: '無効ファンド', kijunKa: 'not-a-number' },
        { isinCd: '', fndsNm: '名前なし', kijunKa: 10000 },
      ],
    })

    const result = await searchFunds('検索')
    expect(result).toHaveLength(1)
    expect(result[0].isinCd).toBe('JP90C000ABF2')
  })

  it('rows が空配列のとき空配列を返す', async () => {
    mockFetchSuccess({ rows: [] })
    const result = await searchFunds('存在しないファンド')
    expect(result).toEqual([])
  })

  it('rows フィールドが存在しないとき空配列を返す', async () => {
    mockFetchSuccess({ message: 'not found' })
    const result = await searchFunds('検索')
    expect(result).toEqual([])
  })

  it('プロキシもエラーのときエラーをスローする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(searchFunds('eMAXIS')).rejects.toThrow('HTTP 500')
  })
})

// ---- fetchFundPrice ---------------------------------------------------------

describe('fetchFundPrice', () => {
  it('ISINコードで基準価額を取得できる', async () => {
    mockFetchSuccess({ rows: [MOCK_FUND] })

    const price = await fetchFundPrice('JP90C000ABF2')
    expect(price).toBe(25000)
  })

  it('見つからない場合はエラーをスローする', async () => {
    mockFetchSuccess({ rows: [] })
    await expect(fetchFundPrice('JP90CXXXXXXX')).rejects.toThrow('見つかりません')
  })

  it('kijunKa が 0 以下の場合はエラーをスローする', async () => {
    mockFetchSuccess({ rows: [{ ...MOCK_FUND, kijunKa: 0 }] })
    // kijunKa=0 はパース時に除外されるため「見つかりません」エラーになる
    await expect(fetchFundPrice('JP90C000ABF2')).rejects.toThrow()
  })

  it('fetchがネットワークエラーの場合はエラーが伝播する', async () => {
    mockFetchFail()
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: false, status: 503 })
    )
    await expect(fetchFundPrice('JP90C000ABF2')).rejects.toThrow()
  })
})

// ---- formatKijunKaDt --------------------------------------------------------

describe('formatKijunKaDt', () => {
  it('YYYYMMDD を YYYY/MM/DD に変換する', () => {
    expect(formatKijunKaDt('20240301')).toBe('2024/03/01')
  })

  it('形式が異なる文字列はそのまま返す', () => {
    expect(formatKijunKaDt('2024-03-01')).toBe('2024-03-01')
    expect(formatKijunKaDt('')).toBe('')
    expect(formatKijunKaDt('invalid')).toBe('invalid')
  })
})
