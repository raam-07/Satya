'use client'
import { useState, useCallback, useEffect } from 'react'
import { Masthead } from './Masthead'
import { BottomNav } from './BottomNav'
import { SearchOverlay } from './SearchOverlay'
import { ArticleModal } from './ArticleModal'
import { Toast } from './Toast'
import { SplashScreen } from './SplashScreen'
import { LanguageTransitionOverlay } from './LanguageTransitionOverlay'
import { PullToRefresh } from './PullToRefresh'
import { NotificationBanner } from './NotificationBanner'
import { InstallBanner } from './InstallBanner'
import type { Article } from '@/lib/api'
import type { Language } from '@/lib/i18n'

export function Shell({
  children,
  initialLang,
}: {
  children: React.ReactNode
  lastUpdated?: string
  initialLang?: Language
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [modalArticle, setModalArticle] = useState<Article | null>(null)

  // Splash shows once per session; default to true on server to prevent first-paint flash.
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem('satya_splash_seen') === 'true') {
      setShowSplash(false)
    }
  }, [])

  // Signal to LanguageContext that the server-rendered page in initialLang has mounted
  useEffect(() => {
    if (initialLang) {
      window.dispatchEvent(new CustomEvent('satya-lang-mounted', { detail: { lang: initialLang } }))
    }
  }, [initialLang])

  const hideSplash  = useCallback(() => setShowSplash(false), [])
  const openSearch  = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const openModal   = useCallback((a: Article) => setModalArticle(a), [])
  const closeModal  = useCallback(() => setModalArticle(null), [])

  return (
    <>
      <LanguageTransitionOverlay />
      {showSplash && (
        <SplashScreen onComplete={hideSplash} />
      )}

      <PullToRefresh />

      <div className="flex flex-col min-h-screen">
        <Masthead currentLang={initialLang} />
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
      <NotificationBanner />
      <InstallBanner />
      <Toast />
    </>
  )
}

