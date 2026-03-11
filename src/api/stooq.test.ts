/**
 * Unit tests for Stooq API adapter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toStooqTicker, fetchStooqPrice } from './stooq'

// --- toStooqTicker -----------------------------------------------------------

describe('toStooqTicker', () => {
  it('appends .jp to a bare 4-digit code', () => {
    expect(toStooqTicker('9433', 'jp')).toBe('9433.jp')
  })

  it('strips .T suffix and appends .jp', () => {
    expect(toStooqTicker('9433.T', 'jp')).toBe('9433.jp')
  })

  it('strips .T suffix (uppercase) and appends .jp', () => {
    expect(toStooqTicker('7203.T', 'jp')).toBe('7203.jp')
  })

  it('strips text after space (e.g. "9433 東証.T") and appends .jp', () => {
    expect(toStooqTicker('9433 東証.T', 'jp')).toBe('9433.jp')
  })

  it('converts US ticker to .us format', () => {
    expect(toStooqTicker('AAPL', 'us')).toBe('AAPL.us')
  })

  it('strips existing .US suffix for US exchange', () => {
    expect(toStooqTicker('AAPL.US', 'us')).toBe('AAPL.us')
  })

  it('handles already-correct .jp format', () => {
    expect(toStooqTicker('9433.jp', 'jp')).toBe('9433.jp')
  })

  it('trims leading/trailing whitespace', () => {
    expect(toStooqTicker('  9433  ', 'jp')).toBe('9433.jp')
  })
})

// --- fetchStooqPrice ---------------------------------------------------------

const VALID_CSV = `Symbol,Date,Time,Open,High,Low,Close,Volume,Name
9433.JP,2026-03-11,,3200.0,3210.0,3185.0,3195.0,1234567,KDDI`

const ND_CSV = `Symbol,Date,Time,Open,High,Low,Close,Volume,Name
9999.JP,2026-03-11,,N/D,N/D,N/D,N/D,0,UNKNOWN`

describe('fetchStooqPrice', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('parses close price from valid CSV response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(VALID_CSV),
    }))

    const price = await fetchStooqPrice('9433.T', 'jp')
    expect(price).toBe(3195.0)
  })

  it('throws when HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }))

    await expect(fetchStooqPrice('9999.T', 'jp')).rejects.toThrow('Stooq API error: 404')
  })

  it('throws when close value is N/D (data unavailable)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ND_CSV),
    }))

    await expect(fetchStooqPrice('9999.T', 'jp')).rejects.toThrow('価格データが無効です')
  })

  it('throws when CSV has only header row (no data)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('Symbol,Date,Time,Open,High,Low,Close,Volume,Name'),
    }))

    await expect(fetchStooqPrice('9999.T', 'jp')).rejects.toThrow('データが取得できませんでした')
  })

  it('calls the correct Stooq URL with normalized ticker', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(VALID_CSV),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchStooqPrice('9433.T', 'jp')

    const calledUrl: string = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('corsproxy.io')
    expect(calledUrl).toContain('stooq.com')
    expect(calledUrl).toContain('9433.jp')
  })

  it('uses .us exchange suffix for US stocks', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`Symbol,Date,Time,Open,High,Low,Close,Volume,Name\nAAPL.US,2026-03-11,,170.0,172.0,169.0,171.5,98765432,Apple`),
    })
    vi.stubGlobal('fetch', fetchMock)

    const price = await fetchStooqPrice('AAPL', 'us')
    expect(price).toBe(171.5)

    const calledUrl: string = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('corsproxy.io')
    expect(calledUrl).toContain('AAPL.us')
  })
})
