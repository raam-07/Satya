import { api } from '@/lib/api'
import { ArticleList } from '@/components/ArticleList'
import { PBadge } from '@/components/SrcTag'
import Link from 'next/link'
import { JsonLd, makeBreadcrumbJsonLd } from '@/components/JsonLd'
import { slugify } from '@/lib/utils'
import type { Metadata } from 'next'

export const revalidate = false

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
  const state = await api.state(params.name).catch(() => null)
  const stateName = state?.state || params.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const title = `${stateName} — local issues, CM & accountability | SatyaDheesh`
  const description = `Track governance, local issues, and political news for ${stateName}. Chief Minister: ${state?.cm || 'N/A'}. Capital: ${state?.capital || 'N/A'}.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://satyadheesh.in/state/${params.name}`,
    },
    openGraph: {
      title,
      description,
      url: `https://satyadheesh.in/state/${params.name}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    }
  }
}

export default async function StatePage({ params }: { params: { name: string } }) {
  const state = await api.state(params.name)

  if (!state) {
    return <div className="p-12 text-center"><p className="text-[var(--text3)] font-mono text-[13px]">State not found: {params.name}</p></div>
  }

  const topTopics = Object.entries(state.top_topics_30d ?? {}).sort(([, a], [, b]) => b - a)
  const topCities = Object.entries(state.top_cities_30d ?? {}).sort(([, a], [, b]) => b - a)

  const breadcrumbData = makeBreadcrumbJsonLd([
    { name: 'Home', item: 'https://satyadheesh.in/' },
    { name: state.state || 'State', item: `https://satyadheesh.in/state/${params.name}` }
  ])

  return (
    <div className="md:max-w-5xl md:mx-auto">
      <JsonLd data={breadcrumbData} />
      {/* Header */}
      <div className="border-b border-[var(--border-md)] px-4 md:px-6 py-5 bg-[var(--surface)]">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {state.ruling_party && <PBadge party={state.ruling_party} />}
          {state.region && <span className="text-[10px] font-mono text-[var(--text3)]">{state.region} India</span>}
        </div>
        <h1 className="text-[24px] md:text-[28px] font-black font-serif text-[var(--text1)] capitalize">{state.state ?? params.name}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-[var(--text2)]">
          {state.cm && (
            <span>
              CM:{' '}
              <Link href={`/minister/${slugify(state.cm)}`} className="font-bold text-[var(--text1)] hover:underline hover:text-[var(--accent)] transition-colors">
                {state.cm}
              </Link>
            </span>
          )}
          {state.capital && <span>Capital: <strong className="text-[var(--text1)]">{state.capital}</strong></span>}
          {state.stats?.total_articles && <span className="font-mono text-[var(--text3)]">{state.stats.total_articles} articles</span>}
        </div>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-4">
        {/* Topics + Cities sidebar */}
        <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-[var(--border-md)]">
          {topTopics.length > 0 && (
            <>
              <div className="px-4 py-3 border-b border-[var(--border-md)]">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text2)]">Top Topics</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topTopics.slice(0, 8).map(([topic, count]) => (
                  <Link key={topic} href={`/topic/${topic}`}
                    className="flex justify-between items-center px-4 py-2.5 hover:bg-[var(--bg-alt)] hover:text-[var(--accent)] transition-colors group">
                    <span className="text-[11px] text-[var(--text2)] capitalize group-hover:text-[var(--accent)] transition-colors">
                      {topic.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text3)]">{count}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {topCities.length > 0 && (
            <>
              <div className="px-4 py-3 border-t border-b border-[var(--border-md)] mt-2">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text2)]">Top Cities</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {topCities.slice(0, 5).map(([city, count]) => (
                  <div key={city} className="flex justify-between items-center px-4 py-2">
                    <span className="text-[11px] text-[var(--text2)]">{city}</span>
                    <span className="text-[10px] font-mono text-[var(--text3)]">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Articles */}
        <div className="md:col-span-3">
          <div className="px-4 py-3 border-b border-[var(--border-md)]">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text2)]">Recent Articles</span>
          </div>
          <ArticleList
            articles={state.recent_articles ?? []}
            emptyMessage="No articles found"
          />
        </div>
      </div>
    </div>
  )
}
