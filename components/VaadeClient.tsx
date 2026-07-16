'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PBadge, StatusBadge } from './SrcTag'
import type { PoliticalPromise, PromisesSummary } from '@/lib/api'

type StatusFilterId = 'all' | 'broken' | 'overdue' | 'ongoing' | 'kept' | 'void'
type PartyFilterId = 'all' | 'bjp' | 'inc' | 'aap'
type TypeFilterId = 'all' | 'specific' | 'policy' | 'vision'

const STATUS_FILTERS: { id: StatusFilterId; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'broken',  label: 'Broken' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'kept',    label: 'Kept' },
  { id: 'void',    label: 'Void' },
]

/** Still "ongoing" but its promised deadline year has already passed —
 *  the most accountability-relevant state a promise can be in. */
function isOverdue(p: PoliticalPromise): boolean {
  if (p.status !== 'ongoing' || !p.deadline) return false
  const year = parseInt(p.deadline, 10)
  return Number.isFinite(year) && year >= 1990 && year < new Date().getFullYear()
}

const PARTY_FILTERS: { id: PartyFilterId; label: string }[] = [
  { id: 'all', label: 'All parties' },
  { id: 'bjp', label: 'BJP' },
  { id: 'inc', label: 'INC' },
  { id: 'aap', label: 'AAP' },
]

const TYPE_FILTERS: { id: TypeFilterId; label: string; desc: string }[] = [
  { id: 'all',      label: 'All types', desc: 'Every kind of promise' },
  { id: 'specific', label: 'Specific',  desc: 'Clear, measurable commitments' },
  { id: 'policy',   label: 'Policy',    desc: 'Government actions, plans & schemes' },
  { id: 'vision',   label: 'Vision',    desc: 'Broad goals, ideals & slogans' },
]

const TOPIC_CATEGORIES = [
  { id: 'all', label: 'All topics' },
  { id: 'jobs/employment', label: 'Jobs & Employment' },
  { id: 'economy', label: 'Economy' },
  { id: 'farmers/agriculture', label: 'Farmers & Agriculture' },
  { id: 'health', label: 'Health' },
  { id: 'education', label: 'Education' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'welfare', label: 'Welfare' },
  { id: 'corruption/governance', label: 'Corruption & Governance' },
  { id: 'law_and_order', label: 'Law & Order' },
  { id: 'other', label: 'Other' },
]

function normalizeCategory(cat?: string): string {
  if (!cat) return 'other'
  const c = cat.toLowerCase().trim()
  if (c === 'farmer_agriculture' || c === 'farmers_agriculture' || c === 'farmers/agriculture') {
    return 'farmers/agriculture'
  }
  if (c === 'corruption_scam' || c === 'corruption/governance' || c === 'corruption_governance') {
    return 'corruption/governance'
  }
  if (c === 'jobs_employment' || c === 'jobs/employment') {
    return 'jobs/employment'
  }
  return c
}

const STATUS_COLOR: Record<string, string> = {
  kept:    '#1B7050',
  broken:  '#B02828',
  ongoing: '#BF4A07',
  void:    '#6B7280',
}

interface VaadeClientProps {
  data: PromisesSummary | null
}

