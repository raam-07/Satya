import { api } from '@/lib/api'
import { ArticleList } from '@/components/ArticleList'
import { StatusBadge, PBadge } from '@/components/SrcTag'
import Link from 'next/link'
import { JsonLd, makeBreadcrumbJsonLd } from '@/components/JsonLd'
import type { Metadata } from 'next'
import { slugify, partySlugify } from '@/lib/utils'
import { notFound, permanentRedirect } from 'next/navigation'

export const revalidate = false

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
  const party = await api.party(params.name).catch(() => null)
  if (!party) {
    return {
      title: 'Not Found | SatyaDheesh',
      robots: {
        index: false,
      }
    }
  }

  const canonicalSlug = partySlugify(party.party || '')
  const partyName = party.full_name || party.party || params.name.toUpperCase()
  // Include the criminal-record angle when the data supports it — factual
  // counts (as declared/reported), never characterization.
  const leadersWithCases = (party.ministers ?? []).filter(m => (m.criminal_cases ?? 0) > 0).length
  const title = leadersWithCases > 0
    ? `${partyName} — promises, performance & leaders' criminal records | SatyaDheesh`
    : `${partyName} — promises & performance | SatyaDheesh`

  let description = `${partyName} (${party.coalition || ''}) promise tracker and political performance on SatyaDheesh.`
  if (party.promises) {
    const kept = party.promises.filter(p => p.status === 'kept').length
    const broken = party.promises.filter(p => p.status === 'broken').length
    const ongoing = party.promises.filter(p => p.status === 'ongoing').length
    description = `${partyName} (${party.coalition || ''}) promise tracker: ${kept} kept, ${broken} broken, and ${ongoing} ongoing political promises`
      + (leadersWithCases > 0 ? `, plus criminal cases on record for ${leadersWithCases} tracked leader${leadersWithCases > 1 ? 's' : ''}.` : '.')
  }

  return {
    title,
    description,
    alternates: {
      canonical: `https://satyadheesh.in/party/${canonicalSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://satyadheesh.in/party/${canonicalSlug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    }
  }
}

export default async function PartyPage({ params }: { params: { name: string } }) {
  const party = await api.party(params.name)

  if (!party) {
    notFound()
  }

  const canonicalSlug = partySlugify(party.party || '')
  if (decodeURIComponent(params.name) !== canonicalSlug) {
    permanentRedirect(`/party/${canonicalSlug}`)
  }

  const promises = party.promises ?? []
  const kept    = promises.filter(p => p.status === 'kept').length
  const broken  = promises.filter(p => p.status === 'broken').length
  const ongoing = promises.filter(p => p.status === 'ongoing').length
  const voidVal = promises.filter(p => p.status === 'void').length

  const breadcrumbData = makeBreadcrumbJsonLd([
    { name: 'Home', item: 'https://satyadheesh.in/' },
    { name: party.full_name || party.party || 'Party', item: `https://satyadheesh.in/party/${canonicalSlug}` }
  ])

  return (
    <div className="md:max-w-6xl md:mx-auto">
      <JsonLd data={breadcrumbData} />
      {/* Header */}
      <div className="border-b border-[var(--border-md)] px-4 md:px-6 py-5 bg-[var(--surface)]">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <PBadge party={party.party} />
              {party.coalition && (
                <span className="text-[10px] font-mono text-[var(--text3)]">{party.coalition}</span>
              )}
            </div>
            <h1 className="text-[22px] md:text-[28px] font-black font-serif text-[var(--text1)] leading-tight">
              {party.full_name ?? party.party}
            </h1>
            {party.ideology && (
              <p className="text-[12px] text-[var(--text2)] mt-1">{party.ideology}</p>
            )}
            {party.president && (
              <p className="text-[11px] font-mono text-[var(--text3)] mt-0.5">President: {party.president}</p>
            )}
          </div>

          {/* Promise pills */}
          {promises.length > 0 && (
            <div className="flex gap-4 flex-shrink-0 border border-[var(--border-md)] rounded-sm p-3 bg-[var(--bg)]">
              {[
                { label: 'Kept', val: kept, color: '#1b7050' },
                { label: 'Broken', val: broken, color: '#b02828' },
                { label: 'Ongoing', val: ongoing, color: '#bf4a07' },
                { label: 'Void', val: voidVal, color: '#6b7280' }
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <div className="text-[20px] font-black font-mono" style={{ color }}>{val}</div>
                  <div className="text-[8px] font-mono tracking-widest uppercase text-[var(--text3)]">{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ruling states */}
        {party.ruling_states && party.ruling_states.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-wider">Ruling states:</span>
            {party.ruling_states.map(state => (
              <Link key={state} href={`/state/${slugify(state)}`}
                className="text-[10px] font-mono border border-[var(--border-md)] rounded-sm px-2 py-0.5 text-[var(--text2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                {state}
              </Link>
            ))}
          </div>
        )}
      </div>
 
      {/* Body */}
      <div className="flex flex-col md:grid md:grid-cols-3">
        {/* Ministers */}
        <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-[var(--border-md)]">
          <div className="px-4 py-3 border-b border-[var(--border-md)]">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text2)]">Ministers</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {(party.ministers ?? []).map((m, i) => (
              <Link key={i} href={`/minister/${m.name ? slugify(m.name) : '#'}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-alt)] transition-colors group">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-alt)] flex items-center justify-center text-[12px] font-bold text-[var(--text2)] flex-shrink-0">
                  {m.name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--text1)] truncate group-hover:text-[var(--accent)] transition-colors">{m.name}</p>
                  <p className="text-[10px] text-[var(--text3)] truncate">{m.role}</p>
                </div>
                {(m.criminal_cases ?? 0) > 0 && (
                  <span className="text-[9px] font-mono text-[#b02828] border border-[rgba(176,40,40,0.3)] rounded-sm px-1.5 py-0.5 flex-shrink-0">
                    {m.criminal_cases}
                  </span>
                )}
              </Link>
            ))}
            {(party.ministers ?? []).length === 0 && (
              <p className="px-4 py-6 text-[12px] text-[var(--text3)] font-mono">No minister data</p>
            )}
          </div>
        </div>

        {/* Promises + Articles */}
        <div className="md:col-span-2">
          {promises.length > 0 && (
            <div className="border-b border-[var(--border-md)]">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text2)]">Key Promises</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {promises.slice(0, 6).map((p, i) => (
                  <div key={p.id ?? i} className="px-4 py-3 flex items-start gap-3">
                    <StatusBadge status={p.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[var(--text1)] leading-snug">{p.promise}</p>
                      {p.person && <p className="text-[10px] font-mono text-[var(--text3)] mt-0.5">{p.person}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="px-4 py-3 border-b border-[var(--border-md)]">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text2)]">Recent Articles</span>
            </div>
            <ArticleList
              articles={party.recent_articles ?? []}
              emptyMessage="No articles loaded"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="p-12 text-center"><p className="text-[var(--text3)] font-mono text-[13px]">{message}</p></div>
}
