'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { EventSummary } from '@/lib/api'
import { cleanTitle } from '@/lib/utils'
import { epochToMonYear, eventDaySpan, entityKeyLabel } from '@/lib/eventUtils'

type Filter = 'all' | 'ongoing' | 'concluded' | 'most_updates' | 'longest'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'concluded', label: 'Concluded' },
  { id: 'most_updates', label: 'Most updates' },
  { id: 'longest', label: 'Longest running' },
]

// entity_keys mix parties, people, states and cities — these whitelists pick
// out the two kinds users filter by. Keys are the classifier's snake_case slugs.
const STATE_KEYS = new Set([
  'andhra_pradesh', 'arunachal_pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa',
  'gujarat', 'haryana', 'himachal_pradesh', 'jharkhand', 'karnataka', 'kerala',
  'madhya_pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland',
  'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil_nadu', 'telangana', 'tripura',
  'uttar_pradesh', 'uttarakhand', 'west_bengal', 'delhi', 'jammu', 'kashmir',
  'ladakh', 'puducherry', 'chandigarh',
])

const PARTY_KEYS = new Set([
  'bjp', 'congress', 'inc', 'aap', 'tmc', 'trinamool', 'samajwadi_party', 'sp',
  'bsp', 'ncp', 'nationalist_congress', 'shiv_sena', 'cpi', 'cpm', 'rjd', 'jdu',
  'janata_dal', 'tdp', 'telugu_desam', 'ysrcp', 'dmk', 'aiadmk', 'pdp',
  'national_conference', 'aimim', 'bjd', 'biju_janata_dal', 'jmm', 'akali_dal',
  'sad', 'nda', 'upa', 'india_alliance',
])

const DEPTH_MIN = 5 // "substantial stories" floor

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
  const [stateKey, setStateKey] = useState<string>('all')
  const [partyKey, setPartyKey] = useState<string>('all')
  const [deepOnly, setDeepOnly] = useState<boolean>(false)

  // Build dropdown options only from values actually present, with counts.
  const { stateOptions, partyOptions } = useMemo(() => {
    const sc = new Map<string, number>()
    const pc = new Map<string, number>()
    for (const ev of events) {
      for (const k of ev.entity_keys ?? []) {
        if (STATE_KEYS.has(k)) sc.set(k, (sc.get(k) ?? 0) + 1)
        else if (PARTY_KEYS.has(k)) pc.set(k, (pc.get(k) ?? 0) + 1)
      }
    }
    const sort = (m: Map<string, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ key: k, label: entityKeyLabel(k), count: n }))
    return { stateOptions: sort(sc), partyOptions: sort(pc) }
  }, [events])

  let shown = [...events]
  if (filter === 'ongoing') shown = shown.filter(e => e.state === 'open')
  if (filter === 'concluded') shown = shown.filter(e => e.state === 'closed')
  if (stateKey !== 'all') shown = shown.filter(e => (e.entity_keys ?? []).includes(stateKey))
  if (partyKey !== 'all') shown = shown.filter(e => (e.entity_keys ?? []).includes(partyKey))
  if (deepOnly) shown = shown.filter(e => e.article_count >= DEPTH_MIN)
  if (filter === 'most_updates') shown.sort((a, b) => b.article_count - a.article_count)
  if (filter === 'longest') shown.sort((a, b) => eventDaySpan(b) - eventDaySpan(a))

  const anyAdvanced = stateKey !== 'all' || partyKey !== 'all' || deepOnly

  return (
    <div className="px-4 md:px-6 py-4">
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

      {/* State / Party / Depth controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={stateKey}
          onChange={e => setStateKey(e.target.value)}
          className="text-[11px] font-mono px-2 py-1.5 rounded-[3px] bg-[var(--surface)] cursor-pointer"
          style={{ border: '1px solid var(--border-md)', color: stateKey !== 'all' ? 'var(--accent)' : 'var(--text2)' }}
        >
          <option value="all">All states</option>
          {stateOptions.map(o => (
            <option key={o.key} value={o.key}>{o.label} ({o.count})</option>
          ))}
        </select>

        <select
          value={partyKey}
          onChange={e => setPartyKey(e.target.value)}
          className="text-[11px] font-mono px-2 py-1.5 rounded-[3px] bg-[var(--surface)] cursor-pointer"
          style={{ border: '1px solid var(--border-md)', color: partyKey !== 'all' ? 'var(--accent)' : 'var(--text2)' }}
        >
          <option value="all">All parties</option>
          {partyOptions.map(o => (
            <option key={o.key} value={o.key}>{o.label} ({o.count})</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
          <input
            type="checkbox"
            checked={deepOnly}
            onChange={e => setDeepOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded-sm accent-[var(--accent)] cursor-pointer"
          />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text2)]">
            {DEPTH_MIN}+ updates
          </span>
        </label>
      </div>

      {/* Event cards */}
      {shown.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-[13px] text-[var(--text3)] font-mono">No timelines match these filters.</p>
          {anyAdvanced && (
            <button
              onClick={() => { setStateKey('all'); setPartyKey('all'); setDeepOnly(false) }}
              className="mt-3 text-[11px] font-mono uppercase tracking-widest hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Clear filters
            </button>
          )}
        </div>
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
