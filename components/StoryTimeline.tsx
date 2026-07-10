import Link from 'next/link'
import type { EventMilestone } from '@/lib/api'
import { cleanTitle } from '@/lib/utils'
import { epochToDate } from '@/lib/eventUtils'

interface StoryTimelineProps {
  milestones: EventMilestone[]
  currentArticleId?: number
  linkArticles?: boolean
}

export function StoryTimeline({ milestones, currentArticleId, linkArticles = true }: StoryTimelineProps) {
  if (!milestones.length) return null

  return (
    <div>
      {milestones.map((m, i) => {
        const isCurrent = currentArticleId != null && m.article_id === currentArticleId
        const isLast = i === milestones.length - 1
        const text = cleanTitle(m.milestone)

        const body = (
          <div className="pb-5">
            <p
              className="text-[10px] font-mono tracking-wider"
              style={{ color: isCurrent ? 'var(--accent)' : 'var(--text3)' }}
            >
              {epochToDate(m.event_date).toUpperCase()}
              {isCurrent && ' · THIS STORY'}
              {m.source && <span className="normal-case"> — {m.source}</span>}
            </p>
            <p
              className={`text-[13px] leading-relaxed mt-0.5 ${isCurrent ? 'font-semibold' : ''} ${linkArticles && !isCurrent ? 'group-hover:text-[var(--accent)] transition-colors' : ''}`}
              style={{ color: isCurrent ? 'var(--text1)' : 'var(--text2)' }}
            >
              {text}
            </p>
          </div>
        )

        return (
          <div key={`${m.article_id}-${i}`} className="flex gap-3">
            {/* Rail */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 12 }}>
              <div
                className="rounded-full flex-shrink-0 mt-[5px]"
                style={{
                  width: isCurrent ? 9 : 7,
                  height: isCurrent ? 9 : 7,
                  background: isCurrent ? 'var(--accent)' : 'var(--text3)',
                  boxShadow: isCurrent ? '0 0 0 3px rgba(191,74,7,0.15)' : undefined,
                }}
              />
              {!isLast && <div className="w-px flex-1" style={{ background: 'var(--border-md)' }} />}
            </div>

            {/* Content */}
            {linkArticles && !isCurrent ? (
              <Link href={`/news/${m.article_id}`} className="group flex-1 min-w-0">
                {body}
              </Link>
            ) : (
              <div className="flex-1 min-w-0">{body}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
