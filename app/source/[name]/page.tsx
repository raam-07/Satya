import { api } from '@/lib/api'
import Link from 'next/link'
import { ArticleList } from '@/components/ArticleList'

export default async function SourcePage({ params }: { params: { name: string } }) {
  const sourceName = decodeURIComponent(params.name)

  // Fetch all feeds in parallel and merge for better coverage
  const [mainFeed, ...categoryFeeds] = await Promise.all([
    api.feed('all'),
    api.feed('governance'),
    api.feed('justice'),
    api.feed('economy'),
    api.feed('health'),
  ])

  // Deduplicate by id
  const seen = new Set<number>()
  const allArticles = [
    ...(mainFeed?.articles ?? []),
    ...(categoryFeeds.flatMap(f => f?.articles ?? [])),
  ].filter(a => {
    if (a.id != null && seen.has(a.id)) return false
    if (a.id != null) seen.add(a.id)
    return true
  })

  // Filter by source (case-insensitive)
  const articles = allArticles.filter(
    a => a.source?.toLowerCase() === sourceName.toLowerCase()
  )

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
          <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">Source</span>
          <h1 className="text-[22px] md:text-[26px] font-black font-serif mt-1" style={{ color: 'var(--text1)' }}>
            {sourceName}
          </h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text2)' }}>
            {articles.length} article{articles.length !== 1 ? 's' : ''} in current feed
          </p>
        </div>
      </div>

      <ArticleList
        articles={articles}
        emptyMessage={`No articles from ${sourceName} in the current feed`}
      />
    </div>
  )
}
