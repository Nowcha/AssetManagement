/**
 * CSV import/export utilities for assets and transactions
 * Uses UTF-8 BOM prefix to ensure correct display in Excel
 */
import type { Asset } from '@/types/asset.types'
import type { Transaction } from '@/types/transaction.types'
import type { AssetFormData, TransactionFormData } from '@/utils/validators'
import { TRANSACTION_TYPE_LABELS } from '@/types/transaction.types'

const BOM = '\uFEFF'

/** Escape a single CSV field value */
function escapeField(value: string | number | undefined | null): string {
  const str = String(value ?? '')
  // Wrap in quotes if field contains comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Join an array of values into a CSV row */
function toRow(values: (string | number | undefined | null)[]): string {
  return values.map(escapeField).join(',')
}

/** Trigger a file download in the browser */
function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export assets to a CSV file and trigger browser download.
 * Includes UTF-8 BOM for correct Excel rendering.
 */
export function exportAssetsToCSV(assets: Asset[]): void {
  const header = toRow([
    'ID', '資産名', 'ティッカー', '資産クラス', '口座種別',
    '通貨', '保有数量', '取得単価', '現在価格', 'メモ', '作成日',
  ])

  const rows = assets.map((a) =>
    toRow([
      a.id, a.name, a.ticker ?? '', a.assetClass, a.accountType,
      a.currency, a.quantity, a.acquisitionPrice, a.currentPrice,
      a.note ?? '', a.createdAt,
    ]),
  )

  const csv = BOM + [header, ...rows].join('\n')
  downloadFile(csv, `assets_${new Date().toISOString().slice(0, 10)}.csv`)
}

/**
 * Export transactions to a CSV file and trigger browser download.
 * Includes UTF-8 BOM for correct Excel rendering.
 */
export function exportTransactionsToCSV(transactions: Transaction[]): void {
  const header = toRow([
    'ID', '資産ID', '取引種別', '取引日', '数量', '単価',
    '金額(JPY)', '手数料', '為替レート', 'メモ', '作成日',
  ])

  const rows = transactions.map((tx) =>
    toRow([
      tx.id, tx.assetId, TRANSACTION_TYPE_LABELS[tx.type], tx.date,
      tx.quantity ?? '', tx.price ?? '', tx.amount, tx.fee ?? '',
      tx.exchangeRate ?? '', tx.note ?? '', tx.createdAt,
    ]),
  )

  const csv = BOM + [header, ...rows].join('\n')
  downloadFile(csv, `transactions_${new Date().toISOString().slice(0, 10)}.csv`)
}

/**
 * Parse a CSV string into an array of partial AssetFormData objects.
 * Skips the header row and any rows that cannot be parsed.
 * Expected columns: name, ticker, assetClass, accountType, currency,
 *                   quantity, acquisitionPrice, currentPrice, note
 */
export function parseAssetsCSV(csvText: string): Partial<AssetFormData>[] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const results: Partial<AssetFormData>[] = []

  // Skip header (index 0); process from index 1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const cols = parseCsvLine(line)
      // Expect at least: name(0), ticker(1), assetClass(2), accountType(3),
      //                  currency(4), quantity(5), acquisitionPrice(6), currentPrice(7)
      if (cols.length < 8) continue

      const name = cols[0]?.trim()
      if (!name) continue

      const quantity = parseFloat(cols[5] ?? '')
      const acquisitionPrice = parseFloat(cols[6] ?? '')
      const currentPrice = parseFloat(cols[7] ?? '')

      if (isNaN(quantity) || isNaN(acquisitionPrice) || isNaN(currentPrice)) continue

      const rawAssetClass = cols[2]?.trim()
      const rawAccountType = cols[3]?.trim()
      const rawCurrency = cols[4]?.trim()

      results.push({
        name,
        ticker: cols[1]?.trim() || undefined,
        assetClass: (rawAssetClass as AssetFormData['assetClass'] | undefined) ?? 'other',
        accountType: (rawAccountType as AssetFormData['accountType'] | undefined) ?? 'other',
        currency: (rawCurrency as AssetFormData['currency'] | undefined) ?? 'JPY',
        quantity,
        acquisitionPrice,
        currentPrice,
        note: cols[8]?.trim() || undefined,
        tags: [],
      })
    } catch {
      // Skip malformed rows silently
      continue
    }
  }

  return results
}

/**
 * Parse a CSV string into an array of partial TransactionFormData objects.
 * Skips the header row and any rows that cannot be parsed.
 * Expected columns: assetId, type, date, quantity, price, amount, fee, exchangeRate, note
 */
export function parseTransactionsCSV(csvText: string): Partial<TransactionFormData>[] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const results: Partial<TransactionFormData>[] = []

  // Skip header (index 0); process from index 1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const cols = parseCsvLine(line)
      // Expect at least: assetId(0), type(1), date(2), amount(5)
      if (cols.length < 6) continue

      const assetId = cols[0]?.trim()
      const rawType = cols[1]?.trim()
      const date = cols[2]?.trim()
      const amount = parseFloat(cols[5] ?? '')

      if (!assetId || !rawType || !date || isNaN(amount)) continue
      const type = rawType as TransactionFormData['type']

      const quantity = cols[3] ? parseFloat(cols[3]) : undefined
      const price = cols[4] ? parseFloat(cols[4]) : undefined
      const fee = cols[6] ? parseFloat(cols[6]) : undefined
      const exchangeRate = cols[7] ? parseFloat(cols[7]) : undefined

      results.push({
        assetId,
        type,
        date,
        quantity: quantity && !isNaN(quantity) ? quantity : undefined,
        price: price && !isNaN(price) ? price : undefined,
        amount,
        fee: fee && !isNaN(fee) ? fee : undefined,
        exchangeRate: exchangeRate && !isNaN(exchangeRate) ? exchangeRate : undefined,
        note: cols[8]?.trim() || undefined,
      })
    } catch {
      // Skip malformed rows silently
      continue
    }
  }

  return results
}

/**
 * Return a CSV template string for assets (with header only).
 */
export function getAssetCSVTemplate(): string {
  const header = toRow([
    '資産名', 'ティッカー', '資産クラス', '口座種別',
    '通貨', '保有数量', '取得単価', '現在価格', 'メモ',
  ])
  const example = toRow([
    'トヨタ自動車', '7203', 'stock_jp', 'taxable', 'JPY', '100', '2500', '2800', '例：コメント',
  ])
  return BOM + [header, example].join('\n')
}

/**
 * Return a CSV template string for transactions (with header only).
 */
export function getTransactionCSVTemplate(): string {
  const header = toRow([
    '資産ID', '取引種別', '取引日', '数量', '単価',
    '金額(JPY)', '手数料', '為替レート', 'メモ',
  ])
  const example = toRow([
    'asset-uuid-here', 'buy', '2024-01-15', '100', '2500', '250000', '500', '1', '例：初回購入',
  ])
  return BOM + [header, example].join('\n')
}

/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped double-quote ("")
        if (line[i + 1] === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        fields.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }

  fields.push(current)
  return fields
}
