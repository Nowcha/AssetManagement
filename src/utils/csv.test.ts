/**
 * Unit tests for csv.ts
 * Tests CSV export string format and import parsing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseAssetsCSV,
  parseTransactionsCSV,
  getAssetCSVTemplate,
  getTransactionCSVTemplate,
  exportAssetsToCSV,
  exportTransactionsToCSV,
} from './csv'
import type { Asset } from '@/types/asset.types'
import type { Transaction } from '@/types/transaction.types'

const BOM = '\uFEFF'

// Mock URL.createObjectURL and document.createElement for download tests
function setupDownloadMock() {
  const clickSpy = vi.fn()
  const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
    href: '',
    download: '',
    click: clickSpy,
  } as unknown as HTMLElement)
  const createObjectURLSpy = vi
    .spyOn(URL, 'createObjectURL')
    .mockReturnValue('blob:mock-url')
  const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

  return { clickSpy, createElementSpy, createObjectURLSpy, revokeObjectURLSpy }
}

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    name: 'トヨタ自動車',
    ticker: '7203',
    assetClass: 'stock_jp',
    accountType: 'taxable',
    currency: 'JPY',
    quantity: 100,
    acquisitionPrice: 2500,
    currentPrice: 2800,
    currentPriceJpy: 2800,
    tags: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    assetId: 'asset-1',
    type: 'buy',
    date: '2024-01-15',
    quantity: 100,
    price: 2500,
    amount: 250000,
    fee: 500,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  }
}

describe('getAssetCSVTemplate', () => {
  it('starts with UTF-8 BOM', () => {
    expect(getAssetCSVTemplate().startsWith(BOM)).toBe(true)
  })

  it('contains a header row', () => {
    const template = getAssetCSVTemplate()
    expect(template).toContain('資産名')
    expect(template).toContain('保有数量')
    expect(template).toContain('取得単価')
  })

  it('contains an example data row', () => {
    const template = getAssetCSVTemplate()
    expect(template).toContain('トヨタ自動車')
  })
})

describe('getTransactionCSVTemplate', () => {
  it('starts with UTF-8 BOM', () => {
    expect(getTransactionCSVTemplate().startsWith(BOM)).toBe(true)
  })

  it('contains a header row', () => {
    const template = getTransactionCSVTemplate()
    expect(template).toContain('資産ID')
    expect(template).toContain('取引種別')
    expect(template).toContain('金額(JPY)')
  })
})

describe('exportAssetsToCSV', () => {
  let mocks: ReturnType<typeof setupDownloadMock>

  beforeEach(() => {
    mocks = setupDownloadMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('triggers a file download', () => {
    exportAssetsToCSV([makeAsset()])
    expect(mocks.clickSpy).toHaveBeenCalled()
  })

  it('creates a blob with CSV content type', () => {
    const blobSpy = vi.spyOn(globalThis, 'Blob')
    exportAssetsToCSV([makeAsset()])
    expect(blobSpy).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining(BOM)]),
      expect.objectContaining({ type: expect.stringContaining('text/csv') }),
    )
  })
})

describe('exportTransactionsToCSV', () => {
  let mocks: ReturnType<typeof setupDownloadMock>

  beforeEach(() => {
    mocks = setupDownloadMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('triggers a file download', () => {
    exportTransactionsToCSV([makeTransaction()])
    expect(mocks.clickSpy).toHaveBeenCalled()
  })
})

describe('parseAssetsCSV', () => {
  it('returns empty array for header-only CSV', () => {
    const csv = `${BOM}資産名,ティッカー,資産クラス,口座種別,通貨,保有数量,取得単価,現在価格,メモ`
    expect(parseAssetsCSV(csv)).toHaveLength(0)
  })

  it('parses a valid asset row', () => {
    const csv = [
      '資産名,ティッカー,資産クラス,口座種別,通貨,保有数量,取得単価,現在価格,メモ',
      'トヨタ自動車,7203,stock_jp,taxable,JPY,100,2500,2800,テストメモ',
    ].join('\n')

    const result = parseAssetsCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('トヨタ自動車')
    expect(result[0].ticker).toBe('7203')
    expect(result[0].assetClass).toBe('stock_jp')
    expect(result[0].quantity).toBe(100)
    expect(result[0].acquisitionPrice).toBe(2500)
    expect(result[0].currentPrice).toBe(2800)
    expect(result[0].note).toBe('テストメモ')
  })

  it('skips rows with missing required fields', () => {
    const csv = [
      '資産名,ティッカー,資産クラス,口座種別,通貨,保有数量,取得単価,現在価格,メモ',
      ',7203,stock_jp,taxable,JPY,100,2500,2800,', // no name
    ].join('\n')

    expect(parseAssetsCSV(csv)).toHaveLength(0)
  })

  it('skips rows with non-numeric quantity', () => {
    const csv = [
      '資産名,ティッカー,資産クラス,口座種別,通貨,保有数量,取得単価,現在価格,メモ',
      'テスト,T,stock_jp,taxable,JPY,abc,2500,2800,',
    ].join('\n')

    expect(parseAssetsCSV(csv)).toHaveLength(0)
  })

  it('parses multiple rows correctly', () => {
    const csv = [
      '資産名,ティッカー,資産クラス,口座種別,通貨,保有数量,取得単価,現在価格,メモ',
      'トヨタ,7203,stock_jp,taxable,JPY,100,2500,2800,',
      'ソニー,6758,stock_jp,taxable,JPY,50,12000,13000,',
    ].join('\n')

    const result = parseAssetsCSV(csv)
    expect(result).toHaveLength(2)
  })

  it('skips blank lines', () => {
    const csv = [
      '資産名,ティッカー,資産クラス,口座種別,通貨,保有数量,取得単価,現在価格,メモ',
      '',
      'トヨタ,7203,stock_jp,taxable,JPY,100,2500,2800,',
      '',
    ].join('\n')

    expect(parseAssetsCSV(csv)).toHaveLength(1)
  })

  it('handles CRLF line endings', () => {
    const csv = '資産名,ティッカー,資産クラス,口座種別,通貨,保有数量,取得単価,現在価格,メモ\r\nトヨタ,7203,stock_jp,taxable,JPY,100,2500,2800,'
    const result = parseAssetsCSV(csv)
    expect(result).toHaveLength(1)
  })

  it('handles quoted fields containing commas', () => {
    const csv = [
      '資産名,ティッカー,資産クラス,口座種別,通貨,保有数量,取得単価,現在価格,メモ',
      '"Toyota, Inc.",7203,stock_jp,taxable,JPY,100,2500,2800,',
    ].join('\n')

    const result = parseAssetsCSV(csv)
    expect(result[0]?.name).toBe('Toyota, Inc.')
  })
})

describe('parseTransactionsCSV', () => {
  it('returns empty array for header-only CSV', () => {
    const csv = '資産ID,取引種別,取引日,数量,単価,金額(JPY),手数料,為替レート,メモ'
    expect(parseTransactionsCSV(csv)).toHaveLength(0)
  })

  it('parses a valid transaction row', () => {
    const csv = [
      '資産ID,取引種別,取引日,数量,単価,金額(JPY),手数料,為替レート,メモ',
      'asset-1,buy,2024-01-15,100,2500,250000,500,1,初回購入',
    ].join('\n')

    const result = parseTransactionsCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].assetId).toBe('asset-1')
    expect(result[0].type).toBe('buy')
    expect(result[0].date).toBe('2024-01-15')
    expect(result[0].quantity).toBe(100)
    expect(result[0].price).toBe(2500)
    expect(result[0].amount).toBe(250000)
    expect(result[0].fee).toBe(500)
    expect(result[0].note).toBe('初回購入')
  })

  it('skips rows with missing assetId', () => {
    const csv = [
      '資産ID,取引種別,取引日,数量,単価,金額(JPY),手数料,為替レート,メモ',
      ',buy,2024-01-15,100,2500,250000,500,1,',
    ].join('\n')

    expect(parseTransactionsCSV(csv)).toHaveLength(0)
  })

  it('skips rows with non-numeric amount', () => {
    const csv = [
      '資産ID,取引種別,取引日,数量,単価,金額(JPY),手数料,為替レート,メモ',
      'asset-1,buy,2024-01-15,100,2500,invalid,500,1,',
    ].join('\n')

    expect(parseTransactionsCSV(csv)).toHaveLength(0)
  })

  it('handles optional fee and exchangeRate fields', () => {
    const csv = [
      '資産ID,取引種別,取引日,数量,単価,金額(JPY),手数料,為替レート,メモ',
      'asset-1,dividend,2024-01-15,,,10000,,,配当入金',
    ].join('\n')

    const result = parseTransactionsCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].fee).toBeUndefined()
    expect(result[0].quantity).toBeUndefined()
  })

  it('parses multiple rows correctly', () => {
    const csv = [
      '資産ID,取引種別,取引日,数量,単価,金額(JPY),手数料,為替レート,メモ',
      'asset-1,buy,2024-01-15,100,2500,250000,500,1,',
      'asset-1,sell,2024-06-01,50,3000,150000,500,1,',
    ].join('\n')

    expect(parseTransactionsCSV(csv)).toHaveLength(2)
  })
})
