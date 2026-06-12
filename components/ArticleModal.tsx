'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Article } from '@/lib/api'
import { cleanTitle, formatDate, categoryLabel, hasImage, renderMarkdown, slugify, partySlugify } from '@/lib/utils'
import { PBadge, SentimentDot, SrcTag, TappableMinister, TappableState } from './SrcTag'

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

  useEffect(() => {
    if (article) document.body.style.overflow = 'hidden'
    else         document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [article])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!article) return null

  const displayTitle = cleanTitle(article.title ?? '')
  const displayDate  = formatDate(article.scraped_at)
  const displayCat   = categoryLabel(article.category)
  const showImage    = hasImage(article.image_url)
  const tabId        = CATEGORY_TO_TAB[article.category?.toLowerCase() ?? '']

  const navigateTo = (href: string) => { onClose(); router.push(href) }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(26,26,26,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
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
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-md)' }}>
          <div className="flex items-center gap-2 flex-wrap">
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
          <button
            onClick={onClose}
            className="text-[22px] leading-none w-8 h-8 flex items-center justify-center transition-colors"
            style={{ color: 'var(--text3)' }}
          >
            ×
          </button>
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
            <h2 className="text-[22px] md:text-[26px] font-black font-serif leading-tight mb-4" style={{ color: 'var(--text1)' }}>
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

            {/* Original Full Text */}
            {article.content && (
              <div className="mb-5 border border-[var(--border-md)] rounded-sm p-4 bg-[var(--bg)]">
                <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--text3)' }}>
                  Original Full Article
                </div>
                <div 
                  className="text-[12.5px] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-line font-sans"
                  style={{ color: 'var(--text2)' }}
                >
                  {article.content}
                </div>
              </div>
            )}

            {/* Topic tags — tappable */}
            {article.topic_tags && article.topic_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.topic_tags.map((tag, i) => (
                  <Link
                    key={i}
                    href={`/topic/${encodeURIComponent(tag)}`}
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

            {/* Source + original link */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t mb-6" style={{ borderColor: 'var(--border)' }}>
              {article.source && <SrcTag label={article.source} />}
              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] font-mono transition-colors hover:underline"
                  style={{ color: 'var(--text3)' }}
                >
                  View original source
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 8L8 2M8 2H4M8 2V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
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
                    href={`/topic/${encodeURIComponent(tag)}`}
                    onClose={onClose}
                  />
                ))}

                {/* Source feed — always show */}
                {article.source && (
                  <DigRow
                    label={`More from ${article.source}`}
                    href={`/source/${encodeURIComponent(article.source)}`}
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
