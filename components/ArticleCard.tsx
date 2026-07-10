'use client'
import type { Article } from '@/lib/api'
import { SrcTag, PBadge, SentimentDot } from './SrcTag'
import { cleanTitle, formatDate, categoryLabel, hasImage, renderMarkdown } from '@/lib/utils'

// Category placeholder when no image — colored div with initial letter
const CAT_PLACEHOLDER: Record<string, { initial: string; bg: string; text: string }> = {
  politics:      { initial: 'G', bg: '#FFF3E0', text: '#BF4A07' },
  governance:    { initial: 'G', bg: '#FFF3E0', text: '#BF4A07' },
  crime:         { initial: 'J', bg: '#FEF2F2', text: '#B02828' },
  justice:       { initial: 'J', bg: '#FEF2F2', text: '#B02828' },
  economy:       { initial: 'E', bg: '#F0FDF4', text: '#1B7050' },
  international: { initial: 'W', bg: '#EFF6FF', text: '#1D4ED8' },
  world:         { initial: 'W', bg: '#EFF6FF', text: '#1D4ED8' },
  health:        { initial: 'H', bg: '#F5F3FF', text: '#7C3AED' },
  farmers:       { initial: 'F', bg: '#FFFDE7', text: '#92400E' },
  corruption:    { initial: 'C', bg: '#FEF2F2', text: '#B91C1C' },
  environment:   { initial: 'E', bg: '#F0FDF4', text: '#14532d' },
  education:     { initial: 'E', bg: '#EFF6FF', text: '#1D4ED8' },
}
const DEFAULT_PLACEHOLDER = { initial: '·', bg: '#F3F4F6', text: '#888888' }

function CategoryPlaceholder({ category, size = 'sm' }: { category?: string; size?: 'sm' | 'lg' }) {
  const p = CAT_PLACEHOLDER[category?.toLowerCase() ?? ''] ?? DEFAULT_PLACEHOLDER
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: p.bg }}
    >
      <span
        className="font-black font-serif"
        style={{ color: p.text, fontSize: size === 'lg' ? 48 : 28, opacity: 0.5 }}
      >
        {p.initial}
      </span>
    </div>
  )
}

interface ArticleCardProps {
  article: Article
  variant?: 'default' | 'featured'
  onOpen?: (article: Article) => void
  clampSummary?: boolean
}

