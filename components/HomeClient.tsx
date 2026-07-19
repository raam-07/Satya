'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { api, type Article, type IndiaOverview } from '@/lib/api'
import { ArticleCard } from '@/components/ArticleCard'
import { ArticleModal } from '@/components/ArticleModal'
import { CategoryTabs } from '@/components/CategoryTabs'

interface HomeClientProps {
  overview: IndiaOverview | null
  initialArticles: Article[]
  initialTab?: string
}

// The feed renders 20 at a time and pages up; fetching 500 upfront just to
// hold them in memory froze phones (huge JSON with every article's full text).
// 150 is plenty of scroll headroom at a fraction of the payload/parse cost.
const BATCH_SIZE = 60
const PAGE_SIZE = 20
const MAX_FEED_LIMIT = 1000

export function HomeClient({ overview, initialArticles, initialTab = 'all' }: HomeClientProps) {
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

  // Dynamic server-side pagination fetch
  const loadMoreArticles = useCallback(async () => {
    if (loading || loadingMore || !hasMoreOnServer || articles.length >= MAX_FEED_LIMIT) return

    setLoadingMore(true)
    try {
      const currentOffset = articles.length
      const res = await api.feed(activeTab, false, BATCH_SIZE, currentOffset)
      const newArticles = res?.articles ?? []
      
      const hasMore = newArticles.length >= BATCH_SIZE
      const reachedLimit = (currentOffset + newArticles.length) >= MAX_FEED_LIMIT
      const nextHasMore = hasMore && !reachedLimit

      setHasMoreOnServer(nextHasMore)
      serverHasMoreMap.current.set(activeTab, nextHasMore)

      if (newArticles.length > 0) {
        const updatedList = [...articles, ...newArticles]
        setArticles(updatedList)
        feedCache.current.set(activeTab, updatedList)
        setVisibleCount((prev) => prev + PAGE_SIZE)
      }
    } catch (err) {
      console.error('Error loading more articles:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [activeTab, articles, loading, loadingMore, hasMoreOnServer])

  // Listen for custom pull-to-refresh event
  useEffect(() => {
    const handleRefresh = async () => {
      feedCache.current.clear()
      setLoading(true)
      try {
        fullLoaded.current.clear()
        serverHasMoreMap.current.clear()
        const res = await api.feed(activeTab, true, BATCH_SIZE, 0)
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
  }, [activeTab])

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
        const res = await api.feed(activeTab, false, BATCH_SIZE, 0)
        const list = res?.articles ?? []
        feedCache.current.set(activeTab, list)
        fullLoaded.current.add(activeTab)
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
  }, [activeTab])

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

  const tabLabel = 
    activeTab === 'all' 
      ? "Today's Reality" 
      : (activeTab === 'flagged' 
          ? "Critical Civic Alerts — What Needs Attention" 
          : `${activeTab.charAt(0).toUpperCase()}${activeTab.slice(1)} Edition`)

  return (
    <div>

      {/* Sticky Category Tabs */}
      <div className="sticky top-0 z-30 shadow-sm" style={{ background: 'var(--surface)' }}>
        <CategoryTabs activeTab={activeTab} onChangeTab={handleTabChange} />
      </div>

      {/* ── Single column layout (mobile-first, all screens) ── */}
      <div>

        {/* Section label */}
        <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <div className="h-[2px] w-3" style={{ background: 'var(--accent)' }} />
          <span className="text-[9.5px] font-mono tracking-widest uppercase" style={{ color: 'var(--text2)' }}>
            {tabLabel}
          </span>
          {loading && <span className="text-[9.5px] font-mono animate-pulse ml-auto" style={{ color: 'var(--text3)' }}>Updating...</span>}
        </div>

        {loading ? (
          <div className="p-4 space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded animate-pulse" style={{ background: 'var(--bg-alt)' }} />)}
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {paginatedArticles.map((article: Article, i: number) => (
                <div key={article.id ?? i} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 140px' }}>
                  <ArticleCard article={article} variant="default" onOpen={openModal} />
                </div>
              ))}
            </div>
            {articles.length === 0 && <EmptyState message="No stories loaded — check back soon as coverage grows" />}
            {hasMore && (
              <div className="p-4 text-center">
                {isObserverSupported ? (
                  <div ref={sentinelRef} className="py-4 flex justify-center items-center">
                    <span className="text-[10px] font-mono tracking-wider animate-pulse" style={{ color: 'var(--text3)' }}>
                      Loading more headlines...
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
                    {loadingMore ? 'Loading...' : 'Load More Headlines ↗'}
                  </button>
                )}
              </div>
            )}
          </>
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
