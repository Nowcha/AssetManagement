/** アプリ設定 */
export interface AppSettings {
  displayCurrency: 'JPY' | 'USD'
  theme: 'light' | 'dark' | 'system'
  isEncryptionEnabled: boolean
  encryptionSaltHex?: string     // PBKDF2用ソルト（Base64）
  encryptionKeyVerifier?: string // パスワード検証用（暗号化されたダミー文字列）
  autoLockMinutes: number        // 0 = 無効
  priceAutoRefresh: boolean
  priceRefreshIntervalMinutes: number
  alphaVantageApiKey?: string    // 暗号化して保存
  jQuantsRefreshToken?: string   // 暗号化して保存
  lastBackupAt?: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  displayCurrency: 'JPY',
  theme: 'system',
  isEncryptionEnabled: false,
  autoLockMinutes: 30,
  priceAutoRefresh: true,
  priceRefreshIntervalMinutes: 60,
}
