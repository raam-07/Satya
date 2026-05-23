import { api } from '@/lib/api'
import Link from 'next/link'
import { ArticleList } from '@/components/ArticleList'

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

export default async function TopicPage({ params }: { params: { name: string } }) {
  const slug = decodeURIComponent(params.name)

  // Fetch feed + try topic-specific JSON (may not exist) in parallel
  const [feedData, topicData] = await Promise.all([
    api.feed('all'),
    api.topic(slug).catch(() => null),
  ])

  // Filter main feed by topic_tags
  const feedArticles = (feedData?.articles ?? []).filter(
    a => a.topic_tags?.some(t => t === slug || t.toLowerCase() === slug.toLowerCase())
  )

  // Merge with topic-specific articles (deduplicate by id)
  const seen = new Set<number>()
  const mergedArticles = [
    ...feedArticles,
    ...(topicData?.recent_articles ?? []),
  ].filter(a => {
    if (a.id != null && seen.has(a.id)) return false
    if (a.id != null) seen.add(a.id)
    return true
  })

  const displayName =
    TOPIC_LABELS[slug] ??
    (topicData?.topic ?? slug).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const totalCount =
    topicData?.stats?.total_articles ??
    (topicData?.stats?.articles_last_30d ?? mergedArticles.length)

  return (
    <div className="md:max-w-4xl md:mx-auto">
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
