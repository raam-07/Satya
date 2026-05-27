'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, type Article } from '@/lib/api'
import { ArticleCard } from './ArticleCard'
import { ArticleModal } from './ArticleModal'

interface Props {
  party?: string
  person?: string
  category?: string
  preloadedEvidence?: {
    url: string
    title: string
    source: string
    scraped_at: string
    relevance_score?: number
    gemma_validated?: boolean
    rephrased?: string
    content?: string
  }[]
}

export function VaadeRelatedArticles({ party, person, category, preloadedEvidence }: Props) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Article | null>(null)
  const openModal  = useCallback((a: Article) => setModal(a), [])
  const closeModal = useCallback(() => setModal(null), [])

  useEffect(() => {
    if (preloadedEvidence && preloadedEvidence.length > 0) {
      const mapped: Article[] = preloadedEvidence.map((e, idx) => ({
        id: idx,
        title: e.title,
        url: e.url,
        source: e.source,
        scraped_at: e.scraped_at,
        rephrased_article: e.rephrased ?? '',
        content: e.content ?? '',
        category: category ?? 'politics',
        sentiment: 'neutral',
        party_mentioned: party ? [party] : [],
        ministers_mentioned: person ? [person] : [],
      }))
      setArticles(mapped)
      setLoading(false)
      return
    }

    api.feed('all').then(feedData => {
      const filtered = (feedData?.articles ?? []).filter(a => {
        const partyMatch   = party    && a.party_mentioned?.some(p => p.toLowerCase() === party.toLowerCase())
        const ministerMatch = person  && a.ministers_mentioned?.some(m => m.toLowerCase().includes(person.toLowerCase()))
        const categoryMatch = category && a.category?.toLowerCase() === category.toLowerCase()
        return partyMatch || ministerMatch || categoryMatch
      }).slice(0, 10)
      setArticles(filtered)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [party, person, category, preloadedEvidence])

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded animate-pulse" style={{ background: 'var(--bg-alt)' }} />
        ))}
      </div>
    )
  }

  if (articles.length === 0) return null

  return (
    <>
      <div className="px-4 md:px-6 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-md)' }}>
        <div className="h-[2px] w-3" style={{ background: 'var(--accent)' }} />
        <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>Related Coverage</span>
      </div>
      <div className="flex flex-col">
        {articles.map((a, i) => (
          <ArticleCard key={a.id ?? i} article={a} variant="default" onOpen={openModal} clampSummary={false} />
        ))}
      </div>
      <ArticleModal article={modal} onClose={closeModal} />
    </>
  )
}
