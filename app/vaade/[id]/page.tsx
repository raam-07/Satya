import { api } from '@/lib/api'
import Link from 'next/link'
import { PBadge, StatusBadge } from '@/components/SrcTag'
import { VaadeRelatedArticles } from '@/components/VaadeRelatedArticles'
import type { PoliticalPromise } from '@/lib/api'
import { renderMarkdown } from '@/lib/utils'

const STATUS_COLOR: Record<string, string> = {
  kept:    '#1B7050',
  broken:  '#B02828',
  ongoing: '#BF4A07',
  void:    '#6B7280',
}

export default async function PromisePage({ params }: { params: { id: string } }) {
  const promiseId = decodeURIComponent(params.id)

  // Only fetch promises — feed loaded lazily on client
  const data = await api.promises()

  const allPromises: PoliticalPromise[] = [
    ...(data?.by_status?.broken  ?? []),
    ...(data?.by_status?.ongoing ?? []),
    ...(data?.by_status?.kept    ?? []),
    ...(data?.by_status?.void   ?? []),
  ]

  const promise = allPromises.find(p => String(p.id) === promiseId)

  if (!promise) {
    return (
      <div className="md:max-w-4xl md:mx-auto">
        <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
          <Link href="/vaade" className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
            ← Vaade
          </Link>
          <h1 className="text-[22px] font-black font-serif mt-2" style={{ color: 'var(--text1)' }}>Promise not found</h1>
        </div>
        <div className="p-12 text-center">
          <p className="text-[13px] font-mono" style={{ color: 'var(--text3)' }}>
            Promise #{promiseId} could not be found.
          </p>
          <Link href="/vaade" className="text-[11px] font-mono mt-4 block" style={{ color: 'var(--accent)' }}>
            ← Back to all promises
          </Link>
        </div>
      </div>
    )
  }

  const statusColor = STATUS_COLOR[promise.status ?? ''] ?? 'var(--text3)'

  return (
    <div className="md:max-w-4xl md:mx-auto">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <Link href="/vaade" className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
          ← Vaade
        </Link>
        <div className="flex items-center gap-2 mt-3 mb-2 flex-wrap">
          {promise.status && <StatusBadge status={promise.status} />}
          {promise.importance === 'critical' && (
            <span
              className="text-[8.5px] font-bold tracking-[0.09em] rounded-[2px] px-[6px] py-[2px] font-mono text-white flex items-center gap-1 group relative cursor-help"
              style={{ background: '#DC2626' }}
              title={promise.importance_reason || 'Critical Promise'}
            >
              CRITICAL
              {promise.importance_reason && (
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-gray-900 text-white text-[9px] leading-snug p-2 rounded shadow-lg z-50 font-normal normal-case tracking-normal">
                  {promise.importance_reason}
                </span>
              )}
            </span>
          )}
          {promise.party  && <PBadge party={promise.party} verified={promise.party_verified} />}
          {promise.person && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--text2)' }}>{promise.person}</span>
          )}
          {promise.made_on && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>Made {promise.made_on}</span>
          )}
          {promise.deadline && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>· Due {promise.deadline}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {promise.promise_type && (
            <span className="text-[9px] font-mono tracking-widest uppercase border rounded-sm px-1.5 py-0.5 font-bold"
              style={{
                borderColor: promise.promise_type === 'specific' ? 'rgba(27,112,80,0.3)' : promise.promise_type === 'policy' ? 'rgba(191,74,7,0.3)' : 'rgba(107,114,128,0.3)',
                color: promise.promise_type === 'specific' ? '#1B7050' : promise.promise_type === 'policy' ? '#BF4A07' : '#6B7280',
                background: promise.promise_type === 'specific' ? 'rgba(27,112,80,0.04)' : promise.promise_type === 'policy' ? 'rgba(191,74,7,0.04)' : 'rgba(107,114,128,0.04)',
              }}>
              {promise.promise_type} Promise
            </span>
          )}
          <span className="text-[9px] font-mono tracking-widest uppercase text-[var(--text3)] border border-[var(--border-md)] rounded-sm px-1.5 py-0.5">
            {promise.category?.replace(/_/g, ' ') ?? 'Promise'}
          </span>
        </div>
      </div>

      {/* Promise text */}
      <div className="px-4 md:px-6 py-6 border-b" style={{ borderColor: 'var(--border-md)' }}>
        <div className="flex gap-3">
          <div className="w-[3px] self-stretch rounded-full flex-shrink-0" style={{ background: statusColor, opacity: 0.5 }} />
          <div className="flex-1">
            <p className="text-[18px] md:text-[22px] font-bold font-serif leading-relaxed" style={{ color: 'var(--text1)' }}>
              {promise.promise}
            </p>
            {promise.supporting_quote && (
              <blockquote
                className="mt-3 pl-4 border-l-2 text-[13px] italic leading-relaxed"
                style={{ borderColor: 'var(--border-hi)', color: 'var(--text2)' }}
              >
                &ldquo;{promise.supporting_quote}&rdquo;
                <span className="block not-italic text-[10px] font-mono mt-1" style={{ color: 'var(--text3)' }}>
                  — verbatim from the source
                </span>
              </blockquote>
            )}
            {promise.source_url && (
              <div className="mt-3 text-[11px] font-mono text-[var(--text3)] space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Source:</span>
                  {promise.url_status === 'dead' ? (
                    <span className="line-through opacity-60">
                      {promise.source_description || 'Manifesto/Announcement'}
                    </span>
                  ) : (
                    <a
                      href={promise.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-[var(--accent)] transition-colors inline-flex items-center gap-0.5"
                      style={{ color: 'var(--accent)' }}
                    >
                      {promise.source_description || 'Manifesto/Announcement'} ↗
                    </a>
                  )}
                </div>

                {promise.archived_url && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>
                      Archived copy — {promise.archive_source || 'unknown'}
                      {(() => {
                        const m = promise.archived_url.match(/\/web\/(\d{4})(\d{2})(\d{2})\d{6}\//);
                        return m ? `, captured ${m[1]}-${m[2]}-${m[3]}` : '';
                      })()}
                      :
                    </span>
                    <a
                      href={promise.archived_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-[var(--accent)] transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      View Archive ↗
                    </a>
                  </div>
                )}

                {promise.url_status === 'dead' && promise.search_fallback_url && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Original link unavailable —</span>
                    <a
                      href={promise.search_fallback_url}
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
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      {promise.gemma_reasoning && (
        <div className="px-4 md:px-6 py-5 border-b" style={{ borderColor: 'var(--border-md)' }}>
          <div className="text-[9px] font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--text3)' }}>
            AI Analysis
          </div>
          <div className="border-l-2 pl-4 text-[13px] leading-relaxed" style={{ borderColor: statusColor + '55', color: 'var(--text2)' }}>
            {renderMarkdown(promise.gemma_reasoning)}
          </div>
          {promise.gemma_suggestion && (
            <p className="text-[11px] mt-3 italic" style={{ color: 'var(--text3)' }}>
              Suggestion: {promise.gemma_suggestion}
            </p>
          )}
        </div>
      )}

      {/* Verdict Trajectory Timeline */}
      {promise.status_history && promise.status_history.length > 0 && (
        <div className="px-4 md:px-6 py-5 border-b" style={{ borderColor: 'var(--border-md)' }}>
          <div className="text-[9px] font-mono tracking-widest uppercase mb-4" style={{ color: 'var(--text3)' }}>
            Verdict Trajectory
          </div>
          <div className="relative pl-6 border-l border-[var(--border-md)] ml-3 space-y-6">
            {[...promise.status_history]
              .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
              .map((h, idx) => {
                const color = STATUS_COLOR[h.status] ?? 'var(--text3)';
                return (
                  <div key={idx} className="relative">
                    {/* Timeline Dot */}
                    <div
                      className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border bg-[var(--surface)] flex items-center justify-center"
                      style={{ borderColor: color }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    </div>

                    {/* Timeline Content */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider font-mono mr-2.5" style={{ color }}>
                          {h.status}
                        </span>
                        {h.evidence_url ? (
                          <a
                            href={h.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] hover:underline"
                            style={{ color: 'var(--accent)' }}
                          >
                            View evidence ↗
                          </a>
                        ) : (
                          <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                            (no source link)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>
                        {h.changed_at}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Evidence count */}
      {promise.evidence_count != null && promise.evidence_count > 0 && (
        <div className="px-4 md:px-6 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-md)' }}>
          <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>Evidence Sources</span>
          <span className="text-[11px] font-mono font-bold" style={{ color: statusColor }}>{promise.evidence_count}</span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>tracked</span>
        </div>
      )}

      {/* Related articles — loaded lazily on client, no blocking */}
      <VaadeRelatedArticles
        party={promise.party}
        person={promise.person}
        category={promise.category}
        preloadedEvidence={promise.evidence_articles}
      />
    </div>
  )
}
