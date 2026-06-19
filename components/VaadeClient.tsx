'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PBadge, StatusBadge } from './SrcTag'
import type { PoliticalPromise, PromisesSummary } from '@/lib/api'
import { renderMarkdown } from '@/lib/utils'

type FilterId = 'all' | 'broken' | 'ongoing' | 'kept' | 'void' | 'bjp' | 'inc' | 'aap'
type CategoryFilterId = 'all' | 'specific' | 'policy' | 'vision'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'broken',  label: 'Broken' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'kept',    label: 'Kept' },
  { id: 'void',    label: 'Void' },
  { id: 'bjp',     label: 'BJP' },
  { id: 'inc',     label: 'INC' },
  { id: 'aap',     label: 'AAP' },
]

const CATEGORIES: { id: CategoryFilterId; label: string; desc: string }[] = [
  { id: 'all',      label: 'All Categories', desc: 'All political promises' },
  { id: 'specific', label: 'Specific',       desc: 'Clear, measurable commitments' },
  { id: 'policy',   label: 'Policy',         desc: 'Government actions, plans & schemes' },
  { id: 'vision',   label: 'Vision',         desc: 'Broad goals, ideals & slogans' },
]

const TOPIC_CATEGORIES = [
  { id: 'all', label: 'All Topics' },
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
  const [activeCategory, setActiveCategory] = useState<CategoryFilterId>('all')
  const [activeTopic, setActiveTopic] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')
  const [criticalOnly, setCriticalOnly] = useState<boolean>(false)

  const byStatus = data?.by_status ?? {}
  const allPromises: PoliticalPromise[] = [
    ...(byStatus.broken  ?? []),
    ...(byStatus.ongoing ?? []),
    ...(byStatus.kept    ?? []),
    ...(byStatus.void    ?? []),
  ]

  // Filter 1: Group by promise type category first
  const categoryPromises = allPromises.filter(p => {
    if (activeCategory === 'all') return true
    return p.promise_type === activeCategory
  })

  // Filter 2: Filter by topic category
  const topicPromises = categoryPromises.filter(p => {
    if (activeTopic === 'all') return true
    return normalizeCategory(p.category) === activeTopic
  })

  // Filter 3: Apply status, party, and critical toggle filters within selected categories
  const filteredPromises = topicPromises.filter(p => {
    if (criticalOnly && p.importance !== 'critical') return false

    if (activeFilter === 'all')     return true
    if (activeFilter === 'broken')  return p.status === 'broken'
    if (activeFilter === 'ongoing') return p.status === 'ongoing'
    if (activeFilter === 'kept')    return p.status === 'kept'
    if (activeFilter === 'void')    return p.status === 'void'
    // Party filters
    return p.party?.toLowerCase() === activeFilter
  })

  return (
    <div>
      {/* Category selector tabs */}
      <div className="grid grid-cols-4 border-b" style={{ borderColor: 'var(--border-md)' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id)
                setActiveTopic('all')
                setActiveFilter('all') // Reset status filter when category shifts to prevent empty states
                setCriticalOnly(false)
              }}
              className="flex flex-col items-center py-3.5 px-1 border-r last:border-r-0 transition-colors"
              style={{
                borderColor: 'var(--border-md)',
                background: isActive ? 'var(--bg-alt)' : 'transparent',
              }}
            >
              <span
                className="text-[10px] md:text-[11px] font-bold tracking-wider uppercase font-mono text-center"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text2)' }}
              >
                {cat.label}
              </span>
              <span className="text-[7.5px] font-mono text-[var(--text3)] mt-0.5 text-center px-1 hidden md:inline">
                {cat.desc}
              </span>
            </button>
          )
        })}
      </div>

      {/* Topic Category selector chips */}
      <div className="flex overflow-x-auto gap-2 px-4 md:px-6 py-2.5 bg-[var(--surface-alt)] border-b no-scrollbar" style={{ borderColor: 'var(--border-md)', background: 'var(--bg-alt)' }}>
        {TOPIC_CATEGORIES.map(topic => {
          const isActive = activeTopic === topic.id
          const count = topic.id === 'all' ? categoryPromises.length :
                        categoryPromises.filter(p => normalizeCategory(p.category) === topic.id).length

          return (
            <button
              key={topic.id}
              onClick={() => {
                setActiveTopic(topic.id)
                setActiveFilter('all') // Reset status filter to prevent empty states
              }}
              className="flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-mono tracking-wide border transition-all"
              style={{
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                color: isActive ? 'var(--accent)' : 'var(--text2)',
                background: isActive ? 'rgba(191,74,7,0.06)' : 'var(--surface)',
              }}
            >
              {topic.label}
              <span className="ml-1 opacity-60 font-bold">
                ({count})
              </span>
            </button>
          )
        })}
      </div>

      {/* Filter chips (Dynamic counts relative to active category and topic) */}
      <div className="flex overflow-x-auto gap-2 px-4 md:px-6 py-3 border-b no-scrollbar" style={{ borderColor: 'var(--border-md)' }}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f.id
          const count = f.id === 'all' ? topicPromises.length :
                        f.id === 'broken' ? topicPromises.filter(p => p.status === 'broken').length :
                        f.id === 'ongoing' ? topicPromises.filter(p => p.status === 'ongoing').length :
                        f.id === 'kept' ? topicPromises.filter(p => p.status === 'kept').length :
                        f.id === 'void' ? topicPromises.filter(p => p.status === 'void').length :
                        topicPromises.filter(p => p.party?.toLowerCase() === f.id).length

          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-[2px] text-[10px] font-mono tracking-widest uppercase border transition-colors"
              style={{
                borderColor: isActive ? 'var(--accent)' : 'var(--border-md)',
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                background: isActive ? 'rgba(191,74,7,0.06)' : 'transparent',
              }}
            >
              {f.label}
              <span className="ml-1.5 font-bold">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Control bar with Critical only toggle */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2 bg-[var(--surface)] border-b" style={{ borderColor: 'var(--border-md)' }}>
        <div className="text-[10px] font-mono tracking-wider text-[var(--text3)] uppercase">
          Showing {filteredPromises.length} promise{filteredPromises.length !== 1 ? 's' : ''}
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(e) => setCriticalOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded-sm accent-[var(--accent)] cursor-pointer"
          />
          <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[var(--text2)] flex items-center gap-1">
            ⚠️ Critical only
          </span>
        </label>
      </div>

      {/* Promise list */}
      <div>
        {filteredPromises.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[13px] font-mono" style={{ color: 'var(--text3)' }}>No promises match this filter</p>
          </div>
        )}

        {filteredPromises.map((p, i) => {
          const statusColor = STATUS_COLOR[p.status ?? ''] ?? 'var(--text3)'
          return (
            <div
              key={p.id ?? i}
              className="border-b hover:bg-[var(--bg-alt)] transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="px-4 md:px-6 py-4">
                <div className="flex items-start gap-3">
                  {/* Left accent bar */}
                  <div
                    className="w-[3px] self-stretch rounded-full flex-shrink-0 mt-0.5"
                    style={{ background: statusColor, opacity: 0.35 }}
                  />

                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {p.status && <StatusBadge status={p.status} />}
                      {p.importance === 'critical' && (
                        <span
                          className="text-[8.5px] font-bold tracking-[0.09em] rounded-[2px] px-[6px] py-[2px] font-mono text-white flex items-center gap-1 group relative cursor-help"
                          style={{ background: '#DC2626' }}
                          title={p.importance_reason || 'Critical Promise'}
                        >
                          CRITICAL
                          {p.importance_reason && (
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-gray-900 text-white text-[9px] leading-snug p-2 rounded shadow-lg z-50 font-normal normal-case tracking-normal">
                              {p.importance_reason}
                            </span>
                          )}
                        </span>
                      )}
                      {p.party  && <PBadge party={p.party} verified={p.party_verified} />}
                      {p.person && <span className="text-[10px] font-mono" style={{ color: 'var(--text2)' }}>{p.person}</span>}
                      
                      {/* Promise Type Badge */}
                      {p.promise_type && (
                        <span className="text-[9px] font-mono tracking-widest uppercase border rounded-sm px-1.5 py-0.5 font-bold"
                          style={{
                            borderColor: p.promise_type === 'specific' ? 'rgba(27,112,80,0.3)' : p.promise_type === 'policy' ? 'rgba(191,74,7,0.3)' : 'rgba(107,114,128,0.3)',
                            color: p.promise_type === 'specific' ? '#1B7050' : p.promise_type === 'policy' ? '#BF4A07' : '#6B7280',
                            background: p.promise_type === 'specific' ? 'rgba(27,112,80,0.04)' : p.promise_type === 'policy' ? 'rgba(191,74,7,0.04)' : 'rgba(107,114,128,0.04)',
                          }}>
                          {p.promise_type}
                        </span>
                      )}

                      {p.category && (
                        <span className="text-[9px] font-mono tracking-widest uppercase border rounded-sm px-1.5 py-0.5"
                          style={{ borderColor: 'var(--border-md)', color: 'var(--text3)' }}>
                          {p.category.replace(/_/g, ' ')}
                        </span>
                      )}
                      {p.made_on && (
                        <span className="text-[9px] font-mono" style={{ color: 'var(--text3)' }}>{p.made_on}</span>
                      )}
                    </div>

                    {/* Promise text — tappable only when a real id exists */}
                    {p.id ? (
                      <Link
                        href={`/vaade/${p.id}`}
                        className="block text-[13px] md:text-[14px] font-medium leading-relaxed mb-1.5 hover:text-[var(--accent)] transition-colors"
                        style={{ color: 'var(--text1)' }}
                      >
                        {p.promise}
                      </Link>
                    ) : (
                      <span className="block text-[13px] md:text-[14px] font-medium leading-relaxed mb-1.5" style={{ color: 'var(--text1)' }}>
                        {p.promise}
                      </span>
                    )}

                    {p.supporting_quote && (
                      <blockquote
                        className="mb-2 pl-3 border-l-2 text-[12px] italic leading-relaxed"
                        style={{ borderColor: 'var(--border-hi)', color: 'var(--text2)' }}
                      >
                        &ldquo;{p.supporting_quote}&rdquo;
                        <span className="block not-italic text-[9px] font-mono mt-0.5" style={{ color: 'var(--text3)' }}>
                          — verbatim from the source
                        </span>
                      </blockquote>
                    )}

                    {p.source_url && (
                      <div className="mb-3 text-[10px] font-mono text-[var(--text3)] space-y-1" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>Source:</span>
                          {p.url_status === 'dead' ? (
                            <span className="line-through opacity-60">
                              {p.source_description || 'Manifesto/Announcement'}
                            </span>
                          ) : (
                            <a
                              href={p.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline hover:text-[var(--accent)] transition-colors"
                              style={{ color: 'var(--accent)' }}
                            >
                              {p.source_description || 'Manifesto/Announcement'} ↗
                            </a>
                          )}
                        </div>

                        {p.archived_url && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>
                              Archived copy — {p.archive_source || 'unknown'}
                              {(() => {
                                const m = p.archived_url.match(/\/web\/(\d{4})(\d{2})(\d{2})\d{6}\//);
                                return m ? `, captured ${m[1]}-${m[2]}-${m[3]}` : '';
                              })()}
                              :
                            </span>
                            <a
                              href={p.archived_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline hover:text-[var(--accent)] transition-colors"
                              style={{ color: 'var(--accent)' }}
                            >
                              View Archive ↗
                            </a>
                          </div>
                        )}

                        {p.url_status === 'dead' && p.search_fallback_url && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>Original link unavailable —</span>
                            <a
                              href={p.search_fallback_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline hover:text-[var(--accent)] transition-colors font-bold"
                              style={{ color: 'var(--accent)' }}
                            >
                              search for this article ↗
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI reasoning preview */}
                    {p.gemma_reasoning && (
                      <p className="text-[11px] leading-relaxed border-l-2 pl-3 line-clamp-2"
                        style={{ color: 'var(--text2)', borderColor: `${statusColor}44` }}>
                        {renderMarkdown(p.gemma_reasoning)}
                      </p>
                    )}

                    {/* Footer row */}
                    <div className="flex items-center gap-3 mt-2">
                      {p.evidence_count != null && p.evidence_count > 0 && (
                        <span className="text-[9px] font-mono" style={{ color: 'var(--text3)' }}>
                          {p.evidence_count} evidence source{p.evidence_count !== 1 ? 's' : ''}
                        </span>
                      )}
                      {p.id && (
                        <Link
                          href={`/vaade/${p.id}`}
                          className="text-[9px] font-mono ml-auto transition-colors hover:text-[var(--accent)]"
                          style={{ color: 'var(--text3)' }}
                        >
                          Full details →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
