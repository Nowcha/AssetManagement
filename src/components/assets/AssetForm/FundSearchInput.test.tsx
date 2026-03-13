/**
 * Unit tests for FundSearchInput component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FundSearchInput } from './FundSearchInput'
import * as toushinLib from '@/api/toushinLib'

vi.mock('@/api/toushinLib', () => ({
  searchFunds: vi.fn(),
}))

const MOCK_FUNDS: toushinLib.ToushinFund[] = [
  {
    isinCd: 'JP90C000ABF2',
    fndsNm: 'eMAXIS Slim 全世界株式（オール・カントリー）',
    unyoKaishaNm: '三菱UFJアセットマネジメント',
    kijunKa: 25000,
    kijunKaDt: '20240301',
  },
  {
    isinCd: 'JP90C000GBD2',
    fndsNm: 'eMAXIS Slim 米国株式（S&P500）',
    unyoKaishaNm: '三菱UFJアセットマネジメント',
    kijunKa: 30000,
    kijunKaDt: '20240301',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FundSearchInput rendering', () => {
  it('初期状態でプレースホルダー付き入力を表示する', () => {
    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    const input = screen.getByRole('combobox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder')
  })

  it('value が ISIN コードの場合は入力欄にその値を表示する', () => {
    render(<FundSearchInput value="JP90C000ABF2" onSelect={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveValue('JP90C000ABF2')
  })

  it('ドロップダウンは初期状態では表示されない', () => {
    render(<FundSearchInput value="" onSelect={vi.fn()} />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('FundSearchInput search behavior', () => {
  it('2文字以上入力すると検索が実行される', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue(MOCK_FUNDS)
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'eMAXIS')

    await waitFor(() => {
      expect(toushinLib.searchFunds).toHaveBeenCalledWith('eMAXIS')
    }, { timeout: 2000 })
  })

  it('検索結果をドロップダウンに表示する', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue(MOCK_FUNDS)
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'eMAXIS')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(screen.getByText('eMAXIS Slim 全世界株式（オール・カントリー）')).toBeInTheDocument()
    expect(screen.getByText('eMAXIS Slim 米国株式（S&P500）')).toBeInTheDocument()
  })

  it('1文字以下の入力ではドロップダウンを表示しない', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue(MOCK_FUNDS)
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'e')

    await waitFor(() => {
      expect(toushinLib.searchFunds).not.toHaveBeenCalled()
    })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('結果が空の場合は「見つかりませんでした」メッセージを表示する', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue([])
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'XXXYYY')

    await waitFor(() => {
      expect(screen.getByText(/見つかりませんでした/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('検索エラーの場合はエラーメッセージを表示する', async () => {
    vi.mocked(toushinLib.searchFunds).mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'eMAXIS')

    await waitFor(() => {
      expect(screen.getByText(/接続できません/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})

describe('FundSearchInput direct input (onChange)', () => {
  it('直接入力すると onChange コールバックが呼ばれる', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue([])
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} onChange={onChange} />)

    await user.type(screen.getByRole('combobox'), '0331418A')

    expect(onChange).toHaveBeenCalled()
    // 最後の呼び出しが完全な入力値を持つ
    const calls = onChange.mock.calls as [string][]
    const lastValue = calls[calls.length - 1][0]
    expect(lastValue).toBe('0331418A')
  })

  it('onChange なしでも直接入力でエラーにならない', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue([])
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    // onChange prop なしでも入力できる
    await user.type(screen.getByRole('combobox'), '0331418A')
    expect(screen.getByRole('combobox')).toHaveValue('0331418A')
  })
})

describe('FundSearchInput selection', () => {
  it('ファンドをクリックすると onSelect が呼ばれる', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue(MOCK_FUNDS)
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={onSelect} />)

    await user.type(screen.getByRole('combobox'), 'eMAXIS')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 2000 })

    await user.click(screen.getByText('eMAXIS Slim 全世界株式（オール・カントリー）'))

    expect(onSelect).toHaveBeenCalledWith({
      isinCd: 'JP90C000ABF2',
      fndsNm: 'eMAXIS Slim 全世界株式（オール・カントリー）',
      kijunKa: 25000,
    })
  })

  it('ファンド選択後はドロップダウンが閉じる', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue(MOCK_FUNDS)
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'eMAXIS')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 2000 })

    await user.click(screen.getByText('eMAXIS Slim 全世界株式（オール・カントリー）'))

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('ファンド選択後は入力欄に ISIN コードが入る', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue(MOCK_FUNDS)
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'eMAXIS')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 2000 })

    await user.click(screen.getByText('eMAXIS Slim 全世界株式（オール・カントリー）'))

    expect(screen.getByRole('combobox')).toHaveValue('JP90C000ABF2')
  })
})

describe('FundSearchInput keyboard navigation', () => {
  it('ArrowDown でリストアイテムがハイライトされる', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue(MOCK_FUNDS)
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'eMAXIS')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 2000 })

    await user.keyboard('{ArrowDown}')

    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('Enter でフォーカス中のアイテムを選択できる', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue(MOCK_FUNDS)
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={onSelect} />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'eMAXIS')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 2000 })

    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ isinCd: 'JP90C000ABF2' }),
    )
  })

  it('Escape でドロップダウンが閉じる', async () => {
    vi.mocked(toushinLib.searchFunds).mockResolvedValue(MOCK_FUNDS)
    const user = userEvent.setup()

    render(<FundSearchInput value="" onSelect={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'eMAXIS')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    }, { timeout: 2000 })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })
})
