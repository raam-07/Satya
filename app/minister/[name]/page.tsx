import { api } from '@/lib/api'
import Link from 'next/link'
import { PBadge, StatusBadge } from '@/components/SrcTag'
import { ArticleList } from '@/components/ArticleList'
import { renderMarkdown, slugify } from '@/lib/utils'
import { JsonLd, makeBreadcrumbJsonLd, checkUrlResolves } from '@/components/JsonLd'
import type { Metadata } from 'next'

export const revalidate = 300

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
  const minister = await api.minister(params.name).catch(() => null)
  const displayName = params.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const name = minister?.name ?? displayName

  const promises = minister?.promises ?? []
  const kept = promises.filter(p => p.status === 'kept').length
  const broken = promises.filter(p => p.status === 'broken').length
  const ongoing = promises.filter(p => p.status === 'ongoing').length

  const roleParty = minister
    ? [minister.role, minister.party].filter(Boolean).join(', ')
    : 'Political Leader'

  const title = `${name} — promises kept, broken & pending | SatyaDheesh`
  const description = minister
    ? `Track the political promise record of ${name} (${roleParty}) on SatyaDheesh: ${kept} kept, ${broken} broken, and ${ongoing} pending.`
    : `Track political promises, kept or broken, and verification record of ${name} on SatyaDheesh.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://satyadheesh.in/minister/${params.name}`,
    },
    openGraph: {
      title,
      description,
      url: `https://satyadheesh.in/minister/${params.name}`,
      type: 'profile',
      images: [
        {
          url: `https://satyadheesh.in/minister/${params.name}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${name} promise scorecard`,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`https://satyadheesh.in/minister/${params.name}/opengraph-image`],
    }
  }
}

