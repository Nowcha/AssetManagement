/**
 * 暗号化ユーティリティ
 * Web Crypto API (AES-256-GCM + PBKDF2) を使用
 * CryptoJS は使用しない
 */

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 32  // bytes
const IV_LENGTH = 12    // bytes (AES-GCM推奨)

/** ランダムなソルトを生成してBase64で返す */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  return uint8ArrayToBase64(salt)
}

/** パスワードとソルトからAES-256-GCMキーを導出（PBKDF2） */
export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const salt = base64ToUint8Array(saltBase64)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** データを暗号化してBase64文字列のペアを返す */
export async function encrypt(
  plaintext: string,
  key: CryptoKey,
): Promise<{ data: string; iv: string }> {
  const enc = new TextEncoder()
  const ivRaw = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const iv = ivRaw.buffer

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  )

  return {
    data: uint8ArrayToBase64(new Uint8Array(ciphertext)),
    iv: uint8ArrayToBase64(ivRaw),
  }
}

/** 暗号化済みBase64文字列を復号して平文を返す */
export async function decrypt(
  dataBase64: string,
  ivBase64: string,
  key: CryptoKey,
): Promise<string> {
  const iv = base64ToUint8Array(ivBase64).buffer as ArrayBuffer
  const ciphertext = base64ToUint8Array(dataBase64)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext.buffer as ArrayBuffer,
  )

  return new TextDecoder().decode(plaintext)
}

/** パスワード検証用のverifierを生成（既知平文を暗号化） */
export async function createVerifier(key: CryptoKey): Promise<{ data: string; iv: string }> {
  return encrypt('ASSET_MANAGEMENT_VERIFIER_V1', key)
}

/** verifierを復号してパスワードが正しいか確認 */
export async function verifyPassword(
  key: CryptoKey,
  verifierData: string,
  verifierIv: string,
): Promise<boolean> {
  try {
    const plaintext = await decrypt(verifierData, verifierIv, key)
    return plaintext === 'ASSET_MANAGEMENT_VERIFIER_V1'
  } catch {
    return false
  }
}

// --- ユーティリティ ---

function uint8ArrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
}

/** Base64文字列をUint8Arrayに変換する。バッファはArrayBufferを保証する */
function base64ToUint8Array(base64: string): Uint8Array & { buffer: ArrayBuffer } {
  const binary = atob(base64)
  const buf = new ArrayBuffer(binary.length)
  const arr = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i)
  }
  return arr as Uint8Array & { buffer: ArrayBuffer }
}
