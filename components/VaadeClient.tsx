'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PBadge, StatusBadge } from './SrcTag'
import type { PoliticalPromise, PromisesSummary } from '@/lib/api'

type FilterId = 'all' | 'broken' | 'ongoing' | 'kept' | 'bjp' | 'inc' | 'aap'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'broken',  label: 'Broken' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'kept',    label: 'Kept' },
  { id: 'bjp',     label: 'BJP' },
  { id: 'inc',     label: 'INC' },
  { id: 'aap',     label: 'AAP' },
]

const STATUS_COLOR: Record<string, string> = {
  kept:    '#1B7050',
  broken:  '#B02828',
  ongoing: '#BF4A07',
}

interface VaadeClientProps {
  data: PromisesSummary | null
}

export function VaadeClient({ data }: VaadeClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')

  const byStatus = data?.by_status ?? {}
  const allPromises: PoliticalPromise[] = [
    ...(byStatus.broken  ?? []),
    ...(byStatus.ongoing ?? []),
    ...(byStatus.kept    ?? []),
  ]

  const filteredPromises = allPromises.filter(p => {
    if (activeFilter === 'all')     return true
    if (activeFilter === 'broken')  return p.status === 'broken'
    if (activeFilter === 'ongoing') return p.status === 'ongoing'
    if (activeFilter === 'kept')    return p.status === 'kept'
    // Party filters
    return p.party?.toLowerCase() === activeFilter
  })

  return (
    <div>
      {/* Filter chips */}
      <div className="flex overflow-x-auto gap-2 px-4 md:px-6 py-3 border-b no-scrollbar" style={{ borderColor: 'var(--border-md)' }}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f.id
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
              {f.id !== 'all' && (
                <span className="ml-1.5 font-bold">
                  {f.id === 'broken'  ? byStatus.broken?.length ?? 0 :
                   f.id === 'ongoing' ? byStatus.ongoing?.length ?? 0 :
                   f.id === 'kept'    ? byStatus.kept?.length ?? 0 :
                   allPromises.filter(p => p.party?.toLowerCase() === f.id).length}
                </span>
              )}
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

                    {/* Promise text — tappable */}
                    <Link
                      href={`/vaade/${p.id ?? i}`}
                      className="block text-[13px] md:text-[14px] font-medium leading-relaxed mb-2 hover:text-[var(--accent)] transition-colors"
                      style={{ color: 'var(--text1)' }}
                    >
                      {p.promise}
                    </Link>

                    {/* AI reasoning preview */}
                    {p.gemma_reasoning && (
                      <p className="text-[11px] leading-relaxed border-l-2 pl-3 line-clamp-2"
                        style={{ color: 'var(--text2)', borderColor: `${statusColor}44` }}>
                        {p.gemma_reasoning}
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
