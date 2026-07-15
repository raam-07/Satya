'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { EventSummary } from '@/lib/api'
import { cleanTitle } from '@/lib/utils'
import { epochToMonYear, eventDaySpan } from '@/lib/eventUtils'

type Filter = 'all' | 'ongoing' | 'concluded' | 'most_updates' | 'longest'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'concluded', label: 'Concluded' },
  { id: 'most_updates', label: 'Most updates' },
  { id: 'longest', label: 'Longest running' },
]

function DotTrack({ ev }: { ev: EventSummary }) {
  const dates = ev.milestone_dates ?? []
  if (dates.length < 2) return null
  const min = dates[0]
  const max = dates[dates.length - 1]
  const span = Math.max(1, max - min)
  const shown = dates.length > 12 ? dates.filter((_, i) => i % Math.ceil(dates.length / 12) === 0 || i === dates.length - 1) : dates

  return (
    <div className="flex items-center gap-2 mt-3">
      <div className="relative flex-1 h-[3px] rounded-full" style={{ background: 'var(--border-md)' }}>
        {shown.map((d, i) => {
          const isLatest = i === shown.length - 1
          const left = `${Math.min(98, ((d - min) / span) * 98)}%`
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left,
                top: isLatest ? -3 : -2,
                width: isLatest ? 9 : 7,
                height: isLatest ? 9 : 7,
                background: isLatest ? 'var(--accent)' : 'var(--text3)',
              }}
            />
          )
        })}
      </div>
      <span className="text-[9px] font-mono flex-shrink-0 text-[var(--text3)]">
        {epochToMonYear(ev.first_seen)}→{epochToMonYear(ev.last_seen)}
      </span>
    </div>
  )
}

export function TimelinesClient({ events }: { events: EventSummary[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  let shown = [...events]
  if (filter === 'ongoing') shown = shown.filter(e => e.state === 'open')
  if (filter === 'concluded') shown = shown.filter(e => e.state === 'closed')
  if (filter === 'most_updates') shown.sort((a, b) => b.article_count - a.article_count)
  if (filter === 'longest') shown.sort((a, b) => eventDaySpan(b) - eventDaySpan(a))

  return (
    <div className="px-4 md:px-6 py-4">
      {/* Coming Soon Hero Banner */}
      <div className="border border-dashed border-[var(--accent)] bg-[rgba(191,74,7,0.03)] rounded p-6 md:p-8 text-center mb-6">
        <span className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase font-bold">Under Development</span>
        <h2 className="text-[18px] md:text-[20px] font-serif font-black text-[var(--text1)] mt-2">Political Timelines Coming Soon</h2>
        <p className="text-[12px] text-[var(--text2)] max-w-md mx-auto mt-2 leading-relaxed">
          We are currently building and verifying our AI timeline generator. Soon, you will be able to track every major political event, scam, election, and policy battle milestone-by-milestone with verified sources.
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] font-mono text-[var(--text3)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          System integration in progress
        </div>
      </div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map(f => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-[3px] transition-colors"
              style={
                active
                  ? { background: 'var(--text1)', color: '#fff' }
                  : { border: '1px solid var(--border-md)', color: 'var(--text2)' }
              }
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Event cards */}
      {shown.length === 0 && (
        <p className="text-[13px] text-[var(--text3)] py-8 text-center font-mono">
          No timelines here yet.
        </p>
      )}

      <div className="space-y-2.5">
        {shown.map(ev => {
          const ongoing = ev.state === 'open'
          const days = eventDaySpan(ev)
          return (
            <Link
              key={ev.id}
              href={`/event/${ev.slug || ev.id}`}
              className="block bg-[var(--surface)] border rounded-sm p-4 transition-colors hover:border-[var(--accent)]"
              style={{ borderColor: 'var(--border-md)', opacity: ongoing ? 1 : 0.8 }}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span
                  className="text-[9px] font-mono tracking-wider"
                  style={{ color: ongoing ? 'var(--green)' : 'var(--text3)' }}
                >
                  {ongoing ? `● ONGOING · ${days} DAY${days > 1 ? 'S' : ''}` : `CONCLUDED · ${epochToMonYear(ev.first_seen)}–${epochToMonYear(ev.last_seen)}`}
                </span>
                <span className="text-[9px] font-mono text-[var(--text3)] flex-shrink-0">
                  {ev.article_count} UPDATE{ev.article_count > 1 ? 'S' : ''}
                </span>
              </div>

              <h3 className="text-[16px] font-bold font-serif leading-snug text-[var(--text1)]">
                {cleanTitle(ev.title)}
              </h3>

              {ev.latest_milestone && (
                <p className="text-[12px] leading-relaxed mt-1 line-clamp-2 text-[var(--text2)]">
                  <span className="text-[var(--text3)]">Latest:</span> {cleanTitle(ev.latest_milestone)}
                </p>
              )}

              <DotTrack ev={ev} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
