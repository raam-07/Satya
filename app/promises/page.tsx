import { api } from '@/lib/api'
import { StatusBadge, PBadge } from '@/components/SrcTag'

export default async function PromisesPage() {
  const data = await api.promises()
  const stats = data?.stats ?? { total_promises: 0, kept: 0, broken: 0, ongoing: 0 }
  const byStatus = data?.by_status ?? {}
  const byParty  = data?.by_party ?? {}

  const allPromises = [
    ...(byStatus.broken  ?? []),
    ...(byStatus.ongoing ?? []),
    ...(byStatus.kept    ?? []),
  ]

  return (
    <div className="md:max-w-5xl md:mx-auto">
      {/* Header */}
      <div className="border-b border-[var(--border-md)] px-4 md:px-6 py-5 bg-[var(--surface)]">
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Full List</span>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1">Promise Tracker</h1>
        <p className="text-[13px] text-[var(--text2)] mt-1">Every tracked political promise — with evidence.</p>

        {/* Stats */}
        <div className="flex gap-6 md:gap-10 mt-5 flex-wrap">
          {[
            { label: 'Broken',  val: stats.broken  ?? 0, color: '#b02828' },
            { label: 'Ongoing', val: stats.ongoing ?? 0,  color: '#bf4a07' },
            { label: 'Kept',    val: stats.kept    ?? 0,  color: '#1b7050' },
            { label: 'Total',   val: stats.total_promises ?? 0, color: 'var(--text1)' },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <div className="text-[28px] md:text-[32px] font-black font-mono leading-none" style={{ color }}>{val}</div>
              <div className="text-[9px] font-mono tracking-widest uppercase text-[var(--text3)] mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* By party */}
        {Object.keys(byParty).length > 0 && (
          <div className="flex gap-4 mt-4 flex-wrap">
            {Object.entries(byParty).map(([party, count]) => (
              <div key={party} className="flex items-center gap-1.5">
                <PBadge party={party} />
                <span className="text-[10px] font-mono text-[var(--text3)]">
                  {Array.isArray(count) ? count.length : count} promises
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grouped sections */}
      {(['broken', 'ongoing', 'kept'] as const).map(status => {
        const items = byStatus[status] ?? []
        if (items.length === 0) return null
        return (
          <div key={status} className="border-b border-[var(--border-md)]">
            <div className="px-4 md:px-6 py-2.5 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--bg-alt)]">
              <StatusBadge status={status} />
              <span className="text-[10px] font-mono text-[var(--text2)]">{items.length} promise{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {items.map((p, i) => (
                <div key={p.id ?? i} className="px-4 md:px-6 py-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {p.party && <PBadge party={p.party} />}
                        {p.person && <span className="text-[10px] font-mono text-[var(--text2)]">{p.person}</span>}
                        {p.category && (
                          <span className="text-[9px] font-mono tracking-widest uppercase text-[var(--text3)] border border-[var(--border-md)] rounded-sm px-1.5 py-0.5">
                            {p.category.replace(/_/g, ' ')}
                          </span>
                        )}
                        {p.made_on && <span className="text-[9px] font-mono text-[var(--text3)]">{p.made_on}</span>}
                        {p.deadline && <span className="text-[9px] font-mono text-[var(--text3)]">· due {p.deadline}</span>}
                      </div>
                      <p className="text-[13px] md:text-[14px] text-[var(--text1)] leading-relaxed font-medium">{p.promise}</p>
                      {p.gemma_reasoning && (
                        <p className="text-[11px] text-[var(--text2)] mt-2 leading-relaxed border-l-2 pl-3" style={{ borderColor: status === 'broken' ? '#b02828' : status === 'kept' ? '#1b7050' : '#bf4a07' }}>
                          {p.gemma_reasoning}
                        </p>
                      )}
                      {p.evidence_count != null && p.evidence_count > 0 && (
                        <p className="text-[9px] font-mono text-[var(--text3)] mt-2">↗ {p.evidence_count} evidence source{p.evidence_count !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {allPromises.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-[var(--text3)] font-mono text-[13px]">No promise data loaded</p>
        </div>
      )}
    </div>
  )
}
