'use client'
import { useState, useCallback, useEffect } from 'react'
import { Masthead } from './Masthead'
import { BottomNav } from './BottomNav'
import { SearchOverlay } from './SearchOverlay'
import { ArticleModal } from './ArticleModal'
import { Toast } from './Toast'
import { SplashScreen } from './SplashScreen'
import { PullToRefresh } from './PullToRefresh'
import type { Article } from '@/lib/api'

export function Shell({ children }: { children: React.ReactNode; lastUpdated?: string }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [modalArticle, setModalArticle] = useState<Article | null>(null)

  // Splash shows once per session; default to true on server to prevent first-paint flash.
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem('satya_splash_seen') === 'true') {
      setShowSplash(false)
    }
  }, [])

  const openSearch  = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const openModal   = useCallback((a: Article) => setModalArticle(a), [])
  const closeModal  = useCallback(() => setModalArticle(null), [])

  return (
    <>
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      <PullToRefresh />

      <div className="flex flex-col min-h-screen">
        <Masthead />
        <main className="flex-1 bg-[var(--bg)] pb-16">
          {children}
        </main>
        <BottomNav onSearchOpen={openSearch} />
      </div>

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
