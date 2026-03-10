/**
 * MobileNav - スマートフォン用ボトムナビゲーション
 * md以上では非表示（Sidebarが表示される）
 */
import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: string
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'ダッシュボード', icon: '◈', exact: true },
  { to: '/assets', label: '資産', icon: '◆' },
  { to: '/transactions', label: '取引', icon: '⇅' },
  { to: '/performance', label: '実績', icon: '↗' },
  { to: '/settings', label: '設定', icon: '⚙' },
]

export function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        backgroundColor: 'rgba(9,9,9,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
      aria-label="モバイルナビゲーション"
    >
      <ul className="flex h-16 items-center justify-around px-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors',
                  isActive ? 'text-accent' : 'text-ink-muted hover:text-ink-secondary',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="text-base leading-none"
                    aria-hidden="true"
                    style={{ color: isActive ? '#FFA16C' : undefined }}
                  >
                    {item.icon}
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: isActive ? '#FFA16C' : '#4B5563' }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
