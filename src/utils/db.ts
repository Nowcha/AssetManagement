import Dexie, { type Table } from 'dexie'
import type { AppSettings } from '@/types/settings.types'

/** 暗号化済みレコード（金融データ用） */
export interface EncryptedRecord {
  id: string
  data: string      // AES-256-GCM 暗号化済み JSON
  iv: string        // 初期化ベクター (Base64)
  updatedAt: number // Unix timestamp（Dexieインデックス用）
}

/** 平文設定レコード（機密情報を含まない） */
export interface SettingsRecord {
  key: string
  value: AppSettings
}

class AssetManagementDB extends Dexie {
  assets!: Table<EncryptedRecord>
  transactions!: Table<EncryptedRecord>
  snapshots!: Table<EncryptedRecord>
  goals!: Table<EncryptedRecord>
  settings!: Table<SettingsRecord>

  constructor() {
    super('AssetManagementDB')
    this.version(1).stores({
      assets: 'id, updatedAt',
      transactions: 'id, updatedAt',
      snapshots: 'id, updatedAt',
      goals: 'id, updatedAt',
      settings: 'key',
    })
  }
}

export const db = new AssetManagementDB()
