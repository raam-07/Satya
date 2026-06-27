import { useState, useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Masthead } from './Masthead'
import { BottomNav } from './BottomNav'
import { SearchOverlay } from './SearchOverlay'
import { ArticleModal } from './ArticleModal'
import { Toast } from './Toast'
import { SplashScreen } from './SplashScreen'
import { LazyFeed, LazyNetas, LazyVaade, LazyData } from './LazyTabs'
import type { Article } from '@/lib/api'

export function Shell({ children, lastUpdated }: { children: React.ReactNode; lastUpdated?: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [modalArticle, setModalArticle] = useState<Article | null>(null)
  
  const [showSplash, setShowSplash] = useState(false)
  const [isContentReady, setIsContentReady] = useState(false)

  const pathname = usePathname()
  const TAB_PATHS = ['/', '/netas', '/vaade', '/data']
  const isTabPage = TAB_PATHS.includes(pathname)

  // Capture the initial page route that was server-rendered
  const [initialTabPath, setInitialTabPath] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('feed')
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({})

  // Pull-to-refresh touch tracker variables
  const feedScrollRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  useEffect(() => {
    // If not seen yet, show splash. Otherwise content is immediately ready.
    const hasSeen = sessionStorage.getItem('satya_splash_seen')
    if (hasSeen === 'true') {
      setIsContentReady(true)
    } else {
      setShowSplash(true)
    }
  }, [])

  useEffect(() => {
    if (isTabPage) {
      if (!initialTabPath) {
        setInitialTabPath(pathname)
      }
      const tab = pathname === '/' ? 'feed' : pathname.slice(1)
      setActiveTab(tab)
      setVisitedTabs(prev => ({ ...prev, [tab]: true }))
    }
  }, [pathname, isTabPage, initialTabPath])

  // Sync back/forward popstate
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (TAB_PATHS.includes(path)) {
        const tab = path === '/' ? 'feed' : path.slice(1)
        setActiveTab(tab)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Pull-to-refresh gesture binder
  useEffect(() => {
    const el = feedScrollRef.current
    if (!el) return

    const handleTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY
        isPulling.current = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return
      const currentY = e.touches[0].clientY
      const deltaY = currentY - touchStartY.current

      if (deltaY > 0) {
        // Resistance model for natural pull feel
        const distance = Math.min(80, Math.pow(deltaY, 0.75))
        setPullDistance(distance)
        if (e.cancelable) {
          e.preventDefault()
        }
      } else {
        isPulling.current = false
        setPullDistance(0)
      }
    }

    const handleTouchEnd = () => {
      if (!isPulling.current) return
      isPulling.current = false

      if (pullDistance > 45 && !refreshing) {
        setRefreshing(true)
        setPullDistance(50)
        
        // Dispatch custom event to notify HomeClient to refresh feed
        window.dispatchEvent(new CustomEvent('satya-refresh-feed'))

        setTimeout(() => {
          setRefreshing(false)
          setPullDistance(0)
        }, 1200)
      } else {
        setPullDistance(0)
      }
    }

    el.addEventListener('touchstart', handleTouchStart)
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, refreshing, activeTab, visitedTabs])

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    setVisitedTabs(prev => ({ ...prev, [tab]: true }))
    const path = tab === 'feed' ? '/' : `/${tab}`
    window.history.pushState(null, '', path)
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

      {/* ── MOBILE layout: always active on all screen sizes ── */}
      <div 
        className={`flex flex-col h-screen overflow-hidden transition-all duration-1000 ease-out ${
          isContentReady ? 'opacity-100 translate-y-0 filter-none' : 'opacity-0 translate-y-3 blur-[2px]'
        }`}
      >
        <div className="flex-shrink-0">
          <Masthead />
        </div>
        <main className="flex-1 overflow-hidden relative bg-[var(--bg)] pb-16">
          {/* Pull-to-refresh spinner overlay (shows only when pulling the feed) */}
          {activeTab === 'feed' && isTabPage && (
            <div 
              className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-45 transition-transform duration-100 ease-out"
              style={{ 
                height: '50px',
                top: '-50px',
                transform: `translateY(${pullDistance}px)`,
                opacity: Math.min(1, pullDistance / 40)
              }}
            >
              {refreshing ? (
                <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border-md)] px-3 py-1.5 rounded-full shadow-md">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                  <span className="text-[8.5px] font-mono tracking-widest text-[var(--text2)] uppercase">Refreshing</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border-md)] px-3 py-1 rounded-full shadow-sm">
                  <svg className={`w-3 h-3 text-[var(--accent)] transition-transform duration-200 ${pullDistance > 45 ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-[8px] font-mono tracking-wider text-[var(--text3)] uppercase">
                    {pullDistance > 45 ? 'Release to Refresh' : 'Pull to Refresh'}
                  </span>
                </div>
              )}
            </div>
          )}

          {isTabPage ? (
            <>
              {/* Tab: FEED */}
              <div 
                ref={feedScrollRef}
                className={`absolute inset-0 overflow-y-auto transition-all duration-200 ease-out ${
                  activeTab === 'feed' 
                    ? 'opacity-100 translate-y-0 pointer-events-auto visible' 
                    : 'opacity-0 translate-y-1 pointer-events-none invisible'
                }`}
              >
                {initialTabPath === '/' ? children : (visitedTabs['feed'] && <LazyFeed />)}
              </div>

              {/* Tab: NETAS */}
              <div 
                className={`absolute inset-0 overflow-y-auto transition-all duration-200 ease-out ${
                  activeTab === 'netas' 
                    ? 'opacity-100 translate-y-0 pointer-events-auto visible' 
                    : 'opacity-0 translate-y-1 pointer-events-none invisible'
                }`}
              >
                {initialTabPath === '/netas' ? children : (visitedTabs['netas'] && <LazyNetas />)}
              </div>

              {/* Tab: VAADE */}
              <div 
                className={`absolute inset-0 overflow-y-auto transition-all duration-200 ease-out ${
                  activeTab === 'vaade' 
                    ? 'opacity-100 translate-y-0 pointer-events-auto visible' 
                    : 'opacity-0 translate-y-1 pointer-events-none invisible'
                }`}
              >
                {initialTabPath === '/vaade' ? children : (visitedTabs['vaade'] && <LazyVaade />)}
              </div>

              {/* Tab: DATA */}
              <div 
                className={`absolute inset-0 overflow-y-auto transition-all duration-200 ease-out ${
                  activeTab === 'data' 
                    ? 'opacity-100 translate-y-0 pointer-events-auto visible' 
                    : 'opacity-0 translate-y-1 pointer-events-none invisible'
                }`}
              >
                {initialTabPath === '/data' ? children : (visitedTabs['data'] && <LazyData />)}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 overflow-y-auto">
              {children}
            </div>
          )}
        </main>
        <BottomNav 
          onSearchOpen={openSearch} 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
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
