'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PartyData, IndiaOverview } from '@/lib/api'
import { slugify } from '@/lib/utils'

const PARTY_CONFIG = [
  { id: 'bjp', name: 'BJP', fullName: 'Bharatiya Janata Party',       accent: '#BF4A07', bg: '#FFF3E0', border: '#FFB74D' },
  { id: 'inc', name: 'INC', fullName: 'Indian National Congress',     accent: '#1D4ED8', bg: '#EFF6FF', border: '#93C5FD' },
  { id: 'aap', name: 'AAP', fullName: 'Aam Aadmi Party',              accent: '#92400E', bg: '#FFFDE7', border: '#FCD34D' },
  { id: 'tmc', name: 'TMC', fullName: 'All India Trinamool Congress', accent: '#15803D', bg: '#F0FDF4', border: '#86EFAC' },
  { id: 'dmk', name: 'DMK', fullName: 'Dravida Munnetra Kazhagam',    accent: '#B91C1C', bg: '#FEF2F2', border: '#FCA5A5' },
  { id: 'sp',  name: 'SP',  fullName: 'Samajwadi Party',              accent: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD' },
]

const KEY_MINISTERS = [
  { slug: 'narendra_modi',      name: 'Narendra Modi',      role: 'Prime Minister',             party: 'BJP' },
  { slug: 'amit_shah',          name: 'Amit Shah',          role: 'Home Minister',              party: 'BJP' },
  { slug: 'rajnath_singh',      name: 'Rajnath Singh',      role: 'Defence Minister',           party: 'BJP' },
  { slug: 'nirmala_sitharaman', name: 'Nirmala Sitharaman', role: 'Finance Minister',           party: 'BJP' },
  { slug: 's_jaishankar',       name: 'S. Jaishankar',      role: 'External Affairs Minister',  party: 'BJP' },
  { slug: 'rahul_gandhi',       name: 'Rahul Gandhi',       role: 'Leader of Opposition',       party: 'INC' },
  { slug: 'arvind_kejriwal',    name: 'Arvind Kejriwal',    role: 'National Convenor',          party: 'AAP' },
  { slug: 'mamata_banerjee',    name: 'Mamata Banerjee',    role: 'Chief Minister, West Bengal', party: 'TMC' },
  { slug: 'mk_stalin',          name: 'M.K. Stalin',        role: 'Chief Minister, Tamil Nadu', party: 'DMK' },
  { slug: 'akhilesh_yadav',     name: 'Akhilesh Yadav',     role: 'President, Samajwadi Party', party: 'SP'  },
]

const PARTY_ACCENT: Record<string, string> = {
  BJP: '#BF4A07', INC: '#1D4ED8', AAP: '#92400E', TMC: '#15803D', DMK: '#B91C1C', SP: '#7C3AED',
}
const PARTY_BG: Record<string, string> = {
  BJP: '#FFF3E0', INC: '#EFF6FF', AAP: '#FFFDE7', TMC: '#F0FDF4', DMK: '#FEF2F2', SP: '#F5F3FF',
}

// Major Indian states hardcoded (will be filtered by overview top_states if available)
const MAJOR_STATES = [
  { slug: 'uttar_pradesh', name: 'Uttar Pradesh' },
  { slug: 'maharashtra',   name: 'Maharashtra' },
  { slug: 'west_bengal',   name: 'West Bengal' },
  { slug: 'tamil_nadu',    name: 'Tamil Nadu' },
  { slug: 'rajasthan',     name: 'Rajasthan' },
  { slug: 'karnataka',     name: 'Karnataka' },
  { slug: 'gujarat',       name: 'Gujarat' },
  { slug: 'andhra_pradesh', name: 'Andhra Pradesh' },
  { slug: 'telangana',     name: 'Telangana' },
  { slug: 'kerala',        name: 'Kerala' },
  { slug: 'bihar',         name: 'Bihar' },
  { slug: 'madhya_pradesh', name: 'Madhya Pradesh' },
  { slug: 'punjab',        name: 'Punjab' },
  { slug: 'haryana',       name: 'Haryana' },
  { slug: 'delhi',         name: 'Delhi' },
]

type Tab = 'parties' | 'ministers' | 'states'

interface NetasClientProps {
  partyData: (PartyData | null)[]
  overview: IndiaOverview | null
  manifestMinisters?: Set<string>
  manifestStates?: Set<string>
}

export function NetasClient({ partyData, overview, manifestMinisters, manifestStates }: NetasClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('parties')

  const topMins   = overview?.top_ministers_30d ?? {}
  const topStates = overview?.top_states_30d ?? {}

  // Build minister list: start from manifest (all available), sort by coverage
  const ministerList = (() => {
    const coverageMap: Record<string, number> = topMins as Record<string, number>
    // Coverage map keys are canonical display names ('S. Jaishankar').
    // Dedupe against the manifest BY SLUG, not by reconstructed name, so
    // 'S. Jaishankar' and manifest slug 's_jaishankar' are one entry.
    const entries = Object.keys(coverageMap).map(name => ({
      name,
      slug: slugify(name),
      count: Number(coverageMap[name] ?? 0),
    }))
    const seenSlugs = new Set(entries.map(e => e.slug))
    if (manifestMinisters) {
      for (const slug of Array.from(manifestMinisters)) {
        if (!seenSlugs.has(slug)) {
          entries.push({
            name: slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            slug,
            count: 0,
          })
          seenSlugs.add(slug)
        }
      }
    }
    return entries.sort((a, b) => b.count - a.count)
  })()

  // Build states list: manifest covers all states (27+); sort by coverage
  const stateList = (() => {
    const coverageMap: Record<string, number> = topStates as Record<string, number>
    const entries = Object.keys(coverageMap).map(name => ({
      slug: slugify(name),
      name,
      count: Number(coverageMap[name] ?? 0),
    }))
    const seenSlugs = new Set(entries.map(e => e.slug))
    if (manifestStates) {
      for (const slug of Array.from(manifestStates)) {
        if (!seenSlugs.has(slug)) {
          entries.push({
            slug,
            name: slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            count: 0,
          })
          seenSlugs.add(slug)
        }
      }
    }
    return entries.sort((a, b) => b.count - a.count)
  })()

  const TABS: { id: Tab; label: string }[] = [
    { id: 'parties',   label: 'Parties' },
    { id: 'ministers', label: 'Ministers' },
    { id: 'states',    label: 'States' },
  ]

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative flex-1 py-3 text-[11px] font-semibold tracking-wide transition-colors"
            style={{ color: activeTab === tab.id ? 'var(--accent)' : 'var(--text3)' }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Parties tab */}
      {activeTab === 'parties' && (
        <div className="px-4 md:px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PARTY_CONFIG.map((party, idx) => {
              const data = partyData[idx]
              const ministerCount = data?.ministers?.length ?? '—'
              const promiseCount  = data?.promises?.length ?? '—'
              const articleCount  = data?.stats?.total_articles ?? data?.recent_articles?.length ?? '—'
              return (
                <Link
                  key={party.id}
                  href={`/party/${party.id}`}
                  className="block border rounded-sm p-4 hover:border-[var(--accent)] transition-colors bg-[var(--surface)] group"
                  style={{ borderColor: 'var(--border-md)' }}
                >
                  {/* Party badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-[11px] font-mono font-bold tracking-widest rounded-[2px] px-[6px] py-[2px]"
                      style={{
                        color: party.accent,
                        background: party.bg,
                        border: `1px solid ${party.border}`,
                      }}
                    >
                      {party.name}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug mb-3" style={{ color: 'var(--text2)' }}>{party.fullName}</p>

                  <div className="flex gap-3 text-center">
                    <div>
                      <div className="text-[16px] font-black font-mono" style={{ color: 'var(--text1)' }}>{ministerCount}</div>
                      <div className="text-[8px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>Mins</div>
                    </div>
                    <div className="w-px" style={{ background: 'var(--border)' }} />
                    <div>
                      <div className="text-[16px] font-black font-mono" style={{ color: 'var(--text1)' }}>{promiseCount}</div>
                      <div className="text-[8px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>Vaade</div>
                    </div>
                    <div className="w-px" style={{ background: 'var(--border)' }} />
                    <div>
                      <div className="text-[16px] font-black font-mono" style={{ color: 'var(--text1)' }}>{articleCount}</div>
                      <div className="text-[8px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>News</div>
                    </div>
                  </div>

                  <div className="mt-3 text-[9px] font-mono tracking-widest group-hover:underline" style={{ color: 'var(--accent)' }}>
                    View dashboard →
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Ministers tab */}
      {activeTab === 'ministers' && (
        <div className="px-4 md:px-6 py-5">
          {/* All ministers from manifest, sorted by news coverage */}
          <div className="mb-6">
            <div className="text-[9px] font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--text3)' }}>
              Most Covered (30 days)
            </div>
            <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border-md)' }}>
              {ministerList.slice(0, 12).map(({ name, slug, count }) => (
                <Link
                  key={slug}
                  href={`/minister/${slug}`}
                  className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-[var(--bg-alt)] transition-colors group"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-[13px] font-medium group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text1)' }}>
                    {name}
                  </span>
                  <div className="flex items-center gap-3">
                    {count > 0 && (
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>{count} articles</span>
                    )}
                    <span style={{ color: 'var(--text3)' }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Key ministers hardcoded list */}
          <div>
            <div className="text-[9px] font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--text3)' }}>
              Key Figures
            </div>
            <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border-md)' }}>
              {KEY_MINISTERS.map((m) => (
                <Link
                  key={m.slug}
                  href={`/minister/${m.slug}`}
                  className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0 hover:bg-[var(--bg-alt)] transition-colors group"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[12px] font-bold"
                    style={{ background: PARTY_ACCENT[m.party] ?? '#8A7F72' }}
                  >
                    {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold group-hover:text-[var(--accent)] transition-colors truncate" style={{ color: 'var(--text1)' }}>
                      {m.name}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--text3)' }}>{m.role}</div>
                  </div>
                  <span
                    className="text-[9px] font-mono font-bold tracking-widest rounded-[2px] px-[5px] py-[1px] flex-shrink-0"
                    style={{
                      color: PARTY_ACCENT[m.party] ?? '#8A7F72',
                      background: (PARTY_BG[m.party] ?? '#F3F4F6'),
                    }}
                  >
                    {m.party}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* States tab */}
      {activeTab === 'states' && (
        <div className="px-4 md:px-6 py-5">
          <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border-md)' }}>
            {stateList.map((s, i) => (
              <Link
                key={s.slug}
                href={`/state/${s.slug}`}
                className="flex items-center justify-between px-4 py-3.5 border-b last:border-b-0 hover:bg-[var(--bg-alt)] transition-colors group"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 flex items-center justify-center text-[10px] font-mono font-bold rounded-sm flex-shrink-0"
                    style={{ background: 'var(--bg-alt)', color: 'var(--text3)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13px] font-medium group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text1)' }}>
                    {s.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {s.count > 0 && (
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>{s.count} articles</span>
                  )}
                  <span style={{ color: 'var(--text3)' }}>→</span>
                </div>
              </Link>
            ))}
          </div>
          <p className="text-[10px] font-mono mt-4 text-center" style={{ color: 'var(--text3)' }}>
            State pages available via /state/[name] · Coverage grows daily
          </p>
        </div>
      )}
    </div>
  )
}
