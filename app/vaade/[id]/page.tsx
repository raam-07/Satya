import { api } from '@/lib/api'
import Link from 'next/link'
import { PBadge, StatusBadge } from '@/components/SrcTag'
import { ArticleList } from '@/components/ArticleList'
import type { PoliticalPromise, Article } from '@/lib/api'

const STATUS_COLOR: Record<string, string> = {
  kept:    '#1B7050',
  broken:  '#B02828',
  ongoing: '#BF4A07',
}

export default async function PromisePage({ params }: { params: { id: string } }) {
  const promiseId = decodeURIComponent(params.id)

  const [data, feedData] = await Promise.all([
    api.promises(),
    api.feed('all'),
  ])

  // Find promise by ID across all statuses
  const allPromises: PoliticalPromise[] = [
    ...(data?.by_status?.broken ?? []),
    ...(data?.by_status?.ongoing ?? []),
    ...(data?.by_status?.kept ?? []),
  ]

  const promise = allPromises.find(p => String(p.id) === promiseId)

  // If no promise found, show a graceful fallback
  if (!promise) {
    return (
      <div className="md:max-w-4xl md:mx-auto">
        <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
          <Link href="/vaade" className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
            ← Vaade
          </Link>
          <h1 className="text-[22px] font-black font-serif mt-2" style={{ color: 'var(--text1)' }}>Promise not found</h1>
        </div>
        <div className="p-12 text-center">
          <p className="text-[13px] font-mono" style={{ color: 'var(--text3)' }}>
            Promise #{promiseId} could not be found. It may have been updated or removed.
          </p>
          <Link href="/vaade" className="text-[11px] font-mono mt-4 block" style={{ color: 'var(--accent)' }}>
            ← Back to all promises
          </Link>
        </div>
      </div>
    )
  }

  const statusColor = STATUS_COLOR[promise.status ?? ''] ?? 'var(--text3)'

  // Find related articles from feed by party/person/category
  const relatedArticles: Article[] = (feedData?.articles ?? []).filter(a => {
    const partyMatch = promise.party && a.party_mentioned?.some(
      p => p.toLowerCase() === promise.party?.toLowerCase()
    )
    const ministerMatch = promise.person && a.ministers_mentioned?.some(
      m => m.toLowerCase().includes((promise.person ?? '').toLowerCase())
    )
    const categoryMatch = promise.category && a.category?.toLowerCase() === promise.category.toLowerCase()
    return partyMatch || ministerMatch || categoryMatch
  }).slice(0, 10)

  return (
    <div className="md:max-w-4xl md:mx-auto">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-5 bg-[var(--surface)]" style={{ borderColor: 'var(--border-md)' }}>
        <Link
          href="/vaade"
          className="text-[10px] font-mono tracking-widest uppercase transition-colors"
          style={{ color: 'var(--text3)' }}

        >
          ← Vaade
        </Link>
        <div className="flex items-center gap-2 mt-3 mb-2 flex-wrap">
          {promise.status && <StatusBadge status={promise.status} />}
          {promise.party && <PBadge party={promise.party} />}
          {promise.person && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--text2)' }}>{promise.person}</span>
          )}
          {promise.made_on && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>Made {promise.made_on}</span>
          )}
          {promise.deadline && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>· Due {promise.deadline}</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)] tracking-widest uppercase">
          {promise.category?.replace(/_/g, ' ') ?? 'Promise'}
        </span>
      </div>

      {/* Promise text */}
      <div className="px-4 md:px-6 py-6 border-b" style={{ borderColor: 'var(--border-md)' }}>
        <div
          className="w-[3px] h-auto rounded-full inline-block mr-4 align-middle"
          style={{ background: statusColor }}
        />
        <p className="text-[18px] md:text-[22px] font-bold font-serif leading-relaxed inline" style={{ color: 'var(--text1)' }}>
          {promise.promise}
        </p>
      </div>

      {/* AI Reasoning */}
      {promise.gemma_reasoning && (
        <div className="px-4 md:px-6 py-5 border-b" style={{ borderColor: 'var(--border-md)' }}>
          <div className="text-[9px] font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--text3)' }}>
            AI Analysis
          </div>
          <div
            className="border-l-2 pl-4 text-[13px] leading-relaxed"
            style={{ borderColor: statusColor + '55', color: 'var(--text2)' }}
          >
            {promise.gemma_reasoning}
          </div>
          {promise.gemma_suggestion && (
            <p className="text-[11px] mt-3 italic" style={{ color: 'var(--text3)' }}>
              Suggestion: {promise.gemma_suggestion}
            </p>
          )}
        </div>
      )}

      {/* Evidence count */}
      {promise.evidence_count != null && promise.evidence_count > 0 && (
        <div className="px-4 md:px-6 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-md)' }}>
          <div className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
            Evidence Sources
          </div>
          <span
            className="text-[11px] font-mono font-bold"
            style={{ color: statusColor }}
          >
            {promise.evidence_count}
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text3)' }}>
            source{promise.evidence_count !== 1 ? 's' : ''} tracked
          </span>
        </div>
      )}

      {/* Related articles from feed */}
      {relatedArticles.length > 0 && (
        <div>
          <div
            className="px-4 md:px-6 py-3 border-b flex items-center gap-2"
            style={{ borderColor: 'var(--border-md)' }}
          >
            <div className="h-[2px] w-3" style={{ background: 'var(--accent)' }} />
            <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
              Related Coverage
            </span>
          </div>
          <ArticleList articles={relatedArticles} emptyMessage="" />
        </div>
      )}

      {relatedArticles.length === 0 && !promise.evidence_count && (
        <div className="px-4 md:px-6 py-10 text-center">
          <p className="text-[12px] font-mono" style={{ color: 'var(--text3)' }}>
            No evidence articles in the current feed. Check back as coverage grows.
          </p>
        </div>
      )}
    </div>
  )
}
