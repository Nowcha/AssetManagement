/**
 * FundSearchInput - 投資信託ファンド検索コンポーネント
 *
 * 投信総合検索ライブラリAPIを使ってファンド名で検索し、
 * 選択したファンドの情報をコールバックで通知する。
 *
 * APIが利用できない場合はファンドコード（8桁）の直接入力にフォールバックする。
 * 価格の自動取得には Yahoo Finance 用の「ファンドコード」（例: 0331418A）が必要。
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { searchFunds, type ToushinFund } from '@/api/toushinLib'

export interface FundSearchSelection {
  isinCd: string
  fndsNm: string
  kijunKa: number
}

interface FundSearchInputProps {
  /** 現在の ticker 値 */
  value: string
  /** ファンド選択時のコールバック */
  onSelect: (fund: FundSearchSelection) => void
  /** 直接入力時のコールバック（検索非使用でのファンドコード入力に対応） */
  onChange?: (value: string) => void
  /** 入力欄の id（アクセシビリティ） */
  id?: string
  /** エラーメッセージ */
  error?: string
}

const DEBOUNCE_MS = 400
const MIN_QUERY_LENGTH = 2

export function FundSearchInput({ value, onSelect, onChange, id = 'ticker', error }: FundSearchInputProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<ToushinFund[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // クエリが変わったときにデバウンスして検索
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([])
      setIsOpen(false)
      setSearchError(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      setIsLoading(true)
      setSearchError(null)
      searchFunds(trimmed)
        .then((funds) => {
          setResults(funds)
          setIsOpen(funds.length > 0)
          setActiveIndex(-1)
          if (funds.length === 0) {
            setSearchError('該当するファンドが見つかりませんでした')
          }
        })
        .catch(() => {
          setSearchError('検索APIに接続できません。ファンドコード（8桁）を直接入力してください。')
          setResults([])
          setIsOpen(false)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    // 直接入力の場合もフォームの ticker フィールドを更新する
    onChange?.(val)
  }, [onChange])

  const handleSelect = useCallback((fund: ToushinFund) => {
    setQuery(fund.isinCd)
    setResults([])
    setIsOpen(false)
    setActiveIndex(-1)
    onSelect({ isinCd: fund.isinCd, fndsNm: fund.fndsNm, kijunKa: fund.kijunKa })
  }, [onSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }, [isOpen, results, activeIndex, handleSelect])

  const handleBlur = useCallback(() => {
    // クリックイベントが先に発火するよう少し遅らせる
    setTimeout(() => { setIsOpen(false) }, 150)
  }, [])

  const baseClass = `input-dark pr-8 ${error ? 'input-dark-error' : ''}`

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          type="text"
          placeholder="ファンド名で検索 または ファンドコード直接入力（例: 0331418A）"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={baseClass}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-listbox` : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex.toString()}` : undefined}
          autoComplete="off"
        />
        {isLoading && (
          <span
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4 animate-spin"
              style={{ color: '#868F97' }}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        )}
      </div>

      {/* 検索エラー / 手動入力ガイダンス */}
      {!isLoading && searchError && query.trim().length >= MIN_QUERY_LENGTH && (
        <p className="mt-1 text-xs" style={{ color: '#868F97' }}>
          {searchError}
        </p>
      )}

      {/* 結果ドロップダウン */}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label="ファンド検索結果"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border py-1 shadow-xl"
          style={{
            background: '#141414',
            borderColor: 'rgba(255,255,255,0.1)',
            maxHeight: '16rem',
            overflowY: 'auto',
          }}
        >
          {results.map((fund, index) => (
            <li
              key={fund.isinCd}
              id={`${id}-option-${index.toString()}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={() => { handleSelect(fund) }}
              className="cursor-pointer px-3 py-2.5 transition-colors"
              style={{
                background: index === activeIndex ? 'rgba(255,161,108,0.12)' : undefined,
              }}
            >
              <p
                className="truncate text-sm font-medium"
                style={{ color: index === activeIndex ? '#FFA16C' : '#fff' }}
              >
                {fund.fndsNm}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: '#868F97' }}>
                {fund.isinCd}
                {fund.unyoKaishaNm && ` · ${fund.unyoKaishaNm}`}
                {' · '}
                <span style={{ color: '#60a5fa' }}>
                  {fund.kijunKa.toLocaleString('ja-JP')}円/万口
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
