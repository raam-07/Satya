'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, type Article } from '@/lib/api'
import { cleanTitle, formatDate, categoryLabel, hasImage, renderMarkdown, slugify, partySlugify } from '@/lib/utils'
import { PBadge, SentimentDot, SrcTag, TappableMinister, TappableState } from './SrcTag'
import { useToast } from '@/lib/ToastContext'

// Topic display names per spec
const TOPIC_LABELS: Record<string, string> = {
  corruption_scam:   'CORRUPTION & SCAMS',
  crime_violence:    'CRIME & VIOLENCE',
  rape_sexual_crime: 'CRIMES AGAINST WOMEN',
  farmer_agriculture:'FARMERS & AGRICULTURE',
  foreign_policy:    'FOREIGN POLICY',
  economy:           'ECONOMY',
  infrastructure:    'INFRASTRUCTURE',
  health:            'HEALTH',
  education:         'EDUCATION',
  protest_opposition:'PROTESTS & OPPOSITION',
}

// API category → feed tab ID
const CATEGORY_TO_TAB: Record<string, string> = {
  politics: 'governance', governance: 'governance',
  crime: 'justice', justice: 'justice',
  economy: 'economy',
  international: 'world', world: 'world',
  health: 'health',
}

interface ArticleModalProps {
  article: Article | null
  onClose: () => void
}

