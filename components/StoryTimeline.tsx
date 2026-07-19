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

function isSameDay(ts1?: number, ts2?: number): boolean {
  if (!ts1 || !ts2) return false
  const d1 = new Date(ts1 * 1000)
  const d2 = new Date(ts2 * 1000)
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
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

  // Pre-process milestones with their original global index
  const processedMilestones = milestones.map((m, index) => ({
    m,
    globalIndex: index,
    isCurrent: currentArticleId != null && m.article_id === currentArticleId,
    isFirst: index === 0,
    isLast: index === milestones.length - 1,
    isLatest: storyMode && index === milestones.length - 1,
    text: cleanTitle(m.milestone)
  }))

  // Group adjacent milestones that occur on the same calendar day
  const groups: {
    event_date: number
    items: typeof processedMilestones
  }[] = []

  processedMilestones.forEach((item) => {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && isSameDay(lastGroup.event_date, item.m.event_date)) {
      lastGroup.items.push(item)
    } else {
      groups.push({
        event_date: item.m.event_date,
        items: [item],
      })
    }
  })

  let lastYear: number | null = null

  return (
    <div>
      {groups.map((group, groupIdx) => {
        const isGroupLast = groupIdx === groups.length - 1
        const hasCurrent = group.items.some(item => item.isCurrent)
        const hasLatest = group.items.some(item => item.isLatest)

        const dotAccent = hasCurrent || hasLatest
        
        // Year divider + long-gap divider (story mode only)
        const year = group.event_date ? new Date(group.event_date * 1000).getFullYear() : null
        const showYear = storyMode && year !== null && year !== lastYear && lastYear !== null
        if (year !== null) lastYear = year
        const gap = storyMode && groupIdx > 0 ? gapLabel(groups[groupIdx - 1].event_date, group.event_date) : null

        const row = (
          <div
            className={`flex gap-3 ${hasLatest ? 'rounded-md px-3 pt-3 -mx-3' : ''}`}
            style={hasLatest ? { background: 'rgba(191,74,7,0.06)' } : undefined}
          >
            {storyMode && <DateBlock ts={group.event_date} accent={hasLatest} />}

            {/* Rail */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 12 }}>
              <div
                className="rounded-full flex-shrink-0 mt-[5px]"
                style={{
                  width: dotAccent ? 9 : 7,
                  height: dotAccent ? 9 : 7,
                  background: dotAccent ? 'var(--accent)' : 'var(--text3)',
                  boxShadow: dotAccent ? '0 0 0 3px rgba(191,74,7,0.15)' : undefined,
                }}
              />
              {(!isGroupLast || (storyMode && ongoing)) && (
                <div className="w-px flex-1" style={{ background: 'var(--border-md)' }} />
              )}
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Date Header for non-storyMode (printed once per group) */}
              {!storyMode && (
                <p className="text-[10px] font-mono tracking-wider mb-1" style={{ color: dotAccent ? 'var(--accent)' : 'var(--text3)' }}>
                  {epochToDate(group.event_date).toUpperCase()}
                </p>
              )}

              {/* Sub-feed of same-day milestones */}
              <div 
                className={`flex flex-col space-y-4 ${group.items.length > 1 ? 'border-l pl-3 ml-1' : ''}`}
                style={group.items.length > 1 ? { borderColor: 'var(--border-md)' } : undefined}
              >
                {group.items.map((item) => {
                  const { m, isCurrent, isFirst, isLatest, text } = item

                  const body = (
                    <div className="group/item">
                      <p
                        className="text-[10px] font-mono tracking-wider flex items-center gap-1.5"
                        style={{ color: isCurrent || isLatest ? 'var(--accent)' : 'var(--text3)' }}
                      >
                        {isFirst && storyMode && 'STORY BEGINS'}
                        {isLatest && !isFirst && 'LATEST UPDATE'}
                        {isCurrent && ' · THIS STORY'}
                        {m.source && <span className="normal-case"> {storyMode && !isFirst && !isLatest ? '' : '— '}{m.source}</span>}
                      </p>
                      {linkArticles && !isCurrent ? (
                        <p
                          className={`text-[13px] md:text-[13.5px] leading-relaxed mt-0.5 ${isLatest ? 'font-semibold' : ''} underline underline-offset-4 decoration-[1.5px] transition-colors group-hover/item:text-[var(--accent)]`}
                          style={{ color: 'var(--text1)', textDecorationColor: 'rgba(191,74,7,0.35)' }}
                        >
                          {text}
                          <span
                            className="ml-1.5 text-[11px] font-mono font-bold transition-opacity opacity-70 group-hover/item:opacity-100"
                            style={{ color: 'var(--accent)' }}
                            aria-hidden
                          >
                            ↗
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

                  return (
                    <div key={m.article_id} className="relative">
                      {linkArticles && !isCurrent ? (
                        <Link href={`/news/${m.article_id}`} className="block">
                          {body}
                        </Link>
                      ) : (
                        <div>{body}</div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Spacing spacer between day rows */}
              <div className={storyMode ? 'pb-6' : 'pb-5'} />
            </div>
          </div>
        )

        return (
          <div key={`${group.event_date}-${groupIdx}`}>
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
