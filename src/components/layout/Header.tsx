import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/': 'ダッシュボード',
  '/assets': '資産管理',
  '/transactions': '取引履歴',
  '/performance': 'パフォーマンス',
  '/simulation': 'シミュレーション',
  '/reports': 'レポート',
  '/settings': '設定',
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // Prefix match for sub-routes
  const prefix = Object.keys(PAGE_TITLES)
    .filter((k) => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return prefix ? PAGE_TITLES[prefix] : 'AssetManagement'
}

function getCurrentTime(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

export function Header() {
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <header
      className="flex h-14 flex-shrink-0 items-center justify-between px-6"
      style={{
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left: page title */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold text-white">{pageTitle}</h1>
      </div>

      {/* Right: meta info + search hint */}
      <div className="flex items-center gap-4">
        {/* Last updated */}
        <span className="hidden text-xs text-ink-muted sm:block">
          {getCurrentTime()} 更新
        </span>

        {/* Cmd+K search hint */}
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink-secondary"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          aria-label="検索 (Ctrl+K)"
        >
          <span>検索</span>
          <kbd
            className="rounded px-1 py-0.5 text-[10px] font-medium"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#4B5563',
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  )
}
