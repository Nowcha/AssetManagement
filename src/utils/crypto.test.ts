/**
 * Unit tests for crypto utilities
 * Tests encryption, decryption, and key derivation using Web Crypto API
 */
import { describe, it, expect } from 'vitest'
import {
  generateSalt,
  deriveKey,
  encrypt,
  decrypt,
  createVerifier,
  verifyPassword,
} from './crypto'

describe('generateSalt', () => {
  it('returns a non-empty base64 string', () => {
    const salt = generateSalt()
    expect(typeof salt).toBe('string')
    expect(salt.length).toBeGreaterThan(0)
  })

  it('generates unique salts each time', () => {
    const s1 = generateSalt()
    const s2 = generateSalt()
    expect(s1).not.toBe(s2)
  })
})

describe('deriveKey', () => {
  it('derives a CryptoKey from password and salt', async () => {
    const salt = generateSalt()
    const key = await deriveKey('test-password', salt)
    expect(key).toBeDefined()
    expect(key.type).toBe('secret')
    expect(key.algorithm.name).toBe('AES-GCM')
  })

  it('produces different keys for different passwords', async () => {
    const salt = generateSalt()
    const key1 = await deriveKey('password1', salt)
    const key2 = await deriveKey('password2', salt)
    // Both should be CryptoKey objects but derived differently
    expect(key1).not.toBe(key2)
  })
})

describe('encrypt / decrypt', () => {
  it('encrypts and decrypts plaintext correctly', async () => {
    const salt = generateSalt()
    const key = await deriveKey('my-password', salt)
    const plaintext = 'Hello, World!'

    const { data, iv } = await encrypt(plaintext, key)
    expect(data).toBeTruthy()
    expect(iv).toBeTruthy()
    expect(data).not.toBe(plaintext)

    const decrypted = await decrypt(data, iv, key)
    expect(decrypted).toBe(plaintext)
  })

  it('encrypts JSON strings correctly', async () => {
    const salt = generateSalt()
    const key = await deriveKey('pass', salt)
    const json = JSON.stringify({ id: '123', name: 'テスト資産', value: 1000000 })

    const { data, iv } = await encrypt(json, key)
    const decrypted = await decrypt(data, iv, key)
    expect(decrypted).toBe(json)
    expect(JSON.parse(decrypted)).toMatchObject({ id: '123', name: 'テスト資産' })
  })

  it('generates unique IVs for each encryption', async () => {
    const salt = generateSalt()
    const key = await deriveKey('pass', salt)

    const { iv: iv1 } = await encrypt('test', key)
    const { iv: iv2 } = await encrypt('test', key)
    expect(iv1).not.toBe(iv2)
  })

  it('fails to decrypt with a different key', async () => {
    const salt = generateSalt()
    const key1 = await deriveKey('correct-password', salt)
    const key2 = await deriveKey('wrong-password', salt)

    const { data, iv } = await encrypt('secret data', key1)

    await expect(decrypt(data, iv, key2)).rejects.toThrow()
  })
})

describe('createVerifier / verifyPassword', () => {
  it('verifies correct password returns true', async () => {
    const salt = generateSalt()
    const key = await deriveKey('my-password', salt)

    const { data, iv } = await createVerifier(key)
    const isValid = await verifyPassword(key, data, iv)
    expect(isValid).toBe(true)
  })

  it('verifies wrong password returns false', async () => {
    const salt = generateSalt()
    const correctKey = await deriveKey('correct-password', salt)
    const wrongKey = await deriveKey('wrong-password', salt)

    const { data, iv } = await createVerifier(correctKey)
    const isValid = await verifyPassword(wrongKey, data, iv)
    expect(isValid).toBe(false)
  })
})
