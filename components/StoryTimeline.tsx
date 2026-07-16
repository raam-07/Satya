import Link from 'next/link'
import type { EventMilestone } from '@/lib/api'
import { cleanTitle } from '@/lib/utils'
import { epochToDate } from '@/lib/eventUtils'

interface StoryTimelineProps {
  milestones: EventMilestone[]
  currentArticleId?: number
  linkArticles?: boolean
  /** Full-page reading mode (event page): date blocks, start/latest markers,
   *  "N weeks later" gap dividers, end cap. Compact contexts leave this off. */
  storyMode?: boolean
  /** Only meaningful with storyMode: whether the story is still open. */
  ongoing?: boolean
}

function gapLabel(prevTs?: number, ts?: number): string | null {
  if (!prevTs || !ts) return null
  const days = Math.floor((ts - prevTs) / 86400)
  if (days < 14) return null
  if (days < 60) return `${Math.round(days / 7)} weeks later`
  return `${Math.round(days / 30)} months later`
}

function DateBlock({ ts, accent }: { ts?: number; accent?: boolean }) {
  if (!ts) return <div style={{ width: 34 }} />
  const d = new Date(ts * 1000)
  return (
    <div className="flex flex-col items-center flex-shrink-0 pt-[2px]" style={{ width: 34 }}>
      <span className="text-[15px] font-black font-mono leading-none" style={{ color: accent ? 'var(--accent)' : 'var(--text1)' }}>
        {d.getDate()}
      </span>
      <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
        {d.toLocaleDateString('en-IN', { month: 'short' })}
      </span>
    </div>
  )
}

export function StoryTimeline({ milestones, currentArticleId, linkArticles = true, storyMode = false, ongoing = false }: StoryTimelineProps) {
  if (!milestones.length) return null

  let lastYear: number | null = null

  return (
    <div>
      {milestones.map((m, i) => {
        const isCurrent = currentArticleId != null && m.article_id === currentArticleId
        const isLast = i === milestones.length - 1
        const isFirst = i === 0
        const isLatest = storyMode && isLast
        const text = cleanTitle(m.milestone)

        // Year divider + long-gap divider (story mode only)
        const year = m.event_date ? new Date(m.event_date * 1000).getFullYear() : null
        const showYear = storyMode && year !== null && year !== lastYear && lastYear !== null
        if (year !== null) lastYear = year
        const gap = storyMode && i > 0 ? gapLabel(milestones[i - 1].event_date, m.event_date) : null

        const body = (
          <div className={storyMode ? 'pb-6' : 'pb-5'}>
            <p
              className="text-[10px] font-mono tracking-wider"
              style={{ color: isCurrent || isLatest ? 'var(--accent)' : 'var(--text3)' }}
            >
              {!storyMode && epochToDate(m.event_date).toUpperCase()}
              {isFirst && storyMode && 'STORY BEGINS'}
              {isLatest && !isFirst && 'LATEST UPDATE'}
              {isCurrent && ' · THIS STORY'}
              {m.source && <span className="normal-case"> {storyMode && !isFirst && !isLatest ? '' : '— '}{m.source}</span>}
            </p>
            {linkArticles && !isCurrent ? (
              // Linked milestone: full-strength text with a warm accent
              // underline + arrow — reads as important and tappable, not faded.
              <p
                className={`text-[13px] md:text-[13.5px] leading-relaxed mt-0.5 ${isLatest ? 'font-semibold' : ''} underline underline-offset-4 decoration-[1.5px] transition-colors group-hover:text-[var(--accent)]`}
                style={{ color: 'var(--text1)', textDecorationColor: 'rgba(191,74,7,0.35)' }}
              >
                {text}
                <span
                  className="ml-1.5 text-[10px] font-mono font-bold transition-opacity opacity-70 group-hover:opacity-100"
                  style={{ color: 'var(--accent)' }}
                  aria-hidden
                >
                  READ ↗
                </span>
              </p>
            ) : (
              <p
                className={`text-[13px] md:text-[13.5px] leading-relaxed mt-0.5 ${isCurrent || isLatest ? 'font-semibold' : ''}`}
                style={{ color: isCurrent || isLatest ? 'var(--text1)' : 'var(--text2)' }}
              >
                {text}
              </p>
            )}
          </div>
        )

        const row = (
          <div className="flex gap-3">
            {storyMode && <DateBlock ts={m.event_date} accent={isLatest} />}

            {/* Rail */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 12 }}>
              <div
                className="rounded-full flex-shrink-0 mt-[5px]"
                style={{
                  width: isCurrent || isLatest ? 9 : 7,
                  height: isCurrent || isLatest ? 9 : 7,
                  background: isCurrent || isLatest ? 'var(--accent)' : 'var(--text3)',
                  boxShadow: isCurrent || isLatest ? '0 0 0 3px rgba(191,74,7,0.15)' : undefined,
                }}
              />
              {(!isLast || (storyMode && ongoing)) && (
                <div className="w-px flex-1" style={{ background: 'var(--border-md)' }} />
              )}
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

        return (
          <div key={`${m.article_id}-${i}`}>
            {(gap || showYear) && (
              <div className="flex items-center gap-3 mb-4" style={{ paddingLeft: storyMode ? 46 : 0 }}>
                <div className="h-px flex-1 max-w-[60px]" style={{ background: 'var(--border-md)' }} />
                <span className="text-[9px] font-mono tracking-[0.15em] uppercase" style={{ color: 'var(--text3)' }}>
                  {showYear ? `${year}` : ''}{showYear && gap ? ' · ' : ''}{gap ?? ''}
                </span>
                <div className="h-px flex-1 max-w-[60px]" style={{ background: 'var(--border-md)' }} />
              </div>
            )}
            {row}
          </div>
        )
      })}

      {/* End cap (story mode) */}
      {storyMode && (
        <div className="flex gap-3">
          <div style={{ width: 34 }} />
          <div className="flex flex-col items-center flex-shrink-0" style={{ width: 12 }}>
            {ongoing ? (
              <div className="rounded-full mt-[3px] animate-pulse" style={{ width: 7, height: 7, border: '2px solid var(--accent)' }} />
            ) : (
              <div className="mt-[5px]" style={{ width: 7, height: 2, background: 'var(--text3)' }} />
            )}
          </div>
          <p className="text-[10px] font-mono tracking-widest uppercase pb-2" style={{ color: ongoing ? 'var(--accent)' : 'var(--text3)' }}>
            {ongoing ? 'Awaiting next development' : 'Story concluded'}
          </p>
        </div>
      )}
    </div>
  )
}
