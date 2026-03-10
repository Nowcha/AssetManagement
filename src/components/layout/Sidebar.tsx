import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: string
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'ダッシュボード', icon: '◈', exact: true },
  { to: '/assets', label: '資産管理', icon: '◆' },
  { to: '/transactions', label: '取引履歴', icon: '⇅' },
  { to: '/performance', label: 'パフォーマンス', icon: '↗' },
  { to: '/simulation', label: 'シミュレーション', icon: '◎' },
  { to: '/reports', label: 'レポート', icon: '≡' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/settings', label: '設定', icon: '⚙' },
]

export function Sidebar() {
  return (
    <nav
      className="hidden w-60 flex-col md:flex"
      style={{
        backgroundColor: '#0d0d0d',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
      aria-label="メインナビゲーション"
    >
      {/* Logo area */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold"
          style={{ backgroundColor: '#FFA16C', color: '#000' }}
          aria-hidden="true"
        >
          A
        </div>
        <span className="text-sm font-semibold tracking-wide text-white">
          AssetManagement
        </span>
      </div>

      {/* Main navigation */}
      <div className="flex flex-1 flex-col overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.exact}
                className={({ isActive }) => [
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent-subtle text-accent font-medium'
                    : 'text-ink-secondary hover:bg-white/[0.04] hover:text-white',
                ].join(' ')}
              >
                <span
                  className="w-4 text-center text-base leading-none"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom navigation */}
        <div
          className="mt-2 px-2 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <ul className="space-y-0.5">
            {BOTTOM_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => [
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-accent-subtle text-accent font-medium'
                      : 'text-ink-secondary hover:bg-white/[0.04] hover:text-white',
                  ].join(' ')}
                >
                  <span
                    className="w-4 text-center text-base leading-none"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}
