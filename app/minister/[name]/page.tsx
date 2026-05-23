import { api } from '@/lib/api'
import Link from 'next/link'
import { PBadge } from '@/components/SrcTag'
import { ArticleList } from '@/components/ArticleList'

export default async function MinisterPage({ params }: { params: { name: string } }) {
  const displayName = params.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const [minister, feedData] = await Promise.all([
    api.minister(params.name),
    api.feed('all'),
  ])

  // One-line intro from API or fallback
  const intro = minister
    ? [minister.role, minister.ministry, minister.party && `${minister.party}`]
        .filter(Boolean).join(' · ')
    : null

  // Articles: prefer minister's own recent_articles, supplement with feed filter
  const ministerArticles = minister?.recent_articles ?? []
  const feedArticles = (feedData?.articles ?? []).filter(a =>
    a.ministers_mentioned?.some(m =>
      m.toLowerCase().includes(params.name.replace(/_/g, ' ').toLowerCase())
    )
  )

  // Merge, deduplicate by id
  const seen = new Set<number>()
  const articles = [...ministerArticles, ...feedArticles].filter(a => {
    if (a.id != null && seen.has(a.id)) return false
    if (a.id != null) seen.add(a.id)
    return true
  })

  return (
    <div className="md:max-w-4xl md:mx-auto">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <Link href="/netas" className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
          ← Netas
        </Link>
        <div className="flex items-center gap-2 mt-3 mb-1 flex-wrap">
          {minister?.party && <PBadge party={minister.party} />}
        </div>
        <h1 className="text-[22px] md:text-[26px] font-black font-serif" style={{ color: 'var(--text1)' }}>
          {minister?.name ?? displayName}
        </h1>
        {intro && (
          <p className="text-[12px] mt-1 font-mono" style={{ color: 'var(--text3)' }}>{intro}</p>
        )}
        <p className="text-[11px] mt-1" style={{ color: 'var(--text3)' }}>
          {articles.length} article{articles.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Articles */}
      <ArticleList
        articles={articles}
        emptyMessage={`No articles found for ${displayName}`}
      />
    </div>
  )
}
