'use client'
import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Masthead } from './Masthead'
import { BottomNav } from './BottomNav'
import { SearchOverlay } from './SearchOverlay'
import { ArticleModal } from './ArticleModal'
import { Toast } from './Toast'
import { SplashScreen } from './SplashScreen'
import type { Article } from '@/lib/api'

export function Shell({ children, lastUpdated }: { children: React.ReactNode; lastUpdated?: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [modalArticle, setModalArticle] = useState<Article | null>(null)

  const [showSplash, setShowSplash] = useState(false)
  const [isContentReady, setIsContentReady] = useState(false)

  useEffect(() => {
    // If not seen yet, show splash. Otherwise content is immediately ready.
    const hasSeen = sessionStorage.getItem('satya_splash_seen')
    if (hasSeen === 'true') {
      setIsContentReady(true)
    } else {
      setShowSplash(true)
    }
  }, [])

  const openSearch  = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const openModal   = useCallback((a: Article) => setModalArticle(a), [])
  const closeModal  = useCallback(() => setModalArticle(null), [])

  return (
    <>
      {/* ── Startup loading splash screen ── */}
      {showSplash && (
        <SplashScreen
          onExitStart={() => setIsContentReady(true)}
          onComplete={() => setShowSplash(false)}
        />
      )}

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
      <div
        className={`flex flex-col h-screen overflow-hidden transition-all duration-1000 ease-out ${
          isContentReady ? 'opacity-100 translate-y-0 filter-none' : 'opacity-0 translate-y-3 blur-[2px]'
        }`}
      >
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
