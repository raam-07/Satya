import { api } from '@/lib/api'
import { NetasClient } from '@/components/NetasClient'

const PARTY_IDS = ['bjp', 'inc', 'aap', 'tmc', 'dmk', 'sp']

export default async function NetasPage() {
  const [overview, ...partyData] = await Promise.all([
    api.indiaOverview(),
    ...PARTY_IDS.map(id => api.party(id).catch(() => null)),
  ])

  return (
    <div className="md:max-w-5xl md:mx-auto">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Political Landscape</span>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] mt-1">Netas</h1>
        <p className="text-[13px] text-[var(--text2)] mt-1">Parties, ministers, and their records.</p>
      </div>

      <NetasClient partyData={partyData} overview={overview} />
    </div>
  )
}
