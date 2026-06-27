'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { HomeClient } from './HomeClient'
import { NetasClient } from './NetasClient'
import { VaadeClient } from './VaadeClient'
import Loading from '@/app/loading'
import Link from 'next/link'
import { PBadge } from './SrcTag'
import { HardRefreshButton } from './HardRefreshButton'
import { slugify } from '@/lib/utils'

// ── LAZY FEED ──────────────────────────────────────────────────────────────
export function LazyFeed() {
  const [data, setData] = useState<{ overview: any; articles: any } | null>(null)

  useEffect(() => {
    Promise.all([api.indiaOverview(), api.feed('all')]).then(([overview, feedData]) => {
      setData({
        overview,
        articles: feedData?.articles ?? []
      })
    })
  }, [])

  if (!data) return <Loading />

  return <HomeClient overview={data.overview} initialArticles={data.articles} />
}

// ── LAZY NETAS ─────────────────────────────────────────────────────────────
const PARTY_IDS = ['bjp', 'inc', 'aap', 'tmc', 'dmk', 'sp']

export function LazyNetas() {
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    Promise.all([
      api.indiaOverview(),
      api.manifest(),
      api.politicians(),
      ...PARTY_IDS.map(id => api.party(id).catch(() => null)),
    ]).then(([overview, manifest, politiciansData, ...partyData]) => {
      const endpoints = (manifest?.endpoints ?? {}) as Record<string, unknown>
      const ministersMap = endpoints['ministers'] as Record<string, string> | undefined
      const statesMap    = endpoints['states']    as Record<string, string> | undefined

      const manifestMinisters = new Set<string>(
        ministersMap ? Object.values(ministersMap).map(f => f.replace('minister_', '').replace('.json', '')) : []
      )
      const manifestStates = new Set<string>(
        statesMap ? Object.values(statesMap).map(f => f.replace('state_', '').replace('.json', '')) : []
      )

      setData({
        overview,
        politicians: politiciansData || [],
        partyData,
        manifestMinisters,
        manifestStates
      })
    })
  }, [])

  if (!data) return <Loading />

  return (
    <div className="md:max-w-5xl md:mx-auto">
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Political Landscape</span>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1">Netas</h1>
        <p className="text-[13px] text-[var(--text2)] mt-1">Parties, ministers, and their records.</p>
      </div>
      <NetasClient
        partyData={data.partyData}
        overview={data.overview}
        manifestMinisters={data.manifestMinisters}
        manifestStates={data.manifestStates}
        politicians={data.politicians}
      />
    </div>
  )
}

