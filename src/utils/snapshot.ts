/**
 * Portfolio snapshot utility
 * Saves daily portfolio snapshots to IndexedDB (plaintext, encryption added in Sprint 4)
 */
import { db } from '@/utils/db'
import { calcPortfolioTotals, calcAssetSummary } from '@/utils/calculations'
import type { Asset, AssetClass } from '@/types/asset.types'
import type { PortfolioSnapshot } from '@/types/portfolio.types'

/** Format a Date as YYYY-MM-DD (local date) */
function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y.toString()}-${m}-${d}`
}

/**
 * Save a portfolio snapshot for today.
 * ID is YYYY-MM-DD so one record per day (upsert).
 */
export async function saveSnapshot(assets: Asset[]): Promise<void> {
  const today = toDateString(new Date())
  const totals = calcPortfolioTotals(assets)

  // Build per-assetClass breakdown
  const breakdownMap = new Map<AssetClass, number>()
  for (const asset of assets) {
    const summary = calcAssetSummary(asset)
    const prev = breakdownMap.get(asset.assetClass) ?? 0
    breakdownMap.set(asset.assetClass, prev + summary.totalValue)
  }

  const breakdown = Array.from(breakdownMap.entries()).map(([assetClass, valueJpy]) => ({
    assetClass,
    valueJpy,
  }))

  const snapshot: PortfolioSnapshot = {
    id: today,
    recordedAt: new Date().toISOString(),
    totalValueJpy: totals.totalValueJpy,
    totalCostJpy: totals.totalCostJpy,
    breakdown,
  }

  await db.snapshots.put({
    id: snapshot.id,
    data: JSON.stringify(snapshot),
    iv: '',
    updatedAt: Date.now(),
  })
}

/**
 * Load the most recent N days of snapshots, sorted ascending by date.
 * @param days Number of days to load (default: all)
 */
export async function loadSnapshots(days?: number): Promise<PortfolioSnapshot[]> {
  const records = await db.snapshots.orderBy('id').toArray()

  const snapshots: PortfolioSnapshot[] = []
  for (const record of records) {
    try {
      snapshots.push(JSON.parse(record.data) as PortfolioSnapshot)
    } catch {
      console.warn(`Failed to parse snapshot record id=${record.id}, skipping.`)
    }
  }

  if (days !== undefined && days > 0) {
    return snapshots.slice(-days)
  }
  return snapshots
}

/**
 * Check if a snapshot for today already exists in IndexedDB.
 */
export async function hasSnapshotToday(): Promise<boolean> {
  const today = toDateString(new Date())
  const record = await db.snapshots.get(today)
  return record !== undefined
}
