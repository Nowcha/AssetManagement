/**
 * Unit tests for Yahoo Finance API adapter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toYahooTicker, fetchYahooPrice, withCorsProxy } from './yahooFinance'

// ---- toYahooTicker ----------------------------------------------------------

describe('toYahooTicker', () => {
  it('appends .T to a bare 4-digit code (jp)', () => {
    expect(toYahooTicker('9433', 'jp')).toBe('9433.T')
  })

  it('keeps already-correct .T format (jp)', () => {
    expect(toYahooTicker('9433.T', 'jp')).toBe('9433.T')
  })

  it('replaces old Stooq .jp suffix with .T', () => {
    expect(toYahooTicker('9433.jp', 'jp')).toBe('9433.T')
  })

  it('strips text after half-width space and appends .T', () => {
    expect(toYahooTicker('9433 東証.T', 'jp')).toBe('9433.T')
  })

  it('strips text after full-width space and appends .T', () => {
    expect(toYahooTicker('9433\u3000東証', 'jp')).toBe('9433.T')
  })

  it('trims leading/trailing whitespace', () => {
    expect(toYahooTicker('  7203.T  ', 'jp')).toBe('7203.T')
  })

  it('returns US ticker unchanged', () => {
    expect(toYahooTicker('AAPL', 'us')).toBe('AAPL')
  })

  it('strips .US suffix for US exchange', () => {
    expect(toYahooTicker('AAPL.US', 'us')).toBe('AAPL')
  })

  it('strips lowercase .us suffix for US exchange', () => {
    expect(toYahooTicker('aapl.us', 'us')).toBe('aapl')
  })
})

// ---- withCorsProxy ----------------------------------------------------------

describe('withCorsProxy', () => {
  it('wraps URL with corsproxy.io ?url= format', () => {
    const target = 'https://example.com/api?foo=bar&baz=qux'
    const result = withCorsProxy(target)
    expect(result).toBe(`https://corsproxy.io/?url=${encodeURIComponent(target)}`)
  })

  it('encodes special characters in target URL', () => {
    const target = 'https://query1.finance.yahoo.com/v8/finance/chart/7203.T?range=1d&interval=1d'
    const result = withCorsProxy(target)
    expect(result).toMatch(/^https:\/\/corsproxy\.io\/\?url=/)
    // Encoded URL must not contain raw ? or & after the proxy prefix
    const encoded = result.replace('https://corsproxy.io/?url=', '')
    expect(encoded).not.toContain('?')
    expect(encoded).not.toContain('&')
  })
})

// ---- fetchYahooPrice --------------------------------------------------------

const VALID_JP_RESPONSE = {
  chart: {
    result: [
      {
        meta: {
          currency: 'JPY',
          symbol: '9433.T',
          regularMarketPrice: 3195.0,
        },
      },
    ],
    error: null,
  },
}

const VALID_US_RESPONSE = {
  chart: {
    result: [
      {
        meta: {
          currency: 'USD',
          symbol: 'AAPL',
          regularMarketPrice: 171.5,
        },
      },
    ],
    error: null,
  },
}

const ERROR_RESPONSE = {
  chart: {
    result: null,
    error: { code: 'Not Found', description: 'No fundamentals data found for any of the summaryTypes=price' },
  },
}

const EMPTY_RESULT_RESPONSE = {
  chart: {
    result: [],
    error: null,
  },
}

describe('fetchYahooPrice', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // --- Direct access success ---

  it('returns regularMarketPrice when direct access succeeds (jp)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_JP_RESPONSE),
    }))

    const price = await fetchYahooPrice('9433.T', 'jp')
    expect(price).toBe(3195.0)
  })

  it('returns regularMarketPrice when direct access succeeds (us)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_US_RESPONSE),
    }))

    const price = await fetchYahooPrice('AAPL', 'us')
    expect(price).toBe(171.5)
  })

  // --- Direct blocked → proxy fallback ---

  it('falls back to proxy when direct fetch throws (CORS blocked)', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))  // direct blocked
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(VALID_JP_RESPONSE),
      })

    vi.stubGlobal('fetch', fetchMock)

    const price = await fetchYahooPrice('9433.T', 'jp')
    expect(price).toBe(3195.0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('falls back to proxy when direct returns non-ok status', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })    // direct blocked
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(VALID_JP_RESPONSE),
      })

    vi.stubGlobal('fetch', fetchMock)

    const price = await fetchYahooPrice('9433.T', 'jp')
    expect(price).toBe(3195.0)
  })

  // --- Proxy URL format ---

  it('calls direct URL first with correct Yahoo Finance format', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_JP_RESPONSE),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchYahooPrice('9433.T', 'jp')

    const calledUrl: string = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toMatch(/^https:\/\/query1\.finance\.yahoo\.com\/v8\/finance\/chart\/9433\.T/)
    expect(calledUrl).toContain('range=1d')
    expect(calledUrl).toContain('interval=1d')
  })

  it('uses corsproxy.io with ?url= format for proxy fallback', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(VALID_JP_RESPONSE),
      })
    vi.stubGlobal('fetch', fetchMock)

    await fetchYahooPrice('9433.T', 'jp')

    const proxyUrl: string = fetchMock.mock.calls[1][0] as string
    // Must use ?url= format (not just ?)
    expect(proxyUrl).toMatch(/^https:\/\/corsproxy\.io\/\?url=/)
    // Encoded target must contain yahoo finance domain
    expect(proxyUrl).toContain(encodeURIComponent('https://query1.finance.yahoo.com'))
    expect(proxyUrl).toContain(encodeURIComponent('9433.T'))
  })

  // --- Ticker normalization ---

  it('normalizes bare code to .T for jp exchange', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(VALID_JP_RESPONSE),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchYahooPrice('9433', 'jp')

    const calledUrl: string = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('9433.T')
  })

  // --- Error cases ---

  it('throws when Yahoo Finance returns an error object', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ERROR_RESPONSE),
    }))

    await expect(fetchYahooPrice('INVALID', 'us')).rejects.toThrow('Yahoo Finance エラー')
  })

  it('throws when result array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(EMPTY_RESULT_RESPONSE),
    }))

    await expect(fetchYahooPrice('9999.T', 'jp')).rejects.toThrow('データが見つかりません')
  })

  it('throws when both direct and proxy fail', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ok: false, status: 429 })

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchYahooPrice('9433.T', 'jp')).rejects.toThrow('HTTP 429')
  })
})
