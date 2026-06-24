import { api } from '@/lib/api'
import Link from 'next/link'
import { ArticleList } from '@/components/ArticleList'
import { JsonLd, makeBreadcrumbJsonLd } from '@/components/JsonLd'
import type { Metadata } from 'next'

export const revalidate = false

// Display labels matching ArticleModal's TOPIC_LABELS
const TOPIC_LABELS: Record<string, string> = {
  corruption_scam:    'Corruption & Scams',
  crime_violence:     'Crime & Violence',
  rape_sexual_crime:  'Crimes Against Women',
  farmer_agriculture: 'Farmers & Agriculture',
  foreign_policy:     'Foreign Policy',
  economy:            'Economy',
  infrastructure:     'Infrastructure',
  health:             'Health',
  education:          'Education',
  protest_opposition: 'Protests & Opposition',
}

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
  const slug = decodeURIComponent(params.name)
  const displayName = TOPIC_LABELS[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const title = `${displayName} — political news & promises | SatyaDheesh`
  const description = `Explore recent articles, news, and political promises related to ${displayName} in India on SatyaDheesh. Sourced and verified fact checks.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://satyadheesh.in/topic/${params.name}`,
    },
    openGraph: {
      title,
      description,
      url: `https://satyadheesh.in/topic/${params.name}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    }
  }
}

export default async function TopicPage({ params }: { params: { name: string } }) {
  const slug = decodeURIComponent(params.name)

  // Fetch the specific topic JSON first (fast and lightweight)
  const topicData = await api.topic(slug).catch(() => null)
  let mergedArticles = topicData?.recent_articles ?? []

  // If the topic JSON does not exist or has no articles, fetch feed as a fallback
  if (mergedArticles.length === 0) {
    const feedData = await api.feed('all')
    mergedArticles = (feedData?.articles ?? []).filter(
      a => a.topic_tags?.some(t => t === slug || (t && typeof t === 'string' && t.toLowerCase() === slug.toLowerCase()))
    )
  }

  const displayName =
    TOPIC_LABELS[slug] ??
    (topicData?.topic ?? slug).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const totalCount =
    topicData?.stats?.total_articles ??
    (topicData?.stats?.articles_last_30d ?? mergedArticles.length)

  const breadcrumbData = makeBreadcrumbJsonLd([
    { name: 'Home', item: 'https://satyadheesh.in/' },
    { name: displayName, item: `https://satyadheesh.in/topic/${params.name}` }
  ])

  return (
    <div className="md:max-w-4xl md:mx-auto">
      <JsonLd data={breadcrumbData} />
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <Link
          href="/"
          className="text-[10px] font-mono tracking-widest uppercase transition-colors"
          style={{ color: 'var(--text3)' }}
        >
          ← Feed
        </Link>
        <div className="mt-2">
          <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Topic</span>
          <h1 className="text-[22px] md:text-[26px] font-black font-serif mt-1" style={{ color: 'var(--text1)' }}>
            {displayName}
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
            {mergedArticles.length} article{mergedArticles.length !== 1 ? 's' : ''} in feed
            {totalCount > mergedArticles.length ? ` · ${totalCount} tracked overall` : ''}
          </p>
        </div>
      </div>

      <ArticleList
        articles={mergedArticles}
        emptyMessage={`No articles tagged with "${displayName}" in the current feed`}
      />
    </div>
  )
}