export default async function MinisterPage({ params }: { params: { name: string } }) {
  const displayName = params.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // Fetch the specific minister profile first (fast and lightweight)
  const minister = await api.minister(params.name)
  let articles = minister?.recent_articles ?? []

  // If the minister profile does not exist or has no articles, fetch feed as a fallback
  if (articles.length === 0) {
    const feedData = await api.feed('all')
    articles = (feedData?.articles ?? []).filter(a =>
      a.ministers_mentioned?.some(m =>
        m && typeof m === 'string' && m.toLowerCase().includes(params.name.replace(/_/g, ' ').toLowerCase())
      )
    )
  }

  // One-line intro from API or fallback
  const intro = minister
    ? [minister.role, minister.ministry, minister.party && `${minister.party}`]
        .filter(Boolean).join(' · ')
    : null

  const name = minister?.name ?? displayName
  const promises = minister?.promises ?? []
  const kept = promises.filter(p => p.status === 'kept').length
  const broken = promises.filter(p => p.status === 'broken').length
  const ongoing = promises.filter(p => p.status === 'ongoing').length

  // Wikipedia validation HEAD check
  const isWikiResolves = minister?.wikipedia ? await checkUrlResolves(minister.wikipedia) : false
  const sameAs: string[] = []
  if (isWikiResolves && minister?.wikipedia) {
    sameAs.push(minister.wikipedia)
  }

  const breadcrumbData = makeBreadcrumbJsonLd([
    { name: 'Home', item: 'https://satyadheesh.in/' },
    { name: 'Netas', item: 'https://satyadheesh.in/netas' },
    { name: name, item: `https://satyadheesh.in/minister/${params.name}` }
  ])

  const personData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": name,
    "jobTitle": minister?.role || 'Political Leader',
    "affiliation": minister?.party ? {
      "@type": "Organization",
      "name": minister.party
    } : undefined,
    "sameAs": sameAs.length > 0 ? sameAs : undefined
  }

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": `Has ${name} kept their promises?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": promises.length > 0
          ? `Out of ${promises.length} tracked promises, ${name} has kept ${kept}, broken ${broken}, and ${ongoing} are ongoing.`
          : `There are currently no tracked promises for ${name} on SatyaDheesh.`
      }
    }]
  }

  return (
    <div className="md:max-w-4xl md:mx-auto">
      {/* Structured Data */}
      <JsonLd data={breadcrumbData} />
      <JsonLd data={personData} />
      <JsonLd data={faqData} />

      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <Link href="/netas" className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
          ← Netas
        </Link>
        <div className="flex items-center gap-2 mt-3 mb-1 flex-wrap">
          {minister?.party && <PBadge party={minister.party} />}
        </div>
        <h1 className="text-[22px] md:text-[26px] font-black font-serif" style={{ color: 'var(--text1)' }}>
          {name}
        </h1>
        {intro && (
          <p className="text-[12px] mt-1 font-mono" style={{ color: 'var(--text3)' }}>{intro}</p>
        )}
        <p className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
          {articles.length} article{articles.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Neta Information Dashboard */}
      {minister && (
        <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface-alt)] md:grid md:grid-cols-2 md:gap-6 divide-y md:divide-y-0" style={{ borderColor: 'var(--border-md)' }}>
          {/* Bio & Details Column */}
          <div className="space-y-4 pb-4 md:pb-0">
            <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">Affidavit & Biography</h2>
            <div className="space-y-2">
              {minister.constituency && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[var(--text3)]">Constituency</span>
                  <span className="font-semibold text-[var(--text1)]">{minister.constituency}</span>
                </div>
              )}
              {minister.state && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[var(--text3)]">State / Region</span>
                  <Link href={`/state/${slugify(minister.state)}`} className="font-semibold text-[var(--text1)] hover:underline hover:text-[var(--accent)] transition-colors">
                    {minister.state}
                  </Link>
                </div>
              )}
              {minister.wikipedia && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[var(--text3)]">Biography</span>
                  <a href={minister.wikipedia} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                    Wikipedia Profile ↗
                  </a>
                </div>
              )}
              {minister.affidavit_url && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[var(--text3)]">Official Affidavit</span>
                  <a href={minister.affidavit_url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                    ECI Affidavit ↗
                  </a>
                </div>
              )}
            </div>

            {/* Controversies & Gaffes Spotlight Card */}
            {minister.controversies && minister.controversies.length > 0 && (
              <div className="pt-4 border-t space-y-3 mt-4" style={{ borderColor: 'var(--border-md)' }}>
                <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">Controversies & Verbal Gaffes</h2>
                <div className="p-3 border rounded-sm bg-[var(--bg-alt)] space-y-1.5" style={{ borderColor: 'var(--border-md)' }}>
                  <div className="text-[8.5px] font-mono tracking-widest uppercase text-[var(--text3)]">Statement Log</div>
                  <div className="max-h-[140px] overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                    {minister.controversies.map((incident, i) => (
                      <div key={i} className="flex gap-2 items-start text-[10px] leading-relaxed" style={{ color: 'var(--text2)' }}>
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-[#BF4A07]" />
                        <div className="flex-1 min-w-0">
                          <span className="block">{renderMarkdown(incident.incident_text)}</span>
                          {incident.source_url && (
                            <span className="block mt-1 text-[8.5px] font-mono" style={{ color: 'var(--text3)' }}>
                              Citation:{' '}
                              <a
                                href={incident.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--accent)] hover:underline font-semibold"
                              >
                                {incident.source_title || 'View Source ↗'}
                              </a>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Criminal Case Spotlight Column */}
          <div className="pt-4 md:pt-0 space-y-4">
            <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">Criminal Record Spotlight</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-sm bg-[var(--bg)]" style={{ borderColor: (minister.criminal_cases ?? 0) > 0 ? '#B0282844' : 'var(--border-md)' }}>
                <div className="text-[20px] font-mono font-black" style={{ color: (minister.criminal_cases ?? 0) > 0 ? '#B02828' : 'var(--text1)' }}>
                  {minister.criminal_cases ?? 0}
                </div>
                <div className="text-[8px] font-mono tracking-widest uppercase text-[var(--text3)] mt-1">Declared Cases</div>
              </div>

              <div className="p-3 border rounded-sm bg-[var(--bg)]" style={{ borderColor: (minister.criminal_cases_in_news ?? 0) > 0 ? '#BF4A0744' : 'var(--border-md)' }}>
                <div className="text-[20px] font-mono font-black" style={{ color: (minister.criminal_cases_in_news ?? 0) > 0 ? '#BF4A07' : 'var(--text1)' }}>
                  {minister.criminal_cases_in_news ?? 0}
                </div>
                <div className="text-[8px] font-mono tracking-widest uppercase text-[var(--text3)] mt-1">Active In News</div>
              </div>
            </div>

            {/* List of declared incidents/charges */}
            {minister.criminal_incidents && minister.criminal_incidents.length > 0 && (
              <div className="p-3 border rounded-sm bg-[var(--bg-alt)] space-y-1.5" style={{ borderColor: 'var(--border-md)' }}>
                <div className="text-[8.5px] font-mono tracking-widest uppercase text-[var(--text3)]">Incident Log</div>
                <div className="max-h-[120px] overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                  {minister.criminal_incidents.map((incident, i) => (
                    <div key={i} className="flex gap-2 items-start text-[10px] leading-relaxed" style={{ color: 'var(--text2)' }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-[#B02828]" />
                      <div className="flex-1 min-w-0">
                        {incident.incident_type && (
                          <span className="inline-block text-[8px] font-mono tracking-widest uppercase border px-1.5 py-0.5 rounded-[2px] mb-1"
                            style={{ borderColor: 'var(--border-md)', color: 'var(--text3)' }}>
                            {incident.incident_type}
                          </span>
                        )}
                        <span className="block">{renderMarkdown(incident.incident_text)}</span>
                        {incident.source_url && (
                          <span className="block mt-1 text-[8.5px] font-mono" style={{ color: 'var(--text3)' }}>
                            Citation:{' '}
                            <a
                              href={incident.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--accent)] hover:underline font-semibold"
                            >
                              {incident.source_title || 'View Source ↗'}
                            </a>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Promises Section */}
      {minister && minister.promises && minister.promises.length > 0 && (
        <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
          <h2 className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)] mb-3">Tracked Promises</h2>
          <div className="divide-y divide-[var(--border)]">
            {minister.promises.map((p) => (
              <Link key={p.id} href={`/vaade/${p.id}`} className="block py-3 hover:bg-[var(--bg-alt)] transition-colors group">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5"><StatusBadge status={p.status} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--text1)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                      {p.promise}
                    </p>
                    {p.made_on && (
                      <span className="text-[10px] font-mono text-[var(--text3)] block mt-1">Made {p.made_on}</span>
                    )}
                  </div>
                  <span className="text-[12px] text-[var(--text3)] self-center ml-2">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Articles */}
      <ArticleList
        articles={articles}
        emptyMessage={`No articles found for ${displayName}`}
      />
    </div>
  )
}
