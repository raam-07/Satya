'use client'
import { useState, useCallback } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Masthead } from './Masthead'
import { BottomNav } from './BottomNav'
import { SearchOverlay } from './SearchOverlay'
import { ArticleModal } from './ArticleModal'
import { Toast } from './Toast'
import type { Article } from '@/lib/api'

export function Shell({ children, lastUpdated }: { children: React.ReactNode; lastUpdated?: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [modalArticle, setModalArticle] = useState<Article | null>(null)

  const openSearch  = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const openModal   = useCallback((a: Article) => setModalArticle(a), [])
  const closeModal  = useCallback(() => setModalArticle(null), [])

  return (
    <>
      {/* ── DESKTOP layout (md+): sidebar + topbar — disabled until desktop mode is ready ── */}
      {/* <div className="hidden md:flex h-screen overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <TopBar lastUpdated={lastUpdated} onSearchOpen={openSearch} />
          <main className="flex-1 overflow-y-auto bg-[var(--bg)]">
            {children}
          </main>
        </div>
      </div> */}

      {/* ── MOBILE layout: always active on all screen sizes ── */}
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-shrink-0">
          <Masthead />
        </div>
        <main className="flex-1 overflow-y-auto bg-[var(--bg)] pb-16">
          {children}
        </main>
        <BottomNav onSearchOpen={openSearch} />
      </div>

      {/* ── Global overlays ── */}
      {searchOpen && (
        <SearchOverlay
          onClose={closeSearch}
          onArticleClick={(article) => {
            closeSearch()
            openModal(article)
          }}
        />
      )}
      <ArticleModal article={modalArticle} onClose={closeModal} />
      <Toast />
    </>
  )
}
