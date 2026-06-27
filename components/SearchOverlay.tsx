'use client'

import { useState, useEffect, useRef } from 'react'
import { api, type Article } from '@/lib/api'
import { cleanTitle, formatDate, categoryLabel, hasImage } from '@/lib/utils'
import { PBadge, SentimentDot } from './SrcTag'

interface SearchOverlayProps {
  onClose: () => void
  onArticleClick: (article: Article) => void
}

export function SearchOverlay({ onClose, onArticleClick }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  // Lock scroll + focus input
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => { document.body.style.overflow = '' }
  }, [])

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Debounced full-database search (covers ALL news, not just the recent feed).
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }
    const mySeq = ++seq.current
    setLoading(true)
    const t = setTimeout(async () => {
      const res = await api.search(q)
      if (mySeq !== seq.current) return // a newer query superseded this one
      setResults(res?.articles ?? [])
      setLoading(false)
      setSearched(true)
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  const q = query.trim()

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Search bar */}
      <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-md)' }}>
        <div className="h-[2px]" style={{ background: 'var(--accent)' }} />
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-[var(--accent)] text-[18px] font-black font-serif tracking-[0.15em]">S</span>
          <div className="w-px h-5" style={{ background: 'var(--border-md)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all news — leaders, parties, topics, states..."
            className="flex-1 bg-transparent text-[16px] text-[var(--text1)] placeholder:text-[var(--text3)] outline-none font-sans"
          />
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin flex-shrink-0" />
          )}
          <button
            onClick={onClose}
            className="flex-shrink-0 text-[var(--text3)] hover:text-[var(--text1)] transition-colors text-[22px] leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {q.length < 2 && (
          <div className="p-8 text-center">
            <p className="text-[13px] font-mono text-[var(--text3)]">Type at least 2 characters to search</p>
            <p className="text-[11px] font-mono text-[var(--text3)] mt-2 opacity-60">
              Searches the entire archive — every classified article.
            </p>
          </div>
        )}

        {q.length >= 2 && loading && results.length === 0 && (
          <div className="p-8 text-center">
            <span className="text-[12px] font-mono text-[var(--text3)] animate-pulse">Searching…</span>
          </div>
        )}

        {q.length >= 2 && !loading && searched && results.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-[13px] font-mono text-[var(--text3)]">No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest">
                {results.length}{results.length === 80 ? '+' : ''} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>
            {results.map((article, i) => {
              const show = hasImage(article.image_url)
              return (
                <button
                  key={article.id ?? i}
                  onClick={() => { onArticleClick(article); onClose() }}
                  className="w-full flex items-start gap-3 px-4 py-4 border-b text-left hover:bg-[var(--bg-alt)] transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {show && (
                    <div className="flex-shrink-0 w-14 h-14 overflow-hidden rounded-sm border" style={{ borderColor: 'var(--border-md)' }}>
                      <img src={article.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {article.sentiment && <SentimentDot sentiment={article.sentiment} />}
                      {article.party_mentioned?.[0] && <PBadge party={article.party_mentioned[0]} />}
                      <span className="text-[9px] font-mono tracking-widest text-[var(--text3)] uppercase">
                        {categoryLabel(article.category)}{formatDate(article.scraped_at) && ` · ${formatDate(article.scraped_at)}`}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-[var(--text1)] leading-snug line-clamp-2 font-serif">
                      {cleanTitle(article.title ?? '')}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