export function ArticleCard({ article, variant = 'default', onOpen, clampSummary = true }: ArticleCardProps) {
  const {
    title, rephrased_title, rephrased_article, source,
    image_url, sentiment, party_mentioned,
    category, scraped_at, civic_flag,
    civic_flag_category, civic_flag_reason,
  } = article


  const firstParty      = party_mentioned?.[0]
  const displayTitle    = cleanTitle(rephrased_title ?? title ?? '')
  const displayCategory = categoryLabel(category)
  const displayDate     = formatDate(scraped_at)
  const showImage       = hasImage(image_url)

  const handleClick = (e: React.SyntheticEvent) => {
    e.preventDefault()
    onOpen?.(article)
  }

  // ── TOP STORY (featured) variant ──────────────────────────────────────────
  if (variant === 'featured') {
    return (
      <button
        onClick={handleClick}
        className="w-full text-left block border rounded-sm overflow-hidden transition-colors group bg-[var(--surface)] hover:border-[var(--accent)]"
        style={{ 
          borderColor: 'var(--border-md)',
          borderLeft: civic_flag ? '4px solid #B02828' : undefined
        }}
      >
        {/* Image or placeholder */}
        <div className="h-48 sm:h-64 overflow-hidden border-b" style={{ borderColor: 'var(--border-md)' }}>
          {showImage
            ? <img src={image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <CategoryPlaceholder category={category} size="lg" />
          }
        </div>

        <div className="p-5">
          {/* Meta row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {sentiment && <SentimentDot sentiment={sentiment} />}
            {firstParty && <PBadge party={firstParty} />}
            <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
              {displayCategory}{displayDate && ` · ${displayDate}`}
            </span>
            <span
              className="ml-auto text-[9px] font-mono tracking-widest uppercase rounded-[2px] px-[5px] py-[1px]"
              style={{ 
                color: civic_flag ? '#B02828' : 'var(--accent)', 
                border: civic_flag ? '1px solid rgba(176,40,40,0.3)' : '1px solid rgba(191,74,7,0.3)',
                background: civic_flag ? 'rgba(176,40,40,0.03)' : undefined
              }}
            >
              {civic_flag ? '⚑ CIVIC ALERT' : 'TOP STORY'}
            </span>
          </div>

          {/* Civic Warning Box */}
          {civic_flag && (
            <div 
              className="mb-3 px-3 py-2 rounded-sm border flex items-start gap-2 text-[11px] font-mono font-medium leading-relaxed"
              style={{ 
                background: 'rgba(176, 40, 40, 0.04)', 
                borderColor: 'rgba(176, 40, 40, 0.2)', 
                color: '#B02828' 
              }}
            >
              <span className="font-bold flex-shrink-0 mt-0.5">⚠️ ALERT:</span>
              <span>
                <strong className="uppercase">{civic_flag_category?.replace(/_/g, ' ')}</strong>
                {civic_flag_reason && ` — ${civic_flag_reason}`}
              </span>
            </div>
          )}

          {/* Headline */}
          <h3 className="text-[20px] sm:text-[24px] font-bold leading-tight font-serif mb-3" style={{ color: 'var(--text1)' }}>
            {displayTitle}
          </h3>

          {/* Summary only on featured */}
          {rephrased_article && (
            <p 
              className={`text-[14px] leading-relaxed font-sans mb-4 ${clampSummary ? 'line-clamp-3' : ''}`} 
              style={{ color: 'var(--text2)' }}
            >
              {renderMarkdown(rephrased_article)}
            </p>
          )}

          {source && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[var(--text3)]">
              <SrcTag label={source} />
            </div>
          )}
        </div>
      </button>
    )
  }

  // ── STANDARD card — headline + tags + source ──────────────────────────────
  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick(e as any) }}
      className="w-full text-left flex gap-3 py-4 px-4 border-b hover:bg-[var(--bg-alt)] transition-colors group bg-[var(--surface)] cursor-pointer"
      style={{ 
        borderColor: 'var(--border)',
        borderLeft: civic_flag ? '3px solid #B02828' : undefined
      }}
    >
      {/* Text content */}
      <div className="flex-1 min-w-0">
        {/* Meta chips */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {sentiment && <SentimentDot sentiment={sentiment} />}
          {firstParty && <PBadge party={firstParty} />}
          <span
            className="text-[9px] font-mono tracking-widest uppercase"
            style={{ color: civic_flag ? '#B02828' : 'var(--accent)' }}
          >
            {displayCategory}
          </span>
          {displayDate && (
            <span className="text-[9px] font-mono" style={{ color: 'var(--text3)' }}>· {displayDate}</span>
          )}
        </div>

        {/* Civic Alert Line */}
        {civic_flag && (
          <div 
            className="mb-2 px-2 py-1 rounded-[2px] border inline-flex items-center gap-1.5 text-[9px] font-mono font-bold leading-none"
            style={{ 
              background: 'rgba(176, 40, 40, 0.04)', 
              borderColor: 'rgba(176, 40, 40, 0.2)', 
              color: '#B02828' 
            }}
          >
            <span>⚑ ALERT: {civic_flag_category?.replace(/_/g, ' ').toUpperCase()}</span>
            {civic_flag_reason && <span className="font-medium opacity-85 line-clamp-1">· {civic_flag_reason}</span>}
          </div>
        )}

        {/* Headline */}
        <h3
          className="text-[15px] font-bold leading-snug font-serif mb-1.5 line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
          style={{ color: 'var(--text1)' }}
        >
          {displayTitle}
        </h3>

        {/* Summary */}
        {rephrased_article && (
          <p 
            className={`text-[12px] leading-relaxed mb-2 ${clampSummary ? 'line-clamp-2' : ''}`} 
            style={{ color: 'var(--text2)' }}
          >
            {renderMarkdown(rephrased_article)}
          </p>
        )}

        {source && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[var(--text3)]">
            <SrcTag label={source} />
          </div>
        )}
      </div>

      {/* Thumbnail or placeholder */}
      <div
        className="flex-shrink-0 w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] overflow-hidden rounded-sm border"
        style={{ borderColor: 'var(--border-md)' }}
      >
        {showImage
          ? <img src={image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <CategoryPlaceholder category={category} size="sm" />
        }
      </div>
    </div>
  )
}
