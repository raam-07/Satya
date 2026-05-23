import { api } from '@/lib/api'
import { ArticleCard } from '@/components/ArticleCard'
import { StatusBadge, PBadge } from '@/components/SrcTag'
import Link from 'next/link'

export default async function MinisterPage({ params }: { params: { name: string } }) {
  const minister = await api.minister(params.name)

  if (!minister) {
    return <div className="p-12 text-center"><p className="text-[var(--text3)] font-mono text-[13px]">Minister not found: {params.name}</p></div>
  }

  const promises = minister.promises ?? []
  const kept    = promises.filter(p => p.status === 'kept').length
  const broken  = promises.filter(p => p.status === 'broken').length
  const ongoing = promises.filter(p => p.status === 'ongoing').length

  return (
    <div className="md:max-w-5xl md:mx-auto">
      {/* Header */}
      <div className="border-b border-[var(--border-md)] px-4 md:px-6 py-5 bg-[var(--surface)]">
        <div className="flex items-start gap-4">
          {/* Avatar initials */}
          <div className="w-16 h-16 rounded-sm bg-[var(--bg-alt)] flex-shrink-0 flex items-center justify-center text-[24px] font-black font-serif text-[var(--text3)]">
            {minister.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {minister.party && <PBadge party={minister.party} />}
              <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Minister Profile</span>
            </div>
            <h1 className="text-[22px] md:text-[26px] font-black font-serif text-[var(--text1)] leading-tight">{minister.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[12px] text-[var(--text2)]">
              {minister.role && <span>{minister.role}</span>}
              {minister.ministry && <span className="text-[var(--text3)]">· {minister.ministry}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-[var(--text3)] font-mono">
              {minister.state && <span>{minister.state}</span>}
              {minister.constituency && <span>· {minister.constituency}</span>}
            </div>

            {/* Links */}
            <div className="flex gap-3 mt-2">
              {minister.wikipedia && (
                <a href={minister.wikipedia} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-mono text-[var(--accent)] hover:underline">Wikipedia ↗</a>
              )}
              {minister.affidavit_url && (
                <a href={minister.affidavit_url} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-mono text-[var(--accent)] hover:underline">Affidavit ↗</a>
              )}
            </div>
          </div>

          {/* Criminal cases */}
          {(minister.criminal_cases ?? 0) > 0 && (
            <div className="flex-shrink-0 border border-[rgba(176,40,40,0.3)] bg-[rgba(176,40,40,0.05)] rounded-sm p-3 text-center">
              <div className="text-[28px] font-black font-mono text-[#b02828]">{minister.criminal_cases}</div>
              <div className="text-[9px] font-mono text-[#b02828] tracking-widest uppercase">Cases</div>
              <div className="text-[8px] text-[var(--text3)] mt-0.5">Self-declared</div>
            </div>
          )}
        </div>

        {/* Promise stats */}
        {promises.length > 0 && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-[var(--border)]">
            {[{ label: 'Kept', val: kept, color: '#1b7050' }, { label: 'Broken', val: broken, color: '#b02828' }, { label: 'Ongoing', val: ongoing, color: '#bf4a07' }].map(({ label, val, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-[14px] font-black font-mono" style={{ color }}>{val}</span>
                <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col md:grid md:grid-cols-3">
        {/* Promises */}
        <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-[var(--border-md)]">
          <div className="px-4 py-3 border-b border-[var(--border-md)]">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text2)]">Promises</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {promises.map((p, i) => (
              <div key={p.id ?? i} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <StatusBadge status={p.status} />
                  {p.made_on && <span className="text-[9px] font-mono text-[var(--text3)]">{p.made_on}</span>}
                </div>
                <p className="text-[12px] text-[var(--text1)] leading-snug">{p.promise}</p>
                {p.evidence_count != null && p.evidence_count > 0 && (
                  <p className="text-[9px] font-mono text-[var(--text3)] mt-1">{p.evidence_count} source{p.evidence_count !== 1 ? 's' : ''}</p>
                )}
              </div>
            ))}
            {promises.length === 0 && (
              <p className="px-4 py-6 text-[12px] text-[var(--text3)] font-mono">No promise data</p>
            )}
          </div>
        </div>

        {/* Articles */}
        <div className="md:col-span-2">
          <div className="px-4 py-3 border-b border-[var(--border-md)]">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text2)]">
              Recent Coverage {minister.stats?.total_articles ? `(${minister.stats.total_articles})` : ''}
            </span>
          </div>
          {(minister.recent_articles ?? []).map((a, i) => (
            <ArticleCard key={a.id ?? i} article={a} variant="default" />
          ))}
          {(minister.recent_articles ?? []).length === 0 && (
            <p className="px-4 py-6 text-[12px] text-[var(--text3)] font-mono">No articles found</p>
          )}
        </div>
      </div>
    </div>
  )
}