// ── LAZY VAADE ─────────────────────────────────────────────────────────────
export function LazyVaade() {
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    api.promises().then(setData)
  }, [])

  if (!data) return <Loading />

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
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Promise Tracker</span>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1">
          Vaade <span className="text-[var(--text3)] font-normal font-sans text-[16px]">— वादे</span>
        </h1>
        <p className="text-[13px] text-[var(--text2)] mt-1">Every tracked political promise with sources and verdicts.</p>
      </div>

      <div className="border-b" style={{ borderColor: 'var(--border-md)' }}>
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

        {Object.keys(byParty).length > 0 && (
          <div className="px-4 md:px-6 pb-4 flex flex-wrap gap-3">
            {Object.entries(byParty).map(([party, count]) => (
              <div key={party} className="flex items-center gap-1.5">
                <PBadge party={party} />
                <span className="text-[10px] font-mono text-[var(--text3)]">
                  {Array.isArray(count) ? count.length : String(count)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <VaadeClient data={data} />
    </div>
  )
}

// ── LAZY DATA ──────────────────────────────────────────────────────────────
function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[var(--bg-alt)]">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color ?? 'var(--accent)' }}
      />
    </div>
  )
}

export function LazyData() {
  const [data, setData] = useState<{ overview: any; promises: any } | null>(null)

  useEffect(() => {
    Promise.all([api.indiaOverview(), api.promises()]).then(([overview, promises]) => {
      setData({ overview, promises })
    })
  }, [])

  if (!data) return <Loading />

  const { overview, promises } = data
  const stats      = overview?.stats ?? {}
  const gov        = overview?.current_government ?? {}
  const catBreak   = overview?.category_breakdown_30d ?? {}
  const topMins    = overview?.top_ministers_30d ?? {}
  const topParty   = overview?.top_parties_30d ?? {}
  const topState   = overview?.top_states_30d ?? {}
  const civicAlert = overview?.civic_alert ?? {}
  const ps         = promises?.stats ?? { kept: 0, broken: 0, ongoing: 0, total_promises: 0 }

  const catMax     = Math.max(...Object.values(catBreak) as number[], 1)
  const minMax     = Math.max(...Object.values(topMins).map(Number), 1)
  const partyMax   = Math.max(...Object.values(topParty).map(Number), 1)
  const stateMax   = Math.max(...Object.values(topState).map(Number), 1)
  const civicMax   = Math.max(...Object.values(civicAlert.top_flag_categories ?? {}).map(Number), 1)

  const promiseTotal = (ps.kept ?? 0) + (ps.broken ?? 0) + (ps.ongoing ?? 0) || 1

  return (
    <div className="md:max-w-5xl md:mx-auto">
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ borderColor: 'var(--border-md)' }}>
        <div>
          <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Civic Intelligence</span>
          <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1">Data</h1>
          <p className="text-[13px] text-[var(--text2)] mt-1">India by the numbers — sourced, structured, transparent.</p>
        </div>
        <div className="flex-shrink-0">
          <HardRefreshButton />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0" style={{ borderColor: 'var(--border-md)', borderBottom: `1px solid var(--border-md)` }}>
        {[
          { label: 'Articles Tracked',   val: stats.total_articles_classified?.toLocaleString() ?? '—', color: 'var(--accent)' },
          { label: 'Last 7 Days',         val: stats.articles_last_7_days?.toLocaleString()      ?? '—', color: 'var(--text1)' },
          { label: 'Last 30 Days',        val: stats.articles_last_30_days?.toLocaleString()     ?? '—', color: 'var(--text1)' },
          { label: 'Promises Tracked',    val: ps.total_promises?.toLocaleString()               ?? '—', color: 'var(--text1)' },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex flex-col items-center py-5 px-3 text-center">
            <div className="text-[26px] md:text-[32px] font-black font-mono leading-none" style={{ color }}>{val}</div>
            <div className="text-[8.5px] font-mono tracking-widest uppercase text-[var(--text3)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="md:grid md:grid-cols-2 md:divide-x" style={{ borderColor: 'var(--border-md)' }}>
        <div className="divide-y" style={{ borderColor: 'var(--border-md)' }}>
          {gov.ruling_party && (
            <div className="px-4 md:px-6 py-5">
              <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)] mb-4">Current Government</h2>
              <div className="space-y-3">
                {[
                  { label: 'Ruling Party',    val: gov.ruling_party },
                  { label: 'Coalition',        val: gov.ruling_coalition },
                  { label: 'Prime Minister',   val: gov.prime_minister },
                  { label: 'President',        val: gov.president },
                ].filter(r => r.val).map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-mono text-[var(--text3)]">{label}</span>
                    <span className="text-[12px] font-semibold text-[var(--text1)] text-right">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 md:px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">Promise Scorecard</h2>
              <Link href="/vaade" className="text-[9px] font-mono text-[var(--accent)] hover:underline">
                Full tracker →
              </Link>
            </div>
            <div className="space-y-3">
              {([
                { label: 'Kept',    val: ps.kept    ?? 0, color: '#1B7050' },
                { label: 'Broken',  val: ps.broken  ?? 0, color: '#B02828' },
                { label: 'Ongoing', val: ps.ongoing ?? 0, color: '#BF4A07' },
              ] as const).map(({ label, val, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--text2)]">{label}</span>
                    <span className="text-[12px] font-mono font-bold" style={{ color }}>{val}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-[var(--bg-alt)]">
                    <div className="h-full rounded-full" style={{
                      width: `${(val / promiseTotal) * 100}%`,
                      background: color,
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[10px] font-mono text-[var(--text3)]">
              Promise kept rate: <span className="font-bold text-[var(--text2)]">
                {Math.round(((ps.kept ?? 0) / promiseTotal) * 100)}%
              </span>
            </div>
          </div>

          {Object.keys(topParty).length > 0 && (
            <div className="px-4 md:px-6 py-5">
              <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)] mb-4">Most Covered Parties (30d)</h2>
              <div className="space-y-2.5">
                {Object.entries(topParty)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .slice(0, 6)
                  .map(([party, count]) => (
                    <div key={party} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono font-bold w-12 text-[var(--text2)]">{party}</span>
                      <Bar value={Number(count)} max={partyMax} color="var(--accent)" />
                      <span className="text-[10px] font-mono text-[var(--text3)] w-8 text-right">{String(count)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {civicAlert.top_flag_categories && Object.keys(civicAlert.top_flag_categories).length > 0 && (
            <div className="px-4 md:px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">AI Civic Alerts (30d)</h2>
                <div className="text-[9px] font-mono text-[var(--accent)] font-semibold">
                  Today: {stats.civic_flags_today ?? 0} flagged
                </div>
              </div>
              <div className="mb-4 p-3 rounded-sm bg-[var(--bg-alt)] border flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-[18px] font-mono font-black" style={{ color: 'var(--text1)' }}>
                    {stats.civic_flags_last_30_days ?? 0}
                  </div>
                  <div className="text-[8px] font-mono tracking-wider uppercase" style={{ color: 'var(--text3)' }}>
                    Total Flagged (30d)
                  </div>
                </div>
                <div className="text-right">
                  <Link href="/?tab=flagged" className="text-[9px] font-mono text-[var(--accent)] hover:underline">
                    View Flagged Feed →
                  </Link>
                </div>
              </div>
              <div className="space-y-2.5">
                {Object.entries(civicAlert.top_flag_categories)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .slice(0, 5)
                  .map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[var(--text2)] w-24 capitalize truncate">{cat.replace(/_/g, ' ')}</span>
                      <Bar value={Number(count)} max={civicMax} color="#B02828" />
                      <span className="text-[10px] font-mono text-[var(--text3)] w-8 text-right">{String(count)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="divide-y border-t md:border-t-0" style={{ borderColor: 'var(--border-md)' }}>
          {Object.keys(catBreak).length > 0 && (
            <div className="px-4 md:px-6 py-5">
              <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)] mb-4">Coverage by Category (30d)</h2>
              <div className="space-y-2.5">
                {Object.entries(catBreak)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([label, val]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[var(--text2)] w-24 capitalize truncate">{label}</span>
                      <Bar value={val as number} max={catMax} />
                      <span className="text-[10px] font-mono text-[var(--text3)] w-8 text-right">{val as number}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {Object.keys(topMins).length > 0 && (
            <div className="px-4 md:px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">Most Covered Ministers (30d)</h2>
                <Link href="/netas" className="text-[9px] font-mono text-[var(--accent)] hover:underline">
                  All netas →
                </Link>
              </div>
              <div className="space-y-2.5">
                {Object.entries(topMins)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .slice(0, 8)
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center gap-3">
                      <Link
                        href={`/minister/${slugify(name)}`}
                        className="text-[11px] text-[var(--text1)] hover:text-[var(--accent)] transition-colors truncate w-40 flex-shrink-0"
                      >
                        {name}
                      </Link>
                      <Bar value={Number(count)} max={minMax} color="#4A4A4A" />
                      <span className="text-[10px] font-mono text-[var(--text3)] w-8 text-right">{String(count)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {Object.keys(topState).length > 0 && (
            <div className="px-4 md:px-6 py-5">
              <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)] mb-4">Coverage by State (30d)</h2>
              <div className="space-y-2.5">
                {Object.entries(topState)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .slice(0, 8)
                  .map(([state, count]) => (
                    <div key={state} className="flex items-center gap-3">
                      <Link
                        href={`/state/${slugify(state)}`}
                        className="text-[11px] text-[var(--text1)] hover:text-[var(--accent)] transition-colors truncate w-40 flex-shrink-0"
                      >
                        {state}
                      </Link>
                      <Bar value={Number(count)} max={stateMax} color="var(--accent)" />
                      <span className="text-[10px] font-mono text-[var(--text3)] w-8 text-right">{String(count)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t" style={{ borderColor: 'var(--border-md)' }}>
        <div className="px-4 md:px-6 py-6">
          <h2 className="text-[10px] font-mono tracking-widest uppercase mb-4" style={{ color: 'var(--text3)' }}>
            About SatyaDheesh
          </h2>
          <div className="md:grid md:grid-cols-2 gap-8">
            <div className="space-y-4 text-[12px] leading-relaxed" style={{ color: 'var(--text2)' }}>
              <p>
                <strong className="text-[var(--text1)]">SatyaDheesh (सत्याधीश)</strong> is an independent civic intelligence platform
                that tracks Indian political accountability in real time. No editorial filter. No advertiser influence.
                Just sourced, structured data.
              </p>
              <p>
                Every article is scraped from verified Indian news outlets, classified by AI into categories, parties,
                ministers, and states — then linked back to its original source. Nothing is summarised without attribution.
              </p>
              <p>
                The promise tracker monitors political commitments made by parties and leaders, scores them against
                evidence, and surfaces them alongside current news so accountability travels with the story.
              </p>
              <p>
                <strong className="text-[var(--text1)]">Disclaimer:</strong> Data is aggregated and categorized automatically by AI algorithms from third-party verified news outlets. While we monitor for quality, automated classification can occasionally make errors. SatyaDheesh does not assert independent claims; original linked sources remain the sole authority of their respective publishers.
              </p>
            </div>
            <div className="mt-4 md:mt-0 space-y-4">
              <div>
                <div className="text-[9px] font-mono tracking-widest uppercase mb-2" style={{ color: 'var(--text3)' }}>
                  Platform Methodology
                </div>
                <div className="space-y-1.5">
                  {[
                    'Real-time news processing and organization',
                    'Multi-dimensional tagging by party, leader, and region',
                    'Evidence-based promise verification and status updates',
                    'Direct linking to verified primary source articles',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--accent)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--text2)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono tracking-widest uppercase mb-2" style={{ color: 'var(--text3)' }}>
                  Sources Tracked
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text2)' }}>
                  The Hindu · Times of India · NDTV · India Today · Hindustan Times ·
                  The Wire · Scroll · NewsLaundry · ANI · PTI · and more
                </p>
              </div>
              <div>
                <div className="text-[9px] font-mono tracking-widest uppercase mb-2" style={{ color: 'var(--text3)' }}>
                  Contact Us
                </div>
                <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text2)' }}>
                  For feedback, data corrections, or general inquiries:
                </p>
                <a
                  href="mailto:thesatyadheesh@gmail.com"
                  className="inline-flex items-center justify-center px-4 py-1.5 border border-[var(--accent)] text-[10px] font-mono tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors duration-200 uppercase rounded-sm"
                >
                  Email Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[10px] font-mono text-[var(--text3)]">
          SatyaDheesh · सत्याधीश · Truth · Open civic intelligence for India · Data updated continuously
        </p>
      </div>
    </div>
  )
}
