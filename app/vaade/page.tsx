import Link from 'next/link'
import { api } from '@/lib/api'
import { PBadge } from '@/components/SrcTag'
import { VaadeClient } from '@/components/VaadeClient'
import type { Metadata } from 'next'

export const revalidate = false

export const metadata: Metadata = {
  title: "Political Promise Tracker & Accountability Scorecard | SatyaDheesh",
  description: "Explore all tracked promises made by Indian political parties and leaders. Verified verdicts: kept, broken, or ongoing with news source evidence.",
  alternates: {
    canonical: 'https://satyadheesh.in/vaade',
  }
}

export default async function VaadePage() {
  const data = await api.promises()
  const stats    = data?.stats   ?? { total_promises: 0, kept: 0, broken: 0, ongoing: 0 }
  const byParty  = data?.by_party  ?? {}

  const kept    = stats.kept    ?? 0
  const broken  = stats.broken  ?? 0
  const ongoing = stats.ongoing ?? 0
  const voidVal = stats.void    ?? 0
  const total   = (kept + broken + ongoing) || 1
  const keptPct = Math.round((kept / total) * 100)

  return (
    <div className="md:max-w-5xl md:mx-auto">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Promise Tracker</span>
            <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1">
              Vaade <span className="text-[var(--text3)] font-normal font-sans text-[16px]">— वादे</span>
            </h1>
            <p className="text-[13px] text-[var(--text2)] mt-1">Every tracked political promise with sources and verdicts.</p>
          </div>
          <Link
            href="/netas"
            className="flex-shrink-0 mt-1 text-[10px] font-mono font-semibold tracking-wider uppercase px-3 py-2 rounded-[3px] transition-colors hover:bg-[var(--bg-alt)] text-[var(--text2)]"
            style={{ border: '1px solid var(--border-md)' }}
          >
            Netas →
          </Link>
        </div>
      </div>

      {/* Scorecard */}
      <div className="border-b" style={{ borderColor: 'var(--border-md)' }}>
        {/* Big numbers */}
        <div className="grid grid-cols-3 md:grid-cols-6" style={{ borderColor: 'var(--border-md)' }}>
          {[
            { label: 'CRITICAL', val: stats.critical ?? 0, color: '#DC2626' },
            { label: 'BROKEN',   val: broken,             color: '#B02828' },
            { label: 'ONGOING',  val: ongoing,            color: '#BF4A07' },
            { label: 'KEPT',     val: kept,               color: '#1B7050' },
            { label: 'VOID',     val: voidVal,            color: '#6B7280' },
            { label: 'TOTAL',    val: stats.total_promises ?? (kept + broken + ongoing + voidVal), color: 'var(--text1)' },
          ].map(({ label, val, color }) => (
            <div
              key={label}
              className="flex flex-col items-center py-5 px-2 border-r border-b border-[var(--border-md)] [&:nth-child(3n)]:border-r-0 md:[&:nth-child(3n)]:border-r md:last:border-r-0 [&:nth-child(n+4)]:border-b-0 md:border-b-0"
            >
              <div className="text-[28px] md:text-[36px] font-black font-mono leading-none" style={{ color }}>
                {val}
              </div>
              <div className="text-[8px] font-mono tracking-[0.16em] uppercase text-[var(--text3)] mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="px-4 md:px-6 pb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-mono text-[var(--text3)] tracking-widest">PROMISE KEPT RATE (EXCL. VOID)</span>
            <span className="text-[9px] font-mono font-bold" style={{ color: keptPct >= 50 ? '#1B7050' : '#B02828' }}>
              {keptPct}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-[var(--bg-alt)]">
            <div className="h-full rounded-full transition-all" style={{
              width: `${keptPct}%`,
              background: keptPct >= 50 ? '#1B7050' : '#BF4A07',
            }} />
          </div>
        </div>

        {/* By party */}
        {Object.keys(byParty).length > 0 && (
          <div className="px-4 md:px-6 pb-4 flex flex-wrap gap-3">
            {Object.entries(byParty).map(([party, count]) => (
              <div key={party} className="flex items-center gap-1.5">
                <PBadge party={party} />
                <span className="text-[10px] font-mono text-[var(--text3)]">
                  {Array.isArray(count) ? count.length : count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter chips + promise list (client) */}
      <VaadeClient data={data} />
    </div>
  )
}
