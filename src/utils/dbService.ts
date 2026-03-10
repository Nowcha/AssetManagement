/**
 * Database service layer for IndexedDB operations via Dexie.js
 * Supports both plaintext (no encryption) and AES-256-GCM encrypted modes
 */
import { db } from '@/utils/db'
import { encrypt, decrypt } from '@/utils/crypto'
import type { Asset } from '@/types/asset.types'
import type { Transaction } from '@/types/transaction.types'

/**
 * Save a single asset to IndexedDB.
 * When encryptionKey is provided, data is encrypted with AES-256-GCM.
 * Otherwise, data is stored as plaintext JSON with an empty IV.
 */
export async function saveAsset(asset: Asset, encryptionKey?: CryptoKey): Promise<void> {
  const json = JSON.stringify(asset)

  if (encryptionKey) {
    const { data, iv } = await encrypt(json, encryptionKey)
    await db.assets.put({
      id: asset.id,
      data,
      iv,
      updatedAt: Date.now(),
    })
  } else {
    // Plaintext mode (Sprint 4 will add encryption)
    await db.assets.put({
      id: asset.id,
      data: json,
      iv: '',
      updatedAt: Date.now(),
    })
  }
}

/**
 * Load all assets from IndexedDB.
 * Automatically detects whether each record is encrypted (non-empty iv) or plaintext.
 */
export async function loadAllAssets(encryptionKey?: CryptoKey): Promise<Asset[]> {
  const records = await db.assets.toArray()
  const assets: Asset[] = []

  for (const record of records) {
    try {
      if (record.iv && encryptionKey) {
        // Encrypted record
        const json = await decrypt(record.data, record.iv, encryptionKey)
        assets.push(JSON.parse(json) as Asset)
      } else {
        // Plaintext record
        assets.push(JSON.parse(record.data) as Asset)
      }
    } catch {
      // Skip corrupted records silently; they will not appear in the list
      console.warn(`Failed to parse asset record id=${record.id}, skipping.`)
    }
  }

  return assets
}

/**
 * Delete a single asset from IndexedDB by ID.
 */
export async function deleteAsset(id: string): Promise<void> {
  await db.assets.delete(id)
}

/**
 * Save a single transaction to IndexedDB.
 * When encryptionKey is provided, data is encrypted with AES-256-GCM.
 */
export async function saveTransaction(tx: Transaction, encryptionKey?: CryptoKey): Promise<void> {
  const json = JSON.stringify(tx)

  if (encryptionKey) {
    const { data, iv } = await encrypt(json, encryptionKey)
    await db.transactions.put({
      id: tx.id,
      data,
      iv,
      updatedAt: Date.now(),
    })
  } else {
    await db.transactions.put({
      id: tx.id,
      data: json,
      iv: '',
      updatedAt: Date.now(),
    })
  }
}

/**
 * Load all transactions from IndexedDB.
 * Automatically detects whether each record is encrypted (non-empty iv) or plaintext.
 */
export async function loadAllTransactions(encryptionKey?: CryptoKey): Promise<Transaction[]> {
  const records = await db.transactions.toArray()
  const transactions: Transaction[] = []

  for (const record of records) {
    try {
      if (record.iv && encryptionKey) {
        const json = await decrypt(record.data, record.iv, encryptionKey)
        transactions.push(JSON.parse(json) as Transaction)
      } else {
        transactions.push(JSON.parse(record.data) as Transaction)
      }
    } catch {
      console.warn(`Failed to parse transaction record id=${record.id}, skipping.`)
    }
  }

  return transactions
}

/**
 * Delete a single transaction from IndexedDB by ID.
 */
export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id)
}

/**
 * Load all transactions for a specific asset from IndexedDB.
 */
export async function loadTransactionsByAsset(
  assetId: string,
  encryptionKey?: CryptoKey,
): Promise<Transaction[]> {
  const all = await loadAllTransactions(encryptionKey)
  return all.filter((tx) => tx.assetId === assetId)
}