export function VaadeClient({ data }: VaadeClientProps) {
  const [status, setStatus] = useState<StatusFilterId>('all')
  const [party, setParty] = useState<PartyFilterId>('all')
  const [topic, setTopic] = useState<string>('all')
  const [ptype, setPtype] = useState<TypeFilterId>('all')
  const [criticalOnly, setCriticalOnly] = useState<boolean>(true)
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [query, setQuery] = useState<string>('')

  const byStatus = data?.by_status ?? {}
  const allPromises: PoliticalPromise[] = useMemo(() => [
    ...(byStatus.broken  ?? []),
    ...(byStatus.ongoing ?? []),
    ...(byStatus.kept    ?? []),
    ...(byStatus.void    ?? []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [data])

  // Base pool: everything except the status choice, so status chips show
  // counts consistent with the other active filters.
  const q = query.trim().toLowerCase()
  const basePromises = allPromises.filter(p => {
    if (criticalOnly && p.importance !== 'critical') return false
    if (ptype !== 'all' && p.promise_type !== ptype) return false
    if (topic !== 'all' && normalizeCategory(p.category) !== topic) return false
    if (party !== 'all' && p.party?.toLowerCase() !== party) return false
    if (q && !(`${p.promise ?? ''} ${p.person ?? ''} ${p.category ?? ''}`.toLowerCase().includes(q))) return false
    return true
  })

  const filteredPromises = basePromises.filter(p =>
    status === 'all' ? true : status === 'overdue' ? isOverdue(p) : p.status === status
  )

  const statusCount = (id: StatusFilterId) =>
    id === 'all' ? basePromises.length
    : id === 'overdue' ? basePromises.filter(isOverdue).length
    : basePromises.filter(p => p.status === id).length

  const advancedActive =
    (party !== 'all' ? 1 : 0) + (topic !== 'all' ? 1 : 0) + (ptype !== 'all' ? 1 : 0)

  const resetAdvanced = () => { setParty('all'); setTopic('all'); setPtype('all') }

  return (
    <div>
      {/* Single primary filter row: status chips + critical toggle + Filters */}
      <div
        className="flex items-center gap-2 px-4 md:px-6 py-2.5 border-b overflow-x-auto no-scrollbar"
        style={{ borderColor: 'var(--border-md)' }}
      >
        {STATUS_FILTERS.map(f => {
          const isActive = status === f.id
          // Overdue is the accountability chip — it gets the alarm color.
          const tone = f.id === 'overdue' ? '#B02828' : 'var(--accent)'
          return (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-[2px] text-[10px] font-mono tracking-widest uppercase border transition-colors"
              style={{
                borderColor: isActive ? tone : f.id === 'overdue' && statusCount('overdue') > 0 ? 'rgba(176,40,40,0.35)' : 'var(--border-md)',
                color: isActive ? tone : f.id === 'overdue' && statusCount('overdue') > 0 ? '#B02828' : 'var(--text3)',
                background: isActive ? (f.id === 'overdue' ? 'rgba(176,40,40,0.06)' : 'rgba(191,74,7,0.06)') : 'transparent',
              }}
            >
              {f.label}
              <span className="ml-1.5 font-bold">{statusCount(f.id)}</span>
            </button>
          )
        })}

        <div className="flex-1 min-w-2" />

        <label className="flex-shrink-0 flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(e) => setCriticalOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded-sm accent-[var(--accent)] cursor-pointer"
          />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text2)]">
            Critical only
          </span>
        </label>

        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex-shrink-0 px-3 py-1.5 rounded-[2px] text-[10px] font-mono tracking-widest uppercase border transition-colors"
          style={{
            borderColor: showFilters || advancedActive ? 'var(--accent)' : 'var(--border-md)',
            color: showFilters || advancedActive ? 'var(--accent)' : 'var(--text3)',
            background: showFilters ? 'rgba(191,74,7,0.06)' : 'transparent',
          }}
        >
          Filters{advancedActive > 0 ? ` · ${advancedActive}` : ''} {showFilters ? '▴' : '▾'}
        </button>
      </div>

      {/* Collapsible advanced filters */}
      {showFilters && (
        <div className="px-4 md:px-6 py-3 border-b space-y-3" style={{ borderColor: 'var(--border-md)', background: 'var(--bg-alt)' }}>
          {/* Party */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono tracking-widest uppercase text-[var(--text3)] w-12">Party</span>
            {PARTY_FILTERS.map(f => {
              const isActive = party === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setParty(f.id)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all"
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                    color: isActive ? 'var(--accent)' : 'var(--text2)',
                    background: isActive ? 'rgba(191,74,7,0.06)' : 'var(--surface)',
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono tracking-widest uppercase text-[var(--text3)] w-12">Type</span>
            {TYPE_FILTERS.map(t => {
              const isActive = ptype === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setPtype(t.id)}
                  title={t.desc}
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all"
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                    color: isActive ? 'var(--accent)' : 'var(--text2)',
                    background: isActive ? 'rgba(191,74,7,0.06)' : 'var(--surface)',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Topic */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono tracking-widest uppercase text-[var(--text3)] w-12">Topic</span>
            {TOPIC_CATEGORIES.map(t => {
              const isActive = topic === t.id
              const count = t.id === 'all'
                ? allPromises.length
                : allPromises.filter(p => normalizeCategory(p.category) === t.id).length
              if (t.id !== 'all' && count === 0) return null
              return (
                <button
                  key={t.id}
                  onClick={() => setTopic(t.id)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all"
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                    color: isActive ? 'var(--accent)' : 'var(--text2)',
                    background: isActive ? 'rgba(191,74,7,0.06)' : 'var(--surface)',
                  }}
                >
                  {t.label}<span className="ml-1 opacity-60">{count}</span>
                </button>
              )
            })}
          </div>

          {advancedActive > 0 && (
            <button
              onClick={resetAdvanced}
              className="text-[10px] font-mono uppercase tracking-widest hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Search + result count */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-2 border-b" style={{ borderColor: 'var(--border-md)' }}>
        <div className="relative flex-1 max-w-[320px]">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search promises, leaders…"
            className="w-full text-[12px] font-mono px-3 py-1.5 rounded-[3px] bg-[var(--bg-alt)] outline-none focus:ring-1"
            style={{ border: '1px solid var(--border-md)', color: 'var(--text1)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text3)] hover:text-[var(--accent)]"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <span className="ml-auto flex-shrink-0 text-[10px] font-mono tracking-wider text-[var(--text3)] uppercase">
          {filteredPromises.length} promise{filteredPromises.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Promise list — scannable rows; full evidence lives on the detail page */}
      <div>
        {filteredPromises.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[13px] font-mono" style={{ color: 'var(--text3)' }}>
              No promises match {q ? `"${query.trim()}"` : 'this filter'}
            </p>
            {(advancedActive > 0 || criticalOnly || q) && (
              <button
                onClick={() => { resetAdvanced(); setCriticalOnly(false); setStatus('all'); setQuery('') }}
                className="mt-3 text-[11px] font-mono uppercase tracking-widest hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {filteredPromises.map((p, i) => {
          const statusColor = STATUS_COLOR[p.status ?? ''] ?? 'var(--text3)'
          const inner = (
            <div className="px-4 md:px-6 py-3.5 flex items-start gap-3">
              {/* Status accent bar */}
              <div
                className="w-[3px] self-stretch rounded-full flex-shrink-0"
                style={{ background: statusColor, opacity: 0.5 }}
              />
              <div className="flex-1 min-w-0">
                {/* Meta row: who + verdict */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {p.status && <StatusBadge status={p.status} />}
                  {isOverdue(p) && (
                    <span
                      className="text-[8.5px] font-bold tracking-[0.09em] rounded-[2px] px-[6px] py-[2px] font-mono text-white"
                      style={{ background: '#B02828' }}
                      title={`Deadline was ${p.deadline} and this promise is still marked ongoing`}
                    >
                      OVERDUE · {p.deadline}
                    </span>
                  )}
                  {p.importance === 'critical' && (
                    <span
                      className="text-[8.5px] font-bold tracking-[0.09em] rounded-[2px] px-[6px] py-[2px] font-mono text-white"
                      style={{ background: '#DC2626' }}
                      title={p.importance_reason || 'Critical Promise'}
                    >
                      CRITICAL
                    </span>
                  )}
                  {p.party && <PBadge party={p.party} verified={p.party_verified} />}
                  {p.person && (
                    <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text2)' }}>{p.person}</span>
                  )}
                  {(p.made_on || p.reported_on) && (
                    <span className="text-[9px] font-mono ml-auto flex-shrink-0" style={{ color: 'var(--text3)' }}>{p.made_on || p.reported_on}</span>
                  )}
                </div>

                {/* The promise itself — the headline of the row */}
                <p className="text-[13px] md:text-[14px] font-medium leading-relaxed" style={{ color: 'var(--text1)' }}>
                  {p.promise}
                </p>

                {/* Quiet footer: topic + evidence, details affordance */}
                <div className="flex items-center gap-3 mt-1.5">
                  {p.category && (
                    <span className="text-[9px] font-mono tracking-wider uppercase" style={{ color: 'var(--text3)' }}>
                      {normalizeCategory(p.category).replace(/_/g, ' ')}
                    </span>
                  )}
                  {p.evidence_count != null && p.evidence_count > 0 && (
                    <span className="text-[9px] font-mono" style={{ color: 'var(--text3)' }}>
                      {p.evidence_count} source{p.evidence_count !== 1 ? 's' : ''}
                    </span>
                  )}
                  {p.id && (
                    <span className="text-[9px] font-mono ml-auto transition-colors group-hover:text-[var(--accent)]" style={{ color: 'var(--text3)' }}>
                      Details →
                    </span>
                  )}
                </div>
              </div>
            </div>
          )

          return p.id ? (
            <Link
              key={p.id}
              href={`/vaade/${p.id}`}
              className="block border-b group hover:bg-[var(--bg-alt)] transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              {inner}
            </Link>
          ) : (
            <div key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
