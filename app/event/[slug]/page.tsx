import { api } from '@/lib/api'
import { StoryTimeline } from '@/components/StoryTimeline'
import { cleanTitle } from '@/lib/utils'
import { epochToDate, eventDaySpan, entityKeyLabel } from '@/lib/eventUtils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 900

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await api.eventTimeline(params.slug)
  if (!event) return { title: 'Timeline not found | SatyaDheesh' }
  const title = cleanTitle(event.title)
  const description =
    event.scope ||
    `${title}: ${event.article_count} updates tracked from ${epochToDate(event.first_seen)} to ${epochToDate(event.last_seen)}.`
  return {
    title: `${title} — Full Timeline | SatyaDheesh`,
    description,
    alternates: {
      canonical: `https://satyadheesh.in/event/${params.slug}`,
    },
    openGraph: {
      title: `${title} — Full Timeline | SatyaDheesh`,
      description,
      url: `https://satyadheesh.in/event/${params.slug}`,
      siteName: 'SatyaDheesh',
      type: 'article',
      publishedTime: new Date(event.first_seen * 1000).toISOString(),
      modifiedTime: new Date(event.last_seen * 1000).toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — Full Timeline | SatyaDheesh`,
      description,
    },
  }
}

export default async function EventPage({ params }: Props) {
  const event = await api.eventTimeline(params.slug)
  if (!event) notFound()

  const ongoing = event.state === 'open'
  const days = eventDaySpan(event)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': cleanTitle(event.title),
    'description': event.scope || `${cleanTitle(event.title)} timeline with ${event.article_count} updates.`,
    'numberOfItems': event.milestones.length,
    'itemListElement': event.milestones.map((m, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'item': {
        '@type': 'NewsArticle',
        'headline': m.milestone ? cleanTitle(m.milestone.length > 80 ? m.milestone.slice(0, 77) + '...' : m.milestone) : cleanTitle(event.title),
        'datePublished': m.event_date ? new Date(m.event_date * 1000).toISOString() : undefined,
        'description': m.milestone ? cleanTitle(m.milestone) : undefined,
        'author': {
          '@type': 'Organization',
          'name': 'SatyaDheesh',
        },
      },
    })),
  }

  return (
    <div className="md:max-w-3xl md:mx-auto">
      <script
        type="application/ld+json"
        // Escape "<" so scraped/LLM text containing "</script>" can never
        // break out of this tag and inject HTML.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/timelines"
            className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase hover:text-[var(--accent)] transition-colors"
          >
            Timelines
          </Link>
          <span className="text-[10px] font-mono text-[var(--text3)]">/</span>
          <span
            className="text-[10px] font-mono tracking-widest uppercase"
            style={{ color: ongoing ? 'var(--green)' : 'var(--text3)' }}
          >
            {ongoing ? '● Ongoing' : 'Concluded'}
          </span>
        </div>

        <h1 className="text-[24px] md:text-[30px] font-bold font-serif leading-tight text-[var(--text1)] mt-2">
          {cleanTitle(event.title)}
        </h1>

        <p className="text-[10px] font-mono text-[var(--text3)] tracking-wider mt-3">
          {event.article_count} UPDATES · {days} DAY{days > 1 ? 'S' : ''} ·{' '}
          {epochToDate(event.first_seen).toUpperCase()} — {epochToDate(event.last_seen).toUpperCase()}
        </p>

        {event.entity_keys.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {event.entity_keys.slice(0, 8).map(key => (
              <span
                key={key}
                className="text-[10px] font-mono px-2 py-0.5 rounded-[3px] text-[var(--text2)]"
                style={{ border: '1px solid var(--border-md)' }}
              >
                {entityKeyLabel(key)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Latest update callout — what a returning reader wants first */}
      {event.milestones.length > 1 && (() => {
        const latest = event.milestones[event.milestones.length - 1]
        return (
          <Link
            href={`/news/${latest.article_id}`}
            className="block border-b px-4 md:px-6 py-4 transition-colors hover:bg-[var(--bg-alt)]"
            style={{ borderColor: 'var(--border-md)', background: 'rgba(191,74,7,0.03)', borderLeft: '3px solid var(--accent)' }}
          >
            <p className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--accent)' }}>
              Latest · {epochToDate(latest.event_date)}
            </p>
            <p className="text-[13.5px] font-medium leading-relaxed mt-1 text-[var(--text1)]">
              {cleanTitle(latest.milestone)}
            </p>
          </Link>
        )
      })()}

      {/* What this timeline covers */}
      {event.scope && (
        <div className="border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border-md)' }}>
          <p className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-[var(--text3)] mb-1">
            What this timeline covers
          </p>
          <p className="text-[12px] text-[var(--text2)] leading-relaxed italic">{event.scope}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="px-4 md:px-6 py-6">
        <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase mb-5 text-[var(--text3)]">
          The full story, from the beginning
        </div>
        <StoryTimeline milestones={event.milestones} storyMode ongoing={ongoing} />
      </div>
    </div>
  )
}