export function ArticleModal({ article, onClose }: ArticleModalProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [fullContent, setFullContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentExpanded, setContentExpanded] = useState(false)

  const handleShare = () => {
    if (!article?.id) return
    const shareUrl = `https://satyadheesh.in/news/${article.id}`
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        showToast('Link copied to clipboard!')
      })
      .catch(() => {
        showToast('Failed to copy link')
      })
  }

  useEffect(() => {
    if (article) document.body.style.overflow = 'hidden'
    else         document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [article])

  // Close on the phone's back gesture / browser Back button: push a history
  // entry when the modal opens, and close (instead of leaving the page) when
  // the user goes back.
  useEffect(() => {
    if (!article) return
    window.history.pushState({ satyaModal: true }, '')
    const onPop = () => onClose()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [article, onClose])

  // Single dismiss path: if we pushed a history entry, go back (which fires
  // popstate -> onClose); otherwise just close.
  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined' && (window.history.state as any)?.satyaModal) {
      window.history.back()
    } else {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dismiss])

  // Lazy-load full article content when modal opens
  useEffect(() => {
    if (!article?.id) {
      setFullContent(null)
      setContentExpanded(false)
      return
    }

    // If content was already in the article object (e.g. from a direct DB query), use it
    if (article.content) {
      setFullContent(article.content)
      return
    }

    let cancelled = false
    setContentLoading(true)
    setFullContent(null)
    setContentExpanded(false)

    api.articleContent(article.id).then(res => {
      if (!cancelled) {
        setFullContent(res?.content || null)
        setContentLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setContentLoading(false)
    })

    return () => { cancelled = true }
  }, [article?.id, article?.content])

  if (!article) return null

  const displayTitle = cleanTitle(article.rephrased_title ?? article.title ?? '')
  const displayDate  = formatDate(article.scraped_at)
  const displayCat   = categoryLabel(article.category)
  const showImage    = hasImage(article.image_url)
  const tabId        = CATEGORY_TO_TAB[article.category?.toLowerCase() ?? '']

  const navigateTo = (href: string) => { onClose(); router.push(href) }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(26,26,26,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={dismiss}
    >
      <div
        className="relative mt-auto md:m-auto w-full md:max-w-2xl md:rounded-sm overflow-hidden flex flex-col"
        style={{
          background: 'var(--surface)',
          maxHeight: '92dvh',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-md)' }}>
          <button
            onClick={dismiss}
            aria-label="Back"
            className="flex items-center gap-1 flex-shrink-0 mr-1 -ml-1 px-2 py-1.5 rounded-md text-[11px] font-mono tracking-widest uppercase text-[var(--text2)] hover:text-[var(--accent)] active:bg-[var(--bg-alt)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {article.sentiment && <SentimentDot sentiment={article.sentiment} />}
            {article.party_mentioned?.[0] && <PBadge party={article.party_mentioned[0]} />}
            {/* Tappable category → navigates to feed tab */}
            {tabId ? (
              <button
                onClick={() => navigateTo(`/?tab=${tabId}`)}
                className="text-[10px] font-mono tracking-widest uppercase hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                {displayCat}
              </button>
            ) : (
              <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
                {displayCat}
              </span>
            )}
            {displayDate && <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>· {displayDate}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="text-[10px] font-mono tracking-wider uppercase border rounded-[2px] px-2 py-1 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
              style={{ color: 'var(--text3)', borderColor: 'var(--border-md)' }}
              title="Copy shareable link"
            >
              <span>Share</span>
              <span className="text-[10px]">🔗</span>
            </button>
            <button
              onClick={dismiss}
              aria-label="Close"
              className="text-[22px] leading-none w-8 h-8 flex items-center justify-center transition-colors"
              style={{ color: 'var(--text3)' }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {/* Image */}
          {showImage && (
            <div className="w-full h-[200px] md:h-[260px] overflow-hidden border-b" style={{ borderColor: 'var(--border-md)' }}>
              <img src={article.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="px-5 py-5">
            {/* All party badges */}
            {article.party_mentioned && article.party_mentioned.length > 1 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {article.party_mentioned.map((p, i) => <PBadge key={i} party={p} />)}
              </div>
            )}

            {/* Title */}
            <h2 className="text-[22px] md:text-[26px] font-bold font-serif leading-tight mb-4" style={{ color: 'var(--text1)' }}>
              {displayTitle}
            </h2>

            {/* Civic Warning Alert Box */}
            {article.civic_flag && (
              <div 
                className="mb-5 p-4 rounded-sm border flex gap-3 text-[13px] font-sans leading-relaxed"
                style={{ 
                  background: 'rgba(176, 40, 40, 0.05)', 
                  borderColor: 'rgba(176, 40, 40, 0.3)', 
                  color: '#B02828' 
                }}
              >
                <span className="text-[20px] leading-none flex-shrink-0">⚑</span>
                <div>
                  <div className="font-mono text-[10px] font-bold tracking-widest uppercase mb-1">
                    Urgent Civic Alert: {article.civic_flag_category?.replace(/_/g, ' ')}
                  </div>
                  <p className="font-semibold">
                    {article.civic_flag_reason || 'This article reports an incident flagged for systemic civic concern or institutional abuse of power.'}
                  </p>
                </div>
              </div>
            )}

            {/* Summary */}
            {article.rephrased_article && (
              <p className="text-[14px] leading-relaxed border-l-2 pl-4 mb-5" style={{ color: 'var(--text2)', borderColor: 'var(--accent)' }}>
                {renderMarkdown(article.rephrased_article)}
              </p>
            )}

            {/* Original Full Text — lazy loaded */}
            {contentLoading && (
              <div className="mb-5 border border-[var(--border-md)] rounded-sm p-4 bg-[var(--bg)]">
                <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--text3)' }}>
                  Loading Original Article…
                </div>
                <div className="space-y-2">
                  <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-alt)', width: '100%' }} />
                  <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-alt)', width: '92%' }} />
                  <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-alt)', width: '85%' }} />
                </div>
              </div>
            )}
            {fullContent && (
              <div className="mb-5 border border-[var(--border-md)] rounded-sm bg-[var(--bg)] overflow-hidden">
                <button
                  onClick={() => setContentExpanded(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--bg-alt)]"
                >
                  <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text3)' }}>
                    Original Full Article
                  </span>
                  <span className="text-[11px] font-mono transition-transform" style={{ color: 'var(--text3)', transform: contentExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </button>
                {contentExpanded && (
                  <div className="px-4 pb-4">
                    <div 
                      className="text-[12.5px] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-line font-sans"
                      style={{ color: 'var(--text2)' }}
                    >
                      {fullContent}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Topic tags — tappable */}
            {article.topic_tags && article.topic_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.topic_tags.map((tag, i) => (
                  <Link
                    key={i}
                    href={`/topic/${slugify(tag)}`}
                    onClick={onClose}
                    className="text-[9px] font-mono tracking-widest uppercase border rounded-[2px] px-[6px] py-[2px] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                    style={{ color: 'var(--text3)', borderColor: 'var(--border-md)' }}
                  >
                    {TOPIC_LABELS[tag] ?? tag.replace(/_/g, ' ')}
                  </Link>
                ))}
              </div>
            )}

            {/* Ministers — tappable */}
            {article.ministers_mentioned && article.ministers_mentioned.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>Ministers:</span>
                {article.ministers_mentioned.map((m, i) => (
                  <TappableMinister key={i} name={m} />
                ))}
              </div>
            )}

            {/* States — tappable */}
            {article.states_mentioned && article.states_mentioned.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>States:</span>
                {article.states_mentioned.map((s, i) => (
                  <TappableState key={i} name={s} />
                ))}
              </div>
            )}

            {/* Source + original link + archive link + search fallback + supporting quote */}
            <div className="pt-4 border-t mb-6 space-y-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {article.source && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[var(--text3)]">
                    <SrcTag label={article.source} />
                  </div>
                )}
                
                {article.url && (
                  <div className="text-[10px] font-mono flex items-center gap-1">
                    <span>Source:</span>
                    {article.url_status === 'dead' ? (
                      <span className="line-through opacity-60">original link</span>
                    ) : (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="hover:underline hover:text-[var(--accent)] transition-colors inline-flex items-center gap-0.5"
                        style={{ color: 'var(--accent)' }}
                      >
                        original link ↗
                      </a>
                    )}
                  </div>
                )}
              </div>

              {article.archived_url && (
                <div className="text-[10px] font-mono flex items-center gap-1.5 flex-wrap text-[var(--text3)]">
                  <span>
                    Archived copy — {article.archive_source || 'unknown'}
                    {(() => {
                      const m = article.archived_url.match(/\/web\/(\d{4})(\d{2})(\d{2})\d{6}\//);
                      return m ? `, captured ${m[1]}-${m[2]}-${m[3]}` : '';
                    })()}
                    :
                  </span>
                  <a
                    href={article.archived_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="hover:underline hover:text-[var(--accent)] transition-colors"
                    style={{ color: 'var(--accent)' }}
                  >
                    View Archive ↗
                  </a>
                </div>
              )}

              {article.url_status === 'dead' && article.search_fallback_url && (
                <div className="text-[10px] font-mono flex items-center gap-1.5 flex-wrap text-[var(--text3)]">
                  <span>Original link unavailable —</span>
                  <a
                    href={article.search_fallback_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="hover:underline hover:text-[var(--accent)] transition-colors font-bold"
                    style={{ color: 'var(--accent)' }}
                  >
                    search for this article ↗
                  </a>
                </div>
              )}

              {article.supporting_quote && (
                <blockquote
                  className="mt-3 pl-4 border-l-2 text-[12px] italic leading-relaxed bg-[var(--bg-alt)] py-2 pr-3 rounded-sm"
                  style={{ borderColor: 'var(--border-hi)', color: 'var(--text2)' }}
                >
                  &ldquo;{article.supporting_quote}&rdquo;
                  <span className="block not-italic text-[9px] font-mono mt-1" style={{ color: 'var(--text3)' }}>
                    — verbatim from the source
                  </span>
                </blockquote>
              )}
            </div>

            {/* ── DIG DEEPER ── */}
            <div className="border-t pt-4" style={{ borderColor: 'var(--border-md)' }}>
              <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--text3)' }}>
                Dig Deeper
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>

                {/* Party dashboards */}
                {article.party_mentioned?.map((party, i) => (
                  <DigRow
                    key={`party-${i}`}
                    label={`About ${party}`}
                    href={`/party/${partySlugify(party)}`}
                    onClose={onClose}
                  />
                ))}

                {/* Minister profiles */}
                {article.ministers_mentioned?.map((name, i) => (
                  <DigRow
                    key={`min-${i}`}
                    label={`About ${name}`}
                    href={`/minister/${slugify(name)}`}
                    onClose={onClose}
                  />
                ))}

                {/* State pages */}
                {article.states_mentioned?.map((state, i) => (
                  <DigRow
                    key={`state-${i}`}
                    label={`News from ${state}`}
                    href={`/state/${slugify(state)}`}
                    onClose={onClose}
                  />
                ))}

                {/* Topic feeds */}
                {article.topic_tags?.slice(0, 2).map((tag, i) => (
                  <DigRow
                    key={`topic-${i}`}
                    label={`More on ${TOPIC_LABELS[tag] ?? tag.replace(/_/g, ' ')}`}
                    href={`/topic/${slugify(tag)}`}
                    onClose={onClose}
                  />
                ))}

                {/* Source feed — always show */}
                {article.source && (
                  <DigRow
                    label={`More from ${article.source}`}
                    href={`/source/${slugify(article.source)}`}
                    onClose={onClose}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DigRow({ label, href, onClose }: { label: string; href: string; onClose: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center justify-between py-3 transition-colors group"
    >
      <span
        className="text-[13px] font-sans group-hover:text-[var(--accent)] transition-colors"
        style={{ color: 'var(--text1)' }}
      >
        {label}
      </span>
      <span className="text-[14px] ml-2" style={{ color: 'var(--text3)' }}>→</span>
    </Link>
  )
}
