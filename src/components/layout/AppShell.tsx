import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#090909' }}>
      {/* スキップリンク（キーボードナビゲーション用） */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        style={{ background: '#FFA16C', color: '#000' }}
      >
        メインコンテンツへスキップ
      </a>

      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* モバイル用ボトムナビゲーション */}
      <MobileNav />
    </div>
  )
}
