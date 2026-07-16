import { api } from '@/lib/api'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cleanTitle, formatDate, categoryLabel, renderMarkdown, hasImage } from '@/lib/utils'
import { PBadge, SentimentDot, TappableMinister, TappableState } from '@/components/SrcTag'
import { EventStorySoFar } from '@/components/EventStorySoFar'
import { SummaryMark } from '@/components/BrandMark'

export const revalidate = false

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const idNum = Number(params.id)
  if (isNaN(idNum)) return { robots: { index: false } }

  const article = await api.article(idNum).catch(() => null)
  if (!article) return { robots: { index: false } }

  const title = `${cleanTitle(article.rephrased_title ?? article.title)} — SatyaDheesh`
  const description = article.supporting_quote || article.title
  // Always use OUR generated card for social shares: publisher image URLs are
  // often generic logo placeholders (e.g. thehindu.com/theme/images/og-image.png)
  // and frequently block hotlinking — either way the share card looks broken.
  const image = `https://satyadheesh.in/news/${article.id}/opengraph-image`

  return {
    title,
    description,
    robots: {
      index: false,
      follow: true
    },
    alternates: {
      canonical: `https://satyadheesh.in/news/${article.id}`
    },
    openGraph: {
      title,
      description,
      url: `https://satyadheesh.in/news/${article.id}`,
      type: 'article',
      images: [image]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image]
    }
  }
}

export default async function NewsArticlePage({ params }: PageProps) {
  const idNum = Number(params.id)
  if (isNaN(idNum)) {
    notFound()
  }

  const article = await api.article(idNum)
  if (!article) {
    notFound()
  }

  // Server-prefetch the article's event timeline so the "story so far" box and
  // its timeline link are in the initial HTML (crawlable internal link).
  const storyEvent = await api.articleEvent(article.id).catch(() => null)

  const displayTitle = cleanTitle(article.rephrased_title ?? article.title ?? '')
  const displayDate  = formatDate(article.scraped_at)
  const displayCat   = categoryLabel(article.category)

  return (
    <div className="md:max-w-2xl md:mx-auto px-4 py-8">
      {/* Back to feed */}
      <div className="mb-6">
        <Link href="/" className="text-[11px] font-mono uppercase tracking-wider text-[var(--text3)] hover:text-[var(--accent)] transition-colors">
          ← Back to Feed
        </Link>
      </div>

      <article className="border rounded-sm bg-[var(--surface)] overflow-hidden" style={{ borderColor: 'var(--border-md)' }}>
        {/* Header meta */}
        <div className="flex items-center gap-2 flex-wrap px-5 py-4 border-b" style={{ borderColor: 'var(--border-md)' }}>
          {article.sentiment && <SentimentDot sentiment={article.sentiment} />}
          {article.party_mentioned?.[0] && <PBadge party={article.party_mentioned[0]} />}
          <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">
            {displayCat}
          </span>
          {displayDate && <span className="text-[10px] font-mono text-[var(--text3)]">· {displayDate}</span>}
        </div>

        {/* Featured image — hasImage() rejects generic publisher placeholders;
            no-referrer dodges hotlink blocking */}
        {hasImage(article.image_url) && (
          <div className="w-full h-[240px] md:h-[320px] overflow-hidden border-b" style={{ borderColor: 'var(--border-md)' }}>
            <img src={article.image_url} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6">
          {/* All party badges if multiple */}
          {article.party_mentioned && article.party_mentioned.length > 1 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {article.party_mentioned.map((p, i) => <PBadge key={i} party={p} />)}
            </div>
          )}

          {/* Title */}
          <h1 className="text-[24px] md:text-[30px] font-bold font-serif leading-tight mb-5 text-[var(--text1)]">
            {displayTitle}
          </h1>

          {/* Civic Warning Alert Box */}
          {article.civic_flag && (
            <div 
              className="mb-6 p-4 rounded-sm border flex gap-3 text-[13px] font-sans leading-relaxed"
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
            <div className="mb-5">
              <p className="text-[14px] leading-relaxed border-l-2 pl-4 font-sans" style={{ color: 'var(--text2)', borderColor: 'var(--accent)' }}>
                {renderMarkdown(article.rephrased_article)}
              </p>
              <SummaryMark />
            </div>
          )}

          {/* Story so far — event timeline (server-rendered for SEO) */}
          <EventStorySoFar articleId={article.id} initialEvent={storyEvent} />

          {/* Verbatim excerpt — shown only when we actually have one; no
              internal placeholder text for readers when we don't */}
          {article.supporting_quote && (
            <blockquote
              className="my-6 pl-4 border-l-2 text-[13.5px] italic leading-relaxed bg-[var(--bg-alt)] py-3 pr-4 rounded-sm font-sans"
              style={{ borderColor: 'var(--accent)', color: 'var(--text1)' }}
            >
              &ldquo;{article.supporting_quote}&rdquo;
              <span className="block not-italic text-[10px] font-mono mt-2" style={{ color: 'var(--text3)' }}>
                — verbatim excerpt from {article.source || 'the publisher'}
              </span>
            </blockquote>
          )}

          {/* Mentioned Entities (Topics, Netas, States) */}
          <div className="border-t pt-5 mt-6 space-y-4" style={{ borderColor: 'var(--border-md)' }}>
            {article.topic_tags && article.topic_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">Topics:</span>
                {article.topic_tags.map((tag, i) => (
                  <Link
                    key={i}
                    href={`/topic/${tag}`}
                    className="text-[9px] font-mono tracking-widest uppercase border rounded-[2px] px-[6px] py-[2px] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-[var(--text3)]"
                    style={{ borderColor: 'var(--border-md)' }}
                  >
                    {tag.replace(/_/g, ' ')}
                  </Link>
                ))}
              </div>
            )}

            {article.ministers_mentioned && article.ministers_mentioned.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">Ministers:</span>
                {article.ministers_mentioned.map((m, i) => (
                  <TappableMinister key={i} name={m} />
                ))}
              </div>
            )}

            {article.states_mentioned && article.states_mentioned.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">States:</span>
                {article.states_mentioned.map((s, i) => (
                  <TappableState key={i} name={s} />
                ))}
              </div>
            )}
          </div>

          {/* Call-to-action full article links */}
          <div className="border-t pt-6 mt-6 space-y-4" style={{ borderColor: 'var(--border-md)' }}>
            <div className="bg-[var(--bg-alt)] border p-4 rounded-sm" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase block mb-1">
                Full Coverage
              </span>
              <p className="text-[12.5px] text-[var(--text2)] leading-relaxed mb-3">
                To respect publishing rights, SatyaDheesh does not host full copyrighted news copy. You can read the complete article on the publisher's platform:
              </p>
              
              <div className="flex flex-wrap gap-4 items-center justify-between text-[11px] font-mono">
                {article.url && (
                  article.url_status === 'dead' ? (
                    <span className="line-through text-[var(--text3)]">Original article link is inactive</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline transition-colors font-bold text-[var(--accent)]"
                      >
                        Read full article at {article.source || 'original publisher'} ↗
                      </a>
                    </div>
                  )
                )}

                {article.archived_url && (
                  <a
                    href={article.archived_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-[var(--accent)]"
                  >
                    View archived copy ({article.archive_source || 'Wayback'}) ↗
                  </a>
                )}
              </div>
            </div>

            {article.url_status === 'dead' && article.search_fallback_url && (
              <div className="text-[10px] font-mono text-[var(--text3)]">
                Original link inactive? search for the headline on Google: 
                <a
                  href={article.search_fallback_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 hover:underline text-[var(--accent)] font-bold"
                >
                  Search Fallback ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}
