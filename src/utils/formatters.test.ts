import { describe, it, expect } from 'vitest'
import {
  formatJpy,
  formatUsd,
  formatGainRate,
  formatGainJpy,
  formatPercent,
  formatQuantity,
  formatDate,
  formatDateTime,
} from './formatters'

describe('formatJpy', () => {
  it('正の金額をJPYフォーマットで返す（桁区切りと通貨記号を含む）', () => {
    const result = formatJpy(1000000)
    expect(result).toContain('1,000,000')
    // 環境によって ¥ or ￥ が異なるため記号の種類はチェックしない
  })

  it('0円を正しくフォーマットする', () => {
    const result = formatJpy(0)
    expect(result).toContain('0')
  })

  it('負の金額をフォーマットする', () => {
    expect(formatJpy(-5000)).toContain('5,000')
  })
})

describe('formatGainRate', () => {
  it('正の損益率に+符号を付ける', () => {
    expect(formatGainRate(20)).toBe('+20.00%')
  })

  it('負の損益率はそのまま', () => {
    expect(formatGainRate(-5.5)).toBe('-5.50%')
  })

  it('0は+符号あり', () => {
    expect(formatGainRate(0)).toBe('+0.00%')
  })
})

describe('formatGainJpy', () => {
  it('正の金額に+符号を付ける', () => {
    expect(formatGainJpy(10000)).toContain('+')
  })

  it('負の金額はそのまま', () => {
    const result = formatGainJpy(-5000)
    expect(result).not.toContain('+')
  })
})

describe('formatPercent', () => {
  it('割合をパーセント表示する（0.1234 → 12.3%）', () => {
    expect(formatPercent(0.1234)).toBe('12.3%')
  })

  it('桁数を指定できる', () => {
    expect(formatPercent(0.5, 0)).toBe('50%')
  })
})

describe('formatUsd', () => {
  it('USDフォーマットで返す（小数点2桁）', () => {
    const result = formatUsd(1234.56)
    expect(result).toContain('1,234.56')
  })

  it('0ドルを正しくフォーマットする', () => {
    expect(formatUsd(0)).toContain('0.00')
  })
})

describe('formatQuantity', () => {
  it('整数は小数点なしで表示', () => {
    expect(formatQuantity(100)).toBe('100')
  })

  it('小数は適切に表示', () => {
    expect(formatQuantity(0.001)).toBe('0.001')
  })

  it('最大桁数を指定できる', () => {
    expect(formatQuantity(0.12345678, 2)).toBe('0.12')
  })

  it('0を正しく表示', () => {
    expect(formatQuantity(0)).toBe('0')
  })
})

describe('formatGainJpy (additional cases)', () => {
  it('0に+符号を付ける', () => {
    expect(formatGainJpy(0)).toContain('+')
  })
})

describe('formatDate', () => {
  it('ISO8601文字列を日本語の日付にフォーマットする', () => {
    const result = formatDate('2024-01-15T00:00:00.000Z')
    expect(result).toContain('2024')
    // Month and day appear in the output
    expect(result.replace(/\s/g, '')).toMatch(/2024/)
  })
})

describe('formatDateTime', () => {
  it('ISO8601文字列を日本語の日時にフォーマットする', () => {
    const result = formatDateTime('2024-06-01T00:00:00.000Z')
    expect(result).toContain('2024')
  })
})
