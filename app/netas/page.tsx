import { api } from '@/lib/api'
import { NetasClient } from '@/components/NetasClient'
import type { Metadata } from 'next'

export const revalidate = 300

export const metadata: Metadata = {
  title: "Indian Political Leaders & Neta Profiles | SatyaDheesh",
  description: "Explore profiles of Indian cabinet ministers, opposition leaders, and chief ministers. Track criminal cases, controversies, and promise records.",
  alternates: {
    canonical: 'https://satyadheesh.in/netas',
  }
}

const PARTY_IDS = ['bjp', 'inc', 'aap', 'tmc', 'dmk', 'sp']

export default async function NetasPage() {
  const [overview, manifest, politiciansData, ...partyData] = await Promise.all([
    api.indiaOverview(),
    api.manifest(),
    api.politicians(),
    ...PARTY_IDS.map(id => api.party(id).catch(() => null)),
  ])

  // Extract minister and state slugs from manifest's nested endpoint structure
  const endpoints = (manifest?.endpoints ?? {}) as unknown as Record<string, unknown>
  const ministersMap = endpoints['ministers'] as Record<string, string> | undefined
  const statesMap    = endpoints['states']    as Record<string, string> | undefined

  const manifestMinisters = new Set<string>(
    ministersMap ? Object.values(ministersMap).map(f => f.replace('minister_', '').replace('.json', '')) : []
  )
  const manifestStates = new Set<string>(
    statesMap ? Object.values(statesMap).map(f => f.replace('state_', '').replace('.json', '')) : []
  )

  return (
    <div className="md:max-w-5xl md:mx-auto">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Political Landscape</span>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1">Netas</h1>
        <p className="text-[13px] text-[var(--text2)] mt-1">Parties, ministers, and their records.</p>
      </div>

      <NetasClient
        partyData={partyData}
        overview={overview}
        manifestMinisters={manifestMinisters}
        manifestStates={manifestStates}
        politicians={politiciansData || []}
      />
    </div>
  )
}
