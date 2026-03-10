import '@testing-library/jest-dom'

// IndexedDB のモック（jsdomではIndexedDBが動作しないため）
import 'fake-indexeddb/auto'

// Web Crypto API のモック（Node.js環境用）
// Node 18+ では globalThis.crypto が存在するため基本不要
// テスト環境で使えない場合はここでモックを設定
