import Link from 'next/link'
import { api } from '@/lib/api'
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
            className="flex-shrink-0 mt-1 text-[10px] font-mono font-semibold tracking-wider uppercase px-3 py-2 rounded-[3px] transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'rgba(191,74,7,0.06)' }}
          >
            Netas →
          </Link>
        </div>
      </div>

      {/* Scorecard — one compact strip: stacked verdict bar + inline numbers */}
      <div className="border-b px-4 md:px-6 py-3" style={{ borderColor: 'var(--border-md)' }}>
        {/* Stacked verdict bar: the whole story in one glance */}
        <div className="h-2.5 rounded-full overflow-hidden flex bg-[var(--bg-alt)]" title={`Kept ${kept} · Ongoing ${ongoing} · Broken ${broken}`}>
          <div style={{ width: `${(kept / total) * 100}%`,    background: '#1B7050' }} />
          <div style={{ width: `${(ongoing / total) * 100}%`, background: '#BF4A07' }} />
          <div style={{ width: `${(broken / total) * 100}%`,  background: '#B02828' }} />
        </div>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2">
          {[
            { label: 'Kept',     val: kept,               color: '#1B7050' },
            { label: 'Ongoing',  val: ongoing,            color: '#BF4A07' },
            { label: 'Broken',   val: broken,             color: '#B02828' },
            { label: 'Void',     val: voidVal,            color: '#6B7280' },
            { label: 'Critical', val: stats.critical ?? 0, color: '#DC2626' },
          ].map(({ label, val, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
              <span className="font-black" style={{ color }}>{val}</span>
              <span className="text-[var(--text3)] uppercase tracking-wider">{label}</span>
            </span>
          ))}
          <span className="ml-auto text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider">
            {keptPct}% kept · {stats.total_promises ?? (kept + broken + ongoing + voidVal)} tracked
          </span>
        </div>
      </div>

      {/* Filter chips + promise list (client) */}
      <VaadeClient data={data} />
    </div>
  )
}
