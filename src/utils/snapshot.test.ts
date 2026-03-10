/**
 * Unit tests for snapshot.ts
 * Uses fake-indexeddb (imported via test/setup.ts) to mock IndexedDB
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { saveSnapshot, loadSnapshots, hasSnapshotToday } from './snapshot'
import { db } from '@/utils/db'
import type { Asset } from '@/types/asset.types'

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    name: 'テスト株式',
    assetClass: 'stock_jp',
    accountType: 'taxable',
    currency: 'JPY',
    quantity: 100,
    acquisitionPrice: 1000,
    currentPrice: 1200,
    currentPriceJpy: 1200,
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(async () => {
  await db.snapshots.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('saveSnapshot', () => {
  it('saves a snapshot record with today\'s date as ID', async () => {
    const assets = [makeAsset()]
    await saveSnapshot(assets)

    const records = await db.snapshots.toArray()
    expect(records).toHaveLength(1)

    // ID should be YYYY-MM-DD format
    expect(records[0].id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(records[0].iv).toBe('')

    const parsed = JSON.parse(records[0].data)
    expect(parsed.totalValueJpy).toBe(100 * 1200) // quantity * currentPriceJpy
    expect(parsed.totalCostJpy).toBe(100 * 1000)  // quantity * acquisitionPrice
  })

  it('calculates breakdown per asset class', async () => {
    const assets = [
      makeAsset({ id: 'a1', assetClass: 'stock_jp', quantity: 100, currentPriceJpy: 1000, acquisitionPrice: 800 }),
      makeAsset({ id: 'a2', assetClass: 'stock_us', quantity: 10,  currentPriceJpy: 5000, acquisitionPrice: 4000 }),
    ]
    await saveSnapshot(assets)

    const records = await db.snapshots.toArray()
    const parsed = JSON.parse(records[0].data)
    expect(parsed.breakdown).toHaveLength(2)

    const jpBreakdown = parsed.breakdown.find(
      (b: { assetClass: string }) => b.assetClass === 'stock_jp'
    )
    expect(jpBreakdown?.valueJpy).toBe(100 * 1000)
  })

  it('upserts: saving twice on the same day produces one record', async () => {
    const assets = [makeAsset({ quantity: 100, currentPriceJpy: 1000 })]
    await saveSnapshot(assets)
    await saveSnapshot([makeAsset({ quantity: 200, currentPriceJpy: 1000 })])

    const records = await db.snapshots.toArray()
    expect(records).toHaveLength(1)

    // Should have the latest value
    const parsed = JSON.parse(records[0].data)
    expect(parsed.totalValueJpy).toBe(200 * 1000)
  })

  it('stores an empty breakdown for empty assets array', async () => {
    await saveSnapshot([])

    const records = await db.snapshots.toArray()
    const parsed = JSON.parse(records[0].data)
    expect(parsed.totalValueJpy).toBe(0)
    expect(parsed.breakdown).toHaveLength(0)
  })
})

describe('loadSnapshots', () => {
  it('returns an empty array when no snapshots exist', async () => {
    const result = await loadSnapshots()
    expect(result).toEqual([])
  })

  it('returns all snapshots sorted by date ascending', async () => {
    // Manually insert records with different dates
    await db.snapshots.put({
      id: '2024-01-03',
      data: JSON.stringify({ id: '2024-01-03', recordedAt: '2024-01-03T00:00:00.000Z', totalValueJpy: 300, totalCostJpy: 200, breakdown: [] }),
      iv: '',
      updatedAt: Date.now(),
    })
    await db.snapshots.put({
      id: '2024-01-01',
      data: JSON.stringify({ id: '2024-01-01', recordedAt: '2024-01-01T00:00:00.000Z', totalValueJpy: 100, totalCostJpy: 80, breakdown: [] }),
      iv: '',
      updatedAt: Date.now(),
    })
    await db.snapshots.put({
      id: '2024-01-02',
      data: JSON.stringify({ id: '2024-01-02', recordedAt: '2024-01-02T00:00:00.000Z', totalValueJpy: 200, totalCostJpy: 150, breakdown: [] }),
      iv: '',
      updatedAt: Date.now(),
    })

    const result = await loadSnapshots()
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('2024-01-01')
    expect(result[1].id).toBe('2024-01-02')
    expect(result[2].id).toBe('2024-01-03')
  })

  it('limits result when days param is provided', async () => {
    for (let i = 1; i <= 10; i++) {
      const dateStr = `2024-01-${String(i).padStart(2, '0')}`
      await db.snapshots.put({
        id: dateStr,
        data: JSON.stringify({ id: dateStr, recordedAt: `${dateStr}T00:00:00.000Z`, totalValueJpy: i * 1000, totalCostJpy: i * 800, breakdown: [] }),
        iv: '',
        updatedAt: Date.now(),
      })
    }

    const result = await loadSnapshots(3)
    expect(result).toHaveLength(3)
    // Should be the last 3 records
    expect(result[0].id).toBe('2024-01-08')
    expect(result[2].id).toBe('2024-01-10')
  })

  it('skips corrupted records gracefully', async () => {
    await db.snapshots.put({ id: '2024-01-01', data: 'NOT_JSON', iv: '', updatedAt: Date.now() })
    await db.snapshots.put({
      id: '2024-01-02',
      data: JSON.stringify({ id: '2024-01-02', recordedAt: '2024-01-02T00:00:00.000Z', totalValueJpy: 1000, totalCostJpy: 800, breakdown: [] }),
      iv: '',
      updatedAt: Date.now(),
    })

    const result = await loadSnapshots()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2024-01-02')
  })
})

describe('hasSnapshotToday', () => {
  it('returns false when no snapshot exists for today', async () => {
    const result = await hasSnapshotToday()
    expect(result).toBe(false)
  })

  it('returns true after saving a snapshot today', async () => {
    await saveSnapshot([makeAsset()])
    const result = await hasSnapshotToday()
    expect(result).toBe(true)
  })

  it('returns false for records from other dates', async () => {
    await db.snapshots.put({
      id: '2020-01-01',
      data: JSON.stringify({ id: '2020-01-01', recordedAt: '2020-01-01T00:00:00.000Z', totalValueJpy: 0, totalCostJpy: 0, breakdown: [] }),
      iv: '',
      updatedAt: Date.now(),
    })

    const result = await hasSnapshotToday()
    expect(result).toBe(false)
  })
})
