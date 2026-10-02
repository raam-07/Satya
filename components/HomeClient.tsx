'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { api, type Article, type IndiaOverview } from '@/lib/api'
import { ArticleCard } from '@/components/ArticleCard'
import { ArticleModal } from '@/components/ArticleModal'
import { CategoryTabs } from '@/components/CategoryTabs'
import { UpscStrip } from '@/components/UpscStrip'
import type { Language } from '@/lib/i18n'

interface HomeClientProps {
  overview: IndiaOverview | null
  initialArticles: Article[]
  initialTab?: string
  currentLang?: Language
}

// The feed renders 20 at a time and pages up; fetching 500 upfront just to
// hold them in memory froze phones (huge JSON with every article's full text).
// 150 is plenty of scroll headroom at a fraction of the payload/parse cost.
const BATCH_SIZE = 60
const PAGE_SIZE = 20
const MAX_FEED_LIMIT = 1000

export function HomeClient({ overview, initialArticles, initialTab = 'all', currentLang = 'en' }: HomeClientProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [articles, setArticles] = useState<Article[]>(
    initialArticles
  )
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreOnServer, setHasMoreOnServer] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [modalArticle, setModalArticle] = useState<Article | null>(null)

  // Feed cache — persists across tab switches without triggering re-renders
  const feedCache = useRef<Map<string, Article[]>>(new Map([['all', initialArticles]]))
  // Tabs whose INITIAL feed (or full initial chunk) has been fetched
  const fullLoaded = useRef<Set<string>>(new Set())
  // Track if we can load more on the server for each tab
  const serverHasMoreMap = useRef<Map<string, boolean>>(new Map())
  // Per tab: stories the server sent again on a later page (dropped), so the next offset still advances
  const skippedMap = useRef<Map<string, number>>(new Map())

  const openModal  = useCallback((a: Article) => setModalArticle(a), [])
  const closeModal = useCallback(() => setModalArticle(null), [])

  // Read URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam && tabParam !== 'all') {
      setActiveTab(tabParam)
      setLoading(true)
    }
  }, [])

  // Signal to LanguageContext that HomeClient has mounted with currentLang
  useEffect(() => {
    if (currentLang) {
      window.dispatchEvent(new CustomEvent('satya-lang-mounted', { detail: { lang: currentLang } }))
    }
  }, [currentLang])

  // Clear feed cache when currentLang changes so different language tab caches never mix
  const prevLangRef = useRef(currentLang)
  useEffect(() => {
    if (prevLangRef.current !== currentLang) {
      prevLangRef.current = currentLang
      feedCache.current.clear()
      fullLoaded.current.clear()
      serverHasMoreMap.current.clear()
      skippedMap.current.clear()
      feedCache.current.set(activeTab, initialArticles)
      setArticles(initialArticles)
    }
  }, [currentLang, activeTab, initialArticles])

  // The tab on screen right now: a slow "load more" must not write its tab's list into another tab
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab

  // Dynamic server-side pagination fetch
  const loadMoreArticles = useCallback(async () => {
    if (loading || loadingMore || !hasMoreOnServer || articles.length >= MAX_FEED_LIMIT) return

    setLoadingMore(true)
    try {
      const currentOffset = articles.length + (skippedMap.current.get(activeTab) ?? 0)
      const res = await api.feed(activeTab, false, BATCH_SIZE, currentOffset, currentLang)
      const newArticles = res?.articles ?? []
      if (activeTabRef.current !== activeTab) return  // user switched tabs meanwhile
      
      const hasMore = newArticles.length >= BATCH_SIZE
      const reachedLimit = (currentOffset + newArticles.length) >= MAX_FEED_LIMIT
      const nextHasMore = hasMore && !reachedLimit

      setHasMoreOnServer(nextHasMore)
      serverHasMoreMap.current.set(activeTab, nextHasMore)

      // Offset paging shifts when new stories arrive, so a page can repeat stories already shown.
      // Drop repeats: duplicate React keys can leave a stale card on screen across tab switches.
      const seen = new Set(articles.map(a => a.id))
      const fresh = newArticles.filter(a => !seen.has(a.id))
      skippedMap.current.set(activeTab, (skippedMap.current.get(activeTab) ?? 0) + newArticles.length - fresh.length)
      if (fresh.length > 0) {
        const updatedList = [...articles, ...fresh]
        setArticles(updatedList)
        feedCache.current.set(activeTab, updatedList)
        setVisibleCount((prev) => prev + PAGE_SIZE)
      }
    } catch (err) {
      console.error('Error loading more articles:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [activeTab, articles, loading, loadingMore, hasMoreOnServer, currentLang])

  // Listen for custom pull-to-refresh event
  useEffect(() => {
    const handleRefresh = async () => {
      feedCache.current.clear()
      setLoading(true)
      try {
        fullLoaded.current.clear()
        serverHasMoreMap.current.clear()
        skippedMap.current.clear()
        const res = await api.feed(activeTab, true, BATCH_SIZE, 0, currentLang)
        const list = res?.articles ?? []
        feedCache.current.set(activeTab, list)
        fullLoaded.current.add(activeTab)
        setArticles(list)
        setVisibleCount(PAGE_SIZE)
        const hasMore = list.length >= BATCH_SIZE
        setHasMoreOnServer(hasMore)
        serverHasMoreMap.current.set(activeTab, hasMore)
      } catch (err) {
        console.error('Error refreshing feed:', err)
      } finally {
        setLoading(false)
      }
    }
    window.addEventListener('satya-refresh-feed', handleRefresh)
    return () => window.removeEventListener('satya-refresh-feed', handleRefresh)
  }, [activeTab, currentLang])

  // Fetch / Switch tabs
  useEffect(() => {
    // Check cache first — show instantly, no spinner
    const cached = feedCache.current.get(activeTab)
    if (cached) {
      setArticles(cached)
      setVisibleCount(PAGE_SIZE)
      setLoading(false)
      setHasMoreOnServer(serverHasMoreMap.current.get(activeTab) ?? true)
      // Fully loaded already → nothing else to do
      if (fullLoaded.current.has(activeTab)) return
    }

    let active = true
    async function loadFeed() {
      // Only show the spinner when we have nothing to display yet;
      // topping up a fast initial slice happens silently in the background.
      if (!cached) setLoading(true)
      try {
        const res = await api.feed(activeTab, false, BATCH_SIZE, 0, currentLang)
        const list = res?.articles ?? []
        feedCache.current.set(activeTab, list)
        fullLoaded.current.add(activeTab)
        skippedMap.current.set(activeTab, 0)
        if (active && list.length > 0) {
          setArticles(list)
          if (!cached) setVisibleCount(PAGE_SIZE)
          const hasMore = list.length >= BATCH_SIZE
          setHasMoreOnServer(hasMore)
          serverHasMoreMap.current.set(activeTab, hasMore)
        }
      } catch (err) {
        console.error('Error loading feed:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadFeed()
    return () => { active = false }
  }, [activeTab, currentLang])

  // Lightweight background pre-warming for top 2 tabs during idle time (only 20 items each)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prewarmTabs = ['governance', 'economy']

    const timer = setTimeout(() => {
      const runPrewarm = async () => {
        for (const tab of prewarmTabs) {
          if (!feedCache.current.has(tab)) {
            try {
              const res = await api.feed(tab, false, PAGE_SIZE, 0, currentLang)
              const list = res?.articles ?? []
              if (list.length > 0) {
                feedCache.current.set(tab, list)
                serverHasMoreMap.current.set(tab, list.length >= PAGE_SIZE)
              }
            } catch {}
          }
        }
      }

      if ('requestIdleCallback' in window) {
        ;(window as any).requestIdleCallback(() => runPrewarm(), { timeout: 4000 })
      } else {
        runPrewarm()
      }
    }, 2500)

    return () => clearTimeout(timer)
  }, [currentLang])

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId)
    const url = new URL(window.location.href)
    if (tabId === 'all') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', tabId)
    }
    window.history.replaceState(null, '', url.pathname + url.search)
  }, [])

  // Observer support detection and Observer logic
  const [isObserverSupported, setIsObserverSupported] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setIsObserverSupported(typeof window !== 'undefined' && 'IntersectionObserver' in window)
  }, [])

  const paginatedArticles = articles.slice(0, visibleCount)
  const hasMore = (articles.length > paginatedArticles.length) || (hasMoreOnServer && articles.length < MAX_FEED_LIMIT)

  // Proactive background pre-fetching when we have 20 or fewer unrevealed articles in local cache
  useEffect(() => {
    if (loading || loadingMore || !hasMoreOnServer || articles.length >= MAX_FEED_LIMIT) return

    const unrevealedCount = articles.length - visibleCount
    if (unrevealedCount <= 20) {
      loadMoreArticles()
    }
  }, [visibleCount, articles.length, loading, loadingMore, hasMoreOnServer, loadMoreArticles])

  useEffect(() => {
    if (!isObserverSupported || !hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const hasMoreLocal = articles.length > visibleCount
          if (hasMoreLocal) {
            setVisibleCount((v) => v + PAGE_SIZE)
          } else if (hasMoreOnServer && !loadingMore) {
            loadMoreArticles()
          }
        }
      },
      {
        rootMargin: '300px',
      }
    )

    const currentSentinel = sentinelRef.current
    if (currentSentinel) {
      observer.observe(currentSentinel)
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel)
      }
    }
  }, [isObserverSupported, hasMore, articles.length, visibleCount, loading, loadMoreArticles, hasMoreOnServer, loadingMore])

  const gov          = overview?.current_government
  const catBreakdown = overview?.category_breakdown_30d ?? {}

  const tabLabel = currentLang === 'hi'
    ? (activeTab === 'all'
        ? 'आज की वास्तविकता'
        : (activeTab === 'flagged'
            ? 'नागरिक अलर्ट — तत्काल ध्यान देने योग्य'
            : `${activeTab} संस्करण`))
    : (activeTab === 'all' 
        ? "Today's Reality" 
        : (activeTab === 'flagged' 
            ? "Critical Civic Alerts — What Needs Attention" 
            : `${activeTab.charAt(0).toUpperCase()}${activeTab.slice(1)} Edition`))

  return (
    <div>

      {/* Sticky Category Tabs */}
      <div className="sticky top-0 z-30 shadow-sm" style={{ background: 'var(--surface)' }}>
        <CategoryTabs activeTab={activeTab} onChangeTab={handleTabChange} currentLang={currentLang} />
      </div>

      <UpscStrip currentLang={currentLang} />

      {/* ── Single column layout (mobile-first, all screens) ── */}
      <div>

        {/* Section label */}
        <div className="relative px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          {loading && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--border-md)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)]"
                style={{
                  width: '40%',
                  animation: 'satyaShimmerSlide 1s infinite ease-in-out',
                }}
              />
            </div>
          )}
          <div className="h-[2px] w-3" style={{ background: 'var(--accent)' }} />
          <span className="text-[9.5px] font-mono tracking-widest uppercase" style={{ color: 'var(--text2)' }}>
            {tabLabel}
          </span>
          {loading && (
            <span className="text-[9.5px] font-mono animate-pulse ml-auto" style={{ color: 'var(--text3)' }}>
              {currentLang === 'hi' ? 'लोड हो रहा है...' : 'Updating...'}
            </span>
          )}
        </div>

        {loading && articles.length === 0 ? (
          <div className="p-4 space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded animate-pulse" style={{ background: 'var(--bg-alt)' }} />)}
          </div>
        ) : (
          <div className={`transition-opacity duration-200 ${loading ? 'opacity-70' : 'opacity-100'}`}>
            <div className="flex flex-col">
              {paginatedArticles.map((article: Article, i: number) => (
                <div key={article.id ?? i} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 140px' }}>
                  <ArticleCard article={article} variant="default" onOpen={openModal} />
                </div>
              ))}
            </div>
            {articles.length === 0 && !loading && (
              <EmptyState 
                message={currentLang === 'hi' 
                  ? 'इस श्रेणी में अभी कोई हिन्दी लेख उपलब्ध नहीं हैं — अनुवाद प्रगति पर है' 
                  : 'No stories loaded — check back soon as coverage grows'} 
              />
            )}
            {hasMore && (
              <div className="p-4 text-center">
                {isObserverSupported ? (
                  <div ref={sentinelRef} className="py-4 flex justify-center items-center">
                    <span className="text-[10px] font-mono tracking-wider animate-pulse" style={{ color: 'var(--text3)' }}>
                      {currentLang === 'hi' ? 'और समाचार लोड हो रहे हैं...' : 'Loading more headlines...'}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const hasMoreLocal = articles.length > visibleCount
                      if (hasMoreLocal) {
                        setVisibleCount((v) => v + PAGE_SIZE)
                      } else {
                        loadMoreArticles()
                      }
                    }}
                    className="w-full py-2.5 border rounded-sm text-[11px] font-mono transition-colors"
                    style={{ borderColor: 'var(--border-hi)', color: 'var(--text2)' }}
                    disabled={loadingMore}
                  >
                    {loadingMore 
                      ? (currentLang === 'hi' ? 'लोड हो रहा है...' : 'Loading...') 
                      : (currentLang === 'hi' ? 'और समाचार लोड करें ↗' : 'Load More Headlines ↗')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ArticleModal article={modalArticle} onClose={closeModal} />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center">
      <p className="text-[13px] font-mono" style={{ color: 'var(--text3)' }}>{message}</p>
    </div>
  )
}
