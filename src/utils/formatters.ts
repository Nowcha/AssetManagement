/**
 * 数値・通貨フォーマットユーティリティ
 */

/** 金額を日本円表示にフォーマット */
export function formatJpy(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** 金額をUSDにフォーマット */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** 損益率をパーセント表示にフォーマット（符号付き） */
export function formatGainRate(rate: number): string {
  const sign = rate >= 0 ? '+' : ''
  return `${sign}${rate.toFixed(2)}%`
}

/** 損益金額をJPYフォーマット（符号付き） */
export function formatGainJpy(amount: number): string {
  const sign = amount >= 0 ? '+' : ''
  return `${sign}${formatJpy(amount)}`
}

/** 数量をフォーマット（小数点以下の桁数を自動調整） */
export function formatQuantity(quantity: number, maxFractionDigits = 6): string {
  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(quantity)
}

/** 日付を日本語表示にフォーマット */
export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoString))
}

/** 日時を日本語表示にフォーマット */
export function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

/** パーセンテージをフォーマット（0.1234 → "12.34%"） */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  return `${(ratio * 100).toFixed(fractionDigits)}%`
}
