'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, type EventTimeline } from '@/lib/api'
import { StoryTimeline } from './StoryTimeline'

interface Props {
  articleId: number
  /** Server-prefetched event. When provided (news pages), the timeline link is
   *  rendered into the initial HTML — crawlable internal link, no client fetch.
   *  When omitted (client contexts like ArticleModal), falls back to fetching. */
  initialEvent?: EventTimeline | null
}

export function EventStorySoFar({ articleId, initialEvent }: Props) {
  const prefetched = initialEvent !== undefined
  const [event, setEvent] = useState<EventTimeline | null>(
    prefetched && initialEvent && (initialEvent.milestones?.length ?? 0) >= 2 ? initialEvent : null
  )

  useEffect(() => {
    if (prefetched) return
    let cancelled = false
    setEvent(null)
    api.articleEvent(articleId).then(ev => {
      if (!cancelled && ev && ev.milestones?.length >= 2) setEvent(ev)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [articleId, prefetched])

  if (!event) return null

  const recent = event.milestones.slice(-3)
  const earlier = event.milestones.length - recent.length
  const ongoing = event.state === 'open'

  return (
    <div className="mb-5 border rounded-sm bg-[var(--surface)] overflow-hidden" style={{ borderColor: 'var(--border-md)' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-[var(--text3)]">
          The story so far
        </span>
        <span className="text-[10px] font-mono text-[var(--accent)]">
          {event.article_count} updates{ongoing ? ' · ongoing' : ''}
        </span>
      </div>

      <div className="px-4 pt-4 pb-1">
        <StoryTimeline milestones={recent} currentArticleId={articleId} linkArticles={false} />
      </div>

      <Link
        href={`/event/${event.slug || event.id}`}
        className="flex items-center justify-between px-4 py-2.5 border-t transition-colors hover:bg-[var(--bg-alt)]"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-[10px] font-mono text-[var(--text2)]">
          {earlier > 0 ? `+ ${earlier} earlier update${earlier > 1 ? 's' : ''}` : ''}
        </span>
        <span className="text-[10px] font-mono font-semibold text-[var(--accent)]">Full timeline →</span>
      </Link>
    </div>
  )
}
