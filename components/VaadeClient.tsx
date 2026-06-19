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
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')

  const byStatus = data?.by_status ?? {}
  const allPromises: PoliticalPromise[] = [
    ...(byStatus.broken  ?? []),
    ...(byStatus.ongoing ?? []),
    ...(byStatus.kept    ?? []),
    ...(byStatus.void    ?? []),
  ]

  // Filter 1: Group by category first
  const categoryPromises = allPromises.filter(p => {
    if (activeCategory === 'all') return true
    return p.promise_type === activeCategory
  })

  // Filter 2: Apply status/party filters within the selected category
  const filteredPromises = categoryPromises.filter(p => {
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
                setActiveFilter('all') // Reset status filter when category shifts to prevent empty states
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

      {/* Filter chips (Dynamic counts relative to active category) */}
      <div className="flex overflow-x-auto gap-2 px-4 md:px-6 py-3 border-b no-scrollbar" style={{ borderColor: 'var(--border-md)' }}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f.id
          const count = f.id === 'all' ? categoryPromises.length :
                        f.id === 'broken' ? categoryPromises.filter(p => p.status === 'broken').length :
                        f.id === 'ongoing' ? categoryPromises.filter(p => p.status === 'ongoing').length :
                        f.id === 'kept' ? categoryPromises.filter(p => p.status === 'kept').length :
                        f.id === 'void' ? categoryPromises.filter(p => p.status === 'void').length :
                        categoryPromises.filter(p => p.party?.toLowerCase() === f.id).length

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
                      {p.party  && <PBadge party={p.party} />}
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
