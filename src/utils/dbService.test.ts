/**
 * Unit tests for dbService.ts
 * Uses fake-indexeddb (imported via test/setup.ts) to mock IndexedDB
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { saveAsset, loadAllAssets, deleteAsset } from './dbService'
import { db } from '@/utils/db'
import { generateSalt, deriveKey } from './crypto'
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

// Clear the assets table before each test to ensure isolation
beforeEach(async () => {
  await db.assets.clear()
})

describe('saveAsset (plaintext mode)', () => {
  it('saves a new asset to IndexedDB', async () => {
    const asset = makeAsset()
    await saveAsset(asset)

    const records = await db.assets.toArray()
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('asset-1')
    expect(records[0].iv).toBe('')
    expect(JSON.parse(records[0].data)).toMatchObject({ id: 'asset-1', name: 'テスト株式' })
  })

  it('updates an existing asset when called with the same id', async () => {
    const asset = makeAsset()
    await saveAsset(asset)
    await saveAsset({ ...asset, name: '更新後の名前' })

    const records = await db.assets.toArray()
    expect(records).toHaveLength(1)
    expect(JSON.parse(records[0].data).name).toBe('更新後の名前')
  })

  it('saves multiple assets independently', async () => {
    const asset1 = makeAsset({ id: 'a1', name: '資産1' })
    const asset2 = makeAsset({ id: 'a2', name: '資産2' })
    await saveAsset(asset1)
    await saveAsset(asset2)

    const records = await db.assets.toArray()
    expect(records).toHaveLength(2)
  })

  it('stores updatedAt as a number timestamp', async () => {
    const before = Date.now()
    await saveAsset(makeAsset())
    const after = Date.now()

    const records = await db.assets.toArray()
    expect(records[0].updatedAt).toBeGreaterThanOrEqual(before)
    expect(records[0].updatedAt).toBeLessThanOrEqual(after)
  })
})

describe('loadAllAssets (plaintext mode)', () => {
  it('returns an empty array when no assets are stored', async () => {
    const assets = await loadAllAssets()
    expect(assets).toEqual([])
  })

  it('returns all stored assets', async () => {
    await saveAsset(makeAsset({ id: 'a1', name: '資産1' }))
    await saveAsset(makeAsset({ id: 'a2', name: '資産2' }))

    const assets = await loadAllAssets()
    expect(assets).toHaveLength(2)
    const names = assets.map((a) => a.name).sort()
    expect(names).toEqual(['資産1', '資産2'])
  })

  it('correctly deserializes asset fields', async () => {
    const original = makeAsset({
      id: 'full-asset',
      ticker: 'TYT',
      note: 'テストメモ',
      tags: ['tag1', 'tag2'],
    })
    await saveAsset(original)

    const [loaded] = await loadAllAssets()
    expect(loaded.id).toBe('full-asset')
    expect(loaded.ticker).toBe('TYT')
    expect(loaded.note).toBe('テストメモ')
    expect(loaded.tags).toEqual(['tag1', 'tag2'])
    expect(loaded.quantity).toBe(100)
    expect(loaded.acquisitionPrice).toBe(1000)
    expect(loaded.currentPrice).toBe(1200)
  })
})

describe('saveAsset / loadAllAssets (encrypted mode)', () => {
  it('saves and loads an asset with encryption', async () => {
    const salt = generateSalt()
    const key = await deriveKey('test-password', salt)
    const asset = makeAsset({ id: 'encrypted-asset', name: '暗号化資産' })

    await saveAsset(asset, key)

    // Raw DB record should have non-empty iv
    const records = await db.assets.toArray()
    expect(records).toHaveLength(1)
    expect(records[0].iv).not.toBe('')
    // data should not be plaintext JSON
    expect(() => JSON.parse(records[0].data)).toThrow()

    // loadAllAssets with key should decrypt correctly
    const loaded = await loadAllAssets(key)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('暗号化資産')
  })

  it('loadAllAssets skips encrypted records without a key', async () => {
    const salt = generateSalt()
    const key = await deriveKey('password', salt)
    await saveAsset(makeAsset({ id: 'enc-1' }), key)

    // Load without key - encrypted records have non-empty iv, so they will be skipped
    // (the plaintext parse of cipher text fails but is caught and skipped)
    const loaded = await loadAllAssets()
    // Ciphertext is not valid JSON, so the record should be skipped
    expect(loaded).toHaveLength(0)
  })
})

describe('deleteAsset', () => {
  it('removes the asset from IndexedDB', async () => {
    await saveAsset(makeAsset({ id: 'delete-me' }))
    await deleteAsset('delete-me')

    const records = await db.assets.toArray()
    expect(records).toHaveLength(0)
  })

  it('does not throw when deleting a non-existent id', async () => {
    await expect(deleteAsset('non-existent')).resolves.not.toThrow()
  })

  it('only deletes the target asset, leaving others intact', async () => {
    await saveAsset(makeAsset({ id: 'keep', name: '残す資産' }))
    await saveAsset(makeAsset({ id: 'remove', name: '削除する資産' }))

    await deleteAsset('remove')

    const assets = await loadAllAssets()
    expect(assets).toHaveLength(1)
    expect(assets[0].id).toBe('keep')
  })
})
