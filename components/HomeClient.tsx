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
const FEED_LIMIT = 150

export function HomeClient({ overview, initialArticles, initialTab = 'all' }: HomeClientProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [articles, setArticles] = useState<Article[]>(
    initialArticles
  )
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)
  const [modalArticle, setModalArticle] = useState<Article | null>(null)

  // Feed cache — persists across tab switches without triggering re-renders
  const feedCache = useRef<Map<string, Article[]>>(new Map([['all', initialArticles]]))
  // Tabs whose FULL feed (not just the fast initial slice) has been fetched
  const fullLoaded = useRef<Set<string>>(new Set())

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

  // Listen for custom pull-to-refresh event
  useEffect(() => {
    const handleRefresh = async () => {
      feedCache.current.clear()
      setLoading(true)
      try {
        fullLoaded.current.clear()
        const res = await api.feed(activeTab, true, FEED_LIMIT)
        const list = res?.articles ?? []
        feedCache.current.set(activeTab, list)
        fullLoaded.current.add(activeTab)
        setArticles(list)
        setVisibleCount(20)
      } catch (err) {
        console.error('Error refreshing feed:', err)
      } finally {
        setLoading(false)
      }
    }
    window.addEventListener('satya-refresh-feed', handleRefresh)
    return () => window.removeEventListener('satya-refresh-feed', handleRefresh)
  }, [activeTab])

  useEffect(() => {
    // Check cache first — show instantly, no spinner
    const cached = feedCache.current.get(activeTab)
    if (cached) {
      setArticles(cached)
      setVisibleCount(20)
      setLoading(false)
      // Fully loaded already → nothing else to do
      if (fullLoaded.current.has(activeTab)) return
    }

    let active = true
    async function loadFeed() {
      // Only show the spinner when we have nothing to display yet;
      // topping up a fast initial slice happens silently in the background.
      if (!cached) setLoading(true)
      try {
        const res = await api.feed(activeTab, false, FEED_LIMIT)
        const list = res?.articles ?? []
        feedCache.current.set(activeTab, list)
        fullLoaded.current.add(activeTab)
        if (active && list.length > 0) {
          setArticles(list)
          if (!cached) setVisibleCount(20)
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

  const gov          = overview?.current_government
  const catBreakdown = overview?.category_breakdown_30d ?? {}

  const paginatedArticles = articles.slice(0, visibleCount)
  const hasMore           = articles.length > paginatedArticles.length

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
                <button
                  onClick={() => setVisibleCount(v => v + 20)}
                  className="w-full py-2.5 border rounded-sm text-[11px] font-mono transition-colors"
                  style={{ borderColor: 'var(--border-hi)', color: 'var(--text2)' }}
                >
                  Load More Headlines ↗
                </button>
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
